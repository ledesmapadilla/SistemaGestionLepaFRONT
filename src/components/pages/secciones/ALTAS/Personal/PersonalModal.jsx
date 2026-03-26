import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Table } from "react-bootstrap";

const formatoMiles = (valor) => {
  if (
    valor === undefined ||
    valor === null ||
    valor === "" ||
    Number(valor) === 0
  ) {
    return "-";
  }
  const numeroFormateado = new Intl.NumberFormat("es-AR").format(valor);
  return `$ ${numeroFormateado}`;
};

const PersonalModal = ({
  show,
  onHide,
  onSubmit,
  handleSubmit,
  register,
  errors,
  editando,
  personal,
  personalId
}) => {
  const [historial, setHistorial] = useState([]);

  useEffect(() => {
    if (show && editando) {
      const persona = personal.find((p) => p._id === personalId);
      const raw = persona?.semanal;
      let arr = [];
      if (Array.isArray(raw)) {
        arr = raw;
      } else if (typeof raw === "number" && raw > 0) {
        arr = [{ valor: raw, fecha: "-" }];
      }
      setHistorial(arr.map((item) => ({ ...item, disabled: true })));
    } else {
      setHistorial([]);
    }
  }, [show, editando, personalId, personal]);

  const agregarFila = () => {
    const today = new Date();
    const hoy = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    setHistorial([...historial, { valor: "", fecha: hoy, disabled: false }]);
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
      if (faltaValor || faltaFecha) {
        return;
      }
      const semanalArray = historial.map(({ disabled, ...rest }) => ({
        valor: Number(rest.valor),
        fecha: rest.fecha,
      }));
      onSubmit({ nombre: data.nombre, semanal: semanalArray });
    } else {
      onSubmit(data);
    }
  };

  const ultimoValor = historial.length
    ? Number(historial[historial.length - 1].valor || 0)
    : 0;

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton className="bg-dark text-white">
        <Modal.Title>
          {editando ? "Editar Personal" : "Crear Personal"}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit(handleGuardar)}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label className="d-block text-center fw-bold">Nombre*</Form.Label>
            <Form.Control
              className="text-center"
              {...register("nombre", {
                required: "El nombre es obligatorio",
                validate: (value) =>
                  !personal.some(
                    (p) =>
                      p.nombre.toLowerCase().trim() ===
                        value.toLowerCase().trim() && p._id !== personalId
                  ) || "El nombre ya existe",
              })}
            />
            <Form.Text className="text-danger d-block text-center">
              {errors.nombre?.message}
            </Form.Text>
          </Form.Group>

          {editando ? (
            <>
              <Table bordered size="sm" className="align-middle mb-3">
                <tbody>
                  <tr>
                    <td className="fw-bold">Semanal</td>
                    <td>{formatoMiles(ultimoValor)}</td>
                  </tr>
                  <tr>
                    <td className="fw-bold">Hora</td>
                    <td>{formatoMiles(ultimoValor / 44)}</td>
                  </tr>
                  <tr>
                    <td className="fw-bold">Jornal</td>
                    <td>{formatoMiles(ultimoValor / 5.5)}</td>
                  </tr>
                </tbody>
              </Table>

              <h6 className="text-center fw-bold">Historial Semanal</h6>
              <Table bordered size="sm" className="text-center align-middle">
                <thead className="table-dark">
                  <tr>
                    <th>Valor</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.length === 0 ? (
                    <tr>
                      <td colSpan="2" className="py-2 text-muted">Sin historial</td>
                    </tr>
                  ) : (
                    historial.map((fila, index) => (
                      <tr key={index}>
                        <td>
                          {fila.disabled ? (
                            formatoMiles(fila.valor)
                          ) : (
                            <Form.Control
                              type="number"
                              step="0.01"
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
                            (() => {
                              if (!fila.fecha || fila.fecha === "-") return "-";
                              const p = fila.fecha.split("-");
                              return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : fila.fecha;
                            })()
                          ) : (
                            <div className="d-flex gap-1 align-items-center">
                              <Form.Control
                                type="date"
                                className="text-center"
                                required
                                value={fila.fecha || ""}
                                max={new Date().toISOString().slice(0, 10)}
                                onChange={(e) => actualizarFila(index, "fecha", e.target.value)}
                              />
                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() => eliminarFilaNueva(index)}
                              >
                                X
                              </Button>
                            </div>
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
            <Form.Group className="mb-3">
              <Form.Label className="d-block text-center fw-bold">Semanal</Form.Label>
              <Form.Control
                className="text-center"
                type="number"
                step="0.01"
                min="0"
                {...register("semanal", {
                  min: {
                    value: 0,
                    message: "Las horas semanales no pueden ser negativas",
                  },
                })}
              />
              <Form.Text className="text-danger d-block text-center">
                {errors.semanal?.message}
              </Form.Text>
            </Form.Group>
          )}
        </Modal.Body>

        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={onHide}>
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

export default PersonalModal;
