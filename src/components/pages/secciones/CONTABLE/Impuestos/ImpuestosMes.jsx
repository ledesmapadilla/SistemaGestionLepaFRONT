import { useNavigate, useParams } from "react-router-dom";
import { Button, Card } from "react-bootstrap";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const IMPUESTOS = [
  "931",
  "Autónomos",
  "Convenio Multilateral",
  "IVA",
  "Salud Pública",
  "Anticipo ganancias",
  "Planes de pago AFIP",
];

export default function ImpuestosMes() {
  const navigate = useNavigate();
  const { anio, mes } = useParams();
  const mesNombre = MESES[Number(mes)];

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div style={{ width: 70 }} />
        <h2 className="mb-0 text-center">💀 Impuestos - {mesNombre} {anio}</h2>
        <Button variant="outline-success" size="sm" onClick={() => navigate(-1)}>Volver</Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {IMPUESTOS.map((impuesto) => (
          <Card
            key={impuesto}
            style={{
              cursor: "pointer",
              border: "1px solid #444",
              background: "#1e1e1e",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#2a2a2a"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#1e1e1e"; }}
          >
            <Card.Body className="text-center py-5">
              <Card.Title className="mb-0" style={{ fontSize: "1.1rem", color: "#dee2e6" }}>
                {impuesto}
              </Card.Title>
            </Card.Body>
          </Card>
        ))}
      </div>
    </div>
  );
}
