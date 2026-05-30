import { useState, useEffect, useMemo } from "react";
import { Button, Table, Form, Spinner, Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import XLSXStyle from "xlsx-js-style";
import { listarChequesPropio, editarChequePropio, borrarChequePropio } from "../../../../../helpers/queriesChequesPropio";

const formatoMoneda = (valor) =>
  Number(valor).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const formatearFecha = (fecha) => {
  if (!fecha) return "-";
  const p = fecha.split("-");
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : fecha;
};

const esVencido = (fecha) => !!fecha && fecha <= new Date().toLocaleDateString("en-CA");

const estiloX = {
  position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
  cursor: "pointer", color: "#fff", fontSize: "14px", fontWeight: "900", zIndex: 5, userSelect: "none",
};
const selectActivo = { backgroundImage: "none" };

export default function ChequesPropio() {
  const navigate = useNavigate();
  const [cheques, setCheques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chequeVer, setChequeVer] = useState(null);
  const [filtroProveedor, setFiltroProveedor] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

  useEffect(() => {
    listarChequesPropio()
      .then((data) => setCheques(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const proveedoresUnicos = useMemo(
    () => [...new Set(cheques.map((c) => c.proveedor).filter(Boolean))].sort(),
    [cheques]
  );

  const chequesFiltrados = useMemo(
    () => cheques.filter((c) => {
      if (filtroProveedor && c.proveedor !== filtroProveedor) return false;
      if (filtroEstado && c.estado !== filtroEstado) return false;
      if (filtroTipo && c.tipo !== filtroTipo) return false;
      return true;
    }),
    [cheques, filtroProveedor, filtroEstado, filtroTipo]
  );

  const totalEnCartera = useMemo(
    () => cheques.filter((c) => c.estado === "Emitido").reduce((s, c) => s + (c.monto || 0), 0),
    [cheques]
  );

  const cambiarEstado = async (cheque, nuevoEstado) => {
    const res = await editarChequePropio(cheque._id, { estado: nuevoEstado });
    if (res?.ok) {
      setCheques((prev) => prev.map((c) => c._id === cheque._id ? { ...c, estado: nuevoEstado } : c));
      if (chequeVer?._id === cheque._id) setChequeVer((prev) => ({ ...prev, estado: nuevoEstado }));
    }
  };

  const eliminar = async (id) => {
    const { isConfirmed } = await Swal.fire({
      title: "¿Borrar cheque?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc3545",
    });
    if (!isConfirmed) return;
    const res = await borrarChequePropio(id);
    if (res?.ok) {
      setCheques((prev) => prev.filter((c) => c._id !== id));
      Swal.fire({ icon: "success", title: "Cheque eliminado", timer: 1500, showConfirmButton: false });
    } else {
      Swal.fire("Error", "No se pudo eliminar el cheque.", "error");
    }
  };

  const exportarExcel = () => {
    const headers = ["N° Cheque", "Tipo", "Proveedor", "Monto", "Fecha cobro", "Estado"];
    const cols = "ABCDEF";
    const estCentro = { alignment: { horizontal: "center", vertical: "center" } };
    const estHeader = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "222222" } }, alignment: { horizontal: "center", vertical: "center" } };
    const estTitulo = { font: { bold: true, sz: 13 }, alignment: { horizontal: "left", vertical: "center" } };
    const moneda = { numFmt: "#,##0" };

    const hoy = new Date();
    const fechaSerial = Math.round((Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) - Date.UTC(1899, 11, 30)) / 86400000);

    const wb = XLSXStyle.utils.book_new();
    const ws = {};
    ws["A1"] = { v: "Cheques Propios", t: "s", s: estTitulo };
    ws["A2"] = { v: fechaSerial, t: "n", s: { ...estTitulo, numFmt: "DD/MM/YYYY" } };
    ws["A3"] = { v: "", t: "s" };
    headers.forEach((h, i) => { ws[`${cols[i]}4`] = { v: h, t: "s", s: estHeader }; });

    chequesFiltrados.forEach((c, idx) => {
      const row = idx + 5;
      ws[`A${row}`] = { v: c.numeroCheque || "-", t: "s", s: estCentro };
      ws[`B${row}`] = { v: c.tipo || "-", t: "s", s: estCentro };
      ws[`C${row}`] = { v: c.proveedor || "-", t: "s", s: estCentro };
      ws[`D${row}`] = { v: c.monto || 0, t: "n", s: { ...estCentro, ...moneda } };
      ws[`E${row}`] = { v: formatearFecha(c.fechaCobro), t: "s", s: estCentro };
      ws[`F${row}`] = { v: c.estado || "-", t: "s", s: estCentro };
    });

    const lastRow = Math.max(chequesFiltrados.length + 4, 4);
    ws["!ref"] = `A1:F${lastRow}`;
    ws["!cols"] = [{ wch: 14 }, { wch: 10 }, { wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 12 }];
    XLSXStyle.utils.book_append_sheet(wb, ws, "Cheques Propios");
    XLSXStyle.writeFile(wb, "ChequesPropios.xlsx");
  };

  if (loading) return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <div className="w-75 mx-auto my-2">
      <h6 className="text-center mb-2">Cheques Propios</h6>

      <div className="d-flex justify-content-between align-items-start mb-3">
        <div style={{ fontSize: "0.9rem" }}>
          <div>Cheques emitidos: <strong style={{ color: "var(--lepa-orange)", fontSize: "1.1rem" }}>{cheques.filter((c) => c.estado === "Emitido").length}</strong></div>
          <div>Monto emitido: <strong style={{ color: "var(--lepa-orange)" }}>{formatoMoneda(totalEnCartera)}</strong></div>
        </div>
        <div className="d-flex gap-2">
          <Button size="sm" variant="outline-light" onClick={exportarExcel}>Excel</Button>
          <Button size="sm" variant="outline-success" onClick={() => navigate(-1)}>Volver</Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="d-flex flex-wrap gap-3 mb-3">
        <div style={{ position: "relative", width: 200 }}>
          <Form.Select size="sm" value={filtroProveedor} onChange={(e) => setFiltroProveedor(e.target.value)} style={filtroProveedor ? selectActivo : {}}>
            <option value="">Proveedor</option>
            {proveedoresUnicos.map((p) => <option key={p} value={p}>{p}</option>)}
          </Form.Select>
          {filtroProveedor && <span onClick={() => setFiltroProveedor("")} style={estiloX}>✕</span>}
        </div>
        <div style={{ position: "relative", width: 140 }}>
          <Form.Select size="sm" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} style={filtroTipo ? selectActivo : {}}>
            <option value="">Tipo</option>
            <option value="Físico">Físico</option>
            <option value="E-Cheq">E-Cheq</option>
          </Form.Select>
          {filtroTipo && <span onClick={() => setFiltroTipo("")} style={estiloX}>✕</span>}
        </div>
        <div style={{ position: "relative", width: 150 }}>
          <Form.Select size="sm" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={filtroEstado ? selectActivo : {}}>
            <option value="">Estado</option>
            <option value="Emitido">Emitido</option>
            <option value="Cobrado">Cobrado</option>
          </Form.Select>
          {filtroEstado && <span onClick={() => setFiltroEstado("")} style={estiloX}>✕</span>}
        </div>
      </div>

      <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
        <Table striped bordered hover className="text-center align-middle">
          <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
            <tr>
              <th>N° Cheque</th>
              <th>Tipo</th>
              <th>Proveedor</th>
              <th>Monto</th>
              <th>Fecha cobro</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {chequesFiltrados.length === 0 ? (
              <tr><td colSpan={7} className="text-muted py-3">Sin cheques registrados</td></tr>
            ) : (
              chequesFiltrados.map((c) => (
                <tr key={c._id}>
                  <td>{c.numeroCheque}</td>
                  <td>{c.tipo}</td>
                  <td>{c.proveedor}</td>
                  <td className={c.estado === "Emitido" && esVencido(c.fechaCobro) ? "text-danger fw-bold" : ""}>
                    {formatoMoneda(c.monto)}
                  </td>
                  <td>{formatearFecha(c.fechaCobro)}</td>
                  <td>
                    <span style={{ color: c.estado === "Cobrado" ? "#198754" : "#ffc107", fontWeight: 600 }}>
                      {c.estado}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-1 justify-content-center">
                      <Button size="sm" variant="outline-success" onClick={() => setChequeVer(c)}>Ver</Button>
                      <Button size="sm" variant="outline-danger" onClick={() => eliminar(c._id)}>Borrar</Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* Modal Ver */}
      <Modal show={!!chequeVer} onHide={() => setChequeVer(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Cheque N° {chequeVer?.numeroCheque}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-1"><strong>Tipo:</strong> {chequeVer?.tipo}</p>
          <p className="mb-1"><strong>Proveedor:</strong> {chequeVer?.proveedor}</p>
          <p className="mb-1"><strong>Monto:</strong> {chequeVer ? formatoMoneda(chequeVer.monto) : ""}</p>
          <p className="mb-1"><strong>Fecha de cobro:</strong> {formatearFecha(chequeVer?.fechaCobro)}</p>
          <p className="mb-3"><strong>Estado:</strong>{" "}
            <span style={{ color: chequeVer?.estado === "Cobrado" ? "#198754" : "#ffc107", fontWeight: 600 }}>
              {chequeVer?.estado}
            </span>
          </p>
          <div className="d-flex justify-content-center gap-2">
            {chequeVer?.estado === "Emitido" && (
              <Button variant="outline-success" size="sm" onClick={() => cambiarEstado(chequeVer, "Cobrado")}>
                Marcar como Cobrado
              </Button>
            )}
            {chequeVer?.estado === "Cobrado" && (
              <Button variant="outline-warning" size="sm" onClick={() => cambiarEstado(chequeVer, "Emitido")}>
                Volver a Emitido
              </Button>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={() => setChequeVer(null)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
