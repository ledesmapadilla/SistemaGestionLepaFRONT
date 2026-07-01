import { useNavigate } from "react-router-dom";
import { Button, Card, Col, Container, Row } from "react-bootstrap";

const tarjetas = [
  {
    titulo: "Palas cargadoras",
    icono: "bi-truck-front-fill",
    ruta: "/mantenimiento/cubiertas/palas",
    color: "#0d6efd",
  },
  {
    titulo: "Camiones",
    icono: "bi-truck",
    ruta: "/mantenimiento/cubiertas/camiones",
    color: "#198754",
  },
  {
    titulo: "Motoniveladora",
    icono: "bi-cone-striped",
    ruta: "/mantenimiento/cubiertas/motoniveladora",
    color: "#ffc107",
  },
  {
    titulo: "Retropalas",
    icono: "bi-tools",
    ruta: "/mantenimiento/cubiertas/retropalas",
    color: "#dc3545",
  },
];

export default function CubiertasDashboard() {
  const navigate = useNavigate();

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-1">
        <h2 className="mb-0 fw-bold">Cubiertas</h2>
        <Button size="sm" variant="outline-success" onClick={() => navigate(-1)}>Volver</Button>
      </div>
      <p className="text-muted mb-4">Seleccioná una categoría para continuar</p>
      <Row xs={1} sm={2} md={2} lg={4} className="g-4">
        {tarjetas.map((t) => (
          <Col key={t.titulo}>
            <Card
              className="h-100 shadow-sm border-0"
              style={{ cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s" }}
              onClick={() => { if (t.ruta) navigate(t.ruta); }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "";
              }}
            >
              <Card.Body className="d-flex flex-column align-items-center text-center py-4">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center mb-3"
                  style={{ width: 64, height: 64, backgroundColor: t.color + "1a" }}
                >
                  <i className={`bi ${t.icono} fs-2`} style={{ color: t.color }} />
                </div>
                <Card.Title className="fw-semibold mb-0">{t.titulo}</Card.Title>
              </Card.Body>
              <div style={{ height: 4, backgroundColor: t.color, borderRadius: "0 0 .375rem .375rem" }} />
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}
