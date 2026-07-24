import { useState, useEffect } from "react";
import { Container, Button, Row, Col, Table, Form } from "react-bootstrap";
import Swal from "sweetalert2";
import XLSXStyle from "xlsx-js-style";

const ESTADOS = ["Pendiente", "En proceso", "Terminado"];
const COLOR_ESTADO = { Pendiente: "#6c757d", "En proceso": "#ffc107", Terminado: "#198754" };
const RESPONSABLES = ["Zamorano", "Mauricio", "Nelson", "Juan José", "Nacho", "Agustín"];

const fmt = (iso) =>
  iso ? new Date(iso + "T12:00:00").toLocaleDateString("es-AR") : "—";

const hoy = () => new Date().toLocaleDateString("en-CA");

const filaVacia = () => ({
  id: crypto.randomUUID(),
  fecha: hoy(),
  tarea: "",
  responsable: "",
  estado: "Pendiente",
  observaciones: "",
});

const Item = ({ label, value }) => (
  <Col xs={6} md={4} className="mb-3">
    <div className="text-muted small">{label}</div>
    <div className="fw-semibold">{value || "—"}</div>
  </Col>
);

function DetalleReparacion({ maquina, reparacion, onVolver, onGuardar }) {
  const r = reparacion || {};
  const [filas, setFilas] = useState(
    (r.detalle || []).map((d) => ({ ...d, id: d.id || crypto.randomUUID() }))
  );
  const [editandoId, setEditandoId] = useState(null);
  const [otroResp, setOtroResp] = useState(() => new Set()); // filas en modo "Otro" responsable
  const [nuevas, setNuevas] = useState(() => new Set()); // filas nuevas sin guardar todavía

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
    setNuevas((prev) => new Set(prev).add(nueva.id));
  };
  const editar = (id, campo, valor) =>
    setFilas((p) => p.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)));

  const borrar = async (id) => {
    const { isConfirmed } = await Swal.fire({
      title: "¿Eliminar tarea?",
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: "swal-btn-danger" },
      confirmButtonText: "Sí, borrar",
    });
    if (!isConfirmed) return;
    const restantes = filas.filter((f) => f.id !== id);
    setFilas(restantes);
    setEditandoId((prev) => (prev === id ? null : prev));
    await persistir(restantes);
    Swal.fire({
      position: "center",
      icon: "success",
      title: "Tarea eliminada",
      showConfirmButton: false,
      timer: 1500,
      timerProgressBar: true,
    });
  };

  const finalizarEdicion = async () => {
    const id = editandoId;
    const fila = filas.find((f) => f.id === id);
    if (fila) {
      if (!(fila.tarea || "").trim())
        return Swal.fire({ icon: "warning", title: "Atención", text: "La tarea es obligatoria." });
      if (!(fila.responsable || "").trim())
        return Swal.fire({ icon: "warning", title: "Atención", text: "El responsable es obligatorio." });
    }
    const esNueva = nuevas.has(id);
    setEditandoId(null);
    const res = await persistir(filas);
    if (res?.ok) {
      setNuevas((prev) => { const n = new Set(prev); n.delete(id); return n; });
      Swal.fire({
        position: "center",
        icon: "success",
        title: esNueva ? "Tarea guardada" : "Tarea editada",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
      });
    }
  };

  const exportarExcel = () => {
    const titulo = `Detalle - ${r.reparacion || "reparación"} (${maquina?.maquina || ""})`;
    const headers = ["#", "Fecha", "Tarea / Avance", "Responsable", "Estado", "Observaciones"];
    const cols = "ABCDEF";
    const estCentro = { alignment: { horizontal: "center", vertical: "center" } };
    const estIzq = { alignment: { horizontal: "left", vertical: "center" } };
    const estHeader = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "222222" } }, alignment: { horizontal: "center", vertical: "center" } };
    const estTitulo = { font: { bold: true, sz: 13 }, alignment: { horizontal: "left", vertical: "center" } };

    const wb = XLSXStyle.utils.book_new();
    const ws = {};

    const ahora = new Date();
    const fechaSerial = Math.round((Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()) - Date.UTC(1899, 11, 30)) / 86400000);

    ws["A1"] = { v: titulo, t: "s", s: estTitulo };
    ws["A2"] = { v: fechaSerial, t: "n", s: { ...estTitulo, numFmt: "DD/MM/YYYY" } };
    ws["A3"] = { v: "", t: "s" };
    headers.forEach((h, i) => { ws[`${cols[i]}4`] = { v: h, t: "s", s: estHeader }; });

    filas.forEach((d, rowIdx) => {
      const row = rowIdx + 5;
      ws[`A${row}`] = { v: rowIdx + 1, t: "n", s: estCentro };
      ws[`B${row}`] = { v: d.fecha ? d.fecha.split("-").reverse().join("/") : "", t: "s", s: estCentro };
      ws[`C${row}`] = { v: d.tarea || "", t: "s", s: estIzq };
      ws[`D${row}`] = { v: d.responsable || "", t: "s", s: estCentro };
      ws[`E${row}`] = { v: d.estado || "", t: "s", s: estCentro };
      ws[`F${row}`] = { v: d.observaciones || "", t: "s", s: estIzq };
    });

    const lastRow = filas.length + 4;
    ws["!ref"] = `A1:F${Math.max(lastRow, 4)}`;
    ws["!cols"] = [{ wch: 5 }, { wch: 14 }, { wch: 40 }, { wch: 20 }, { wch: 16 }, { wch: 30 }];

    XLSXStyle.utils.book_append_sheet(wb, ws, "Detalle");
    XLSXStyle.writeFile(wb, `DetalleReparacion_${r.reparacion || ""}.xlsx`);
  };

  return (
    <Container className="py-4">
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}
        className="mb-3"
      >
        <div></div>
        <h4 className="mb-0 text-center">
          Detalle de reparación - {maquina?.maquina}
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

      <div
        className="border rounded p-3 mb-4"
        style={{ borderTop: "4px solid #8b4a4a" }}
      >
        <Row>
          <Item label="Fecha" value={fmt(r.fecha)} />
          <Item label="Reparación" value={r.reparacion} />
          <Item label="Parte" value={r.parte} />
          <Item label="Descripción" value={r.descripcion} />
          <Item label="Prioridad" value={r.prioridad} />
          <Item label="Estado" value={r.estado} />
        </Row>
      </div>

      <div className="mb-4">
        <Button variant="outline-primary" size="sm" onClick={agregar}>
          Agregar tarea
        </Button>
      </div>

      <div style={{ maxHeight: "55vh", overflowY: "auto" }}>
      <Table striped bordered hover size="sm" className="text-center align-middle mb-0">
        <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
          <tr>
            <th style={{ width: 40 }}>#</th>
            <th style={{ width: 140 }}>Fecha</th>
            <th style={{ minWidth: 300 }}>Tarea / Avance</th>
            <th style={{ width: 170 }}>Responsable</th>
            <th style={{ width: 140 }}>Estado</th>
            <th style={{ width: 220 }}>Observaciones</th>
            <th style={{ width: 150 }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && (
            <tr>
              <td colSpan={7} className="text-muted py-3">
                Sin tareas cargadas
              </td>
            </tr>
          )}
          {filas.map((f, idx) => {
            const editando = editandoId === f.id;
            return (
            <tr key={f.id}>
              <td className="text-muted">{idx + 1}</td>
              <td>
                {editando ? (
                  <Form.Control
                    type="date"
                    size="sm"
                    value={f.fecha || ""}
                    onChange={(e) => editar(f.id, "fecha", e.target.value)}
                  />
                ) : (
                  f.fecha ? f.fecha.split("-").reverse().join("/") : "-"
                )}
              </td>
              <td className="text-start" style={{ wordBreak: "break-word" }}>
                {editando ? (
                  <Form.Control
                    size="sm"
                    value={f.tarea}
                    onChange={(e) => editar(f.id, "tarea", e.target.value)}
                  />
                ) : (
                  f.tarea || "-"
                )}
              </td>
              <td>
                {editando ? (
                  <>
                    <Form.Select
                      size="sm"
                      value={
                        RESPONSABLES.includes(f.responsable)
                          ? f.responsable
                          : (f.responsable || otroResp.has(f.id)) ? "__otro__" : ""
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "__otro__") {
                          setOtroResp((prev) => new Set(prev).add(f.id));
                          editar(f.id, "responsable", "");
                        } else {
                          setOtroResp((prev) => { const n = new Set(prev); n.delete(f.id); return n; });
                          editar(f.id, "responsable", v);
                        }
                      }}
                    >
                      <option value="">Seleccionar...</option>
                      {RESPONSABLES.map((resp) => (
                        <option key={resp} value={resp}>{resp}</option>
                      ))}
                      <option value="__otro__">Otro...</option>
                    </Form.Select>
                    {(otroResp.has(f.id) || (f.responsable && !RESPONSABLES.includes(f.responsable))) && (
                      <Form.Control
                        size="sm"
                        className="mt-1"
                        placeholder="Nombre"
                        value={f.responsable}
                        onChange={(e) => editar(f.id, "responsable", e.target.value)}
                      />
                    )}
                  </>
                ) : (
                  f.responsable || "-"
                )}
              </td>
              <td>
                {editando ? (
                  <Form.Select
                    size="sm"
                    value={f.estado || "Pendiente"}
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
      </Table>
      </div>
    </Container>
  );
}

export default DetalleReparacion;
