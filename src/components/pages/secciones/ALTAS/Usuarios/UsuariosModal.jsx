import React from "react";
import { Modal, Button, Form } from "react-bootstrap";

const UsuariosModal = ({
  show,
  onHide,
  onSubmit,
  handleSubmit,
  register,
  errors,
  editando,
  usuarios,
  usuarioId,
}) => {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton className="bg-dark text-white">
        <Modal.Title>
          {editando ? "Editar Usuario" : "Crear Usuario"}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label className="d-block text-center fw-bold">
              Nombre*
            </Form.Label>
            <Form.Control
              className="text-center"
              {...register("nombre", {
                required: "El nombre es obligatorio",
              })}
            />
            <Form.Text className="text-danger d-block text-center">
              {errors.nombre?.message}
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="d-block text-center fw-bold">
              Usuario*
            </Form.Label>
            <Form.Control
              className="text-center"
              {...register("usuario", {
                required: "El usuario es obligatorio",
                validate: (value) =>
                  !usuarios.some(
                    (u) =>
                      u.usuario.toLowerCase().trim() ===
                        value.toLowerCase().trim() && u._id !== usuarioId
                  ) || "El nombre de usuario ya existe",
              })}
            />
            <Form.Text className="text-danger d-block text-center">
              {errors.usuario?.message}
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="d-block text-center fw-bold">
              {editando ? "Contraseña (dejar vacío para no cambiar)" : "Contraseña*"}
            </Form.Label>
            <Form.Control
              className="text-center"
              type="password"
              {...register("contrasena", {
                required: editando ? false : "La contraseña es obligatoria",
                minLength: {
                  value: 6,
                  message: "La contraseña debe tener al menos 6 caracteres",
                },
                validate: (value) => {
                  if (editando && value === "") return true;
                  if (value && value.length < 6)
                    return "La contraseña debe tener al menos 6 caracteres";
                  return true;
                },
              })}
            />
            <Form.Text className="text-danger d-block text-center">
              {errors.contrasena?.message}
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="d-block text-center fw-bold">
              Rol*
            </Form.Label>
            <Form.Select
              className="text-center"
              {...register("rol", {
                required: "El rol es obligatorio",
              })}
            >
              <option value="">Seleccionar rol</option>
              <option value="superadministrador">Superadministrador</option>
              <option value="administrador">Administrador</option>
              <option value="operador">Operador</option>
            </Form.Select>
            <Form.Text className="text-danger d-block text-center">
              {errors.rol?.message}
            </Form.Text>
          </Form.Group>
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

export default UsuariosModal;
