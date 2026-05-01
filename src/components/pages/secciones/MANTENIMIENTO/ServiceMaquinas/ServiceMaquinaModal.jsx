import { Modal, Button, Form, Row, Col } from "react-bootstrap";

const ESTADOS = ["Operativo", "En servicio programado", "Requiere atención", "Fuera de servicio"];

const ServiceMaquinaModal = ({
  show,
  onHide,
  onSubmit,
  handleSubmit,
  register,
  errors,
  editando,
  maquinas,
}) => {
  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{editando ? "Editar Service" : "Nuevo Service"}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Body>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="d-block text-center fw-bold">Máquina *</Form.Label>
                <Form.Select
                  className="text-center"
                  {...register("maquina", { required: "Seleccioná una máquina" })}
                >
                  <option value="">-- Seleccionar --</option>
                  {maquinas.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.maquina}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-danger d-block text-center">
                  {errors.maquina?.message}
                </Form.Text>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="d-block text-center fw-bold">Fecha</Form.Label>
                <Form.Control
                  type="date"
                  className="text-center"
                  {...register("fecha")}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="d-block text-center fw-bold">Horómetro (hs)</Form.Label>
                <Form.Control
                  type="number"
                  className="text-center"
                  min={0}
                  {...register("horometro", {
                    min: { value: 0, message: "El horómetro no puede ser negativo" },
                  })}
                />
                <Form.Text className="text-danger d-block text-center">
                  {errors.horometro?.message}
                </Form.Text>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="d-block text-center fw-bold">Estado</Form.Label>
                <Form.Select className="text-center" {...register("estado")}>
                  <option value="">-- Seleccionar --</option>
                  {ESTADOS.map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label className="d-block text-center fw-bold">Observaciones</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  className="text-center"
                  {...register("observaciones")}
                />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={onHide}>Cancelar</Button>
          <Button variant="outline-success" type="submit">
            {editando ? "Actualizar Cambios" : "Guardar Service"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default ServiceMaquinaModal;
