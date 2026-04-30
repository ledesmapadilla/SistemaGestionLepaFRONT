import React, { useState, useMemo } from "react";
import { Table, Dropdown, Button, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import XLSXStyle from "xlsx-js-style";

const hoy = new Date().toLocaleDateString("en-CA");

const USOS = ["En cartera", "Pago proveedores", "Depósito en banco", "Cambio", "Ahorro", "Otros"];

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

const formatoMoneda = (valor) =>
  Number(valor).toLocaleString("es-AR", { style: "currency", currency: "ARS" });

const formatearFecha = (fecha) => {
  if (!fecha) return "-";
  const p = fecha.split("-");
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : fecha;
};

const esVencido = (fecha) => !!fecha && fecha <= hoy;

const ChequesTabla = ({ cheques, onUtilizar, onVer }) => {
  const navigate = useNavigate();
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroNumero, setFiltroNumero] = useState("");
  const [filtroValor, setFiltroValor] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("En cartera");

  const unicos = (campo) => [...new Set(cheques.map((c) => c[campo]).filter(Boolean))].sort();

  const valoresUnicos = useMemo(
    () => [...new Set(cheques.map((c) => c.valor))].sort((a, b) => a - b),
    [cheques]
  );

  const filasFiltradas = useMemo(() => {
    return cheques.filter((c) => {
      if (filtroCliente && c.cliente !== filtroCliente) return false;
      if (filtroNumero && c.numeroCheque !== filtroNumero) return false;
      if (filtroValor && String(c.valor) !== filtroValor) return false;
      if (filtroFecha && c.fechaVencimiento !== filtroFecha) return false;
      if (filtroEstado && c.estado !== filtroEstado) return false;
      return true;
    });
  }, [cheques, filtroCliente, filtroNumero, filtroValor, filtroFecha, filtroEstado]);

  const exportarExcel = () => {
    const headers = ["Cliente", "N° de Cheque", "Valor", "Fecha Vencimiento", "Estado", "Observaciones"];
    const cols = ["A", "B", "C", "D", "E", "F"];
    const currencyFmt = '"$"#,##0.00';
    const centerAlign = { horizontal: "center", vertical: "center" };
    const leftAlign = { horizontal: "left", vertical: "center" };

    const ws = {};
    ws["A1"] = { v: "CHEQUES DE TERCEROS", t: "s", s: { font: { bold: true, sz: 14 }, alignment: leftAlign } };

    headers.forEach((h, i) => {
      ws[`${cols[i]}3`] = { v: h, t: "s", s: { font: { bold: true }, alignment: centerAlign } };
    });

    filasFiltradas.forEach((c, rowIdx) => {
      const estado = c.estado === "Pago proveedores" && c.proveedor ? `Pago proveedores — ${c.proveedor}` : c.estado;
      const fila = [c.cliente, c.numeroCheque, c.valor, formatearFecha(c.fechaVencimiento), estado, c.observaciones || "-"];
      fila.forEach((val, colIdx) => {
        const esCurrency = colIdx === 2;
        ws[`${cols[colIdx]}${rowIdx + 4}`] = {
          v: val ?? "-",
          t: esCurrency ? "n" : "s",
          ...(esCurrency ? { z: currencyFmt } : {}),
          s: { alignment: centerAlign, ...(esCurrency ? { numFmt: currencyFmt } : {}) },
        };
      });
    });

    ws["!ref"] = `A1:F${filasFiltradas.length + 3}`;
    ws["!cols"] = [{ wch: 28 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 30 }, { wch: 30 }];

    const libro = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(libro, ws, "Cheques");
    XLSXStyle.writeFile(libro, "Cheques_Terceros.xlsx");
  };

  const FiltroSelect = ({ value, onChange, placeholder, opciones, width = "180px" }) => (
    <div style={{ position: "relative", width }}>
      <Form.Select
        size="sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={value ? selectActivo : {}}
      >
        <option value="">{placeholder}</option>
        {opciones.map((op) => {
          const val = typeof op === "object" ? op.value : op;
          const label = typeof op === "object" ? op.label : op;
          return <option key={val} value={val}>{label}</option>;
        })}
      </Form.Select>
      {value && <span onClick={() => onChange("")} style={estiloX}>✕</span>}
    </div>
  );

  return (
    <div className="w-75 mx-auto my-2">
      <h6 className="text-center mb-2">Cheques de Terceros</h6>
      {(() => {
        const enCartera = cheques.filter((c) => c.estado === "En cartera");
        const montoTotal = enCartera.reduce((sum, c) => sum + (c.valor || 0), 0);
        return (
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div style={{ fontSize: "0.9rem" }}>
              <div>Cantidad de cheques en cartera: <strong style={{ color: "var(--lepa-orange)", fontSize: "1.1rem" }}>{enCartera.length}</strong></div>
              <div>Monto cheques en cartera: <strong style={{ color: "var(--lepa-orange)" }}>{formatoMoneda(montoTotal)}</strong></div>
            </div>
            <div className="d-flex gap-2">
              <Button size="sm" variant="outline-light" onClick={exportarExcel}>Excel</Button>
              <Button size="sm" variant="outline-success" onClick={() => navigate(-1)}>Volver</Button>
            </div>
          </div>
        );
      })()}

      <div className="d-flex flex-wrap gap-3 mb-3 align-items-center">
        <FiltroSelect
          value={filtroCliente}
          onChange={setFiltroCliente}
          placeholder="Cliente"
          opciones={unicos("cliente")}
          width="200px"
        />
        <FiltroSelect
          value={filtroNumero}
          onChange={setFiltroNumero}
          placeholder="N° Cheque"
          opciones={unicos("numeroCheque")}
          width="160px"
        />
        <FiltroSelect
          value={filtroValor}
          onChange={setFiltroValor}
          placeholder="Valor"
          opciones={valoresUnicos.map((v) => ({ value: String(v), label: formatoMoneda(v) }))}
          width="180px"
        />
        <FiltroSelect
          value={filtroFecha}
          onChange={setFiltroFecha}
          placeholder="Fecha vencimiento"
          opciones={unicos("fechaVencimiento").map((f) => ({ value: f, label: formatearFecha(f) }))}
          width="190px"
        />
        <FiltroSelect
          value={filtroEstado}
          onChange={setFiltroEstado}
          placeholder="Estado"
          opciones={unicos("estado")}
          width="160px"
        />
      </div>

      <Table striped bordered hover className="text-center align-middle">
        <thead className="table-dark">
          <tr>
            <th>Cliente</th>
            <th>N° de Cheque</th>
            <th>Valor</th>
            <th>Fecha Vencimiento</th>
            <th>Estado</th>
            <th>Observaciones</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filasFiltradas.length === 0 ? (
            <tr>
              <td colSpan="7">No hay cheques registrados</td>
            </tr>
          ) : (
            filasFiltradas.map((c) => (
              <tr key={c._id}>
                <td>{c.cliente}</td>
                <td>{c.numeroCheque}</td>
                <td className={esVencido(c.fechaVencimiento) ? "text-danger fw-bold" : ""}>
                  {formatoMoneda(c.valor)}
                </td>
                <td>{formatearFecha(c.fechaVencimiento)}</td>
                <td>{c.estado === "Pago proveedores" && c.proveedor ? `Pago proveedores — ${c.proveedor}` : c.estado}</td>
                <td>{c.observaciones || "-"}</td>
                <td className="d-flex gap-1 justify-content-center">
                  <Button size="sm" variant="outline-success" onClick={() => onVer(c)}>
                    Ver
                  </Button>
                  <Dropdown onSelect={(uso) => onUtilizar(c, uso)}>
                    <Dropdown.Toggle size="sm" variant="outline-primary">
                      Utilizar
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      {USOS.map((uso) => (
                        <Dropdown.Item key={uso} eventKey={uso}>
                          {uso}
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Menu>
                  </Dropdown>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
};

export default ChequesTabla;
