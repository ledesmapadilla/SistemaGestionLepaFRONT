import { Modal, Button, Form, Table } from "react-bootstrap";
import { useEffect, useState } from "react";

//  Validación fila
const hoy = () => new Date().toISOString().split("T")[0];

const MAQUINA_A_PRECIO = {
  PC1: "PC200", PC2: "PC200", PC3: "PC200", PC4: "PC200", PC5: "PC200",
  PC200: "PC200",
  JD1: "Retropala", JD2: "Retropala",
  Retropala: "Retropala",
  WA200: "Pala cargadora",
  "Pala cargadora": "Pala cargadora",
  Motoniveladora: "Motoniveladora",
  ETX: "Camión batea", EIQ: "Camión batea",
  "Camión batea": "Camión batea",
  "Carretón chico": "Carretón chico",
  "Carretón grande": "Carretón grande",
  Batea: "Viaje batea",
  "Viaje batea": "Viaje batea",
};

// Lista de grupos únicos para el dropdown de Alquiler
const MAQUINAS_ALQUILER = [...new Set(Object.values(MAQUINA_A_PRECIO))];

const MAQUINA_A_UNIDAD = {
  PC200: "Horas",
  Retropala: "Horas",
  "Pala cargadora": "Horas",
  Motoniveladora: "Horas",
  "Camión batea": "Viaje",
  "Carretón chico": "Viaje",
  "Carretón grande": "Viaje",
  "Viaje batea": "Viaje",
};

const esAlquiler = (clasificacion) =>
  clasificacion === "Alquiler c/gasoil" || clasificacion === "Alquiler s/gasoil";

const filaValida = (fila) => {
  if (fila.clasificacion === "Precio cerrado")
    return !!(fila.clasificacion && fila.trabajo && fila.fecha);
  return (
    fila.clasificacion &&
    fila.trabajo?.trim() &&
    fila.precio !== "" &&
    fila.unidad?.trim() &&
    fila.fecha
  );
};

const PRECIO_CERRADO_DEFAULT = "";

