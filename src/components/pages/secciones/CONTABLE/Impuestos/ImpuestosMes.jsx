import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Card } from "react-bootstrap";
import { obtenerDatos931 } from "../../../../../helpers/queriesDato931";
import { obtenerDatosImpuesto } from "../../../../../helpers/queriesDatoImpuesto";

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
  { nombre: "Resumen",                slug: "resumen" },
];

const FILAS_TOTAL = ["montoFormulario", "intereses", "otrasDeudas"];
const TIPOS_HISTORIAL = ["intereses", "otrasDeudas"];

const formatoMoneda = (valor) =>
  Number(valor).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default function ImpuestosMes() {
  const navigate = useNavigate();
  const { anio, mes } = useParams();
  const mesNombre = MESES[Number(mes)];
  const [datos931, setDatos931]             = useState({});
  const [datosIVA, setDatosIVA]             = useState({});
  const [datosAutonomos, setDatosAutonomos] = useState({});
  const [datosSalud, setDatosSalud]         = useState({});

  useEffect(() => {
    const toMapa = (lista) => { const m = {}; lista.forEach((d) => { m[d.tipo] = d; }); return m; };
    obtenerDatos931(Number(anio), Number(mes)).then(toMapa).then(setDatos931).catch(() => {});
    obtenerDatosImpuesto("iva",          Number(anio), Number(mes)).then(toMapa).then(setDatosIVA).catch(() => {});
    obtenerDatosImpuesto("autonomos",    Number(anio), Number(mes)).then(toMapa).then(setDatosAutonomos).catch(() => {});
    obtenerDatosImpuesto("salud-publica", Number(anio), Number(mes)).then(toMapa).then(setDatosSalud).catch(() => {});
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

  const getValorNumG = (datos, tipo) => {
    const dato = datos[tipo];
    if (!dato) return 0;
    if (TIPOS_HISTORIAL.includes(tipo)) {
      const suma = (dato.historial || []).reduce((s, h) => s + (h.valor || 0), 0);
      return suma > 0 ? suma : (dato.valor || 0);
    }
    return dato.valor || 0;
  };
  const getPagadoNumG = (datos, tipo) => {
    const dato = datos[`pago_${tipo}`];
    if (!dato) return 0;
    const suma = (dato.historial || []).reduce((s, h) => s + (h.valor || 0), 0);
    return suma > 0 ? suma : (dato.valor || 0);
  };
  const totalIVAValor       = FILAS_TOTAL.reduce((s, t) => s + getValorNumG(datosIVA, t), 0);
  const totalIVAPagado      = FILAS_TOTAL.reduce((s, t) => s + getPagadoNumG(datosIVA, t), 0);
  const saldoIVA            = totalIVAValor - totalIVAPagado;

  const totalAutonomosValor  = FILAS_TOTAL.reduce((s, t) => s + getValorNumG(datosAutonomos, t), 0);
  const totalAutonomosPagado = FILAS_TOTAL.reduce((s, t) => s + getPagadoNumG(datosAutonomos, t), 0);
  const saldoAutonomos       = totalAutonomosValor - totalAutonomosPagado;

  const totalSaludValor  = FILAS_TOTAL.reduce((s, t) => s + getValorNumG(datosSalud, t), 0);
  const totalSaludPagado = FILAS_TOTAL.reduce((s, t) => s + getPagadoNumG(datosSalud, t), 0);
  const saldoSalud       = totalSaludValor - totalSaludPagado;

  const saldoTotal = saldo931 + saldoIVA + saldoAutonomos + saldoSalud;
  const hayDatos   = totalValor + totalIVAValor + totalAutonomosValor + totalSaludValor > 0;

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
              if (slug === "931")           navigate(`/impuestos/${anio}/${mes}/931/cargar`);
              if (slug === "iva")           navigate(`/impuestos/${anio}/${mes}/iva/cargar`);
              if (slug === "autonomos")     navigate(`/impuestos/${anio}/${mes}/autonomos/cargar`);
              if (slug === "salud-publica") navigate(`/impuestos/${anio}/${mes}/salud-publica/cargar`);
              if (slug === "resumen")       navigate(`/impuestos/${anio}/${mes}/resumen`);
            }}
            style={{
              cursor: "pointer",
              border: slug === "resumen" ? "1px solid #6c757d" : "1px solid #444",
              background: slug === "resumen" ? "#252d38" : "#1e1e1e",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = slug === "resumen" ? "#2e3a4a" : "#2a2a2a"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = slug === "resumen" ? "#252d38" : "#1e1e1e"; }}
          >
            <Card.Body className="d-flex flex-column justify-content-between py-4" style={{ minHeight: 120 }}>
              <Card.Title className="mb-0 text-center" style={{ fontSize: "1.1rem", color: "#dee2e6" }}>
                {nombre}
              </Card.Title>
              {slug === "931" && totalValor > 0 ? (
                <div className="text-center mt-auto pt-3" style={{ fontSize: "0.85rem", color: saldo931 <= 0 ? "#198754" : "#ffc107" }}>
                  Saldo: {formatoMoneda(saldo931)}
                </div>
              ) : slug === "iva" && totalIVAValor > 0 ? (
                <div className="text-center mt-auto pt-3" style={{ fontSize: "0.85rem", color: saldoIVA <= 0 ? "#198754" : "#ffc107" }}>
                  Saldo: {formatoMoneda(saldoIVA)}
                </div>
              ) : slug === "autonomos" && totalAutonomosValor > 0 ? (
                <div className="text-center mt-auto pt-3" style={{ fontSize: "0.85rem", color: saldoAutonomos <= 0 ? "#198754" : "#ffc107" }}>
                  Saldo: {formatoMoneda(saldoAutonomos)}
                </div>
              ) : slug === "salud-publica" && totalSaludValor > 0 ? (
                <div className="text-center mt-auto pt-3" style={{ fontSize: "0.85rem", color: saldoSalud <= 0 ? "#198754" : "#ffc107" }}>
                  Saldo: {formatoMoneda(saldoSalud)}
                </div>
              ) : slug === "resumen" && hayDatos ? (
                <div className="text-center mt-auto pt-3" style={{ fontSize: "0.85rem", color: saldoTotal <= 0 ? "#198754" : "#ffc107" }}>
                  Saldo total: {formatoMoneda(saldoTotal)}
                </div>
              ) : <div />}
            </Card.Body>
          </Card>
        ))}
      </div>
    </div>
  );
}
