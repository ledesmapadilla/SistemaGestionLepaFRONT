import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";

const CotizarModal = ({ show, onHide, precioPorKm, titulo }) => {
  const [kmsIda, setKmsIda] = useState("");

  const costoViaje = (Number(kmsIda) || 0) * precioPorKm;

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{titulo}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="d-flex align-items-center gap-2 mb-3">
          <Form.Label className="mb-0 fw-bold">Kms (ida)</Form.Label>
          <Form.Control
            type="number"
            step="any"
            min="0"
            className="text-center"
            style={{ width: "100px" }}
            placeholder="0"
            value={kmsIda}
            onChange={(e) => setKmsIda(e.target.value)}
          />
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="fw-bold">Costo viaje:</span>
          <span className="fs-5 text-warning fw-bold">
            {costoViaje
              ? Number(costoViaje).toLocaleString("es-AR", {
                  style: "currency",
                  currency: "ARS",
                })
              : "-"}
          </span>
        </div>
      </Modal.Body>

      <Modal.Footer className="justify-content-center">
        <Button variant="outline-secondary" onClick={onHide}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CotizarModal;
