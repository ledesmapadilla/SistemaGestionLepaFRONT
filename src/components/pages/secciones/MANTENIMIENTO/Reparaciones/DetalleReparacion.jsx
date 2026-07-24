import { useState } from "react";
import { Container, Button, Row, Col, Form } from "react-bootstrap";
import Swal from "sweetalert2";
import AsyncButton from "../../../../shared/AsyncButton";

const fmt = (iso) =>
  iso ? new Date(iso + "T12:00:00").toLocaleDateString("es-AR") : "—";

const Item = ({ label, value }) => (
  <Col xs={6} md={4} className="mb-3">
    <div className="text-muted small">{label}</div>
    <div className="fw-semibold">{value || "—"}</div>
  </Col>
);

function DetalleReparacion({ maquina, reparacion, onVolver, onGuardar }) {
  const r = reparacion || {};
  const [texto, setTexto] = useState(r.detalleTexto || "");

  const guardar = async () => {
    const res = await onGuardar(texto);
    if (res?.ok) {
      Swal.fire({
        position: "center",
        icon: "success",
        title: "Detalle guardado",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
      });
      onVolver();
    } else {
      Swal.fire({ icon: "error", title: "Error", text: "No se pudieron guardar los cambios" });
    }
  };

  return (
    <Container className="py-4">
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}
        className="mb-3"
      >
        <div></div>
        <h4 className="mb-0 text-center">
          Detalle de reparación - {maquina?.maquina}
        </h4>
        <div className="d-flex gap-2 justify-content-end">
          <Button variant="outline-success" size="sm" onClick={onVolver}>
            Volver
          </Button>
        </div>
      </div>

      <div
        className="border rounded p-3 mb-4"
        style={{ borderTop: "4px solid #8b4a4a" }}
      >
        <Row>
          <Item label="Fecha" value={fmt(r.fecha)} />
          <Item label="Reparación" value={r.reparacion} />
          <Item label="Parte" value={r.parte} />
          <Item label="Prioridad" value={r.prioridad} />
          <Item label="Estado" value={r.estado} />
        </Row>
      </div>

      <Form.Group>
        <Form.Label className="text-muted small">Detalle</Form.Label>
        <Form.Control
          as="textarea"
          rows={8}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escribí acá todo el detalle de la reparación..."
          style={{ resize: "vertical" }}
        />
      </Form.Group>

      <div className="d-flex justify-content-end mt-3">
        <AsyncButton variant="outline-primary" onClick={guardar}>
          Guardar
        </AsyncButton>
      </div>
    </Container>
  );
}

export default DetalleReparacion;
