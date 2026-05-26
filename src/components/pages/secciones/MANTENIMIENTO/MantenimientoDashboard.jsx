import { useNavigate } from "react-router-dom";
import { Card, Col, Container, Row } from "react-bootstrap";

const tarjetas = [
  {
    titulo: "Tablero de Control",
    descripcion: "Estado general de la flota y alertas",
    icono: "bi-speedometer2",
    ruta: "/tablero-control",
    color: "#0d6efd",
  },
  {
    titulo: "Consumo de Aceites",
    descripcion: "Registro y seguimiento de consumo de aceites",
    icono: "bi-droplet-fill",
    ruta: "/consumo-aceites",
    color: "#198754",
  },
  {
    titulo: "Service Maquinaria",
    descripcion: "Historial y programación de services",
    icono: "bi-tools",
    ruta: "/service-maquinas",
    color: "#ffc107",
  },
  {
    titulo: "Baterías",
    descripcion: "Control y reemplazo de baterías",
    icono: "bi-battery-charging",
    ruta: "/mantenimiento/baterias",
    color: "#0dcaf0",
  },
  {
    titulo: "Cubiertas",
    descripcion: "Gestión de cubiertas por máquina",
    icono: "bi-circle-square",
    ruta: "/mantenimiento/cubiertas",
    color: "#6f42c1",
  },
  {
    titulo: "Mantenimiento Preventivo",
    descripcion: "Plan de mantenimiento programado",
    icono: "bi-shield-check",
    ruta: "/mantenimiento/preventivo",
    color: "#20c997",
  },
  {
    titulo: "Reparaciones",
    descripcion: "Registro de reparaciones y presupuestos",
    icono: "bi-wrench-adjustable",
    ruta: "/mantenimiento/reparaciones",
    color: "#dc3545",
  },
  {
    titulo: "Otra",
    descripcion: "Otros registros de mantenimiento",
    icono: "bi-three-dots-vertical",
    ruta: "/mantenimiento/otra",
    color: "#6c757d",
  },
];

export default function MantenimientoDashboard() {
  const navigate = useNavigate();

  return (
    <Container className="py-4">
      <h2 className="mb-1 fw-bold">Departamento de Mantenimiento</h2>
      <p className="text-muted mb-4">Seleccioná una sección para continuar</p>
      <Row xs={1} sm={2} md={3} lg={4} className="g-4">
        {tarjetas.map((t) => (
          <Col key={t.ruta}>
            <Card
              className="h-100 shadow-sm border-0"
              style={{ cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s" }}
              onClick={() => navigate(t.ruta)}
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
                <Card.Title className="fw-semibold mb-1">{t.titulo}</Card.Title>
                <Card.Text className="text-muted small">{t.descripcion}</Card.Text>
              </Card.Body>
              <div style={{ height: 4, backgroundColor: t.color, borderRadius: "0 0 .375rem .375rem" }} />
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}
