import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Table, Spinner } from "react-bootstrap";

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

const formatoMonedaInput = (valor) => {
  if (valor === undefined || valor === null || valor === "") return "";
  const numero = Number(valor);
  if (isNaN(numero)) return valor;
  return `$ ${new Intl.NumberFormat("es-AR").format(numero)}`;
};

const PersonalModal = ({
  show,
  onHide,
  onSubmit,
  handleSubmit,
  register,
  watch,
  setValue,
  errors,
  editando,
  personal,
  personalId,
  titulo,
  validarUnico = true,
  submitting = false,
}) => {
  const [historial, setHistorial] = useState([]);
  const [activo, setActivo] = useState(true);
  const [editandoSemanal, setEditandoSemanal] = useState(false);
  const semanalValor = watch ? watch("semanal") : "";

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
      setActivo(persona?.activo !== false);
    } else {
      setHistorial([]);
      setActivo(true);
    }
  }, [show, editando, personalId, personal]);

  const agregarFila = () => {
    const today = new Date();
    const hoy = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    setHistorial([...historial, { valor: "", fecha: hoy, cantJornales: "", disabled: false }]);
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
        cantJornales: Number(rest.cantJornales) || 0,
      }));
      onSubmit({ nombre: data.nombre, semanal: semanalArray, activo });
    } else {
      onSubmit(data);
    }
  };

  const ultimoValor = historial.length
    ? Number(historial[historial.length - 1].valor || 0)
    : 0;

  const ultimoCantJornales = historial.length ? Number(historial[historial.length - 1].cantJornales || 0) : 0;
  const jornal = ultimoCantJornales > 0 ? ultimoValor / ultimoCantJornales : 0;

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton className="bg-dark text-white">
        <Modal.Title>
          {titulo ?? (editando ? "Editar Personal" : "Crear Personal")}
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
                  !validarUnico ||
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
                    <td>{jornal > 0 ? formatoMiles(jornal) : "-"}</td>
                  </tr>
                  <tr>
                    <td className="fw-bold">Estado</td>
                    <td>
                      <Form.Check
                        type="switch"
                        id="switch-activo"
                        label={activo ? "Activo" : "Desactivado"}
                        checked={activo}
                        onChange={(e) => setActivo(e.target.checked)}
                      />
                    </td>
                  </tr>
                </tbody>
              </Table>

              <h6 className="text-center fw-bold">Historial Semanal</h6>
              <Table bordered size="sm" className="text-center align-middle">
                <thead className="table-dark">
                  <tr>
                    <th>Valor</th>
                    <th>Cant. Jornales</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="py-2 text-muted">Sin historial</td>
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
                            fila.cantJornales || "-"
                          ) : (
                            <Form.Control
                              type="number"
                              step="0.5"
                              min="0"
                              className="text-center"
                              value={fila.cantJornales}
                              onChange={(e) => actualizarFila(index, "cantJornales", e.target.value)}
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
            <>
              <Form.Group className="mb-3">
                <Form.Label className="d-block text-center fw-bold">Semanal*</Form.Label>
                <Form.Control
                  className="text-center"
                  type="text"
                  inputMode="decimal"
                  placeholder="$ 0"
                  value={editandoSemanal ? (semanalValor ?? "") : formatoMonedaInput(semanalValor)}
                  onFocus={(e) => { setEditandoSemanal(true); const el = e.target; setTimeout(() => el.select(), 0); }}
                  onChange={(e) =>
                    setValue("semanal", e.target.value.replace(/[^\d.]/g, ""), {
                      shouldValidate: true,
                    })
                  }
                  onBlur={() => setEditandoSemanal(false)}
                  isInvalid={!!errors.semanal}
                />
                <input
                  type="hidden"
                  {...register("semanal", {
                    required: "El semanal es obligatorio",
                    validate: (v) =>
                      Number(v) > 0 || "El semanal es obligatorio",
                  })}
                />
                <Form.Text className="text-danger d-block text-center">
                  {errors.semanal?.message}
                </Form.Text>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="d-block text-center fw-bold">Cant. de jornales semanales*</Form.Label>
                <Form.Control
                  className="text-center w-50 mx-auto"
                  type="number"
                  step="0.5"
                  min="0"
                  isInvalid={!!errors.cantJornales}
                  {...register("cantJornales", {
                    required: "La cantidad de jornales es obligatoria",
                    min: { value: 0, message: "No puede ser negativo" },
                    validate: (v) =>
                      Number(v) > 0 || "La cantidad de jornales es obligatoria",
                  })}
                />
                <Form.Text className="text-danger d-block text-center">
                  {errors.cantJornales?.message}
                </Form.Text>
              </Form.Group>
            </>
          )}
        </Modal.Body>

        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={onHide} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="outline-success" type="submit" disabled={submitting}>
            {submitting ? <><Spinner size="sm" animation="border" className="me-1" />Guardando...</> : "Guardar"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default PersonalModal;
