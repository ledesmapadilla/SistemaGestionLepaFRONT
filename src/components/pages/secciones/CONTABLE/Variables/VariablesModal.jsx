import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Table } from "react-bootstrap";

const formatoMoneda = (valor) => {
  if (valor === undefined || valor === null || valor === "" || Number(valor) === 0) return "-";
  return Number(valor).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
};

const formatearFecha = (fecha) => {
  if (!fecha || fecha === "-") return "-";
  const partes = fecha.split("-");
  if (partes.length === 3) return `${partes[2]}-${partes[1]}-${partes[0]}`;
  return fecha;
};

const VariablesModal = ({
  show,
  onHide,
  editando,
  onSubmit,
  register,
  handleSubmit,
  errors,
  cerrarModal,
  variables,
  variableId,
}) => {
  const [historial, setHistorial] = useState([]);

  useEffect(() => {
    if (show && editando) {
      const variable = variables.find((v) => v._id === variableId);
      const raw = variable?.historial;
      let arr = Array.isArray(raw) ? raw : [];
      const ordenado = [...arr].sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));
      setHistorial(ordenado.map((item) => ({ ...item, disabled: true })));
    } else {
      setHistorial([]);
    }
  }, [show, editando, variableId, variables]);

  const agregarFila = () => {
    const today = new Date();
    const hoy = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    setHistorial([...historial, { valor: "", fecha: hoy, observaciones: "", disabled: false }]);
  };

  const actualizarFila = (index, campo, value) => {
    const nuevo = [...historial];
    nuevo[index] = { ...nuevo[index], [campo]: value };
    setHistorial(nuevo);
  };

  const eliminarFilaNueva = (index) => {
    setHistorial(historial.filter((_, i) => i !== index));
  };

  const handleGuardar = (data) => {
    if (editando) {
      const filasNuevas = historial.filter((f) => !f.disabled);
      const faltaValor = filasNuevas.some((f) => !f.valor && f.valor !== 0);
      const faltaFecha = filasNuevas.some((f) => !f.fecha);
      if (faltaValor || faltaFecha) return;

      const historialArray = historial.map(({ disabled, _id, ...rest }) => ({
        valor: Number(rest.valor),
        fecha: rest.fecha,
        observaciones: rest.observaciones || "",
      }));
      onSubmit({ variable: data.variable, historial: historialArray });
    } else {
      onSubmit(data);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {editando ? "Editar Variable" : "Crear Variable"}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit(handleGuardar)}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Variable*</Form.Label>
            <Form.Control
              {...register("variable", {
                required: "La variable es obligatoria",
              })}
            />
            <Form.Text className="text-danger">
              {errors.variable?.message}
            </Form.Text>
          </Form.Group>

          {editando ? (
            <>
              <h6 className="text-center fw-bold">Historial</h6>
              <Table bordered size="sm" className="text-center align-middle">
                <thead className="table-dark">
                  <tr>
                    <th>Fecha</th>
                    <th>Valor</th>
                    <th>Observaciones</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {historial.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-muted py-2">Sin historial</td>
                    </tr>
                  ) : (
                    historial.map((fila, index) => (
                      <tr key={index}>
                        <td>
                          {fila.disabled ? (
                            formatearFecha(fila.fecha)
                          ) : (
                            <Form.Control
                              type="date"
                              className="text-center"
                              required
                              max={new Date().toISOString().slice(0, 10)}
                              value={fila.fecha || ""}
                              onChange={(e) => actualizarFila(index, "fecha", e.target.value)}
                            />
                          )}
                        </td>
                        <td>
                          {fila.disabled ? (
                            formatoMoneda(fila.valor)
                          ) : (
                            <Form.Control
                              type="number"
                              step="any"
                              min="0"
                              required
                              className="text-center"
                              value={fila.valor}
                              onChange={(e) => actualizarFila(index, "valor", e.target.value)}
                            />
                          )}
                        </td>
                        <td>
                          {fila.disabled ? (
                            fila.observaciones || "-"
                          ) : (
                            <Form.Control
                              type="text"
                              className="text-center"
                              value={fila.observaciones || ""}
                              onChange={(e) => actualizarFila(index, "observaciones", e.target.value)}
                            />
                          )}
                        </td>
                        <td>
                          {!fila.disabled && (
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => eliminarFilaNueva(index)}
                            >
                              X
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
              <div className="text-center">
                <Button variant="outline-primary" size="sm" onClick={agregarFila}>
                  + Agregar fila
                </Button>
              </div>
            </>
          ) : (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Fecha*</Form.Label>
                <Form.Control
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  {...register("fecha", {
                    required: "La fecha es obligatoria",
                  })}
                />
                <Form.Text className="text-danger">
                  {errors.fecha?.message}
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Valor*</Form.Label>
                <Form.Control
                  type="number"
                  step="any"
                  {...register("valor", {
                    required: "El valor es obligatorio",
                    valueAsNumber: true,
                  })}
                />
                <Form.Text className="text-danger">
                  {errors.valor?.message}
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Observaciones</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  {...register("observaciones")}
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>

        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={cerrarModal}>
            Cancelar
          </Button>
          <Button variant="outline-success" type="submit">
            Guardar
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default VariablesModal;
