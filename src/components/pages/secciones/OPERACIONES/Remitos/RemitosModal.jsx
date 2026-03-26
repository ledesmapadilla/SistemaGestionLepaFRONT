import { useEffect, useState } from "react";
import { Modal, Button, Form, Table } from "react-bootstrap";
import Swal from "sweetalert2";
import {
  crearRemito,
  listarRemitos,
  editarItemRemito,
  editarRemito,
} from "../../../../../helpers/queriesRemitos";
import { listarPersonal } from "../../../../../helpers/queriesPersonal.js";

const filaVacia = {
  fecha: "",
  servicio: "",
  precioUnitario: "",
  cantidad: "",
  maquina: "",
  unidad: "",
  gasoil: "",
  personal: "",
  costoHoraPersonal: "",
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
    (p) => p.clasificacion === clasificacion && (!trabajo || p.trabajo === trabajo)
  );
  if (candidatos.length === 0) return null;
  if (candidatos.length === 1) return candidatos[0];

  // Ordenar todos los candidatos por fecha descendente (más reciente primero)
  const ordenados = [...candidatos]
    .filter((p) => p.fecha)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const fechaReferencia = new Date(fechaRef);

  // Si hay fecha de referencia válida, buscar el precio vigente a esa fecha
  if (!isNaN(fechaReferencia.getTime())) {
    const vigentes = ordenados.filter((p) => new Date(p.fecha) <= fechaReferencia);
    if (vigentes.length > 0) return vigentes[0];
  }

  // Sin fecha de referencia o sin vigentes: devolver el más reciente
  return ordenados.length > 0 ? ordenados[0] : candidatos[0];
};

