import { useEffect, useMemo, useState } from "react";
import { Table, Button, Spinner, Container, Form } from "react-bootstrap";
import XLSXStyle from "xlsx-js-style";
import { useNavigate } from "react-router-dom";
import { listarRemitosFacturados } from "../../../../../helpers/queriesRemitos.js";
import { normTexto } from "../../../../../helpers/normTexto.js";

import "../../../../../styles/verRemitos.css";

const selectActivo = { backgroundImage: "none" };

const estiloX = {
  position: "absolute",
  right: "10px",
  top: "50%",
  transform: "translateY(-50%)",
  cursor: "pointer",
  color: "#fff",
  fontSize: "14px",
  fontWeight: "900",
  zIndex: 5,
  userSelect: "none",
};

const formatoMiles = (valor) => {
  if (valor === undefined || valor === null) return "-";
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(valor);
};

const mostrarFechaDMY = (fecha) => {
  if (!fecha) return "-";
  const [y, m, d] = String(fecha).slice(0, 10).split("-");
  return `${d}-${m}-${y}`;
};

const abreviarTipo = (tipo) =>
  ({
    "Factura A": "FA",
    "Factura X": "FX",
    "Nota de Crédito": "NC",
    "Nota de Débito": "ND",
  })[tipo] || tipo;

// "Facturado" si quedó cubierto; "Parcial" si tiene algo facturado pero saldo.
const estadoRemito = (r) => (r.estado === "Facturado" ? "Facturado" : "Parcial");

const montoFactura = (f) =>
  f.monto !== null && f.monto !== undefined ? f.monto : f.total;

