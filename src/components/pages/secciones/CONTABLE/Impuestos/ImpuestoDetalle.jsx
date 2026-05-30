import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Card, Form } from "react-bootstrap";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const NOMBRES = {
  "931": "931",
  "autonomos": "Autónomos",
  "convenio-multilateral": "Convenio Multilateral",
  "iva": "IVA",
  "salud-publica": "Salud Pública",
  "anticipo-ganancias": "Anticipo ganancias",
  "planes-pago-afip": "Planes de pago AFIP",
};

const OPCIONES = ["Cargar", "Pagar", "Resumen"];

const PROVINCIAS = [
  "Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Ciudad Autónoma de Buenos Aires",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
];

export default function ImpuestoDetalle() {
  const navigate = useNavigate();
  const { anio, mes, impuesto } = useParams();
  const [provincia, setProvincia] = useState("");
  const mesNombre = MESES[Number(mes)];
  const nombre = NOMBRES[impuesto] || impuesto;

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">💀 {nombre}</h2>
        <h2 className="mb-0 text-center" style={{ fontSize: "1.4rem" }}>- {mesNombre} {anio}</h2>
        <Button variant="outline-success" size="sm" onClick={() => navigate(-1)}>Volver</Button>
      </div>

      {impuesto === "convenio-multilateral" && (
        <div className="d-flex justify-content-center mb-4">
          <div>
            <Form.Label className="text-center d-block mb-1">Provincia</Form.Label>
            <Form.Select
              value={provincia}
              onChange={(e) => setProvincia(e.target.value)}
              style={{ width: 280 }}
            >
              <option value="">Seleccionar provincia...</option>
              {PROVINCIAS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Form.Select>
          </div>
        </div>
      )}

      <div className="d-flex justify-content-center align-items-center gap-4" style={{ minHeight: "40vh" }}>
        {OPCIONES.map((opcion) => (
          <Card
            key={opcion}
            onClick={() => {
              if (impuesto === "931" && opcion === "Cargar")
                navigate(`/impuestos/${anio}/${mes}/931/cargar`);
            }}
            style={{
              cursor: "pointer",
              border: "1px solid #ffc107",
              background: "#1e1e1e",
              transition: "background 0.15s",
              width: 220,
              height: 220,
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
