import { Modal, Button, Form } from "react-bootstrap";
import "../../../../../styles/clientes.css";

const ClientesModal = ({
  show,
  onHide,
  editando,
  onSubmit,
  register,
  handleSubmit,
  errors,
  cerrarModal,
}) => {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {editando ? "Editar Cliente" : "Crear Cliente"}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Razón Social*</Form.Label>
            <Form.Control
              {...register("razonsocial", {
                required: "La razón social es obligatoria",
              })}
            />
            <Form.Text className="text-danger">
              {errors.razonsocial?.message}
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Contacto*</Form.Label>
            <Form.Control
              {...register("contacto", {
                required: "El contacto es obligatorio",
              })}
            />
            <Form.Text className="text-danger">
              {errors.contacto?.message}
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>CUIT</Form.Label>
            <Form.Control
              type="text"
              {...register("cuit", {
                pattern: {
                  value: /^[0-9]{11}$/,
                  message: "El CUIT debe tener 11 dígitos",
                },
              })}
            />
            <Form.Text className="text-danger">
              {errors.cuit?.message}
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control type="email" {...register("email")} />
          </Form.Group>

          <Form.Group>
            <Form.Label>Teléfono*</Form.Label>
            <Form.Control
              {...register("telefono", {
                required: "El teléfono es obligatorio",
              })}
            />
            <Form.Text className="text-danger">
              {errors.telefono?.message}
            </Form.Text>
          </Form.Group>
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

export default ClientesModal;
