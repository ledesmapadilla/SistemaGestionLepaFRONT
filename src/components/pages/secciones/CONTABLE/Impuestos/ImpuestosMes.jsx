import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Card } from "react-bootstrap";
import { obtenerDatos931 } from "../../../../../helpers/queriesDato931";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const IMPUESTOS = [
  { nombre: "931",                    slug: "931" },
  { nombre: "Autónomos",              slug: "autonomos" },
  { nombre: "Convenio Multilateral",  slug: "convenio-multilateral" },
  { nombre: "IVA",                    slug: "iva" },
  { nombre: "Salud Pública",          slug: "salud-publica" },
  { nombre: "Anticipo ganancias",     slug: "anticipo-ganancias" },
  { nombre: "Planes de pago AFIP",    slug: "planes-pago-afip" },
];

const FILAS_TOTAL = ["montoFormulario", "intereses", "otrasDeudas"];
const TIPOS_HISTORIAL = ["intereses", "otrasDeudas"];

const formatoMoneda = (valor) =>
  Number(valor).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default function ImpuestosMes() {
  const navigate = useNavigate();
  const { anio, mes } = useParams();
  const mesNombre = MESES[Number(mes)];
  const [datos931, setDatos931] = useState({});

  useEffect(() => {
    obtenerDatos931(Number(anio), Number(mes))
      .then((lista) => {
        const mapa = {};
        lista.forEach((d) => { mapa[d.tipo] = d; });
        setDatos931(mapa);
      })
      .catch(() => {});
  }, [anio, mes]);

  const getValorNum = (tipo) => {
    const dato = datos931[tipo];
    if (!dato) return 0;
    if (TIPOS_HISTORIAL.includes(tipo)) {
      const suma = (dato.historial || []).reduce((s, h) => s + (h.valor || 0), 0);
      return suma > 0 ? suma : (dato.valor || 0);
    }
    return dato.valor || 0;
  };

  const getPagadoNum = (tipo) => {
    const dato = datos931[`pago_${tipo}`];
    if (!dato) return 0;
    const suma = (dato.historial || []).reduce((s, h) => s + (h.valor || 0), 0);
    return suma > 0 ? suma : (dato.valor || 0);
  };

  const totalValor  = FILAS_TOTAL.reduce((s, t) => s + getValorNum(t), 0);
  const totalPagado = FILAS_TOTAL.reduce((s, t) => s + getPagadoNum(t), 0);
  const saldo931    = totalValor - totalPagado;

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div style={{ width: 70 }} />
        <h2 className="mb-0 text-center">💀 Impuestos - {mesNombre} {anio}</h2>
        <Button variant="outline-success" size="sm" onClick={() => navigate(-1)}>Volver</Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {IMPUESTOS.map(({ nombre, slug }) => (
          <Card
            key={slug}
            onClick={() => {
              if (slug === "931") navigate(`/impuestos/${anio}/${mes}/931/cargar`);
            }}
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
                {nombre}
              </Card.Title>
              {slug === "931" && totalValor > 0 && (
                <div className="mt-2" style={{ fontSize: "0.85rem", color: saldo931 <= 0 ? "#198754" : "#ffc107" }}>
                  Saldo: {formatoMoneda(saldo931)}
                </div>
              )}
            </Card.Body>
          </Card>
        ))}
      </div>
    </div>
  );
}
