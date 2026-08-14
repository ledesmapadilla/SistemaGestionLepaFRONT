import { useEffect, useRef, useState } from "react";
import { Modal, Button, Form, Table } from "react-bootstrap";
import Swal from "sweetalert2";
import {
  crearRemito,
  existeRemito,
  editarItemRemito,
  editarRemito,
} from "../../../../../helpers/queriesRemitos";
import { listarPersonal } from "../../../../../helpers/queriesPersonal.js";
import { valorHoraVigente } from "../../../../../helpers/semanalUtils.js";
import AsyncButton from "../../../../shared/AsyncButton";

const filaVacia = {
  fecha: "",
  servicio: "",
  precioUnitario: "",
  cantidad: "",
  maquina: "",
  unidad: "",
  // Ya no se carga desde el remito (el gasoil tiene su propio módulo), pero el
  // campo sigue viajando: al editar un remito viejo conserva los litros que
  // tenía guardados en vez de pisarlos con 0.
  gasoil: "",
  personal: "",
  costoHoraPersonal: "",
  observaciones: "",
};

const formatearFechaInput = (valor) => {
  if (!valor) return "";
  return valor.toString().slice(0, 10);
};

const obtenerFechaHoy = () => {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, "0");
  const d = String(hoy.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const buscarPrecioVigente = (precios, clasificacion, trabajo, fechaRef) => {
  const candidatos = precios.filter(
    (p) =>
      (clasificacion === "Alquiler"
        ? p.clasificacion?.startsWith("Alquiler")
        : p.clasificacion === clasificacion) &&
      (!trabajo || p.trabajo === trabajo)
  );
  if (candidatos.length === 0) return null;
  if (candidatos.length === 1) return candidatos[0];

  const indexados = candidatos.map((p, i) => ({ p, i }));
  const conFecha = indexados.filter(({ p }) => p.fecha);

  if (fechaRef && conFecha.length > 0) {
    // Candidatos cuya fecha de vigencia es <= fecha del remito
    const vigentes = conFecha
      .filter(({ p }) => new Date(p.fecha) <= new Date(fechaRef))
      .sort((a, b) => {
        const diff = new Date(b.p.fecha) - new Date(a.p.fecha);
        return diff !== 0 ? diff : b.i - a.i;
      });
    if (vigentes.length > 0) return vigentes[0].p;
    // Si todos los precios son posteriores a la fecha del remito, usar el más antiguo
    const masAntiguo = conFecha.sort((a, b) => {
      const diff = new Date(a.p.fecha) - new Date(b.p.fecha);
      return diff !== 0 ? diff : a.i - b.i;
    });
    return masAntiguo[0].p;
  }

  // Sin fechaRef: devolver el más reciente
  conFecha.sort((a, b) => {
    const diff = new Date(b.p.fecha) - new Date(a.p.fecha);
    return diff !== 0 ? diff : b.i - a.i;
  });
  return conFecha.length > 0 ? conFecha[0].p : candidatos[candidatos.length - 1];
};

// Quién estaba trabajando en la fecha de la fila: ya dado de alta y todavía no
// desactivado. Las fechas son "YYYY-MM-DD" en los dos lados, así que se comparan
// como texto.
const activoEnFecha = (persona, fecha) => {
  if (persona.fechaAlta && persona.fechaAlta > fecha) return false;
  if (persona.activo === false) {
    if (!persona.fechaDesactivado || persona.fechaDesactivado <= fecha) return false;
  }
  return true;
};

// Sin fecha todavía no se puede saber quién correspondía, así que se muestran
// todos. Al maquinista ya guardado se lo conserva aunque hoy esté de baja: si
// no, al abrir un remito viejo el select aparecería vacío y se perdería el dato.
const personalParaFila = (personalDisponible, fecha, seleccionado) => {
  const lista = fecha
    ? personalDisponible.filter((p) => activoEnFecha(p, fecha))
    : personalDisponible;

  if (!seleccionado || seleccionado === "No aplica") return lista;
  if (lista.some((p) => p.nombre === seleccionado)) return lista;
  return [{ _id: `guardado-${seleccionado}`, nombre: seleccionado }, ...lista];
};

// Costo hora del maquinista a la fecha de la fila: sale del sueldo semanal
// vigente en esa fecha repartido en sus jornales (semanal / cantJornales / 8).
// `semanalVigente` ya resuelve los casos borde: si el remito es anterior a
// todos los sueldos cargados usa el más antiguo, y las entradas viejas con
// fecha "-" cuentan desde el inicio.
const buscarCostoHoraVigente = (personalDisponible, nombrePersonal, fechaRef) => {
  if (!nombrePersonal || !fechaRef) return 0;
  const persona = personalDisponible.find((p) => p.nombre === nombrePersonal);
  if (!persona) return 0;
  return valorHoraVigente(persona.semanal, fechaRef);
};

const RemitosModal = ({
  show,
  onCancel,
  obra,
  onCreated,
  itemEditando = null,
  remitoEditando = null,
}) => {
  const [personalDisponible, setPersonalDisponible] = useState([]);
  const [errorFecha, setErrorFecha] = useState("");
  const [errorNumeroRemito, setErrorNumeroRemito] = useState("");
  const remitoValidandoRef = useRef("");

  const [remito, setRemito] = useState("");
  const [estado, setEstado] = useState("Sin facturar");
  const [filas, setFilas] = useState([]);
  const [fecha, setFecha] = useState("");
  const [erroresFilas, setErroresFilas] = useState([]);

  // ===============================
  // INICIALIZAR MODAL (EDITAR / CREAR)
  // ===============================
  useEffect(() => {
    if (!show) return;

    if (itemEditando && remitoEditando) {
      // MODO EDITAR REMITO — cargar TODOS los ítems
      setFilas(
        (remitoEditando.items?.length ? remitoEditando.items : [itemEditando]).map((item) => ({
          ...item,
          fecha: item.fecha ? formatearFechaInput(item.fecha) : "",
        }))
      );

      setRemito(remitoEditando.remito);
      setEstado(remitoEditando.estado);
      setFecha(
        remitoEditando.fecha ? formatearFechaInput(remitoEditando.fecha) : ""
      );
      setErrorFecha("");
    } else {
      // MODO CREAR REMITO
      setRemito("");
      setEstado("Sin facturar");
      setFecha(obtenerFechaHoy());
      setFilas([{ ...filaVacia, fecha: obtenerFechaHoy() }]);
    }

    setErroresFilas([]);
    setErrorFecha("");
    setErrorNumeroRemito("");
  }, [show, itemEditando, remitoEditando]);

  // Estado efectivo para crear: obras de precio cerrado usan "Obra propia"
  const estadoCreacion = obra?.modalidad === "Precio cerrado" ? "Obra propia" : "Sin facturar";

  // ===============================
  // CARGAR PERSONAL
  // ===============================
  useEffect(() => {
    if (!show) return;
    let cancelado = false;

    const cargarPersonal = async () => {
      try {
        const respuesta = await listarPersonal();
        if (!cancelado && respuesta?.ok) {
          const data = await respuesta.json();
          // El backend los devuelve en orden de carga; el select de maquinista se
          // ordena alfabético. localeCompare en "es" para acentos y ñ.
          setPersonalDisponible(
            [...data].sort((a, b) =>
              (a?.nombre || "").localeCompare(b?.nombre || "", "es", { sensitivity: "base" })
            )
          );
        }
      } catch (error) {
        console.error("Error al cargar personal:", error);
      }
    };

    cargarPersonal();
    return () => { cancelado = true; };
  }, [show]);

  // ===============================
  // HANDLERS
  // ===============================
  const handleRemitoChange = async (valor) => {
    remitoValidandoRef.current = valor;
    setRemito(valor);
    setErrorNumeroRemito("");

    if (!valor) return;

    try {
      const existe = await existeRemito(valor);
      if (remitoValidandoRef.current !== valor) return;
      if (existe) {
        setErrorNumeroRemito("El remito ya existe");
      }
    } catch (error) {
      console.error("Error al validar remito:", error);
    }
  };

  const handleFechaChange = (valor) => {
    setFecha(valor);
    setErrorFecha("");
  };

  const agregarFila = () => {
    setFilas([...filas, { ...filaVacia, fecha }]);
  };

  const eliminarFila = async (index) => {
    const result = await Swal.fire({
      title: "¿Eliminar fila?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    setFilas((prev) => prev.filter((_, i) => i !== index));

    await Swal.fire({
      icon: "success",
      title: "Fila eliminada",
      timer: 900,
      showConfirmButton: false,
    });
  };

  const actualizarFila = (index, campo, valor) => {
    const nuevasFilas = [...filas];
    nuevasFilas[index][campo] = valor;
    setFilas(nuevasFilas);
  };

  const seleccionarPrecio = (index, tipo, trabajo) => {
    const fechaRef = filas[index]?.fecha;
    const preciosObra = obra?.precio || [];
    const item = buscarPrecioVigente(preciosObra, tipo, trabajo, fechaRef);

    const nuevasFilas = [...filas];
    nuevasFilas[index] = {
      ...nuevasFilas[index],
      maquina: tipo === "Alquiler" ? trabajo : "",
      servicio: tipo === "Servicio" ? trabajo : "",
      precioUnitario: item ? item.precio : "",
      unidad: item?.unidad || "",
    };

    setFilas(nuevasFilas);
  };

  // ===============================
  // SUBMIT
  // ===============================
  const onSubmit = async () => {
    try {
      let hayError = false;

      // VALIDACIONES CABECERA (SOLO CREAR)
      if (!itemEditando) {
        if (!remito) {
          setErrorNumeroRemito("Complete remito");
          hayError = true;
        } else {
          const existe = await existeRemito(remito);

          if (existe) {
            setErrorNumeroRemito("El remito ya existe");
            hayError = true;
          }
        }

        if (!fecha) {
          setErrorFecha("Complete fecha");
          hayError = true;
        }
      }

      if (hayError) return;

      // VALIDACIONES FILAS
      const nuevosErrores = filas.map((f) => {
        const tieneDatos =
          f.maquina || f.servicio || f.cantidad || f.precioUnitario || f.personal;

        return {
          cantidad:
            tieneDatos && !Number(f.cantidad) ? "Complete cantidad" : "",
          precio:
            tieneDatos && (f.precioUnitario === "" || f.precioUnitario === null || f.precioUnitario === undefined)
              ? "Ingrese precio"
              : "",
          fecha: !f.fecha ? "Complete fecha" : "",
          personal: tieneDatos && !f.personal ? "Seleccione personal" : "",
        };
      });

      setErroresFilas(nuevosErrores);

      if (
        nuevosErrores.some(
          (e) => e.cantidad || e.precio || e.fecha || e.personal
        )
      )
        return;

      // FILTRAR ÍTEMS VÁLIDOS
      const itemsValidos = filas.filter(
        (f) =>
          Number(f.cantidad) > 0 && f.precioUnitario !== "" && f.precioUnitario !== null && f.precioUnitario !== undefined && f.fecha
      );

      if (!itemsValidos.length) {
        Swal.fire({
          icon: "warning",
          title: "Sin datos",
          text: "Debe agregar al menos un ítem válido con fecha",
        });
        return;
      }

      // EDITAR REMITO — guardar TODOS los ítems
      if (remitoEditando && itemEditando) {
        const respuesta = await editarRemito(remitoEditando._id, {
          estado,
          items: itemsValidos.map((f) => ({
            _id: f._id,
            fecha: f.fecha,
            maquina: f.maquina || "",
            servicio: f.servicio || "",
            personal: f.personal || "",
            cantidad: Number(f.cantidad),
            precioUnitario: Number(f.precioUnitario),
            costoHoraPersonal: Number(f.costoHoraPersonal || 0),
            unidad: f.unidad || "",
            gasoil: Number(f.gasoil || 0),
            observaciones: f.observaciones || "",
          })),
        });

        Swal.fire({
          icon: "success",
          title: "Remito actualizado",
          timer: 1200,
          showConfirmButton: false,
        });

        onCreated?.(respuesta.remito);
      } else {
        // CREAR REMITO
        await crearRemito({
          remito: Number(remito),
          estado: estadoCreacion,
          obra: obra._id,
          fecha, 
          items: itemsValidos.map((f) => ({
            ...f,
            fecha: f.fecha || fecha,
            cantidad: Number(f.cantidad),
            precioUnitario: Number(f.precioUnitario),
            costoHoraPersonal: Number(f.costoHoraPersonal || 0),
            gasoil: Number(f.gasoil || 0),
          })),
        });

        Swal.fire({
          icon: "success",
          title: "Remito creado",
          timer: 1500,
          showConfirmButton: false,
        });

        onCreated?.();
      }

      onCancel();
    } catch (error) {
      console.error("Error en submit:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "No se pudo guardar el remito",
      });
    }
  };

  return (
    <Modal
      show={show}
      onHide={onCancel}
      size="xl"
      centered
      enforceFocus={false}
    >
      <Modal.Header closeButton className="border-bottom border-warning">
        <div className="container-fluid">
          <div className="row align-items-center">
            {/* Columna izquierda (Fecha) */}
            <div className="col-4">
              <Form.Group className="w-50 text-center">
                <Form.Label className="mb-1">Fecha *</Form.Label>
                <Form.Control
                  type="date"
                  value={formatearFechaInput(fecha)}
                  max={obtenerFechaHoy()}
                  disabled={!!itemEditando}
                  onChange={(e) => handleFechaChange(e.target.value)}
                  isInvalid={!!errorFecha}
                />
                <Form.Control.Feedback type="invalid">
                  {errorFecha}
                </Form.Control.Feedback>
              </Form.Group>
            </div>

            {/* Título centrado */}
            <div className="col-4 text-center">
              <Modal.Title>
                Cargar remito – {"Obra:  "}
                <span className="nombreTitulos">{obra?.nombreobra}</span>
              </Modal.Title>
            </div>

            {/* Columna derecha vacía */}
            <div className="col-4"></div>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="border-bottom border-warning">
        {/* CABECERA */}
        <div className="d-flex flex-column flex-md-row justify-content-center gap-3 mb-4">
          {/* N° REMITO */}
          <Form.Group className="col-md-4 w-25 text-center mx-5">
            <Form.Label className="">N° Remito *</Form.Label>
            <Form.Control
              type="number"
              value={remito}
              onChange={(e) => handleRemitoChange(e.target.value)}
              isInvalid={!!errorNumeroRemito}
            />
            <Form.Control.Feedback type="invalid">
              {errorNumeroRemito}
            </Form.Control.Feedback>
          </Form.Group>

          {/* ESTADO - MODIFICADO */}
          <Form.Group className="col-md-4 text-center w-25 mx-5">
            <Form.Label>Estado</Form.Label>
            
            {itemEditando ? (
              // MODO EDICIÓN: Select desplegable
              <Form.Select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
              >
                <option value="Sin facturar">Sin facturar</option>
                <option value="Facturado">Facturado</option>
                <option value="Obra propia">Obra propia</option>
              </Form.Select>
            ) : (
              // MODO CREACIÓN: Input solo lectura
              <Form.Control
                type="text"
                value={estadoCreacion}
                readOnly
                className="text-center text-muted"
                style={{ cursor: "not-allowed" }}
              />
            )}
          </Form.Group>
        </div>

        {/* TABLA */}
        <Table
          striped
          bordered
          hover
          responsive
          className="text-center align-middle"
        >
          <thead className="table-dark">
            <tr>
              <th>Fecha</th>
              <th>Alquiler</th>
              <th>Servicio</th>
              <th>Maquinista</th>
              <th style={{ width: "70px" }}>Cant.</th>
              <th>Unidad</th>
              <th>Observaciones</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {filas.map((fila, index) => (
              <tr key={index}>
                <td>
                  <Form.Control
                    type="date"
                    value={fila.fecha}
                    max={obtenerFechaHoy()}
                    onChange={(e) => {
                      const nuevaFecha = e.target.value;
                      actualizarFila(index, "fecha", nuevaFecha);

                      // Recalcular precio si ya hay alquiler o servicio seleccionado
                      const preciosObra = obra?.precio || [];
                      if (fila.maquina) {
                        const item = buscarPrecioVigente(preciosObra, "Alquiler", fila.maquina, nuevaFecha);
                        if (item) {
                          actualizarFila(index, "precioUnitario", item.precio);
                          actualizarFila(index, "unidad", item.unidad);
                        }
                      } else if (fila.servicio) {
                        const item = buscarPrecioVigente(preciosObra, "Servicio", fila.servicio, nuevaFecha);
                        if (item) {
                          actualizarFila(index, "precioUnitario", item.precio);
                          actualizarFila(index, "unidad", item.unidad);
                        }
                      }

                      // Recalcular costo hora si hay personal seleccionado
                      if (fila.personal) {
                        const costoHora = buscarCostoHoraVigente(
                          personalDisponible,
                          fila.personal,
                          nuevaFecha
                        );
                        actualizarFila(index, "costoHoraPersonal", costoHora);
                      }

                      if (erroresFilas[index]) {
                        const nuevosErrores = [...erroresFilas];
                        nuevosErrores[index] = {
                          ...nuevosErrores[index],
                          fecha: "",
                        };
                        setErroresFilas(nuevosErrores);
                      }
                    }}
                    isInvalid={!!erroresFilas[index]?.fecha}
                  />
                  <Form.Control.Feedback type="invalid">
                    {erroresFilas[index]?.fecha}
                  </Form.Control.Feedback>
                </td>

                <td>
                  <Form.Select
                    value={fila.maquina || ""}
                    disabled={!!fila.servicio && !itemEditando}
                    onChange={(e) => {
                      const valor = e.target.value;
                      if (valor) {
                        seleccionarPrecio(index, "Alquiler", valor);
                      } else {
                        actualizarFila(index, "maquina", "");
                        actualizarFila(index, "precioUnitario", "");
                        actualizarFila(index, "unidad", "");
                      }
                    }}
                  >
                    <option value="">—</option>
                    {[...new Set(
                      obra?.precio
                        ?.filter((p) => p.clasificacion?.startsWith("Alquiler"))
                        .map((p) => p.trabajo)
                    )].map((trabajo, i) => (
                        <option key={i} value={trabajo}>
                          {trabajo}
                        </option>
                      ))}
                  </Form.Select>
                </td>

                <td>
                  <Form.Select
                    value={fila.servicio || ""}
                    disabled={!!fila.maquina && !itemEditando}
                    onChange={(e) => {
                      const valor = e.target.value;
                      if (valor) {
                        seleccionarPrecio(index, "Servicio", valor);
                      } else {
                        actualizarFila(index, "servicio", "");
                        actualizarFila(index, "precioUnitario", "");
                        actualizarFila(index, "unidad", "");
                      }
                    }}
                  >
                    <option value="">—</option>
                    {[...new Set(
                      obra?.precio
                        ?.filter((p) => p.clasificacion === "Servicio")
                        .map((p) => p.trabajo)
                    )].map((trabajo, i) => (
                        <option key={i} value={trabajo}>
                          {trabajo}
                        </option>
                      ))}
                  </Form.Select>
                </td>

                <td>
                  <Form.Select
                    value={fila.personal || ""}
                    onChange={(e) => {
                      const nombreSeleccionado = e.target.value;
                      actualizarFila(index, "personal", nombreSeleccionado);

                      // Calcular costo hora del personal
                      const costoHora = buscarCostoHoraVigente(
                        personalDisponible,
                        nombreSeleccionado,
                        fila.fecha
                      );
                      actualizarFila(index, "costoHoraPersonal", costoHora);

                      if (erroresFilas[index]) {
                        const nuevosErrores = [...erroresFilas];
                        nuevosErrores[index] = {
                          ...nuevosErrores[index],
                          personal: "",
                        };
                        setErroresFilas(nuevosErrores);
                      }
                    }}
                    isInvalid={!!erroresFilas[index]?.personal}
                  >
                    <option value="">—</option>
                    <option value="No aplica">No aplica</option>
                    {personalParaFila(personalDisponible, fila.fecha, fila.personal).map(
                      (persona) => (
                        <option key={persona._id} value={persona.nombre}>
                          {persona.nombre}
                        </option>
                      )
                    )}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {erroresFilas[index]?.personal}
                  </Form.Control.Feedback>
                </td>

                <td>
                  <Form.Control
                    type="number"
                    value={fila.cantidad}
                    onChange={(e) => {
                      actualizarFila(index, "cantidad", e.target.value);
                      if (erroresFilas[index]) {
                        const nuevosErrores = [...erroresFilas];
                        nuevosErrores[index] = {
                          ...nuevosErrores[index],
                          cantidad: "",
                        };
                        setErroresFilas(nuevosErrores);
                      }
                    }}
                    isInvalid={!!erroresFilas[index]?.cantidad}
                  />
                  <Form.Control.Feedback type="invalid">
                    {erroresFilas[index]?.cantidad}
                  </Form.Control.Feedback>
                </td>

                <td>{fila.unidad}</td>

                <td>
                  <Form.Control
                    type="text"
                    value={fila.observaciones || ""}
                    onChange={(e) =>
                      actualizarFila(index, "observaciones", e.target.value)
                    }
                  />
                </td>

                <td className="text-center">
                  <Button
                    type="button"
                    variant="outline-danger"
                    size="sm"
                    onClick={() => eliminarFila(index)}
                  >
                    ✕
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>

        {!itemEditando && (
          <div className="text-center">
            <Button variant="outline-primary" onClick={agregarFila}>
              + Agregar fila
            </Button>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <AsyncButton variant="outline-success" onClick={onSubmit}>
          Guardar remito
        </AsyncButton>
      </Modal.Footer>
    </Modal>
  );
};

export default RemitosModal;