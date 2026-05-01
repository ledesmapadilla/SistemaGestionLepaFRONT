import { Modal, Button, Form } from "react-bootstrap";

const HorasModal = ({
  show,
  onHide,
  onSubmit,
  handleSubmit,
  register,
  errors,
  maquinaNombre,
  horometroActual,
  horometroMin,
}) => {
  const hoy = new Date().toLocaleDateString("es-AR");

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Actualizar Horómetro</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Body>
          <p className="mb-1">Máquina: {maquinaNombre}</p>
          <p className="mb-1">Fecha: {hoy}</p>
          <p className="mb-3">Horómetro actual: {horometroActual != null ? Number(horometroActual).toLocaleString("es-AR") : "-"} hs</p>

          <Form.Group className="w-50 mx-auto">
            <Form.Label className="d-block text-center">Nuevo horómetro (hs)</Form.Label>
            <Form.Control
              type="number"
              className="text-center"
              min={horometroMin ?? 0}
              {...register("horometro", {
                required: "El horómetro es obligatorio",
                validate: (v) =>
                  horometroMin == null || Number(v) >= horometroMin ||
                  `No puede ser menor a ${Number(horometroMin).toLocaleString("es-AR")}`,
              })}
            />
            <Form.Text className="text-danger d-block">
              {errors.horometro?.message}
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={onHide}>Cancelar</Button>
          <Button variant="outline-success" type="submit">Guardar</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default HorasModal;
