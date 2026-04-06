import { Row, Col, Card } from "react-bootstrap";

const secciones = [
  { titulo: "Sección Operativa" },
  { titulo: "Sección Mantenimiento" },
  { titulo: "Sección Contable" },
  { titulo: "Otra Sección" },
];

const cardStyle = {
  backgroundColor: "#9ca3af",
  color: "var(--lepa-black)",
  transition: "box-shadow 0.3s, transform 0.3s",
  cursor: "default",
};

const Inicio = () => {
  return (
    <div
      className="d-flex flex-column"
      style={{ minHeight: "calc(100vh - 120px)" }}
    >
      <h2 className="my-4 text-center" style={{ color: "var(--lepa-orange)" }}>
        Tablero de control
      </h2>
      <Row className="g-5 flex-grow-1 w-75 mx-auto">
        {secciones.map((sec) => (
          <Col key={sec.titulo} xs={12} md={6} className="d-flex">
            <Card
              className="w-100 card-inicio rounded-4"
              style={cardStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 8px 30px rgba(245, 158, 11, 0.5)";
                e.currentTarget.style.transform = "translateY(-10px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <Card.Header
                className="fw-bold text-center"
                style={{ ...cardStyle, borderBottom: "2px solid var(--lepa-orange)", fontSize: "1.3rem", borderRadius: "calc(0.75rem - 1px) calc(0.75rem - 1px) 0 0" }}
              >
                {sec.titulo}
              </Card.Header>
              <Card.Body>
                <p className="mb-0" style={{ color: "var(--lepa-gray)" }}>
                  Sin datos cargados
                </p>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default Inicio;
