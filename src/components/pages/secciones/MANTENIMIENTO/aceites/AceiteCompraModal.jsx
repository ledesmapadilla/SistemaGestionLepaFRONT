import React, { useEffect, useState } from "react";
import { Modal, Button, Form, InputGroup, Row, Col } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { listarProveedores } from "../../../../../helpers/queriesProveedores";
import { listarAceites } from "../../../../../helpers/queriesAceites";

const AceiteCompraModal = ({ show, onHide, onSubmit, editando = false, compra = null }) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [proveedores, setProveedores] = useState([]);
  const [aceites, setAceites] = useState([]);

  const cargarDatos = async () => {
    try {
      const [respProv, respAceites] = await Promise.all([
        listarProveedores(),
        listarAceites()
      ]);
      if (respProv?.ok) setProveedores(await respProv.json());
      if (respAceites?.ok) setAceites(await respAceites.json());
    } catch (error) {
      console.error("Error cargando datos:", error);
    }
  };

  useEffect(() => {
    if (show) {
      cargarDatos().then(() => {
        if (editando && compra) {
          reset({
            fecha: compra.fecha ? new Date(compra.fecha).toISOString().split("T")[0] : "",
            proveedor: compra.proveedor || "",
            tipoAceite: compra.tipoAceite || "",
            marca: compra.marca || "",
            cantidad: compra.litros || "",
            precio: compra.precio || "",
            observaciones: compra.observaciones || ""
          });
        } else {
          reset({
            fecha: new Date().toISOString().split("T")[0],
            proveedor: "",
            tipoAceite: "",
            marca: "",
            cantidad: "",
            precio: "",
            observaciones: ""
          });
        }
      });
    }
  }, [show]);

  // Obtener tipos únicos de los aceites dados de alta
  const tiposUnicos = [...new Set(aceites.map((a) => a.tipo))];

  const sinScroll = (e) => e.target.blur();

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton className="text-white ">
        <Modal.Title className="w-100 text-center">{editando ? "Editar Compra" : "Compra de Aceite"}</Modal.Title>
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
                <Form.Label className="fw-bold">Proveedor *</Form.Label>
                <Form.Select {...register("proveedor", { required: "Seleccione un proveedor" })}>
                  <option value="">-- Seleccionar --</option>
                  {proveedores.map((p) => (
                    <option key={p._id} value={p.razonsocial}>{p.razonsocial}</option>
                  ))}
                </Form.Select>
                <Form.Text className="text-danger">{errors.proveedor?.message}</Form.Text>
              </Form.Group>
            </Col>
          </Row>
          <Row>
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
            <Col md={6}>
              <Form.Group className="mb-2">
                <Form.Label className="fw-bold">Marca *</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ej: Shell, YPF, Total"
                  {...register("marca", { required: "Ingrese la marca" })}
                />
                <Form.Text className="text-danger">{errors.marca?.message}</Form.Text>
              </Form.Group>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-2">
                <Form.Label className="fw-bold">Cantidad *</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="number"
                    step="0.1"
                    placeholder="Ej: 200"
                    onWheel={sinScroll}
                    {...register("cantidad", { required: "Ingrese la cantidad", min: { value: 0.1, message: "Mínimo 0.1" } })}
                  />
                  <InputGroup.Text>Lts</InputGroup.Text>
                </InputGroup>
                <Form.Text className="text-danger">{errors.cantidad?.message}</Form.Text>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-2">
                <Form.Label className="fw-bold">Precio *</Form.Label>
                <InputGroup>
                  <InputGroup.Text>$</InputGroup.Text>
                  <Form.Control
                    type="number"
                    step="0.01"
                    placeholder="Precio pagado total"
                    onWheel={sinScroll}
                    {...register("precio", { required: "Ingrese el precio", min: { value: 0.01, message: "El precio debe ser mayor a 0" } })}
                  />
                </InputGroup>
                <Form.Text className="text-danger">{errors.precio?.message}</Form.Text>
              </Form.Group>
            </Col>
          </Row>
          <Form.Group className="mb-2">
            <Form.Label className="fw-bold">Observaciones</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              placeholder="Notas adicionales..."
              {...register("observaciones")}
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onHide}>Cancelar</Button>
          <Button variant="outline-success" type="submit">{editando ? "Guardar Cambios" : "Registrar Compra"}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default AceiteCompraModal;
