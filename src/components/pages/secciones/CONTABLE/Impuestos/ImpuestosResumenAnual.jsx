import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Table, Spinner } from "react-bootstrap";
import XLSXStyle from "xlsx-js-style";
import { obtenerDatos931Anio } from "../../../../../helpers/queriesDato931";
import { obtenerDatosImpuestoAnio } from "../../../../../helpers/queriesDatoImpuesto";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const FILAS_TOTAL    = ["montoFormulario", "intereses", "otrasDeudas"];
const TIPOS_HISTORIAL = ["intereses", "otrasDeudas"];

const formatoMoneda = (valor) =>
  Number(valor).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const calcSaldoMes = (registros) => {
  const mapa = {};
  registros.forEach((r) => { mapa[r.tipo] = r; });

  const getVal = (tipo) => {
    const dato = mapa[tipo];
    if (!dato) return 0;
    if (TIPOS_HISTORIAL.includes(tipo)) {
      const suma = (dato.historial || []).reduce((s, h) => s + (h.valor || 0), 0);
      return suma > 0 ? suma : (dato.valor || 0);
    }
    return dato.valor || 0;
  };
  const getPagado = (tipo) => {
    const dato = mapa[`pago_${tipo}`];
    if (!dato) return 0;
    const suma = (dato.historial || []).reduce((s, h) => s + (h.valor || 0), 0);
    return suma > 0 ? suma : (dato.valor || 0);
  };

  const valor  = FILAS_TOTAL.reduce((s, t) => s + getVal(t), 0);
  const pagado = FILAS_TOTAL.reduce((s, t) => s + getPagado(t), 0);
  return { valor, pagado, saldo: valor - pagado };
};

const agruparPorMes = (lista) => {
  const mapa = {};
  lista.forEach((r) => {
    if (!mapa[r.mes]) mapa[r.mes] = [];
    mapa[r.mes].push(r);
  });
  return mapa;
};

