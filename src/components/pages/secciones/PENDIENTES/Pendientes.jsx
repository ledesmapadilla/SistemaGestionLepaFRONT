import { Card, Col, Container, Row } from "react-bootstrap";

// Mismos responsables que el select de repuestos.
const RESPONSABLES = [
  { nombre: "Zamorano", color: "#0d6efd" },
  { nombre: "Mauricio", color: "#198754" },
  { nombre: "Nelson", color: "#dc3545" },
  { nombre: "Juan José", color: "#6f42c1" },
  { nombre: "Nacho", color: "#fd7e14" },
  { nombre: "Agustín", color: "#0dcaf0" },
];

export default function Pendientes() {
  return (
    <Container className="py-4">
      <h2 className="mb-1 fw-bold text-center">Pendientes</h2>
      <p className="text-muted mb-4 text-center">Seleccioná un responsable</p>
      <Row xs={2} sm={3} md={4} lg={6} className="g-3">
        {RESPONSABLES.map((r) => (
          <Col key={r.nombre}>
            <Card
              className="h-100 shadow-sm border-0"
              style={{ cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "";
              }}
            >
              <Card.Body className="d-flex flex-column align-items-center text-center py-3">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center mb-2"
                  style={{ width: 44, height: 44, backgroundColor: r.color + "1a" }}
                >
                  <i className="bi bi-person-fill fs-5" style={{ color: r.color }} />
                </div>
                <Card.Title className="fw-semibold mb-0" style={{ fontSize: "0.95rem" }}>{r.nombre}</Card.Title>
              </Card.Body>
              <div style={{ height: 3, backgroundColor: r.color, borderRadius: "0 0 .375rem .375rem" }} />
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}