const PreciosModal = ({
  show,
  precios,
  setPrecios,
  onCancel,
  onSave,
  nombreObra,
  editando = false,
  gasoilAutomatic,
  ultimaListaPrecios = [],
  modalidad = "",
}) => {
  const [filasOriginales, setFilasOriginales] = useState(0);

  useEffect(() => {
    if (show) {
      setFilasOriginales(editando ? precios.length : 0);

      if (precios.length === 0) {
        const filas = [
          {
            clasificacion: "Gasoil",
            trabajo: "-",
            precio: gasoilAutomatic != null ? String(gasoilAutomatic) : "",
            unidad: "lts",
            observaciones: "",
            fecha: hoy(),
          },
        ];
        if (modalidad === "Precio cerrado") {
          filas.push({
            clasificacion: "Precio cerrado",
            trabajo: "Precio de la obra",
            precio: PRECIO_CERRADO_DEFAULT,
            unidad: "Global",
            observaciones: "",
            fecha: hoy(),
          });
        }
        setPrecios(filas);
      }
    }
  }, [show]);

  const agregarFila = () => {
    setPrecios((prev) => [
      ...prev,
      {
        clasificacion: "",
        trabajo: "",
        precio: "",
        unidad: "",
        observaciones: "",
        fecha: hoy(),
      },
    ]);
  };

  const cambiarCampo = (index, campo, valor) => {
    setPrecios((prev) =>
      prev.map((p, i) => {
        if (i === index) {
          // Lógica especial cuando seleccionamos "Gasoil"
          if (campo === "clasificacion" && valor === "Gasoil") {
            const precioReferencia =
              prev[0]?.clasificacion === "Gasoil" ? prev[0].precio : "";

            return {
              ...p,
              clasificacion: valor,
              trabajo: "-",
              unidad: "lts",
              precio: precioReferencia,
            };
          }

          // Si cambia de "Gasoil" a otra cosa, limpiamos
          if (
            campo === "clasificacion" &&
            p.clasificacion === "Gasoil" &&
            valor !== "Gasoil"
          ) {
            return {
              ...p,
              clasificacion: valor,
              trabajo: "",
              unidad: "",
              precio: "",
            };
          }

          // Al cambiar entre Alquiler c/gasoil y s/gasoil, recalcular precio con la máquina actual
          if (campo === "clasificacion" && esAlquiler(valor) && p.trabajo) {
            const nombrePrecio = MAQUINA_A_PRECIO[p.trabajo];
            if (nombrePrecio) {
              const precioLista = ultimaListaPrecios.find((lp) => lp.maquina === nombrePrecio);
              if (precioLista) {
                const precioValor = valor === "Alquiler s/gasoil"
                  ? precioLista.sinGasoil
                  : precioLista.completo;
                return { ...p, clasificacion: valor, precio: precioValor > 0 ? String(Math.round(precioValor)) : "" };
              }
            }
          }

          // Auto-fill precio y unidad cuando se selecciona máquina en Alquiler
          if (campo === "trabajo" && esAlquiler(p.clasificacion) && valor) {
            const nombrePrecio = MAQUINA_A_PRECIO[valor];
            if (nombrePrecio) {
              const unidadDefault = MAQUINA_A_UNIDAD[nombrePrecio] || "";
              const precioLista = ultimaListaPrecios.find((lp) => lp.maquina === nombrePrecio);
              if (precioLista) {
                const precioValor = p.clasificacion === "Alquiler s/gasoil"
                  ? precioLista.sinGasoil
                  : precioLista.completo;
                return {
                  ...p,
                  trabajo: valor,
                  precio: precioValor > 0 ? String(Math.round(precioValor)) : "",
                  unidad: p.unidad || unidadDefault,
                };
              }
              return { ...p, trabajo: valor, unidad: p.unidad || unidadDefault };
            }
          }

          // ACTUALIZACIÓN NORMAL
          const nuevaFila = { ...p, [campo]: valor };

          // SINCRONIZACIÓN: Si estamos editando el PRECIO de la fila 0 (Gasoil Principal),
          // actualizamos automáticamente cualquier otra fila que también sea Gasoil.
          if (
            index === 0 &&
            campo === "precio" &&
            p.clasificacion === "Gasoil"
          ) {
            setTimeout(() => {
              setPrecios((listaActual) =>
                listaActual.map((item, idx) => {
                  if (idx !== 0 && item.clasificacion === "Gasoil") {
                    return { ...item, precio: valor };
                  }
                  return item;
                }),
              );
            }, 0);
          }

          return nuevaFila;
        }
        return p;
      }),
    );
  };

  const eliminarFila = (index) => {
    setPrecios((prev) => prev.filter((_, i) => i !== index));
  };

  const listaValida = precios.length > 0 && precios.every(filaValida);

  const [focusadoPrecio, setFocusadoPrecio] = useState(null);

  const normalizarPrecio = (val) => {
    val = val.replace(/[^\d.]/g, "");
    const partes = val.split(".");
    if (partes.length > 2) val = partes[0] + "." + partes[1];
    return val;
  };

  const formatearMoneda = (valor) => {
    if (valor === "" || valor == null) return "";
    const num = parseFloat(valor);
    if (isNaN(num)) return valor.toString();
    return num.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  return (
    <Modal show={show} onHide={onCancel} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>Lista de precios - {nombreObra}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="table-responsive">
          <Table striped bordered hover className="align-middle text-center">
            <thead className="table-dark">
              <tr>
                <th>Clasificación *</th>
                <th>Trabajo o máquina *</th>
                <th>Precio (sin IVA)*</th>
                <th>Unidad *</th>
                <th>Observaciones</th>
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {precios.map((item, index) => {
                const invalida = !filaValida(item);
                const esFilaFijaGasoil =
                  index === 0 && item.clasificacion === "Gasoil";
                const esFilaExistente = editando && index < filasOriginales;

                if (item.clasificacion === "Precio cerrado") {
                  const esNumerico = item.precio !== "" && !isNaN(Number(item.precio));
                  return (
                    <tr key={index}>
                      <td colSpan={7} style={{ border: "none", padding: "0.25rem 0.75rem" }}>
                        <div style={{ border: "1px solid #ffc107", borderRadius: "0.5rem", display: "flex", alignItems: "center", gap: "1rem", padding: "0.4rem 0.75rem", backgroundColor: "#2c2c2c" }}>
                          <span className="text-muted fst-italic small">Precio cerrado</span>
                          <span className="fw-semibold">Precio de la obra</span>
                          <div className="input-group" style={{ width: "180px", borderRadius: "0.375rem", overflow: "hidden" }}>
                            {esNumerico && <span className="input-group-text">$</span>}
                            <Form.Control
                              type="text"
                              value={focusadoPrecio === index ? item.precio : formatearMoneda(item.precio)}
                              placeholder="Sin definir"
                              className="text-center"
                              onFocus={() => setFocusadoPrecio(index)}
                              onBlur={() => setFocusadoPrecio(null)}
                              onChange={(e) => cambiarCampo(index, "precio", normalizarPrecio(e.target.value))}
                            />
                          </div>
                          <div className="d-flex align-items-center gap-2 ms-auto">
                            <span className="text-muted small text-nowrap">Observaciones</span>
                            <Form.Control
                              type="text"
                              value={item.observaciones === "No definido por el momento" ? "" : (item.observaciones || "")}
                              style={{ width: "350px" }}
                              onChange={(e) => cambiarCampo(index, "observaciones", e.target.value)}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={index}>
                    {/* CLASIFICACION */}
                    <td>
                      <Form.Select
                        value={item.clasificacion}
                        isInvalid={!item.clasificacion}
                        disabled={esFilaFijaGasoil || esFilaExistente}
                        onChange={(e) =>
                          cambiarCampo(index, "clasificacion", e.target.value)
                        }
                      >
                        <option value="">Seleccionar</option>
                        <option value="Alquiler c/gasoil">Alquiler c/gasoil</option>
                        <option value="Alquiler s/gasoil">Alquiler s/gasoil</option>
                        <option value="Servicio">Servicio</option>
                        <option value="Gasoil">Gasoil</option>
                      </Form.Select>
                    </td>

                    {/* TRABAJO O MÁQUINA */}
                    <td>
                      {esAlquiler(item.clasificacion) ? (
                        <Form.Select
                          value={item.trabajo}
                          isInvalid={invalida && !item.trabajo}
                          disabled={esFilaExistente}
                          onChange={(e) =>
                            cambiarCampo(index, "trabajo", e.target.value)
                          }
                        >
                          <option value="">Seleccione máquina</option>
                          {MAQUINAS_ALQUILER.map((nombre) => (
                            <option key={nombre} value={nombre}>
                              {nombre}
                            </option>
                          ))}
                        </Form.Select>
                      ) : (
                        <Form.Control
                          type="text"
                          value={item.trabajo}
                          className="text-center"
                          disabled={item.clasificacion === "Gasoil" || esFilaExistente}
                          onChange={(e) =>
                            cambiarCampo(index, "trabajo", e.target.value)
                          }
                        />
                      )}
                    </td>

                    {/* PRECIO */}
                    <td>
                      <div className="input-group has-validation">
                        <span className="input-group-text">$</span>
                        <Form.Control
                          type="text"
                          value={focusadoPrecio === index ? item.precio : formatearMoneda(item.precio)}
                          placeholder="0"
                          disabled={esFilaExistente}
                          isInvalid={invalida && item.precio === ""}
                          onFocus={() => setFocusadoPrecio(index)}
                          onBlur={() => setFocusadoPrecio(null)}
                          onChange={(e) => cambiarCampo(index, "precio", normalizarPrecio(e.target.value))}
                        />
                        <Form.Control.Feedback type="invalid">
                          Ingrese precio
                        </Form.Control.Feedback>
                      </div>
                    </td>

                    {/* UNIDAD */}
                    <td>
                      {esAlquiler(item.clasificacion) ? (
                        <Form.Select
                          value={item.unidad}
                          isInvalid={item.precio !== "" && !item.unidad}
                          disabled={esFilaExistente}
                          onChange={(e) =>
                            cambiarCampo(index, "unidad", e.target.value)
                          }
                        >
                          <option value="">Seleccione</option>
                          <option value="Horas">Horas</option>
                          <option value="Días">Días</option>
                          <option value="m3">m3</option>
                          <option value="Un">Un</option>
                          <option value="Viaje">Viaje</option>
                        </Form.Select>
                      ) : (
                        <Form.Control
                          type="text"
                          value={item.unidad}
                          className="text-center"
                          disabled={item.clasificacion === "Gasoil" || esFilaExistente}
                          isInvalid={item.precio !== "" && !item.unidad}
                          onChange={(e) =>
                            cambiarCampo(index, "unidad", e.target.value)
                          }
                        />
                      )}
                      <Form.Control.Feedback type="invalid">
                        Ingrese unidad
                      </Form.Control.Feedback>
                    </td>

                    {/* OBSERVACIONES */}
                    <td>
                      <Form.Control
                        value={item.observaciones}
                        disabled={esFilaExistente}
                        onChange={(e) =>
                          cambiarCampo(index, "observaciones", e.target.value)
                        }
                      />
                    </td>

                    {/* FECHA */}
                    <td>
                      <Form.Control
                        type="date"
                        value={item.fecha ? item.fecha.substring(0, 10) : ""}
                        isInvalid={!item.fecha}
                        disabled={esFilaExistente}
                        onChange={(e) =>
                          cambiarCampo(index, "fecha", e.target.value)
                        }
                      />
                    </td>

                    {/* ELIMINAR */}
                    <td>
                      {!esFilaFijaGasoil && (
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => eliminarFila(index)}
                        >
                          ✕
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>

        <div className="text-center mt-2">
          <Button variant="outline-primary" onClick={agregarFila}>
            + Agregar fila
          </Button>
        </div>
      </Modal.Body>

      <Modal.Footer className="justify-content-between">
        <Button variant="outline-secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          variant="outline-success"
          onClick={onSave}
          disabled={!listaValida}
        >
          Guardar precios
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PreciosModal;
