import React, { useEffect, useState } from "react";
import { Modal, Button, Form, Row, Col, InputGroup } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { listarAceites } from "../../../../../helpers/queriesAceites";
import { listarMaquinas } from "../../../../../helpers/queriesMaquinas";

const AceiteConsumoModal = ({ show, onHide, onSubmit, editando = false, consumo = null }) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [aceites, setAceites] = useState([]);
  const [maquinas, setMaquinas] = useState([]);

  const cargarDatos = async () => {
    try {
      const [respAceites, respMaquinas] = await Promise.all([
        listarAceites(),
        listarMaquinas()
      ]);
      if (respAceites?.ok) setAceites(await respAceites.json());
      if (respMaquinas?.ok) setMaquinas(await respMaquinas.json());
    } catch (error) {
      console.error("Error cargando datos:", error);
    }
  };

  useEffect(() => {
    if (show) {
      cargarDatos();
      if (editando && consumo) {
        reset({
          fecha: consumo.fecha ? new Date(consumo.fecha).toISOString().split("T")[0] : "",
          tipoAceite: consumo.tipoAceite || "",
          litros: consumo.litros || "",
          maquina: consumo.maquina || "",
          observaciones: consumo.observaciones || ""
        });
      } else {
        const today = new Date();
        const hoy = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
        reset({
          fecha: hoy,
          tipoAceite: "",
          litros: "",
          maquina: "",
          observaciones: ""
        });
      }
    }
  }, [show]);

  const tiposUnicos = [...new Set(aceites.map((a) => a.tipo))];

  const sinScroll = (e) => e.target.blur();

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="w-100 text-center">{editando ? "Editar Consumo" : "Consumo de Aceite"}</Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Body>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-2">
                <Form.Label className="fw-bold">Fecha *</Form.Label>
                <Form.Control
                  type="date"
                  {...register("fecha", { required: "La fecha es obligatoria" })}
                />
                <Form.Text className="text-danger">{errors.fecha?.message}</Form.Text>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-2">
                <Form.Label className="fw-bold">Tipo de Aceite *</Form.Label>
                <Form.Select {...register("tipoAceite", { required: "Seleccione el tipo" })}>
                  <option value="">-- Seleccionar --</option>
                  {tiposUnicos.map((tipo) => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </Form.Select>
                <Form.Text className="text-danger">{errors.tipoAceite?.message}</Form.Text>
              </Form.Group>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-2">
                <Form.Label className="fw-bold">Litros *</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="number"
                    step="0.1"
                    placeholder="Ej: 10"
                    onWheel={sinScroll}
                    {...register("litros", { required: "Ingrese los litros", min: { value: 0.1, message: "Mínimo 0.1" } })}
                  />
                  <InputGroup.Text>Lts</InputGroup.Text>
                </InputGroup>
                <Form.Text className="text-danger">{errors.litros?.message}</Form.Text>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-2">
                <Form.Label className="fw-bold">Máquina *</Form.Label>
                <Form.Select {...register("maquina", { required: "Seleccione una máquina" })}>
                  <option value="">-- Seleccionar --</option>
                  {maquinas.map((m) => (
                    <option key={m._id} value={m.maquina}>
                      {m.maquina} {m.patente ? `(${m.patente})` : ""}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-danger">{errors.maquina?.message}</Form.Text>
              </Form.Group>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-2">
                <Form.Label className="fw-bold">Observaciones</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="Notas adicionales..."
                  {...register("observaciones")}
                />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onHide}>Cancelar</Button>
          <Button variant="outline-success" type="submit">{editando ? "Guardar Cambios" : "Registrar Consumo"}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default AceiteConsumoModal;
