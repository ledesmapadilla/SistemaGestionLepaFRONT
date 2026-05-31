import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Table, Spinner } from "react-bootstrap";
import { obtenerDatos931 } from "../../../../../helpers/queriesDato931";
import { obtenerDatosImpuesto } from "../../../../../helpers/queriesDatoImpuesto";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const FILAS_TOTAL    = ["montoFormulario", "intereses", "otrasDeudas"];
const TIPOS_HISTORIAL = ["intereses", "otrasDeudas"];

const formatoMoneda = (valor) =>
  Number(valor).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const calcSaldo = (datos) => {
  const getValor = (tipo) => {
    const dato = datos[tipo];
    if (!dato) return 0;
    if (TIPOS_HISTORIAL.includes(tipo)) {
      const suma = (dato.historial || []).reduce((s, h) => s + (h.valor || 0), 0);
      return suma > 0 ? suma : (dato.valor || 0);
    }
    return dato.valor || 0;
  };
  const getPagado = (tipo) => {
    const dato = datos[`pago_${tipo}`];
    if (!dato) return 0;
    const suma = (dato.historial || []).reduce((s, h) => s + (h.valor || 0), 0);
    return suma > 0 ? suma : (dato.valor || 0);
  };
  const valor  = FILAS_TOTAL.reduce((s, t) => s + getValor(t), 0);
  const pagado = FILAS_TOTAL.reduce((s, t) => s + getPagado(t), 0);
  return { valor, pagado, saldo: valor - pagado };
};

export default function ImpuestosResumen() {
  const navigate = useNavigate();
  const { anio, mes } = useParams();
  const mesNombre = MESES[Number(mes)];

  const [datos, setDatos]     = useState({});
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const toMapa = (lista) => { const m = {}; lista.forEach((d) => { m[d.tipo] = d; }); return m; };
    Promise.all([
      obtenerDatos931(Number(anio), Number(mes)).then(toMapa).catch(() => ({})),
      obtenerDatosImpuesto("iva",           Number(anio), Number(mes)).then(toMapa).catch(() => ({})),
      obtenerDatosImpuesto("autonomos",     Number(anio), Number(mes)).then(toMapa).catch(() => ({})),
      obtenerDatosImpuesto("salud-publica", Number(anio), Number(mes)).then(toMapa).catch(() => ({})),
    ]).then(([d931, dIVA, dAut, dSalud]) => {
      setDatos({ "931": d931, iva: dIVA, autonomos: dAut, "salud-publica": dSalud });
    }).finally(() => setCargando(false));
  }, [anio, mes]);

  const FILAS = [
    { nombre: "931",          datos: datos["931"] },
    { nombre: "Autónomos",    datos: datos["autonomos"] },
    { nombre: "IVA",          datos: datos["iva"] },
    { nombre: "Salud Pública", datos: datos["salud-publica"] },
  ];

  const totales = FILAS.reduce(
    (acc, f) => {
      if (!f.datos) return acc;
      const { valor, pagado, saldo } = calcSaldo(f.datos);
      return { valor: acc.valor + valor, pagado: acc.pagado + pagado, saldo: acc.saldo + saldo };
    },
    { valor: 0, pagado: 0, saldo: 0 }
  );

  if (cargando) return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">💀 Resumen Impuestos</h2>
        <h2 className="mb-0 text-center" style={{ fontSize: "1.4rem" }}>{mesNombre} {anio}</h2>
        <Button variant="outline-success" size="sm" onClick={() => navigate(-1)}>Volver</Button>
      </div>

      <Table striped bordered hover className="text-center align-middle mt-5 w-50 mx-auto">
        <thead className="table-dark">
          <tr>
            <th className="text-start">Impuesto</th>
            <th style={{ width: 160 }}>Valor</th>
            <th style={{ width: 160 }}>Pagado</th>
            <th style={{ width: 160 }}>Saldo</th>
          </tr>
        </thead>
        <tbody>
          {FILAS.map(({ nombre, datos: d }) => {
            if (!d) return null;
            const { valor, pagado, saldo } = calcSaldo(d);
            if (valor === 0 && pagado === 0) return null;
            return (
              <tr key={nombre}>
                <td className="text-start">{nombre}</td>
                <td>{formatoMoneda(valor)}</td>
                <td>{formatoMoneda(pagado)}</td>
                <td style={{ color: saldo <= 0 ? "#198754" : "#ffc107", fontWeight: 600 }}>
                  {formatoMoneda(saldo)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot style={{ borderTop: "2px solid #ffc107" }}>
          <tr className="table-dark fw-bold">
            <td className="text-start">Total</td>
            <td>{formatoMoneda(totales.valor)}</td>
            <td>{formatoMoneda(totales.pagado)}</td>
            <td style={{ color: totales.saldo <= 0 ? "#198754" : "#ffc107" }}>
              {formatoMoneda(totales.saldo)}
            </td>
          </tr>
        </tfoot>
      </Table>
    </div>
  );
}
