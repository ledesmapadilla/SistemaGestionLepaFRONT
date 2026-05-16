import { useState, useEffect, useMemo } from "react";
import { Button, Table, Container, Spinner, Modal, Form } from "react-bootstrap";
import XLSXStyle from "xlsx-js-style";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { listarPagosProveedores, borrarPagoProveedor } from "../../../../../helpers/queriesPagosProveedores";

const formatoMoneda = (valor) => {
  if (valor === undefined || valor === null) return "-";
  return Number(valor).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
};

const formatearFecha = (fecha) => {
  if (!fecha) return "-";
  const p = fecha.substring(0, 10).split("-");
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : fecha;
};

const totalFactura = (f) =>
  f?.tipoFactura === "Factura X" || f?.tipoFactura === "Factura B" ? f.total : (f?.total ?? 0) * 1.21;

const totalPago = (pago) =>
  (pago?.pagos || []).reduce((sum, p) => sum + (p.montoPagado || 0), 0);

const PagosProveedoresTabla = () => {
  const navigate = useNavigate();
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagoVerId, setPagoVerId] = useState(null);
  const pagoVer = pagos.find((p) => p._id === pagoVerId) || null;
  const [filtroProveedor, setFiltroProveedor] = useState("");
  const [filtroMedio, setFiltroMedio] = useState("");
  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");

  useEffect(() => {
    cargarPagos();
  }, []);

  const cargarPagos = async () => {
    try {
      const data = await listarPagosProveedores();
      setPagos(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const eliminar = async (id) => {
    const result = await Swal.fire({
      title: "¿Borrar pago?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: "swal-btn-danger" },
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    });
    if (result.isConfirmed) {
      const respuesta = await borrarPagoProveedor(id);
      if (respuesta?.ok) {
        setPagos(pagos.filter((p) => p._id !== id));
        Swal.fire({ icon: "success", title: "Pago eliminado", timer: 2000, showConfirmButton: false });
      }
    }
  };

  const exportarExcel = () => {
    const headers = ["Fecha", "Proveedor", "Facturas", "Obra", "Total factura", "Total pagado", "Saldo", "Medio de pago"];
    const cols = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const currencyFmt = '"$"#,##0.00';
    const centerAlign = { horizontal: "center", vertical: "center" };
    const leftAlign = { horizontal: "left", vertical: "center" };

    const filas = pagosFiltrados.map((p) => [
      formatearFecha(p.fecha),
      p.proveedor,
      (p.pagos || []).map((i) => `N°${i.factura?.numeroFactura}`).join(", "),
      [...new Set((p.pagos || []).map((i) => i.factura?.obra).filter(Boolean))].join(", ") || "-",
      (totalSaldoPorPago[p._id] ?? 0) + totalPago(p),
      totalPago(p),
      totalSaldoPorPago[p._id] ?? 0,
      (p.mediosPago || []).map((m) => m.medioPago).join(", ") || "-",
    ]);

    const ws = {};
    ws["A1"] = { v: "LISTADO DE PAGOS A PROVEEDORES", t: "s", s: { font: { bold: true, sz: 14 }, alignment: leftAlign } };
    ws["A2"] = { v: new Date().toLocaleDateString("es-AR"), t: "s", s: { alignment: leftAlign } };

    headers.forEach((h, i) => {
      ws[`${cols[i]}3`] = { v: h, t: "s", s: { font: { bold: true }, alignment: centerAlign } };
    });

    filas.forEach((fila, rowIdx) => {
      fila.forEach((val, colIdx) => {
        const isCurrency = [4, 5, 6].includes(colIdx) && typeof val === "number";
        ws[`${cols[colIdx]}${rowIdx + 4}`] = {
          v: val ?? "-",
          t: isCurrency ? "n" : "s",
          s: { alignment: centerAlign, ...(isCurrency ? { numFmt: currencyFmt } : {}) },
          ...(isCurrency ? { z: currencyFmt } : {}),
        };
      });
    });

    ws["!ref"] = `A1:H${filas.length + 3}`;
    ws["!cols"] = [{ wch: 12 }, { wch: 30 }, { wch: 24 }, { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 16 }];

    const libro = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(libro, ws, "Pagos Proveedores");
    XLSXStyle.writeFile(libro, "Listado_Pagos_Proveedores.xlsx");
  };

  const { saldosPorPago, totalSaldoPorPago } = useMemo(() => {
    const pagosAsc = [...pagos].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const runningPagado = {};
    const saldosPorPago = {};
    const totalSaldoPorPago = {};
    pagosAsc.forEach((pago) => {
      const saldosEstePago = {};
      let totalSaldo = 0;
      (pago.pagos || []).forEach((item) => {
        const id = item.factura?._id ?? item.factura;
        if (!id) return;
        runningPagado[id] = (runningPagado[id] || 0) + (item.montoPagado || 0);
        const saldo = totalFactura(item.factura) - runningPagado[id];
        saldosEstePago[id] = saldo;
        totalSaldo += saldo;
      });
      saldosPorPago[pago._id] = saldosEstePago;
      totalSaldoPorPago[pago._id] = totalSaldo;
    });
    return { saldosPorPago, totalSaldoPorPago };
  }, [pagos]);

  const proveedoresUnicos = useMemo(
    () => [...new Set(pagos.map((p) => p.proveedor).filter(Boolean))].sort(),
    [pagos]
  );

  const pagosFiltrados = useMemo(
    () => [...pagos].reverse().filter((p) => {
      const coincideProveedor = filtroProveedor === "" || p.proveedor === filtroProveedor;
      const coincideMedio =
        filtroMedio === "" ||
        (p.mediosPago || []).some((m) => m.medioPago === filtroMedio);
      const fecha = p.fecha?.split("T")[0] ?? "";
      const coincideDesde = filtroDesde === "" || fecha >= filtroDesde;
      const coincideHasta = filtroHasta === "" || fecha <= filtroHasta;
      return coincideProveedor && coincideMedio && coincideDesde && coincideHasta;
    }),
    [pagos, filtroProveedor, filtroMedio, filtroDesde, filtroHasta]
  );

  const estiloX = {
    position: "absolute", right: "10px", top: "50%",
    transform: "translateY(-50%)", cursor: "pointer",
    color: "#fff", fontSize: "14px", fontWeight: "900",
    zIndex: 5, userSelect: "none",
  };
  const selectActivo = { backgroundImage: "none" };

  return (
    <Container className="py-4">
      <h6 className="text-center mb-2">Pagos a Proveedores</h6>
      <div className="d-flex justify-content-end align-items-center mb-3">
        <div className="d-flex gap-2">
          <Button size="sm" variant="outline-light" onClick={exportarExcel}>Excel</Button>
          <Button size="sm" variant="outline-success" onClick={() => navigate(-1)}>Volver</Button>
          <Button size="sm" variant="outline-primary" onClick={() => navigate("/pago-proveedores/nuevo")}>Nuevo Pago</Button>
        </div>
      </div>

      <div className="d-flex flex-wrap gap-3 mb-3 align-items-center">
        <div style={{ position: "relative", width: "250px" }}>
          <Form.Select size="sm" value={filtroProveedor} onChange={(e) => setFiltroProveedor(e.target.value)} style={filtroProveedor ? selectActivo : {}}>
            <option value="">Proveedor</option>
            {proveedoresUnicos.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </Form.Select>
          {filtroProveedor && (
            <span onClick={() => setFiltroProveedor("")} style={estiloX}>✕</span>
          )}
        </div>

        <div style={{ position: "relative", width: "190px" }}>
          <Form.Select size="sm" value={filtroMedio} onChange={(e) => setFiltroMedio(e.target.value)} style={filtroMedio ? selectActivo : {}}>
            <option value="">Medio de pago</option>
            <option>Cheque propio</option>
            <option>Cheque tercero</option>
            <option>E-Cheq propio</option>
            <option>E-Cheq tercero</option>
            <option>Retenciones</option>
            <option>Efectivo</option>
            <option>Transferencia</option>
          </Form.Select>
          {filtroMedio && (
            <span onClick={() => setFiltroMedio("")} style={estiloX}>✕</span>
          )}
        </div>

        <div className="ms-auto d-flex align-items-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <Form.Label className="mb-0 text-nowrap small">Desde</Form.Label>
            <Form.Control size="sm" type="date" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} style={{ maxWidth: "160px" }} />
          </div>
          <div className="d-flex align-items-center gap-2">
            <Form.Label className="mb-0 text-nowrap small">Hasta</Form.Label>
            <Form.Control size="sm" type="date" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} style={{ maxWidth: "160px" }} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <Table striped bordered hover className="text-center align-middle" style={{ fontSize: "0.82rem" }}>
          <thead className="table-dark">
            <tr>
              <th>Fecha pago</th>
              <th>Proveedor</th>
              <th>Facturas</th>
              <th>Obra</th>
              <th>Total factura</th>
              <th>Total pagado</th>
              <th>Saldo</th>
              <th>Medio de pago</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pagosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-muted py-3">Sin pagos registrados</td>
              </tr>
            ) : (
              pagosFiltrados.map((p) => (
                <tr key={p._id}>
                  <td>{formatearFecha(p.fecha)}</td>
                  <td>{p.proveedor}</td>
                  <td className="text-muted">
                    {(p.pagos || []).map((i) => `N°${i.factura?.numeroFactura}`).join(", ")}
                  </td>
                  <td className="text-muted">
                    {[...new Set((p.pagos || []).map((i) => i.factura?.obra).filter(Boolean))].join(", ") || "-"}
                  </td>
                  <td>{formatoMoneda((totalSaldoPorPago[p._id] ?? 0) + totalPago(p))}</td>
                  <td>{formatoMoneda(totalPago(p))}</td>
                  <td>{formatoMoneda(totalSaldoPorPago[p._id] ?? 0)}</td>
                  <td>
                    {(p.mediosPago?.length > 0)
                      ? p.mediosPago.map((m) => m.medioPago).join(", ")
                      : "-"}
                  </td>
                  <td className="d-flex gap-1 justify-content-center align-items-center">
                    <Button size="sm" variant="outline-success" onClick={() => setPagoVerId(p._id)}>Ver</Button>
                    <Button size="sm" variant="outline-danger" onClick={() => eliminar(p._id)}>Borrar</Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      )}

      {/* Modal ver detalle */}
      <Modal show={!!pagoVerId} onHide={() => setPagoVerId(null)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Pago — {pagoVer?.proveedor}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex gap-4 mb-3 small">
            <span>Fecha de pago: {formatearFecha(pagoVer?.fecha)}</span>
            {pagoVer?.mediosPago?.length > 0 && (
              <span>
                Formas de pago:{" "}
                {pagoVer.mediosPago.map((m) => {
                  const esCheque = m.medioPago === "Cheque" || m.medioPago === "E-Cheq";
                  const extra = esCheque
                    ? ` — N°${m.numeroCheque || "-"} · Venc: ${m.fechaCobro ? formatearFecha(m.fechaCobro) : "-"}`
                    : "";
                  return `${m.medioPago} ${formatoMoneda(m.monto)}${extra}`;
                }).join(" | ")}
              </span>
            )}
          </div>
          <Table striped bordered hover className="text-center align-middle">
            <thead className="table-dark">
              <tr>
                <th>Tipo</th>
                <th>N° Factura</th>
                <th>Fecha factura</th>
                <th>Total factura</th>
                <th>Monto pagado</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {(pagoVer?.pagos || []).map((item, i) => (
                <tr key={i}>
                  <td>{item.factura?.tipoFactura}</td>
                  <td>{item.factura?.numeroFactura}</td>
                  <td>{formatearFecha(item.factura?.fecha)}</td>
                  <td>{formatoMoneda(totalFactura(item.factura))}</td>
                  <td>{formatoMoneda(item.montoPagado)}</td>
                  <td>{formatoMoneda(saldosPorPago[pagoVer?._id]?.[item.factura?._id] ?? 0)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot style={{ borderTop: "2px solid #ffc107" }}>
              <tr>
                <td colSpan={3} className="text-end">Total facturas:</td>
                <td>{formatoMoneda((pagoVer?.pagos || []).reduce((sum, item) => sum + totalFactura(item.factura), 0))}</td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td colSpan={3} className="text-end">Total pagado:</td>
                <td></td>
                <td>{formatoMoneda(totalPago(pagoVer))}</td>
                <td></td>
              </tr>
              <tr>
                <td colSpan={3} className="text-end">Saldo:</td>
                <td></td>
                <td></td>
                <td>{formatoMoneda(totalSaldoPorPago[pagoVer?._id] ?? 0)}</td>
              </tr>
            </tfoot>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setPagoVerId(null)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default PagosProveedoresTabla;
