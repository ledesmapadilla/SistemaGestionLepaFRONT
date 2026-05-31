import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Table, Spinner } from "react-bootstrap";
import XLSXStyle from "xlsx-js-style";
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

  const exportarExcel = () => {
    const titulo = `Resumen Impuestos - ${mesNombre} ${anio}`;
    const estCentro = { alignment: { horizontal: "center", vertical: "center" } };
    const estIzq    = { alignment: { horizontal: "left",   vertical: "center" } };
    const estHeader = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "222222" } }, alignment: { horizontal: "center", vertical: "center" } };
    const estTitulo = { font: { bold: true, sz: 13 }, alignment: { horizontal: "left", vertical: "center" } };
    const moneda    = { numFmt: "#,##0" };
    const hoy = new Date();
    const fechaSerial = Math.round((Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) - Date.UTC(1899, 11, 30)) / 86400000);

    const filas = [
      { nombre: "931",          d: datos["931"] },
      { nombre: "Autónomos",    d: datos["autonomos"] },
      { nombre: "IVA",          d: datos["iva"] },
      { nombre: "Salud Pública", d: datos["salud-publica"] },
    ].filter(({ d }) => d && calcSaldo(d).valor > 0);

    const wb = XLSXStyle.utils.book_new();
    const ws = {};
    ws["A1"] = { v: titulo, t: "s", s: estTitulo };
    ws["A2"] = { v: fechaSerial, t: "n", s: { ...estTitulo, numFmt: "DD/MM/YYYY" } };
    ws["A3"] = { v: "", t: "s" };
    ["Impuesto", "Valor", "Pagado", "Saldo"].forEach((h, i) => {
      ws[`${"ABCD"[i]}4`] = { v: h, t: "s", s: estHeader };
    });
    filas.forEach(({ nombre, d }, idx) => {
      const row = idx + 5;
      const { valor, pagado, saldo } = calcSaldo(d);
      ws[`A${row}`] = { v: nombre,  t: "s", s: estIzq };
      ws[`B${row}`] = { v: valor,   t: "n", s: { ...estCentro, ...moneda } };
      ws[`C${row}`] = { v: pagado,  t: "n", s: { ...estCentro, ...moneda } };
      ws[`D${row}`] = { v: saldo,   t: "n", s: { ...estCentro, ...moneda } };
    });
    const totalRow = filas.length + 5;
    const tv = filas.reduce((s, { d }) => s + calcSaldo(d).valor,  0);
    const tp = filas.reduce((s, { d }) => s + calcSaldo(d).pagado, 0);
    ws[`A${totalRow}`] = { v: "Total",  t: "s", s: { font: { bold: true }, ...estIzq } };
    ws[`B${totalRow}`] = { v: tv,       t: "n", s: { font: { bold: true }, ...estCentro, ...moneda } };
    ws[`C${totalRow}`] = { v: tp,       t: "n", s: { font: { bold: true }, ...estCentro, ...moneda } };
    ws[`D${totalRow}`] = { v: tv - tp,  t: "n", s: { font: { bold: true }, ...estCentro, ...moneda } };
    ws["!ref"]  = `A1:D${totalRow}`;
    ws["!cols"] = [{ wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
    XLSXStyle.utils.book_append_sheet(wb, ws, "Resumen");
    XLSXStyle.writeFile(wb, `${titulo}.xlsx`);
  };

  if (cargando) return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">💀 Resumen Impuestos</h2>
        <h2 className="mb-0 text-center" style={{ fontSize: "1.4rem" }}>{mesNombre} {anio}</h2>
        <div style={{ width: 70 }} />
      </div>

      <div className="d-flex justify-content-end gap-2 mb-2 w-50 mx-auto">
        <Button variant="outline-light" size="sm" onClick={exportarExcel}>Excel</Button>
        <Button variant="outline-success" size="sm" onClick={() => navigate(-1)}>Volver</Button>
      </div>

      <Table striped bordered hover className="text-center align-middle w-50 mx-auto">
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
