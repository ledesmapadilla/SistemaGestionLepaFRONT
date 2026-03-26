import React from "react";
import { Modal, Button, Form, Row, Col } from "react-bootstrap";

const MaquinaModal = ({
  show,
  onHide,
  onSubmit,
  handleSubmit,
  register,
  errors,
  editando,
  maquinas,
  maquinaId,
}) => {
  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton className="bg-dark text-white">
        <Modal.Title>
          {editando ? "Editar Máquina" : "Nueva Máquina"}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Body>
          <Row>
            {/* Primera Fila: Denominación */}
            <Col md={12}>
              <Form.Group className="mb-3 w-50 mx-auto">
                <Form.Label className="d-block text-center fw-bold ">Denominación / Nombre del Equipo*</Form.Label>
                <Form.Control
                  className="text-center"
                  {...register("maquina", {
                    required: "El nombre es obligatorio",
                    validate: (value) =>
                      !maquinas.some(
                        (m) =>
                          m.maquina.toLowerCase().trim() ===
                            value.toLowerCase().trim() && m._id !== maquinaId
                      ) || "Este nombre de máquina ya existe",
                  })}
                  
                />
                <Form.Text className="text-danger d-block text-center">
                  {errors.maquina?.message}
                </Form.Text>
              </Form.Group>
            </Col>

            {/* Segunda Fila: Marca y Modelo */}
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="d-block text-center fw-bold">Marca</Form.Label>
                <Form.Control className="text-center" {...register("marca")} />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="d-block text-center fw-bold">Modelo</Form.Label>
                <Form.Control className="text-center" {...register("modelo")} />
              </Form.Group>
            </Col>

            {/* Tercera Fila: Año y Patente */}
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="d-block text-center fw-bold">Año</Form.Label>
                <Form.Control
                  className="text-center"
                  type="number"
                  {...register("anio", {
                    min: { value: 1900, message: "Año no válido" },
                    max: { value: 2100, message: "Año no válido" },
                  })}
                  
                />
                <Form.Text className="text-danger d-block text-center">
                  {errors.anio?.message}
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="d-block text-center fw-bold">Patente / Dominio</Form.Label>
                <Form.Control className="text-center" {...register("patente")}  />
              </Form.Group>
            </Col>

            {/* Cuarta Fila: Chasis y Motor */}
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="d-block text-center fw-bold">N° Chasis / Serie</Form.Label>
                <Form.Control className="text-center" {...register("chasis")}  />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="d-block text-center fw-bold">N° Motor</Form.Label>
                <Form.Control className="text-center" {...register("motor")}  />
              </Form.Group>
            </Col>

            {/* Quinta Fila: Costo */}
            <Col md={6} className="mx-auto"> {/* mx-auto para centrar la columna si está sola */}
              <Form.Group className="mb-3">
                <Form.Label className="d-block text-center fw-bold">Valor ($)</Form.Label>
                <Form.Control
                  className="text-center"
                  type="number"
                  step="0.01"
                  {...register("costo", {
                    min: { value: 0, message: "El costo no puede ser negativo" },
                  })}
                />
                <Form.Text className="text-danger d-block text-center">
                  {errors.costo?.message}
                </Form.Text>
              </Form.Group>
            </Col>

            {/* Sexta Fila: Descripción */}
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label className="d-block text-center fw-bold">Descripción adicional / Observaciones</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  className="text-center"
                  {...register("descripcion")}
                  
                />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={onHide}>
            Cancelar
          </Button>
          <Button variant="outline-success" type="submit">
            {editando ? "Actualizar Cambios" : "Guardar Máquina"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default MaquinaModal;