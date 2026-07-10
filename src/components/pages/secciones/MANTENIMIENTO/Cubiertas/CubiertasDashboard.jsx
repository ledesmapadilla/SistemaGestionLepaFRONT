import { useNavigate } from "react-router-dom";
import { Button, Card, Col, Container, Row } from "react-bootstrap";

const IconoRetropala = ({ color, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    width="1em"
    height="1em"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <path d="M4 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
    <path d="M13 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
    <path d="M13 19l-9 0" />
    <path d="M4 15l9 0" />
    <path d="M8.5 15l-1.5 -5" />
    <path d="M12 15l2 -8" />
    <path d="M15 7l3 2" />
    <path d="M15 7l1.5 -1.5" />
    <path d="M18 9l3 1" />
    <path d="M19 14l2 -3" />
  </svg>
);

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
    icono: (props) => <IconoRetropala {...props} />,
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
                  {typeof t.icono === "string" ? (
                    <i className={`bi ${t.icono} fs-2`} style={{ color: t.color }} />
                  ) : (
                    t.icono({ color: t.color, className: "fs-2" })
                  )}
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
