import { Container, Button, Row, Col } from "react-bootstrap";

const fmt = (iso) =>
  iso ? new Date(iso + "T12:00:00").toLocaleDateString("es-AR") : "—";

function DetalleReparacion({ maquina, reparacion, onVolver }) {
  const r = reparacion || {};

  const Item = ({ label, value }) => (
    <Col xs={6} md={4} className="mb-3">
      <div className="text-muted small">{label}</div>
      <div className="fw-semibold">{value || "—"}</div>
    </Col>
  );

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Button variant="outline-secondary" size="sm" onClick={onVolver}>
          ← Volver
        </Button>
        <h4 className="fw-bold mb-0 text-center">
          Detalle de reparación — {maquina?.maquina}
        </h4>
        <span style={{ width: 80 }} />
      </div>

      <div
        className="border rounded p-3 mb-4"
        style={{ borderTop: "4px solid #8b4a4a" }}
      >
        <Row>
          <Item label="Fecha" value={fmt(r.fecha)} />
          <Item label="Reparación" value={r.reparacion} />
          <Item label="Parte" value={r.parte} />
          <Item label="Descripción" value={r.descripcion} />
          <Item label="Prioridad" value={r.prioridad} />
          <Item label="Estado" value={r.estado} />
        </Row>
      </div>

      <div
        className="text-center text-muted py-5 border rounded"
        style={{ borderStyle: "dashed" }}
      >
        (contenido del detalle a diseñar)
      </div>
    </Container>
  );
}

export default DetalleReparacion;
