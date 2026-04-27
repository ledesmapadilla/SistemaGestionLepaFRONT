import { useState, useEffect, useMemo } from "react";
import { Button, Table, Container, Form, Spinner } from "react-bootstrap";
import XLSXStyle from "xlsx-js-style";
import { useNavigate } from "react-router-dom";
import { obtenerCuentaCorriente } from "../../../../../helpers/queriesCuentaCorriente";

const formatoMoneda = (valor) => {
  if (valor === undefined || valor === null || valor === 0) return "-";
  return Number(valor).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
};

const formatearFecha = (fecha) => {
  if (!fecha) return "-";
  const p = fecha.split("-");
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : fecha;
};

const CuentaCorriente = () => {
  const navigate = useNavigate();
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroObra, setFiltroObra] = useState("");

  useEffect(() => {
    const cargar = async () => {
      try {
        const data = await obtenerCuentaCorriente();
        setTodos(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const clientes = useMemo(() => {
    return [...new Set(todos.map((m) => m.cliente).filter(Boolean))].sort();
  }, [todos]);

  const obrasDisponibles = useMemo(() => {
    if (!filtroCliente) return [];
    const base = todos.filter((m) => m.cliente === filtroCliente);
    const obras = base.flatMap((m) => m.obras || []).filter(Boolean);
    return [...new Set(obras)].sort();
  }, [todos, filtroCliente]);

  // Resumen por cliente (vista sin filtro)
  const resumenPorCliente = useMemo(() => {
    return clientes.map((c) => {
      const movs = todos.filter((m) => m.cliente === c);
      const debito = movs.reduce((s, m) => s + (m.debito || 0), 0);
      const credito = movs.reduce((s, m) => s + (m.credito || 0), 0);
      return { cliente: c, debito, credito, saldo: debito - credito };
    });
  }, [todos, clientes]);

  // Movimientos filtrados (vista con cliente seleccionado)
  const movFiltrados = useMemo(() => {
    let lista = todos.filter((m) => m.cliente === filtroCliente);
    if (filtroObra) lista = lista.filter((m) => (m.obras || []).includes(filtroObra));
    return lista;
  }, [todos, filtroCliente, filtroObra]);

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

  const handleCliente = (e) => {
    setFiltroCliente(e.target.value);
    setFiltroObra("");
  };

  const exportarExcel = () => {
    const centerAlign = { horizontal: "center", vertical: "center" };
    const leftAlign = { horizontal: "left", vertical: "center" };
    const currencyFmt = '"$"#,##0.00';
    const cols = ["A", "B", "C", "D", "E", "F", "G"];
    const libro = XLSXStyle.utils.book_new();

    if (!filtroCliente) {
      const ws = {};
      ws["A1"] = { v: "CUENTA CORRIENTE — Todos los clientes", t: "s", s: { font: { bold: true, sz: 14 }, alignment: leftAlign } };
      ["Cliente", "Facturado", "Cobrado", "Saldo"].forEach((h, i) => {
        ws[`${["A","B","C","D"][i]}3`] = { v: h, t: "s", s: { font: { bold: true }, alignment: centerAlign } };
      });
      resumenPorCliente.forEach((r, ri) => {
        const fila = [r.cliente, r.debito, r.credito, r.saldo];
        fila.forEach((val, ci) => {
          const isCurrency = ci > 0;
          ws[`${["A","B","C","D"][ci]}${ri + 4}`] = {
            v: val ?? "-", t: isCurrency ? "n" : "s",
            s: { alignment: centerAlign, ...(isCurrency ? { numFmt: currencyFmt } : {}) },
            ...(isCurrency ? { z: currencyFmt } : {}),
          };
        });
      });
      ws["!ref"] = `A1:D${resumenPorCliente.length + 3}`;
      ws["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
      XLSXStyle.utils.book_append_sheet(libro, ws, "Resumen");
      XLSXStyle.writeFile(libro, "CuentaCorriente_Todos.xlsx");
      return;
    }

    const titulo = `CUENTA CORRIENTE — ${filtroCliente}${filtroObra ? ` / ${filtroObra}` : ""}`;
    const headers = ["Fecha", "Tipo", "Descripción", "Obra", "Facturado", "Cobrado", "Saldo"];
    const numCols = new Set([4, 5, 6]);
    const ws = {};
    ws["A1"] = { v: titulo, t: "s", s: { font: { bold: true, sz: 14 }, alignment: leftAlign } };
    headers.forEach((h, i) => {
      ws[`${cols[i]}3`] = { v: h, t: "s", s: { font: { bold: true }, alignment: centerAlign } };
    });
    movConSaldo.forEach((m, ri) => {
      const fila = [
        formatearFecha(m.fecha), m.tipo, m.descripcion,
        (m.obras || []).join(", ") || "-",
        m.debito || 0, m.credito || 0, m.saldo ?? 0,
      ];
      fila.forEach((val, ci) => {
        const isCurrency = numCols.has(ci);
        ws[`${cols[ci]}${ri + 4}`] = {
          v: val ?? "-", t: isCurrency ? "n" : "s",
          s: { alignment: centerAlign, ...(isCurrency ? { numFmt: currencyFmt } : {}) },
          ...(isCurrency ? { z: currencyFmt } : {}),
        };
      });
    });
    ws["!ref"] = `A1:G${movConSaldo.length + 3}`;
    ws["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 28 }, { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
    XLSXStyle.utils.book_append_sheet(libro, ws, "Cuenta Corriente");
    XLSXStyle.writeFile(libro, `CuentaCorriente_${filtroCliente}${filtroObra ? `_${filtroObra}` : ""}.xlsx`);
  };

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Cuenta Corriente</h2>
        <div className="d-flex gap-2">
          {(filtroCliente ? movConSaldo.length : resumenPorCliente.length) > 0 && (
            <Button variant="outline-light" onClick={exportarExcel}>Excel</Button>
          )}
          <Button variant="outline-success" onClick={() => navigate(-1)}>Volver</Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "start", marginBottom: "1.5rem", gap: "1rem" }}>
        {/* Filtros apilados — izquierda */}
        <div className="d-flex flex-column gap-2">
          <div className="d-flex align-items-center gap-2">
            <Form.Label className="mb-0 text-nowrap" style={{ width: "55px" }}>Cliente</Form.Label>
            <div style={{ position: "relative", width: "260px" }}>
              <Form.Select
                value={filtroCliente}
                onChange={handleCliente}
                style={filtroCliente ? { backgroundImage: "none" } : {}}
              >
                <option value="">Todos los clientes</option>
                {clientes.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Form.Select>
              {filtroCliente && (
                <span onClick={() => { setFiltroCliente(""); setFiltroObra(""); }} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#fff", fontSize: "14px", fontWeight: "900", zIndex: 5, userSelect: "none" }}>✕</span>
              )}
            </div>
          </div>

          {filtroCliente && (
            <div className="d-flex align-items-center gap-2">
              <Form.Label className="mb-0 text-nowrap" style={{ width: "55px" }}>Obra</Form.Label>
              <div style={{ position: "relative", width: "260px" }}>
                <Form.Select
                  value={filtroObra}
                  onChange={(e) => setFiltroObra(e.target.value)}
                  disabled={obrasDisponibles.length === 0}
                  style={filtroObra ? { backgroundImage: "none" } : {}}
                >
                  <option value="">Todas las obras</option>
                  {obrasDisponibles.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </Form.Select>
                {filtroObra && (
                  <span onClick={() => setFiltroObra("")} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#fff", fontSize: "14px", fontWeight: "900", zIndex: 5, userSelect: "none" }}>✕</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Totales — centro */}
        {!loading && (filtroCliente ? movConSaldo.length : resumenPorCliente.length) > 0 ? (() => {
          const totFact = filtroCliente
            ? totalDebitos
            : resumenPorCliente.reduce((s, r) => s + r.debito, 0);
          const totCob = filtroCliente
            ? totalCreditos
            : resumenPorCliente.reduce((s, r) => s + r.credito, 0);
          const totSaldo = totFact - totCob;
          return (
            <div className="d-flex gap-3">
              <div className="border rounded px-3 py-1 text-center" style={{ minWidth: "150px" }}>
                <div className="text-muted" style={{ fontSize: "0.75rem" }}>Facturado</div>
                <div className="fw-bold" style={{ fontSize: "0.95rem" }}>{formatoMoneda(totFact)}</div>
              </div>
              <div className="border rounded px-3 py-1 text-center" style={{ minWidth: "150px" }}>
                <div className="text-muted" style={{ fontSize: "0.75rem" }}>Cobrado</div>
                <div className="fw-bold" style={{ fontSize: "0.95rem" }}>{formatoMoneda(totCob)}</div>
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

        {/* Espaciador derecho */}
        <div />
      </div>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : !filtroCliente ? (
        // Vista resumen: una fila por cliente
        resumenPorCliente.length === 0 ? (
          <p className="text-muted">Sin movimientos.</p>
        ) : (
          <Table striped bordered hover className="text-center align-middle">
            <thead className="table-dark">
              <tr>
                <th>Cliente</th>
                <th>Facturado</th>
                <th>Cobrado</th>
                <th>Saldo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {resumenPorCliente.map((r) => (
                <tr key={r.cliente}>
                  <td className="text-start fw-semibold">{r.cliente}</td>
                  <td>{formatoMoneda(r.debito)}</td>
                  <td>{formatoMoneda(r.credito)}</td>
                  <td className={r.saldo < 0 ? "text-success fw-semibold" : r.saldo > 0 ? "text-primary fw-semibold" : ""}>
                    {formatoMoneda(r.saldo)}
                  </td>
                  <td>
                    <Button size="sm" variant="outline-success" onClick={() => setFiltroCliente(r.cliente)}>Ver</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )
      ) : (
        // Vista detalle: movimientos del cliente seleccionado
        movConSaldo.length === 0 ? (
          <p className="text-muted">Sin movimientos para este cliente.</p>
        ) : (
          <Table striped bordered hover className="text-center align-middle">
            <thead className="table-dark">
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Obra</th>
                <th>Facturado</th>
                <th>Cobrado</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {movConSaldo.map((m) => (
                <tr key={`${m._id}-${m.tipo}`}>
                  <td>{formatearFecha(m.fecha)}</td>
                  <td>{m.tipo === "Cobro" ? <span style={{ textDecoration: "underline", textDecorationThickness: "1px", textUnderlineOffset: "4px" }}>Cobro</span> : m.tipo}</td>
                  <td>{m.descripcion}</td>
                  <td className="text-muted">{(m.obras || []).join(", ") || "-"}</td>
                  <td>{m.debito ? formatoMoneda(m.debito) : "-"}</td>
                  <td>{m.credito ? <span style={{ textDecoration: "underline", textDecorationThickness: "1px", textUnderlineOffset: "4px" }}>{formatoMoneda(m.credito)}</span> : "-"}</td>
                  <td className={m.saldo < 0 ? "text-success fw-semibold" : m.saldo > 0 ? "text-primary fw-semibold" : ""}>
                    {formatoMoneda(m.saldo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )
      )}
    </Container>
  );
};

export default CuentaCorriente;
