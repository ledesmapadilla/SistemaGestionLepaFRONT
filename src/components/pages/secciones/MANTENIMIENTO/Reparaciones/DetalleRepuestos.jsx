import { useState, useEffect } from "react";
import { Container, Button, Table, Form } from "react-bootstrap";
import Swal from "sweetalert2";
import XLSXStyle from "xlsx-js-style";

const ESTADOS = ["Pedido", "Pendiente", "En proceso", "En taller", "Colocado"];
const COLOR_ESTADO = {
  Pedido: "#0dcaf0",
  Pendiente: "#6c757d",
  "En proceso": "#ffc107",
  "En taller": "#fd7e14",
  Colocado: "#198754",
};

const filaVacia = () => ({
  id: crypto.randomUUID(),
  repuesto: "",
  cantidad: 1,
  precio: 0,
  proveedor: "",
  responsable: "",
  estado: "Pedido",
  observaciones: "",
});

const pesos = (n) =>
  (Number(n) || 0).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

// Input que muestra el valor con formato moneda mientras se escribe y queda
// vacío cuando el valor es 0 (en vez de mostrar "0").
const InputMoneda = ({ value, onChange }) => (
  <Form.Control
    size="sm"
    type="text"
    inputMode="numeric"
    value={Number(value) ? pesos(value) : ""}
    onChange={(e) => onChange(Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
  />
);

function DetalleRepuestos({ maquina, reparacion, onVolver, onGuardar }) {
  const [filas, setFilas] = useState(
    (reparacion?.repuestos || []).map((r) => ({ ...r, id: r.id || crypto.randomUUID() }))
  );
  const [editandoId, setEditandoId] = useState(null);

  // Guarda el estado actual de las filas en la base (guardado automático).
  const persistir = async (nuevasFilas) => {
    const res = await onGuardar(nuevasFilas);
    if (!res?.ok) {
      Swal.fire({ icon: "error", title: "Error", text: "No se pudieron guardar los cambios" });
    }
    return res;
  };

  // Salir del modo edición con la tecla Esc
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setEditandoId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const agregar = () => {
    const nueva = filaVacia();
    setFilas((p) => [...p, nueva]);
    setEditandoId(nueva.id);
  };
  const editar = (id, campo, valor) =>
    setFilas((p) => p.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)));
  const borrar = async (id) => {
    const nuevas = filas.filter((f) => f.id !== id);
    setFilas(nuevas);
    setEditandoId((prev) => (prev === id ? null : prev));
    await persistir(nuevas);
  };
  const finalizarEdicion = async () => {
    setEditandoId(null);
    const res = await persistir(filas);
    if (res?.ok) {
      Swal.fire({
        position: "center",
        icon: "success",
        title: "Cambios guardados",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
      });
    }
  };

  const total = filas.reduce(
    (s, f) => s + (Number(f.cantidad) || 0) * (Number(f.precio) || 0),
    0
  );

  const exportarExcel = () => {
    const titulo = `Repuestos - ${reparacion?.reparacion || "reparación"} (${maquina?.maquina || ""})`;
    const headers = ["#", "Repuesto", "Cantidad", "Precio", "Proveedor", "Responsable", "Estado", "Observaciones"];
    const cols = "ABCDEFGH";
    const moneda = { numFmt: "#,##0" };
    const estCentro = { alignment: { horizontal: "center", vertical: "center" } };
    const estIzq = { alignment: { horizontal: "left", vertical: "center" } };
    const estHeader = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "222222" } }, alignment: { horizontal: "center", vertical: "center" } };
    const estTitulo = { font: { bold: true, sz: 13 }, alignment: { horizontal: "left", vertical: "center" } };
    const estTotal = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "222222" } }, alignment: { horizontal: "center", vertical: "center" }, numFmt: "#,##0" };

    const wb = XLSXStyle.utils.book_new();
    const ws = {};

    const hoy = new Date();
    const fechaSerial = Math.round((Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) - Date.UTC(1899, 11, 30)) / 86400000);

    ws["A1"] = { v: titulo, t: "s", s: estTitulo };
    ws["A2"] = { v: fechaSerial, t: "n", s: { ...estTitulo, numFmt: "DD/MM/YYYY" } };
    ws["A3"] = { v: "", t: "s" };
    headers.forEach((h, i) => { ws[`${cols[i]}4`] = { v: h, t: "s", s: estHeader }; });

    filas.forEach((r, rowIdx) => {
      const row = rowIdx + 5;
      ws[`A${row}`] = { v: rowIdx + 1, t: "n", s: estCentro };
      ws[`B${row}`] = { v: r.repuesto || "", t: "s", s: estIzq };
      ws[`C${row}`] = { v: Number(r.cantidad) || 0, t: "n", s: estCentro };
      ws[`D${row}`] = { v: Number(r.precio) || 0, t: "n", s: { ...estCentro, ...moneda } };
      ws[`E${row}`] = { v: r.proveedor || "", t: "s", s: estCentro };
      ws[`F${row}`] = { v: r.responsable || "", t: "s", s: estCentro };
      ws[`G${row}`] = { v: r.estado || "", t: "s", s: estCentro };
      ws[`H${row}`] = { v: r.observaciones || "", t: "s", s: estIzq };
    });

    const totalRow = filas.length + 5;
    ["A", "B", "E", "F", "G", "H"].forEach((c) => { ws[`${c}${totalRow}`] = { v: "", t: "s", s: estTotal }; });
    ws[`C${totalRow}`] = { v: "Total", t: "s", s: estTotal };
    ws[`D${totalRow}`] = { v: total, t: "n", s: { ...estTotal, ...moneda } };

    ws["!ref"] = `A1:H${Math.max(totalRow, 4)}`;
    ws["!cols"] = [{ wch: 5 }, { wch: 32 }, { wch: 12 }, { wch: 14 }, { wch: 22 }, { wch: 20 }, { wch: 14 }, { wch: 28 }];

    XLSXStyle.utils.book_append_sheet(wb, ws, "Repuestos");
    XLSXStyle.writeFile(wb, `Repuestos_${reparacion?.reparacion || ""}.xlsx`);
  };

  return (
    <Container className="py-4">
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}
        className="mb-3"
      >
        <div></div>
        <h4 className="mb-0 text-center">
          Repuestos - {reparacion?.reparacion || "reparación"}
          <small className="text-muted ms-2" style={{ fontSize: "1rem", fontWeight: 400 }}>
            {maquina?.maquina}
          </small>
        </h4>
        <div className="d-flex gap-2 justify-content-end">
          <Button variant="outline-light" size="sm" onClick={exportarExcel}>
            Excel
          </Button>
          <Button variant="outline-success" size="sm" onClick={onVolver}>
            Volver
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <Button variant="outline-primary" size="sm" onClick={agregar}>
          Agregar repuesto
        </Button>
      </div>

      <div style={{ maxHeight: "65vh", overflowY: "auto" }}>
      <Table striped bordered hover size="sm" className="text-center align-middle mb-0">
        <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
          <tr>
            <th style={{ width: 40 }}>#</th>
            <th>Repuesto</th>
            <th style={{ width: 110 }}>Cantidad</th>
            <th style={{ width: 150 }}>Precio</th>
            <th style={{ width: 200 }}>Proveedor</th>
            <th style={{ width: 180 }}>Responsable</th>
            <th style={{ width: 140 }}>Estado</th>
            <th style={{ width: 220 }}>Observaciones</th>
            <th style={{ width: 160 }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && (
            <tr>
              <td colSpan={9} className="text-muted py-3">
                Sin repuestos cargados
              </td>
            </tr>
          )}
          {filas.map((f, idx) => {
            const editando = editandoId === f.id;
            return (
            <tr key={f.id}>
              <td className="text-muted">{idx + 1}</td>
              <td className="text-start">
                {editando ? (
                  <Form.Control
                    size="sm"
                    value={f.repuesto}
                    onChange={(e) => editar(f.id, "repuesto", e.target.value)}
                  />
                ) : (
                  f.repuesto || "-"
                )}
              </td>
              <td>
                {editando ? (
                  <Form.Control
                    type="number"
                    size="sm"
                    value={f.cantidad}
                    onChange={(e) => editar(f.id, "cantidad", e.target.value)}
                  />
                ) : (
                  Number(f.cantidad) || 0
                )}
              </td>
              <td>
                {editando ? (
                  <InputMoneda
                    value={f.precio}
                    onChange={(v) => editar(f.id, "precio", v)}
                  />
                ) : (
                  pesos(f.precio)
                )}
              </td>
              <td>
                {editando ? (
                  <Form.Control
                    size="sm"
                    value={f.proveedor}
                    onChange={(e) => editar(f.id, "proveedor", e.target.value)}
                  />
                ) : (
                  f.proveedor || "-"
                )}
              </td>
              <td>
                {editando ? (
                  <Form.Control
                    size="sm"
                    value={f.responsable}
                    onChange={(e) => editar(f.id, "responsable", e.target.value)}
                  />
                ) : (
                  f.responsable || "-"
                )}
              </td>
              <td>
                {editando ? (
                  <Form.Select
                    size="sm"
                    value={f.estado || "Pedido"}
                    onChange={(e) => editar(f.id, "estado", e.target.value)}
                  >
                    {ESTADOS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Form.Select>
                ) : (
                  <span style={{ color: COLOR_ESTADO[f.estado] || "#dee2e6", fontWeight: 600 }}>
                    {f.estado || "-"}
                  </span>
                )}
              </td>
              <td className={editando ? "" : "text-start"}>
                {editando ? (
                  <Form.Control
                    size="sm"
                    value={f.observaciones || ""}
                    onChange={(e) => editar(f.id, "observaciones", e.target.value)}
                  />
                ) : (
                  f.observaciones || "-"
                )}
              </td>
              <td>
                <div className="d-flex gap-1 justify-content-center align-items-center">
                  {editando ? (
                    <Button size="sm" variant="outline-success" onClick={finalizarEdicion}>
                      Listo
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline-warning" onClick={() => setEditandoId(f.id)}>
                      Editar
                    </Button>
                  )}
                  <Button size="sm" variant="outline-danger" onClick={() => borrar(f.id)}>
                    Borrar
                  </Button>
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
        {filas.length > 0 && (
          <tfoot>
            <tr className="table-dark">
              <td className="text-end" colSpan={3}>
                Total
              </td>
              <td>{pesos(total)}</td>
              <td colSpan={5} />
            </tr>
          </tfoot>
        )}
      </Table>
      </div>
    </Container>
  );
}

export default DetalleRepuestos;