const buscarCostoHoraVigente = (personalDisponible, nombrePersonal, fechaRef) => {
  if (!nombrePersonal || !fechaRef) return 0;
  const persona = personalDisponible.find((p) => p.nombre === nombrePersonal);
  if (!persona || !persona.semanal || persona.semanal.length === 0) return 0;

  const semanal = persona.semanal;
  const fechaRefDate = new Date(fechaRef + "T12:00:00");

  // Filtrar entradas con fecha válida y <= fechaRef
  const vigentes = semanal
    .filter((s) => {
      if (!s.fecha || s.fecha === "-") return false;
      const sFecha = new Date(s.fecha.slice(0, 10) + "T12:00:00");
      return !isNaN(sFecha.getTime()) && sFecha <= fechaRefDate;
    })
    .sort((a, b) => new Date(b.fecha.slice(0, 10)) - new Date(a.fecha.slice(0, 10)));

  if (vigentes.length > 0) {
    return Math.round((vigentes[0].valor / 44) * 100) / 100;
  }

  return 0;
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
      // MODO EDITAR ITEM
      const fechaItem = itemEditando.fecha
        ? formatearFechaInput(itemEditando.fecha)
        : "";

      setFilas([
        {
          ...itemEditando,
          fecha: fechaItem,
        },
      ]);

      setRemito(remitoEditando.remito);
      setEstado(remitoEditando.estado);
      setFecha(
        remitoEditando.fecha ? formatearFechaInput(remitoEditando.fecha) : ""
      );
      setErrorFecha("");
    } else {
      // MODO CREAR REMITO
      setRemito("");
      setEstado("Sin facturar"); // Se inicializa fijo aquí
      setFecha("");
      setFilas([{ ...filaVacia }]);
    }

    setErroresFilas([]);
    setErrorFecha("");
    setErrorNumeroRemito("");
  }, [show, itemEditando, remitoEditando]);

  // ===============================
  // CARGAR PERSONAL
  // ===============================
  useEffect(() => {
    const cargarPersonal = async () => {
      try {
        const respuesta = await listarPersonal();
        if (respuesta?.ok) {
          const data = await respuesta.json();
          setPersonalDisponible(data);
        }
      } catch (error) {
        console.error("Error al cargar personal:", error);
      }
    };

    cargarPersonal();
  }, [show]);

  // ===============================
  // HANDLERS
  // ===============================
  const handleRemitoChange = async (valor) => {
    setRemito(valor);
    setErrorNumeroRemito("");

    if (!valor) return; 

    try {
      const remitosExistentes = await listarRemitos();
      const existe = remitosExistentes.some((r) => r.remito === Number(valor));

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
      precioUnitario: item?.precio || "",
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
          const remitosExistentes = await listarRemitos();
          const existe = remitosExistentes.some(
            (r) => r.remito === Number(remito)
          );

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
            tieneDatos && !Number(f.precioUnitario)
              ? "Seleccione máquina o servicio"
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
          Number(f.cantidad) > 0 && Number(f.precioUnitario) > 0 && f.fecha
      );

      if (!itemsValidos.length) {
        Swal.fire({
          icon: "warning",
          title: "Sin datos",
          text: "Debe agregar al menos un ítem válido con fecha",
        });
        return;
      }

      // EDITAR ÍTEM
      if (remitoEditando && itemEditando) {
        const itemActualizado = {
          fecha: filas[0].fecha,
          maquina: filas[0].maquina || "",
          servicio: filas[0].servicio || "",
          personal: filas[0].personal || "",
          cantidad: Number(filas[0].cantidad),
          precioUnitario: Number(filas[0].precioUnitario),
          costoHoraPersonal: Number(filas[0].costoHoraPersonal || 0),
          unidad: filas[0].unidad || "",
          gasoil: Number(filas[0].gasoil || 0),
          estado: estado,
        };

        const respuesta = await editarItemRemito(
          remitoEditando._id,
          itemEditando._id,
          itemActualizado
        );

        Swal.fire({
          icon: "success",
          title: "Ítem actualizado",
          timer: 1200,
          showConfirmButton: false,
        });

        onCreated?.(respuesta.remito);
      } else {
        // CREAR REMITO
        await crearRemito({
          remito: Number(remito),
          estado, // Se envía "Sin facturar" (valor del state inicial)
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
              </Form.Select>
            ) : (
              // MODO CREACIÓN: Input solo lectura
              <Form.Control
                type="text"
                value="Sin facturar"
                readOnly
                className="text-center  text-muted"
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
              <th>$ Hora</th>
              <th>$ Unitario</th>
              <th>Cantidad</th>
              <th>Unidad</th>
              <th>Gasoil</th>
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
                        ?.filter((p) => p.clasificacion === "Alquiler")
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
                    {personalDisponible.map((persona) => (
                      <option key={persona._id} value={persona.nombre}>
                        {persona.nombre}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {erroresFilas[index]?.personal}
                  </Form.Control.Feedback>
                </td>

                <td>
                  <Form.Control
                    type="text"
                    value={
                      fila.costoHoraPersonal
                        ? Number(fila.costoHoraPersonal).toLocaleString("es-AR", {
                            style: "currency",
                            currency: "ARS",
                          })
                        : ""
                    }
                    readOnly
                  />
                </td>

                <td>
                  <Form.Control
                    type="text"
                    value={
                      fila.precioUnitario
                        ? Number(fila.precioUnitario).toLocaleString("es-AR", {
                            style: "currency",
                            currency: "ARS",
                          })
                        : ""
                    }
                    readOnly
                  />
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
                  <Form.Group>
                    <div className="input-group">
                      <span
                        className="input-group-text "
                        style={{ fontSize: "0.8rem" }}
                      >
                        lts
                      </span>
                      <Form.Control
                        type="number"
                        value={fila.gasoil}
                        onChange={(e) =>
                          actualizarFila(index, "gasoil", e.target.value)
                        }
                        placeholder=""
                      />
                    </div>
                  </Form.Group>
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
        <Button variant="outline-success" onClick={onSubmit}>
          Guardar remito
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default RemitosModal;