import React, { useEffect } from "react";
import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import { useForm } from "react-hook-form";

const AceiteModal = ({ show, onHide, onSubmit, editando, aceite }) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    if (show) {
      if (editando && aceite) {
        reset({
          tipo: aceite.tipo || "",
          marca: aceite.marca || "",
          denominacion: aceite.denominacion || "",
          uso: aceite.uso || ""
        });
      } else {
        reset({ tipo: "", marca: "", denominacion: "", uso: "" });
      }
    }
  }, [show, editando, aceite, reset]);

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton className="bg-dark text-white">
        <Modal.Title>
          {editando ? "Editar Aceite" : "Nuevo Aceite"}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Tipo de Aceite *</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ej: Motor, Hidráulico, Grasa"
              {...register("tipo", { required: "Ingrese el tipo de aceite" })}
            />
            <Form.Text className="text-danger">{errors.tipo?.message}</Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Marca *</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ej: Shell, YPF, Total"
              {...register("marca", { required: "Ingrese la marca" })}
            />
            <Form.Text className="text-danger">{errors.marca?.message}</Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Denominación Comercial</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ej: Rimula R4 15W40"
              {...register("denominacion")}
            />
            <Form.Text className="text-danger">{errors.denominacion?.message}</Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Uso *</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ej: Motor de maquinaria pesada"
              {...register("uso", { required: "Ingrese el uso" })}
            />
            <Form.Text className="text-danger">{errors.uso?.message}</Form.Text>
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onHide}>Cancelar</Button>
          <Button variant="outline-success" type="submit">
            {editando ? "Actualizar" : "Guardar"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default AceiteModal;
