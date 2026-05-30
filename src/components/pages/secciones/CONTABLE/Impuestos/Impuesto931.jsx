import { useNavigate, useParams } from "react-router-dom";
import { Button, Card } from "react-bootstrap";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const OPCIONES = ["Cargar", "Pagar", "Resumen"];

export default function Impuesto931() {
  const navigate = useNavigate();
  const { anio, mes } = useParams();
  const mesNombre = MESES[Number(mes)];

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div style={{ width: 70 }} />
        <h2 className="mb-0 text-center">💀 931 - {mesNombre} {anio}</h2>
        <Button variant="outline-success" size="sm" onClick={() => navigate(-1)}>Volver</Button>
      </div>

      <div className="d-flex justify-content-center gap-4" style={{ marginTop: 32 }}>
        {OPCIONES.map((opcion) => (
          <Card
            key={opcion}
            style={{
              cursor: "pointer",
              border: "1px solid #444",
              background: "#1e1e1e",
              transition: "background 0.15s",
              width: 180,
              height: 180,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#2a2a2a"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#1e1e1e"; }}
          >
            <Card.Body className="d-flex align-items-center justify-content-center">
              <Card.Title className="mb-0 text-center" style={{ fontSize: "1.2rem", color: "#dee2e6" }}>
                {opcion}
              </Card.Title>
            </Card.Body>
          </Card>
        ))}
      </div>
    </div>
  );
}
