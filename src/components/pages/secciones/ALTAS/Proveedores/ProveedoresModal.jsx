import React from "react";
import { Modal, Form, Button } from "react-bootstrap";

const ProveedoresModal = ({
  show,
  cerrarModal,
  handleSubmit,
  onSubmit,
  editando,
  proveedorId,
  proveedores,
  contactoOriginal,
  register,
  errors,
  resetValores,
}) => {
  return (
    <Modal show={show} onHide={cerrarModal} centered>
      <Modal.Header closeButton>
        <Modal.Title>{editando ? "Editar Proveedor" : "Crear Proveedor"}</Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Razón Social*</Form.Label>
            <Form.Control
              {...register("razonsocial", {
                required: "La razón social es obligatoria",
                validate: (value) =>
                  !proveedores.some(
                    (c) =>
                      c.razonsocial.toLowerCase().trim() ===
                        value.toLowerCase().trim() && c._id !== proveedorId
                  ) || "La razón social ya existe",
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
            <Form.Label>Rubro*</Form.Label>
            <Form.Control
              {...register("rubro", {
                required: "El rubro es obligatorio",
              })}
            />
            <Form.Text className="text-danger">
              {errors.rubro?.message}
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
            <Form.Text className="text-danger">{errors.cuit?.message}</Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control type="email" {...register("email")} />
          </Form.Group>

          <Form.Group>
            <Form.Label>Teléfono</Form.Label>
            <Form.Control {...register("telefono")} />
            <Form.Text className="text-danger">{errors.telefono?.message}</Form.Text>
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

export default ProveedoresModal;
