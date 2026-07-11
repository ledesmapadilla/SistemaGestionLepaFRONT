import { useState, useEffect, useMemo } from "react";
import { Button, Table, Form, Spinner } from "react-bootstrap";
import XLSXStyle from "xlsx-js-style";
import { useNavigate } from "react-router-dom";
import { obtenerCuentaCorrienteProveedor } from "../../../../../helpers/queriesCuentaCorrienteProveedor";

const formatoMoneda = (valor) => {
  if (valor === undefined || valor === null) return "-";
  return Number(valor).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
};

const formatearFecha = (fecha) => {
  if (!fecha) return "-";
  const p = fecha.substring(0, 10).split("-");
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : fecha;
};

const estiloX = {
  position: "absolute", right: "10px", top: "50%",
  transform: "translateY(-50%)", cursor: "pointer",
  color: "#fff", fontSize: "14px", fontWeight: "900",
  zIndex: 5, userSelect: "none",
};

const CuentaCorrienteProveedor = () => {
  const navigate = useNavigate();
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroProveedor, setFiltroProveedor] = useState("");
  const [soloConDeuda, setSoloConDeuda] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const data = await obtenerCuentaCorrienteProveedor();
        setTodos(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const proveedores = useMemo(() => {
    return [...new Set(todos.map((m) => m.proveedor).filter(Boolean))].sort();
  }, [todos]);

  const resumenPorProveedor = useMemo(() => {
    return proveedores.map((prov) => {
      const movs = todos.filter((m) => m.proveedor === prov);
      const debito = movs.reduce((s, m) => s + (m.debito || 0), 0);
      const credito = movs.reduce((s, m) => s + (m.credito || 0), 0);
      return { proveedor: prov, debito, credito, saldo: debito - credito };
    });
  }, [todos, proveedores]);

  const resumenFiltrado = useMemo(() => {
    if (soloConDeuda) {
      return resumenPorProveedor.filter((r) => r.saldo > 0.01 || r.saldo < -0.01);
    }
    return resumenPorProveedor;
  }, [resumenPorProveedor, soloConDeuda]);

  const movFiltrados = useMemo(() => {
    if (!filtroProveedor) return [];
    return todos.filter((m) => m.proveedor === filtroProveedor);
  }, [todos, filtroProveedor]);

  const movConSaldo = useMemo(() => {
    let saldoAcum = 0;
    return movFiltrados.map((m) => {
      saldoAcum += (m.debito || 0) - (m.credito || 0);
      return { ...m, saldo: saldoAcum };
    });
  }, [movFiltrados]);

  const totalDebitos = movFiltrados.reduce((s, m) => s + (m.debito || 0), 0);
  const totalCreditos = movFiltrados.reduce((s, m) => s + (m.credito || 0), 0);
  const saldoTotal = totalDebitos - totalCreditos;

  const exportarExcel = () => {
    const centerAlign = { horizontal: "center", vertical: "center" };
    const leftAlign = { horizontal: "left", vertical: "center" };
    const currencyFmt = '"$"#,##0.00';
    const libro = XLSXStyle.utils.book_new();

    if (!filtroProveedor) {
      const ws = {};
      ws["A1"] = { v: `CUENTA CORRIENTE — ${soloConDeuda ? "Proveedores con deuda" : "Todos los proveedores"}`, t: "s", s: { font: { bold: true, sz: 14 }, alignment: leftAlign } };
      ws["A2"] = { v: new Date().toLocaleDateString("es-AR"), t: "s", s: { alignment: leftAlign } };
      ["Proveedor", "A pagar", "Pagado", "Saldo"].forEach((h, i) => {
        ws[`${["A","B","C","D"][i]}3`] = { v: h, t: "s", s: { font: { bold: true }, alignment: centerAlign } };
      });
      resumenFiltrado.forEach((r, ri) => {
        const fila = [r.proveedor, r.debito, r.credito, r.saldo];
        fila.forEach((val, ci) => {
          const isCurrency = ci > 0;
          ws[`${["A","B","C","D"][ci]}${ri + 4}`] = {
            v: val ?? "-", t: isCurrency ? "n" : "s",
            s: { alignment: centerAlign, ...(isCurrency ? { numFmt: currencyFmt } : {}) },
            ...(isCurrency ? { z: currencyFmt } : {}),
          };
        });
      });
      ws["!ref"] = `A1:D${resumenFiltrado.length + 3}`;
      ws["!cols"] = [{ wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
      XLSXStyle.utils.book_append_sheet(libro, ws, "Resumen");
      XLSXStyle.writeFile(libro, `CuentaCorriente_Proveedores_${soloConDeuda ? "ConDeuda" : "Todos"}.xlsx`);
      return;
    }

    const cols = ["A", "B", "C", "D", "E", "F"];
    const titulo = `CUENTA CORRIENTE — ${filtroProveedor}`;
    const headers = ["Fecha", "N° Factura", "Descripción", "Obra", "A pagar", "Pagado", "Saldo"];
    const numCols = new Set([4, 5, 6]);
    const ws = {};
    ws["A1"] = { v: titulo, t: "s", s: { font: { bold: true, sz: 14 }, alignment: leftAlign } };
    ws["A2"] = { v: new Date().toLocaleDateString("es-AR"), t: "s", s: { alignment: leftAlign } };
    [...cols, "G"].forEach((col, i) => {
      ws[`${col}3`] = { v: headers[i], t: "s", s: { font: { bold: true }, alignment: centerAlign } };
    });
    movConSaldo.forEach((m, ri) => {
      const fila = [
        formatearFecha(m.fecha), m.numeroFactura, m.descripcion,
        m.obra || "-",
        m.debito || 0, m.credito || 0, m.saldo ?? 0,
      ];
      fila.forEach((val, ci) => {
        const isCurrency = numCols.has(ci);
        ws[`${[...cols, "G"][ci]}${ri + 4}`] = {
          v: val ?? "-", t: isCurrency ? "n" : "s",
          s: { alignment: centerAlign, ...(isCurrency ? { numFmt: currencyFmt } : {}) },
          ...(isCurrency ? { z: currencyFmt } : {}),
        };
      });
    });
    ws["!ref"] = `A1:G${movConSaldo.length + 3}`;
    ws["!cols"] = [{ wch: 12 }, { wch: 10 }, { wch: 32 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
    XLSXStyle.utils.book_append_sheet(libro, ws, "Cuenta Corriente");
    XLSXStyle.writeFile(libro, `CuentaCorriente_${filtroProveedor}.xlsx`);
  };

  return (
    <div className="w-75 mx-auto my-2">
      <h6 className="text-center mb-1">Cuenta Corriente Proveedores <small className="text-muted">(iva incluido)</small></h6>
      <div className="d-flex justify-content-end align-items-center mb-1">
        <div className="d-flex gap-2">
          {(filtroProveedor ? movConSaldo.length : resumenFiltrado.length) > 0 && (
            <Button size="sm" variant="outline-light" onClick={exportarExcel}>Excel</Button>
          )}
          <Button size="sm" variant="outline-success" onClick={() => navigate(-1)}>Volver</Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", marginBottom: "0.5rem", gap: "0.5rem" }}>
        {/* Filtros — izquierda */}
        <div className="d-flex align-items-center gap-2">
          <Form.Label className="mb-0 text-nowrap" style={{ width: "75px" }}>Proveedor</Form.Label>
          <div style={{ position: "relative", width: "280px" }}>
            <Form.Select
              value={filtroProveedor}
              onChange={(e) => setFiltroProveedor(e.target.value)}
              style={filtroProveedor ? { backgroundImage: "none", height: "34px" } : { height: "34px" }}
            >
              <option value="">Todos los proveedores</option>
              {proveedores.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Form.Select>
            {filtroProveedor && (
              <span onClick={() => setFiltroProveedor("")} style={estiloX}>✕</span>
            )}
          </div>
          {!filtroProveedor && (
            <div className="d-flex align-items-center gap-2 ms-2">
              <span style={{ fontSize: "0.85rem", userSelect: "none" }} className={soloConDeuda ? "fw-semibold" : "text-muted"}>Con deuda</span>
              <Form.Check
                type="switch"
                id="switch-deuda-prov"
                className="mb-0"
                checked={!soloConDeuda}
                onChange={(e) => setSoloConDeuda(!e.target.checked)}
              />
              <span style={{ fontSize: "0.85rem", userSelect: "none" }} className={!soloConDeuda ? "fw-semibold" : "text-muted"}>Todos</span>
            </div>
          )}
        </div>

        {/* Totales — centro */}
        {!loading && (filtroProveedor ? movConSaldo.length : resumenFiltrado.length) > 0 ? (() => {
          const totPagar = filtroProveedor
            ? totalDebitos
            : resumenFiltrado.reduce((s, r) => s + r.debito, 0);
          const totPagado = filtroProveedor
            ? totalCreditos
            : resumenFiltrado.reduce((s, r) => s + r.credito, 0);
          const totSaldo = totPagar - totPagado;
          return (
            <div className="d-flex gap-3">
              <div className="border rounded px-3 py-1 text-center" style={{ minWidth: "150px" }}>
                <div className="text-muted" style={{ fontSize: "0.75rem" }}>A pagar</div>
                <div className="fw-bold" style={{ fontSize: "0.95rem" }}>{formatoMoneda(totPagar)}</div>
              </div>
              <div className="border rounded px-3 py-1 text-center" style={{ minWidth: "150px" }}>
                <div className="text-muted" style={{ fontSize: "0.75rem" }}>Pagado</div>
                <div className="fw-bold" style={{ fontSize: "0.95rem" }}>{formatoMoneda(totPagado)}</div>
              </div>
              <div className="border rounded px-3 py-1 text-center" style={{ minWidth: "150px", borderColor: totSaldo > 0 ? "#0d6efd" : totSaldo < 0 ? "#198754" : undefined }}>
                <div className="text-muted" style={{ fontSize: "0.75rem" }}>Saldo</div>
                <div className={`fw-bold ${totSaldo > 0 ? "text-primary" : totSaldo < 0 ? "text-success" : ""}`} style={{ fontSize: "0.95rem" }}>
                  {formatoMoneda(totSaldo)}
                </div>
              </div>
            </div>
          );
        })() : <div />}

        <div />
      </div>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : !filtroProveedor ? (
        resumenFiltrado.length === 0 ? (
          <p className="text-muted">Sin movimientos.</p>
        ) : (
          <div style={{ maxHeight: "calc(100vh - 260px)", overflowY: "auto" }}>
            <Table striped bordered hover className="text-center align-middle">
              <thead className="table-dark sticky-top">
                <tr>
                  <th>Proveedor</th>
                  <th>A pagar</th>
                  <th>Pagado</th>
                  <th>Saldo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {resumenFiltrado.map((r) => (
                  <tr key={r.proveedor}>
                    <td className="text-start fw-semibold">{r.proveedor}</td>
                    <td>{formatoMoneda(r.debito)}</td>
                    <td>{formatoMoneda(r.credito)}</td>
                    <td className={r.saldo < 0 ? "text-success fw-semibold" : r.saldo > 0 ? "text-primary fw-semibold" : ""}>
                      {formatoMoneda(r.saldo)}
                    </td>
                    <td>
                      <Button size="sm" variant="outline-success" onClick={() => setFiltroProveedor(r.proveedor)}>Ver</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )
      ) : (
        movConSaldo.length === 0 ? (
          <p className="text-muted">Sin movimientos para este proveedor.</p>
        ) : (
          <div style={{ maxHeight: "calc(100vh - 260px)", overflowY: "auto" }}>
          <Table striped bordered hover className="text-center align-middle">
            <thead className="table-dark sticky-top">
              <tr>
                <th>Fecha</th>
                <th>N° Factura</th>
                <th>Descripción</th>
                <th>Obra</th>
                <th>A pagar</th>
                <th>Pagado</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {movConSaldo.map((m) => (
                <tr key={`${m._id}-${m.tipo}`}>
                  <td>{formatearFecha(m.fecha)}</td>
                  <td>{m.tipo === "Pago" ? <span style={{ textDecoration: "underline", textDecorationThickness: "1px", textUnderlineOffset: "4px" }}>{m.numeroFactura}</span> : m.numeroFactura}</td>
                  <td>{m.descripcion}</td>
                  <td className="text-muted">{m.obra || "-"}</td>
                  <td>{m.debito ? formatoMoneda(m.debito) : "-"}</td>
                  <td>{m.credito ? <span style={{ textDecoration: "underline", textDecorationThickness: "1px", textUnderlineOffset: "4px" }}>{formatoMoneda(m.credito)}</span> : "-"}</td>
                  <td className={m.saldo < 0 ? "text-success fw-semibold" : m.saldo > 0 ? "text-primary fw-semibold" : ""}>
                    {formatoMoneda(m.saldo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          </div>
        )
      )}
    </div>
  );
};

export default CuentaCorrienteProveedor;