export default function ImpuestosResumenAnual() {
  const navigate = useNavigate();
  const { anio } = useParams();

  const [datos, setDatos]       = useState({});
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([
      obtenerDatos931Anio(Number(anio)).catch(() => []),
      obtenerDatosImpuestoAnio("iva",           Number(anio)).catch(() => []),
      obtenerDatosImpuestoAnio("autonomos",     Number(anio)).catch(() => []),
      obtenerDatosImpuestoAnio("salud-publica", Number(anio)).catch(() => []),
    ]).then(([d931, dIVA, dAut, dSalud]) => {
      setDatos({
        "931":          agruparPorMes(d931),
        "iva":          agruparPorMes(dIVA),
        "autonomos":    agruparPorMes(dAut),
        "salud-publica": agruparPorMes(dSalud),
      });
    }).finally(() => setCargando(false));
  }, [anio]);

  const COLS = [
    { key: "931",           nombre: "931" },
    { key: "autonomos",     nombre: "Autónomos" },
    { key: "iva",           nombre: "IVA" },
    { key: "salud-publica", nombre: "Salud Pública" },
  ];

  const mesesConDatos = [...new Set(
    COLS.flatMap(({ key }) => Object.keys(datos[key] || {}).map(Number))
  )].sort((a, b) => a - b);

  const getSaldo = (key, mes) => {
    const registros = datos[key]?.[mes];
    if (!registros?.length) return null;
    return calcSaldoMes(registros).saldo;
  };

  const totalCol = (key) =>
    mesesConDatos.reduce((s, mes) => s + (getSaldo(key, mes) ?? 0), 0);

  const totalFila = (mes) =>
    COLS.reduce((s, { key }) => s + (getSaldo(key, mes) ?? 0), 0);

  const totalGeneral = COLS.reduce((s, { key }) => s + totalCol(key), 0);

  const exportarExcel = () => {
    const titulo = `Resumen Impuestos ${anio}`;
    const estCentro = { alignment: { horizontal: "center", vertical: "center" } };
    const estIzq    = { alignment: { horizontal: "left",   vertical: "center" } };
    const estHeader = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "222222" } }, alignment: { horizontal: "center", vertical: "center" } };
    const estTitulo = { font: { bold: true, sz: 13 }, alignment: { horizontal: "left", vertical: "center" } };
    const moneda    = { numFmt: "#,##0" };
    const hoy = new Date();
    const fechaSerial = Math.round((Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) - Date.UTC(1899, 11, 30)) / 86400000);

    const cols = "ABCDEF";
    const headers = ["Mes", ...COLS.map((c) => c.nombre), "Total"];

    const wb = XLSXStyle.utils.book_new();
    const ws = {};
    ws["A1"] = { v: titulo,      t: "s", s: estTitulo };
    ws["A2"] = { v: fechaSerial, t: "n", s: { ...estTitulo, numFmt: "DD/MM/YYYY" } };
    ws["A3"] = { v: "",          t: "s" };
    headers.forEach((h, i) => { ws[`${cols[i]}4`] = { v: h, t: "s", s: estHeader }; });

    mesesConDatos.forEach((mes, idx) => {
      const row = idx + 5;
      ws[`A${row}`] = { v: MESES[mes], t: "s", s: estIzq };
      COLS.forEach(({ key }, ci) => {
        const s = getSaldo(key, mes);
        ws[`${cols[ci + 1]}${row}`] = s != null
          ? { v: s, t: "n", s: { ...estCentro, ...moneda } }
          : { v: "-", t: "s", s: estCentro };
      });
      ws[`F${row}`] = { v: totalFila(mes), t: "n", s: { ...estCentro, ...moneda } };
    });

    const totalRow = mesesConDatos.length + 5;
    ws[`A${totalRow}`] = { v: "Total", t: "s", s: { font: { bold: true }, ...estIzq } };
    COLS.forEach(({ key }, ci) => {
      ws[`${cols[ci + 1]}${totalRow}`] = { v: totalCol(key), t: "n", s: { font: { bold: true }, ...estCentro, ...moneda } };
    });
    ws[`F${totalRow}`] = { v: totalGeneral, t: "n", s: { font: { bold: true }, ...estCentro, ...moneda } };

    ws["!ref"]  = `A1:F${totalRow}`;
    ws["!cols"] = [{ wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
    XLSXStyle.utils.book_append_sheet(wb, ws, "Resumen Anual");
    XLSXStyle.writeFile(wb, `${titulo}.xlsx`);
  };

  if (cargando) return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">💀 Resumen Anual</h2>
        <h2 className="mb-0 text-center" style={{ fontSize: "1.4rem" }}>{anio}</h2>
        <div style={{ width: 70 }} />
      </div>

      <div className="d-flex justify-content-end gap-2 mb-2">
        <Button variant="outline-light" size="sm" onClick={exportarExcel}>Excel</Button>
        <Button variant="outline-success" size="sm" onClick={() => navigate(-1)}>Volver</Button>
      </div>

      {mesesConDatos.length === 0 ? (
        <p className="text-muted text-center mt-5">Sin datos cargados para {anio}.</p>
      ) : (
        <Table striped bordered hover className="text-center align-middle">
          <thead className="table-dark">
            <tr>
              <th className="text-start">Mes</th>
              {COLS.map(({ nombre }) => <th key={nombre}>{nombre}</th>)}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {mesesConDatos.map((mes) => {
              const total = totalFila(mes);
              return (
                <tr key={mes}>
                  <td className="text-start">{MESES[mes]}</td>
                  {COLS.map(({ key }) => {
                    const s = getSaldo(key, mes);
                    return (
                      <td key={key} style={{ color: s == null ? undefined : s <= 0 ? "#198754" : "#ffc107" }}>
                        {s != null ? formatoMoneda(s) : "-"}
                      </td>
                    );
                  })}
                  <td style={{ color: total <= 0 ? "#198754" : "#ffc107", fontWeight: 600 }}>
                    {formatoMoneda(total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot style={{ borderTop: "2px solid #ffc107" }}>
            <tr className="table-dark fw-bold">
              <td className="text-start">Total</td>
              {COLS.map(({ key }) => (
                <td key={key}>{formatoMoneda(totalCol(key))}</td>
              ))}
              <td>{formatoMoneda(totalGeneral)}</td>
            </tr>
          </tfoot>
        </Table>
      )}
    </div>
  );
}