const RemitosFacturados = () => {
  const [remitos, setRemitos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [busquedaObra, setBusquedaObra] = useState("");
  const [busquedaRemito, setBusquedaRemito] = useState("");
  const [busquedaFactura, setBusquedaFactura] = useState("");
  const [busquedaTipo, setBusquedaTipo] = useState("");
  const [busquedaEstado, setBusquedaEstado] = useState("");
  const [busquedaDesde, setBusquedaDesde] = useState("");
  const [busquedaHasta, setBusquedaHasta] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const cargar = async () => {
      try {
        const data = await listarRemitosFacturados();
        setRemitos(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("ERROR AL CARGAR REMITOS FACTURADOS:", error);
        setRemitos([]);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const remitosFiltrados = useMemo(() => {
    const cli = normTexto(busquedaCliente);
    const obr = normTexto(busquedaObra);
    const fac = normTexto(busquedaFactura);
    return remitos.filter((r) => {
      const fecha = r.fecha ? String(r.fecha).slice(0, 10) : "";
      const facturas = r.facturas || [];
      return (
        normTexto(r.obra?.razonsocial).includes(cli) &&
        normTexto(r.obra?.nombreobra).includes(obr) &&
        String(r.remito ?? "").includes(busquedaRemito.trim()) &&
        (!fac || facturas.some((f) => normTexto(f.numeroFactura).includes(fac))) &&
        (!busquedaTipo || facturas.some((f) => f.tipoFactura === busquedaTipo)) &&
        (!busquedaEstado || estadoRemito(r) === busquedaEstado) &&
        (!busquedaDesde || fecha >= busquedaDesde) &&
        (!busquedaHasta || fecha <= busquedaHasta)
      );
    });
  }, [
    remitos,
    busquedaCliente,
    busquedaObra,
    busquedaRemito,
    busquedaFactura,
    busquedaTipo,
    busquedaEstado,
    busquedaDesde,
    busquedaHasta,
  ]);

  const totales = useMemo(
    () =>
      remitosFiltrados.reduce(
        (acc, r) => ({
          total: acc.total + (r.total || 0),
          facturado: acc.facturado + (r.montoFacturado || 0),
        }),
        { total: 0, facturado: 0 }
      ),
    [remitosFiltrados]
  );

  const textoFactura = (f) =>
    `${abreviarTipo(f.tipoFactura)} ${f.numeroFactura}` +
    (f.anulada ? (f.ncAnula ? ` (anulada NC ${f.ncAnula})` : " (anulada)") : "") +
    (f.tipoFactura === "Nota de Crédito" && f.facturaAsociada ? ` (asoc. ${f.facturaAsociada})` : "");

  const exportarExcel = () => {
    const headers = ["Razón Social", "Obra", "N° Remito", "Fecha Remito", "OC", "$ Total Remito", "$ Facturado", "Estado", "Comprobante", "N° Comprobante", "Fecha Comprobante", "$ Imputado", "Observación"];
    const cols = ["A","B","C","D","E","F","G","H","I","J","K","L","M"];
    const currencyFmt = '"$"#,##0.00';
    const centerAlign = { horizontal: "center", vertical: "center" };

    // Una fila por factura de cada remito (si no tiene, una fila sola).
    const filas = remitosFiltrados.flatMap((r) => {
      const base = [
        r.obra?.razonsocial || "-",
        r.obra?.nombreobra || "-",
        r.remito,
        mostrarFechaDMY(r.fecha),
        r.oc || "-",
        r.total ?? 0,
        r.montoFacturado ?? 0,
        estadoRemito(r),
      ];
      const facturas = r.facturas || [];
      if (facturas.length === 0) return [[...base, "-", "-", "-", null, ""]];
      return facturas.map((f) => [
        ...base,
        f.tipoFactura,
        f.numeroFactura,
        mostrarFechaDMY(f.fecha),
        montoFactura(f) ?? null,
        f.anulada
          ? f.ncAnula ? `Anulada por NC ${f.ncAnula}` : "Anulada"
          : f.tipoFactura === "Nota de Crédito" && f.facturaAsociada
            ? `Asociada a ${f.facturaAsociada}`
            : "",
      ]);
    });

    const ws = {};
    ws["A1"] = { v: "REMITOS FACTURADOS", t: "s", s: { font: { bold: true, sz: 14 }, alignment: centerAlign } };
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];

    headers.forEach((h, i) => {
      ws[`${cols[i]}3`] = { v: h, t: "s", s: { font: { bold: true }, alignment: centerAlign } };
    });

    const currencyCols = new Set([5, 6, 11]);
    filas.forEach((fila, rowIdx) => {
      fila.forEach((val, colIdx) => {
        const isCurrency = currencyCols.has(colIdx) && typeof val === "number";
        ws[`${cols[colIdx]}${rowIdx + 4}`] = {
          v: val ?? "-",
          t: typeof val === "number" ? "n" : "s",
          s: { alignment: centerAlign, ...(isCurrency ? { numFmt: currencyFmt } : {}) },
          ...(isCurrency ? { z: currencyFmt } : {}),
        };
      });
    });

    ws["!ref"] = `A1:${cols[headers.length - 1]}${filas.length + 3}`;
    ws["!cols"] = [{ wch: 24 }, { wch: 24 }, { wch: 11 }, { wch: 13 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 11 }, { wch: 16 }, { wch: 15 }, { wch: 16 }, { wch: 14 }, { wch: 24 }];

    const libro = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(libro, ws, "Remitos facturados");
    XLSXStyle.writeFile(libro, "Remitos_Facturados.xlsx");
  };

  if (loading)
    return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <Container fluid className="my-3 px-4 container-remitos">
      <div className="mb-4">
        <h6 className="text-center">
          Remitos facturados <small className="text-muted">(sin iva)</small>
        </h6>
      </div>

      <div className="d-flex flex-wrap gap-3 mb-3 align-items-center justify-content-center">
        <Form.Control
          size="sm"
          type="search"
          placeholder="Razón Social..."
          value={busquedaCliente}
          onChange={(e) => setBusquedaCliente(e.target.value)}
          style={{ width: "200px" }}
        />
        <Form.Control
          size="sm"
          type="search"
          placeholder="Nombre de Obra..."
          value={busquedaObra}
          onChange={(e) => setBusquedaObra(e.target.value)}
          style={{ width: "200px" }}
        />
        <Form.Control
          size="sm"
          type="search"
          placeholder="N° Remito..."
          value={busquedaRemito}
          onChange={(e) => setBusquedaRemito(e.target.value)}
          style={{ width: "130px" }}
        />
        <Form.Control
          size="sm"
          type="search"
          placeholder="N° Factura..."
          value={busquedaFactura}
          onChange={(e) => setBusquedaFactura(e.target.value)}
          style={{ width: "130px" }}
        />
        <div style={{ position: "relative", width: "160px" }}>
          <Form.Select
            size="sm"
            value={busquedaTipo}
            onChange={(e) => setBusquedaTipo(e.target.value)}
            style={busquedaTipo ? selectActivo : {}}
          >
            <option value="">Comprobante...</option>
            <option value="Factura A">Factura A</option>
            <option value="Factura X">Factura X</option>
            <option value="Nota de Crédito">Nota de Crédito</option>
            <option value="Nota de Débito">Nota de Débito</option>
          </Form.Select>
          {busquedaTipo && (
            <span onClick={() => setBusquedaTipo("")} style={estiloX}>✕</span>
          )}
        </div>
        <div style={{ position: "relative", width: "140px" }}>
          <Form.Select
            size="sm"
            value={busquedaEstado}
            onChange={(e) => setBusquedaEstado(e.target.value)}
            style={busquedaEstado ? selectActivo : {}}
          >
            <option value="">Estado...</option>
            <option value="Facturado">Facturado</option>
            <option value="Parcial">Parcial</option>
          </Form.Select>
          {busquedaEstado && (
            <span onClick={() => setBusquedaEstado("")} style={estiloX}>✕</span>
          )}
        </div>
        <div className="d-flex align-items-center gap-1">
          <small className="text-muted">Desde</small>
          <div style={{ position: "relative", width: "160px" }}>
            <Form.Control
              size="sm"
              type="date"
              value={busquedaDesde}
              onChange={(e) => setBusquedaDesde(e.target.value)}
            />
            {busquedaDesde && (
              <span onClick={() => setBusquedaDesde("")} style={{ ...estiloX, right: "34px" }}>✕</span>
            )}
          </div>
        </div>
        <div className="d-flex align-items-center gap-1">
          <small className="text-muted">Hasta</small>
          <div style={{ position: "relative", width: "160px" }}>
            <Form.Control
              size="sm"
              type="date"
              value={busquedaHasta}
              onChange={(e) => setBusquedaHasta(e.target.value)}
            />
            {busquedaHasta && (
              <span onClick={() => setBusquedaHasta("")} style={{ ...estiloX, right: "34px" }}>✕</span>
            )}
          </div>
        </div>

        <div className="d-flex gap-2 ms-auto">
          <Button size="sm" variant="outline-light" onClick={exportarExcel}>Excel</Button>
          <Button size="sm" variant="outline-success" onClick={() => navigate(-1)}>Volver</Button>
        </div>
      </div>

      <div className="table-responsive shadow-sm">
        <Table striped bordered hover className="align-middle text-center table-sm tabla-remitos">
          <thead className="table-dark">
            <tr>
              <th>Razón Social</th>
              <th>Obra</th>
              <th>Remito</th>
              <th>Fecha</th>
              <th>OC</th>
              <th>$ total</th>
              <th>$ facturado</th>
              <th>Estado</th>
              <th>Facturas</th>
            </tr>
          </thead>
          <tbody>
            {remitosFiltrados.length > 0 ? (
              remitosFiltrados.map((r) => (
                <tr key={r._id}>
                  <td className="col-truncate" title={r.obra?.razonsocial}>{r.obra?.razonsocial || "-"}</td>
                  <td className="col-truncate text-muted" title={r.obra?.nombreobra}>{r.obra?.nombreobra || "-"}</td>
                  <td>{r.remito}</td>
                  <td className="fecha-col">{mostrarFechaDMY(r.fecha)}</td>
                  <td>{r.oc || "-"}</td>
                  <td>${formatoMiles(r.total)}</td>
                  <td>${formatoMiles(r.montoFacturado)}</td>
                  <td>
                    <span className={estadoRemito(r) === "Facturado" ? "text-success" : "text-warning"}>
                      {estadoRemito(r)}
                    </span>
                  </td>
                  <td className="text-start">
                    {(r.facturas || []).length === 0 ? (
                      <span className="text-muted">Sin comprobante vinculado</span>
                    ) : (
                      r.facturas.map((f) => (
                        <div
                          key={f._id}
                          className={f.anulada ? "text-muted text-decoration-line-through" : f.tipoFactura === "Nota de Crédito" ? "text-danger" : ""}
                          title={textoFactura(f)}
                        >
                          {textoFactura(f)} · {mostrarFechaDMY(f.fecha)} · ${formatoMiles(montoFactura(f))}
                        </div>
                      ))
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="py-4">
                  No se encontraron remitos facturados con esa búsqueda.
                </td>
              </tr>
            )}
          </tbody>
          {remitosFiltrados.length > 0 && (
            <tfoot>
              <tr className="fw-bold">
                <td colSpan="5" className="text-end">Totales ({remitosFiltrados.length} remitos)</td>
                <td>${formatoMiles(totales.total)}</td>
                <td>${formatoMiles(totales.facturado)}</td>
                <td colSpan="2"></td>
              </tr>
            </tfoot>
          )}
        </Table>
      </div>
    </Container>
  );
};

export default RemitosFacturados;
