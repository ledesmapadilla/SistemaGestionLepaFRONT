import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";

const CrearListaModal = ({ show, onHide, onCrear, nombresExistentes }) => {
  const mesAnioSugerido = new Date()
    .toLocaleDateString("es-AR", { month: "long", year: "numeric" })
    .replace(" de ", "-");

  const [nombre, setNombre] = useState(mesAnioSugerido);
  const [error, setError] = useState("");

  useEffect(() => {
    if (show) {
      setNombre(mesAnioSugerido);
      setError("");
    }
  }, [show]);

  const handleCrear = () => {
    const val = nombre.trim();
    if (!val) {
      setError("Ingrese un nombre para la lista");
      return;
    }
    const existe = nombresExistentes.some(
      (n) => n.toLowerCase() === val.toLowerCase()
    );
    if (existe) {
      setError("Ya existe una lista con ese nombre");
      return;
    }
    onCrear(val);
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton className="justify-content-center">
        <Modal.Title className="w-100 text-center">Crear lista de precios</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form.Label className="fw-bold">Nombre de la lista</Form.Label>
        <Form.Control
          type="text"
          value={nombre}
          onChange={(e) => {
            setNombre(e.target.value);
            setError("");
          }}
          isInvalid={!!error}
        />
        <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
      </Modal.Body>

      <Modal.Footer className="justify-content-center">
        <Button variant="outline-secondary" onClick={onHide}>
          Cancelar
        </Button>
        <Button variant="outline-success" onClick={handleCrear}>
          Crear
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CrearListaModal;
