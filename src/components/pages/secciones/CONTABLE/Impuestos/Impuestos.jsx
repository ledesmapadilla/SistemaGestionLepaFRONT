import { useState } from "react";
import { Button, Form, Card } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function Impuestos() {
  const navigate = useNavigate();
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const anios = Array.from({ length: 10 }, (_, i) => 2024 + i);
  const mesActual = hoy.getMonth();

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Form.Select
          value={anio}
          onChange={(e) => setAnio(Number(e.target.value))}
          style={{ width: 110 }}
        >
          {anios.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </Form.Select>
        <h2 className="mb-0 text-center">💀 Impuestos</h2>
        <Button variant="outline-success" size="sm" onClick={() => navigate(-1)}>Volver</Button>
      </div>

      <div className="d-flex flex-wrap justify-content-center align-items-center gap-4" style={{ marginTop: 32, minHeight: "50vh" }}>
        {MESES.map((mes, i) => {
          const esActual = i === mesActual && anio === hoy.getFullYear();
          return (
            <Card
              key={mes}
              onClick={() => navigate(`/impuestos/${anio}/${i}`)}
              style={{
                cursor: "pointer",
                border: "1px solid #ffc107",
                background: esActual ? "#2b2b00" : "#1e1e1e",
                transition: "background 0.15s",
                width: 220,
                height: 220,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = esActual ? "#3a3a00" : "#2a2a2a"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = esActual ? "#2b2b00" : "#1e1e1e"; }}
            >
              <Card.Body className="d-flex align-items-center justify-content-center">
                <Card.Title className="mb-0 text-center" style={{ fontSize: "1.3rem", color: esActual ? "#ffc107" : "#dee2e6" }}>
                  {mes}
                </Card.Title>
              </Card.Body>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
