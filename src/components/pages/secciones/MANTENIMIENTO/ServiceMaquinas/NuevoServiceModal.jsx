import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import AsyncButton from "../../../../shared/AsyncButton";

const NuevoServiceModal = ({
  show,
  onHide,
  onSubmit,
  handleSubmit,
  register,
  errors,
  maquinaNombre,
  ultimoHorometro,
  horometroMin,
  esEIQoETX,
  isSubmitting,
}) => {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Service</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Body>
          <p className="mb-1">Máquina: {maquinaNombre}</p>
          <p className="mb-3">Último horómetro: {ultimoHorometro != null ? Number(ultimoHorometro).toLocaleString("es-AR") : "-"} hs</p>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="d-block text-center">Fecha *</Form.Label>
                <Form.Control
                  type="date"
                  className="text-center"
                  {...register("fecha", { required: "La fecha es obligatoria" })}
                />
                <Form.Text className="text-danger d-block text-center">
                  {errors.fecha?.message}
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="d-block text-center">
                  Horómetro service {esEIQoETX ? "" : "*"}
                </Form.Label>
                <Form.Control
                  type="number"
                  className="text-center"
                  min={horometroMin ?? 0}
                  {...register("horometro", {
                    required: esEIQoETX ? false : "El horómetro es obligatorio",
                    validate: (v) =>
                      !v || horometroMin == null || Number(v) >= horometroMin ||
                      `No puede ser menor a ${Number(horometroMin).toLocaleString("es-AR")}`,
                  })}
                />
                <Form.Text className="text-danger d-block text-center">
                  {errors.horometro?.message}
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>
          <Form.Group className="mb-2">
            <Form.Label>Observaciones</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              {...register("observaciones")}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={onHide}>Cancelar</Button>
          <AsyncButton variant="outline-success" type="submit" loading={isSubmitting}>Guardar</AsyncButton>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default NuevoServiceModal;
