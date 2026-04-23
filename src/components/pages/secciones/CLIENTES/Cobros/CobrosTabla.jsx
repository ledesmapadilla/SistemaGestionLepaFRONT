import { useState, useEffect } from "react";
import { Button, Table, Container, Spinner, Modal, Form } from "react-bootstrap";
import XLSXStyle from "xlsx-js-style";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { listarCobros, borrarCobro } from "../../../../../helpers/queriesCobros";

const formatoMoneda = (valor) => {
  if (valor === undefined || valor === null) return "-";
  return Number(valor).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
};

const formatearFecha = (fecha) => {
  if (!fecha) return "-";
  const p = fecha.split("-");
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : fecha;
};

const totalConIva = (f) =>
  f?.tipoFactura === "Factura X" ? f.total : (f?.total ?? 0) * 1.21;

const totalCobro = (cobro) =>
  (cobro?.pagos || []).reduce((sum, p) => sum + (p.montoCobrado || 0), 0);

const obrasDelCobro = (cobro) => {
  const nombres = [...new Set(
    (cobro?.pagos || []).flatMap((p) =>
      (p.factura?.remitos || []).map((r) => r.obra?.nombreobra).filter(Boolean)
    )
  )];
  return nombres.join(", ") || "-";
};

const CobrosTabla = () => {
  const navigate = useNavigate();
  const [cobros, setCobros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cobroVerId, setCobroVerId] = useState(null);
  const cobroVer = cobros.find((c) => c._id === cobroVerId) || null;
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroMedio, setFiltroMedio] = useState("");
  const [filtroFactura, setFiltroFactura] = useState("");
  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");

  useEffect(() => {
    cargarCobros();
  }, []);

  const cargarCobros = async () => {
    try {
      const data = await listarCobros();
      setCobros(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const eliminar = async (id) => {
    const result = await Swal.fire({
      title: "¿Borrar cobro?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: "swal-btn-danger" },
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      const respuesta = await borrarCobro(id);
      if (respuesta?.ok) {
        setCobros(cobros.filter((c) => c._id !== id));
        Swal.fire({ icon: "success", title: "Cobro eliminado", timer: 2000, showConfirmButton: false });
      }
    }
  };

  const exportarExcel = () => {
    const headers = ["Fecha", "Cliente", "Obra", "Facturas", "Total cobrado", "Medio de pago"];
    const cols = ["A", "B", "C", "D", "E", "F"];
    const currencyFmt = '"$"#,##0.00';
    const centerAlign = { horizontal: "center", vertical: "center" };
    const leftAlign = { horizontal: "left", vertical: "center" };

    const filas = cobrosFiltrados.map((c) => [
      formatearFecha(c.fecha),
      c.cliente,
      obrasDelCobro(c),
      (c.pagos || []).map((p) => `N°${p.factura?.numeroFactura}`).join(", "),
      totalCobro(c),
      c.medioPago ||
        [...new Set((c.pagos || []).map((p) => p.medioPago).filter(Boolean))].join(", ") ||
        "-",
    ]);

    const ws = {};
    ws["A1"] = { v: "LISTADO DE COBROS", t: "s", s: { font: { bold: true, sz: 14 }, alignment: leftAlign } };

    headers.forEach((h, i) => {
      ws[`${cols[i]}3`] = { v: h, t: "s", s: { font: { bold: true }, alignment: centerAlign } };
    });

    filas.forEach((fila, rowIdx) => {
      fila.forEach((val, colIdx) => {
        const isCurrency = colIdx === 4 && typeof val === "number";
        ws[`${cols[colIdx]}${rowIdx + 4}`] = {
          v: val ?? "-",
          t: isCurrency ? "n" : "s",
          s: { alignment: centerAlign, ...(isCurrency ? { numFmt: currencyFmt } : {}) },
          ...(isCurrency ? { z: currencyFmt } : {}),
        };
      });
    });

    ws["!ref"] = `A1:F${filas.length + 3}`;
    ws["!cols"] = [{ wch: 12 }, { wch: 28 }, { wch: 24 }, { wch: 24 }, { wch: 16 }, { wch: 16 }];

    const libro = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(libro, ws, "Cobros");
    XLSXStyle.writeFile(libro, "Listado_Cobros.xlsx");
  };

  // Procesar cobros cronológicamente para calcular saldo acumulado por factura
  const cobrosAsc = [...cobros].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const runningCobrado = {};
  const saldosPorCobro = {};   // { cobroId: { facturaId: saldo } }
  const totalSaldoPorCobro = {}; // { cobroId: number }

  cobrosAsc.forEach((cobro) => {
    const saldosEsteCobro = {};
    let totalSaldo = 0;
    (cobro.pagos || []).forEach((pago) => {
      const id = pago.factura?._id ?? pago.factura;
      if (!id) return;
      runningCobrado[id] = (runningCobrado[id] || 0) + (pago.montoCobrado || 0);
      const saldo = Math.max(0, totalConIva(pago.factura) - runningCobrado[id]);
      saldosEsteCobro[id] = saldo;
      totalSaldo += saldo;
    });
    saldosPorCobro[cobro._id] = saldosEsteCobro;
    totalSaldoPorCobro[cobro._id] = totalSaldo;
  });

  const clientesUnicos = [...new Set(cobros.map((c) => c.cliente).filter(Boolean))].sort();

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

  const selectActivo = { backgroundImage: "none" };

  const facturasUnicas = [...new Set(
    cobros.flatMap((c) => (c.pagos || []).map((p) => p.factura?.numeroFactura).filter(Boolean))
  )].sort((a, b) => a - b);

  const cobrosFiltrados = [...cobros].reverse().filter((c) => {
    const coincideCliente = filtroCliente === "" || c.cliente === filtroCliente;
    const coincideMedio =
      filtroMedio === "" ||
      c.medioPago === filtroMedio ||
      (c.mediosPago || []).some((m) => m.medioPago === filtroMedio);
    const coincideFactura =
      filtroFactura === "" ||
      (c.pagos || []).some((p) => String(p.factura?.numeroFactura) === filtroFactura);
    const fecha = c.fecha?.split("T")[0] ?? "";
    const coincideDesde = filtroDesde === "" || fecha >= filtroDesde;
    const coincideHasta = filtroHasta === "" || fecha <= filtroHasta;
    return coincideCliente && coincideMedio && coincideFactura && coincideDesde && coincideHasta;
  });

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Cobros</h2>
        <div className="d-flex gap-2">
          <Button variant="outline-light" onClick={exportarExcel}>Excel</Button>
          <Button variant="outline-success" onClick={() => navigate(-1)}>Volver</Button>
          <Button variant="outline-primary" onClick={() => navigate("/cobro-factura/nuevo")}>Nuevo Cobro</Button>
        </div>
      </div>

      <div className="d-flex flex-wrap gap-3 mb-3 align-items-center">
        <div style={{ position: "relative", width: "220px" }}>
          <Form.Select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} style={filtroCliente ? selectActivo : {}}>
            <option value="">Cliente</option>
            {clientesUnicos.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Form.Select>
          {filtroCliente && (
            <span onClick={() => setFiltroCliente("")} style={estiloX}>✕</span>
          )}
        </div>

        <div style={{ position: "relative", width: "190px" }}>
          <Form.Select value={filtroMedio} onChange={(e) => setFiltroMedio(e.target.value)} style={filtroMedio ? selectActivo : {}}>
            <option value="">Medio de pago</option>
            <option>Efectivo</option>
            <option>Cheque</option>
            <option>E-Cheq</option>
            <option>Retenciones</option>
            <option>Transferencia</option>
          </Form.Select>
          {filtroMedio && (
            <span onClick={() => setFiltroMedio("")} style={estiloX}>✕</span>
          )}
        </div>

        <div style={{ position: "relative", width: "170px" }}>
          <Form.Select value={filtroFactura} onChange={(e) => setFiltroFactura(e.target.value)} style={filtroFactura ? selectActivo : {}}>
            <option value="">N° Factura</option>
            {facturasUnicas.map((n) => (
              <option key={n} value={String(n)}>N° {n}</option>
            ))}
          </Form.Select>
          {filtroFactura && (
            <span onClick={() => setFiltroFactura("")} style={estiloX}>✕</span>
          )}
        </div>

        <div className="ms-auto d-flex align-items-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <Form.Label className="mb-0 text-nowrap small">Desde</Form.Label>
            <Form.Control type="date" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} style={{ maxWidth: "160px" }} />
          </div>
          <div className="d-flex align-items-center gap-2">
            <Form.Label className="mb-0 text-nowrap small">Hasta</Form.Label>
            <Form.Control type="date" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} style={{ maxWidth: "160px" }} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <Table striped bordered hover className="text-center align-middle">
          <thead className="table-dark">
            <tr>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Obra</th>
              <th>Facturas</th>
              <th>Total cobrado</th>
              <th>Medio de pago</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cobrosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-muted py-3">Sin cobros registrados</td>
              </tr>
            ) : (
              cobrosFiltrados.map((c) => (
                <tr key={c._id}>
                  <td>{formatearFecha(c.fecha)}</td>
                  <td>{c.cliente}</td>
                  <td className="text-muted">{obrasDelCobro(c)}</td>
                  <td className="text-muted">
                    {(c.pagos || []).map((p) => `N°${p.factura?.numeroFactura}`).join(", ")}
                  </td>
                  <td>{formatoMoneda(totalCobro(c))}</td>
                  <td>
                    {(c.mediosPago?.length > 0)
                      ? c.mediosPago.map((m) => m.medioPago).join(", ")
                      : c.medioPago || "-"}
                  </td>
                  <td className="d-flex gap-1 justify-content-center align-items-center">
                    <Button variant="outline-success" size="sm" onClick={() => setCobroVerId(c._id)}>Ver</Button>
                    <Button variant="outline-warning" size="sm" onClick={() => navigate(`/cobro-factura/editar/${c._id}`)}>Editar</Button>
                    <Button variant="outline-danger" size="sm" onClick={() => eliminar(c._id)}>Borrar</Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      )}

      {/* Modal ver detalle */}
      <Modal show={!!cobroVerId} onHide={() => setCobroVerId(null)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Cobro — {cobroVer?.cliente}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex gap-4 mb-3 text-muted small">
            <span><strong>Fecha:</strong> {formatearFecha(cobroVer?.fecha)}</span>
            {cobroVer?.mediosPago?.length > 0 && (
              <span>
                <strong>Formas de pago:</strong>{" "}
                {cobroVer.mediosPago.map((m) => {
                  const esCheque = m.medioPago === "Cheque" || m.medioPago === "E-Cheq";
                  const extra = esCheque
                    ? ` — N°${m.numeroCheque || "-"} · Cobro: ${m.fechaCobro ? formatearFecha(m.fechaCobro) : "-"}`
                    : "";
                  return `${m.medioPago} ${formatoMoneda(m.monto)}${extra}`;
                }).join(" | ")}
              </span>
            )}
            {!cobroVer?.mediosPago?.length && cobroVer?.medioPago && (
              <span><strong>Forma de pago:</strong> {cobroVer.medioPago}</span>
            )}
          </div>
          <Table striped bordered hover className="text-center align-middle">
            <thead className="table-dark">
              <tr>
                <th>Tipo</th>
                <th>N° Factura</th>
                <th>Fecha factura</th>
                <th>Total (c/IVA)</th>
                <th>Monto cobrado</th>
                <th>Saldo</th>
                <th>Forma de pago</th>
              </tr>
            </thead>
            <tbody>
              {(cobroVer?.pagos || []).map((p, i) => (
                <tr key={i}>
                  <td>{p.factura?.tipoFactura}</td>
                  <td>{p.factura?.numeroFactura}</td>
                  <td>{formatearFecha(p.factura?.fecha)}</td>
                  <td>{formatoMoneda(totalConIva(p.factura))}</td>
                  <td>{formatoMoneda(p.montoCobrado)}</td>
                  <td>{formatoMoneda(saldosPorCobro[cobroVer?._id]?.[p.factura?._id] ?? 0)}</td>
                  <td>{p.medioPago || cobroVer?.medioPago || "-"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot style={{ borderTop: "2px solid #ffc107" }}>
              <tr>
                <td colSpan={4} className="text-end">Total facturas:</td>
                <td colSpan={3}>
                  {formatoMoneda(
                    (cobroVer?.pagos || []).reduce((sum, p) => sum + totalConIva(p.factura), 0)
                  )}
                </td>
              </tr>
              <tr>
                <td colSpan={4} className="text-end fw-bold">Total cobrado:</td>
                <td colSpan={3} className="fw-bold">{formatoMoneda(totalCobro(cobroVer))}</td>
              </tr>
            </tfoot>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setCobroVerId(null)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default CobrosTabla;
