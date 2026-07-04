import { useState, useEffect, useMemo } from "react";
import { Container, Button, Table, Form, Spinner } from "react-bootstrap";
import Swal from "sweetalert2";
import XLSXStyle from "xlsx-js-style";
import DetalleReparacion from "./DetalleReparacion";
import DetalleRepuestos from "./DetalleRepuestos";
import {
  obtenerReparacionesPorMaquina,
  guardarReparaciones,
} from "../../../../../helpers/queriesReparaciones";
import { obtenerTodosPendientes, guardarPendientes } from "../../../../../helpers/queriesPendientes";

const PARTES = [
  "Motor",
  "Hidráulico",
  "Eléctrico",
  "Electrónico",
  "Herrería",
  "Tren rodante",
  "Cabina",
  "Chapa",
  "Otra",
];
const PRIORIDADES = ["Normal", "Urgente", "Crítico"];
const ESTADOS = ["Pendiente", "En proceso", "Terminado"];
const COLOR_ESTADO = { Pendiente: "#6c757d", "En proceso": "#ffc107", Terminado: "#198754" };

const hoy = () => new Date().toISOString().split("T")[0];
const filaVacia = () => ({
  id: crypto.randomUUID(),
  fecha: hoy(),
  reparacion: "",
  descripcion: "",
  parte: "",
  prioridad: "Normal",
  estado: "Pendiente",
  maquinaParada: false,
  observaciones: "",
});

function HistorialReparaciones({ maquina, onVolver, onCambio, abrirRepuestosDe }) {
  const [filas, setFilas] = useState([]);
  const [docsPendientes, setDocsPendientes] = useState([]); // docs de Pendientes (para editar/borrar sus tareas)
  const [pendEdit, setPendEdit] = useState({}); // borrador de edición de tarea de pendientes
  const [detalleSel, setDetalleSel] = useState(null);
  const [repuestosSel, setRepuestosSel] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [editandoId, setEditandoId] = useState(null);
  const [filtroReparacion, setFiltroReparacion] = useState("");
  const [filtroParte, setFiltroParte] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("activas");

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      try {
        const [res, resPend] = await Promise.all([
          obtenerReparacionesPorMaquina(maquina?._id),
          obtenerTodosPendientes(),
        ]);
        if (res?.ok) {
          const data = await res.json();
          const items = (data?.reparaciones || []).map((r) => ({
            ...r,
            id: r.id || crypto.randomUUID(),
          }));
          setFilas(items);
          // Si venimos desde Pendientes con un repuesto, abrimos su detalle.
          if (abrirRepuestosDe && items.some((f) => f.id === abrirRepuestosDe)) {
            setRepuestosSel(abrirRepuestosDe);
          }
        }
        // Docs de Pendientes (para mostrar/editar/borrar sus tareas por máquina).
        if (resPend?.ok) {
          const docs = await resPend.json();
          setDocsPendientes(Array.isArray(docs) ? docs : []);
        }
      } catch (error) {
        console.error("Error al cargar reparaciones:", error);
      } finally {
        setCargando(false);
      }
    };
    if (maquina?._id) cargar();
    else setCargando(false);
  }, [maquina?._id, abrirRepuestosDe]);

  // Guarda el estado actual de las filas en la base (guardado automático).
  const persistir = async (nuevasFilas) => {
    const res = await guardarReparaciones(maquina?._id, nuevasFilas);
    if (!res?.ok) {
      Swal.fire({ icon: "error", title: "Error", text: "No se pudieron guardar los cambios" });
    } else if (onCambio) {
      onCambio(
        nuevasFilas.some((f) => f.estado === "Pendiente" || f.estado === "En proceso")
      );
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
    const { isConfirmed } = await Swal.fire({
      title: "¿Eliminar reparación?",
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: "swal-btn-danger" },
      confirmButtonText: "Sí, borrar",
    });
    if (!isConfirmed) return;
    const nuevas = filas.filter((f) => f.id !== id);
    setFilas(nuevas);
    setEditandoId((prev) => (prev === id ? null : prev));
    await persistir(nuevas);
    Swal.fire({
      position: "center",
      icon: "success",
      title: "Reparación eliminada",
      showConfirmButton: false,
      timer: 1500,
      timerProgressBar: true,
    });
  };

  const verObservacion = (texto) =>
    Swal.fire({
      title: "Observaciones",
      text: texto,
      confirmButtonText: "Cerrar",
      confirmButtonColor: "#6c757d",
    });

  const finalizarEdicion = async () => {
    const fila = filas.find((f) => f.id === editandoId);
    if (fila && !(fila.reparacion || "").trim()) {
      return Swal.fire({ icon: "warning", title: "Atención", text: "La reparación es obligatoria." });
    }
    if (fila && !fila.parte) {
      return Swal.fire({ icon: "warning", title: "Atención", text: "La parte es obligatoria." });
    }
    setEditandoId(null);
    const res = await persistir(filas);
    if (res?.ok) {
      Swal.fire({
        position: "center",
        icon: "success",
        title: "Reparación guardada",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
      });
    }
  };

  const guardarRepuestos = async (filaId, repuestos) => {
    const nuevasFilas = filas.map((f) =>
      f.id === filaId ? { ...f, repuestos } : f
    );
    setFilas(nuevasFilas);
    return await guardarReparaciones(maquina?._id, nuevasFilas);
  };

  const reparacionesUnicas = useMemo(
    () => [...new Set(filas.map((f) => f.reparacion).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [filas]
  );
  const partesUnicas = useMemo(
    () => [...new Set(filas.map((f) => f.parte).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [filas]
  );
  const filasFiltradas = useMemo(
    () =>
      filas.filter(
        (f) =>
          // La fila en edición no se filtra hasta confirmar con "Listo"
          f.id === editandoId ||
          ((!filtroReparacion || f.reparacion === filtroReparacion) &&
            (!filtroParte || f.parte === filtroParte) &&
            (filtroEstado === "" ||
              (filtroEstado === "activas"
                ? f.estado === "Pendiente" || f.estado === "En proceso"
                : f.estado === filtroEstado)))
      ),
    [filas, filtroReparacion, filtroParte, filtroEstado, editandoId]
  );

  // Tareas de Pendientes asignadas a esta máquina (derivadas de los docs).
  const pendientesMaquina = useMemo(() => {
    const nombreMaq = (maquina?.maquina || "").trim().toLowerCase();
    const rows = [];
    docsPendientes.forEach((doc) => {
      (doc.tareas || []).forEach((t) => {
        if ((t.maquina || "").trim().toLowerCase() === nombreMaq) {
          rows.push({
            id: `pend-${doc.responsable}-${t.id}`,
            taskId: t.id,
            responsable: doc.responsable,
            fecha: t.fecha || "",
            reparacion: t.tarea || "",
            estado: t.estado || "",
            observaciones: t.observaciones || "",
          });
        }
      });
    });
    return rows;
  }, [docsPendientes, maquina?.maquina]);

  const editarPendiente = (t) => {
    setEditandoId(t.id);
    setPendEdit({ fecha: t.fecha || "", reparacion: t.reparacion || "", estado: t.estado || "", observaciones: t.observaciones || "" });
  };

  const persistirPendientes = async (nuevosDocs, responsable, titulo) => {
    setDocsPendientes(nuevosDocs);
    const doc = nuevosDocs.find((d) => d.responsable === responsable);
    const res = await guardarPendientes(responsable, doc?.tareas || []);
    if (res?.ok) {
      Swal.fire({ position: "center", icon: "success", title: titulo, showConfirmButton: false, timer: 1200, timerProgressBar: true });
    } else {
      Swal.fire({ icon: "error", title: "Error", text: "No se pudieron guardar los cambios" });
    }
    return res;
  };

  const guardarPendiente = async (t) => {
    const nuevosDocs = docsPendientes.map((doc) => {
      if (doc.responsable !== t.responsable) return doc;
      const tareas = (doc.tareas || []).map((task) =>
        task.id === t.taskId ? { ...task, fecha: pendEdit.fecha, tarea: pendEdit.reparacion, estado: pendEdit.estado, observaciones: pendEdit.observaciones } : task
      );
      return { ...doc, tareas };
    });
    setEditandoId(null);
    await persistirPendientes(nuevosDocs, t.responsable, "Guardado");
  };

  const borrarPendiente = async (t) => {
    const { isConfirmed } = await Swal.fire({
      title: "¿Eliminar tarea?",
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: "swal-btn-danger" },
      confirmButtonText: "Sí, borrar",
    });
    if (!isConfirmed) return;
    const nuevosDocs = docsPendientes.map((doc) => {
      if (doc.responsable !== t.responsable) return doc;
      return { ...doc, tareas: (doc.tareas || []).filter((task) => task.id !== t.taskId) };
    });
    setEditandoId((prev) => (prev === t.id ? null : prev));
    await persistirPendientes(nuevosDocs, t.responsable, "Tarea eliminada");
  };

  // Nombres de reparaciones ya cargadas (para no duplicar tareas de Pendientes).
  const nombresReparaciones = useMemo(
    () => new Set(filas.map((f) => (f.reparacion || "").trim().toLowerCase()).filter(Boolean)),
    [filas]
  );

  // Tareas de Pendientes de esta máquina, respetando el filtro de estado.
  // Se ocultan si hay filtro por reparación o por parte (no aplican a ellas), y
  // se descartan las que ya existen como reparación (mismo nombre).
  const pendientesFiltradas = useMemo(
    () =>
      filtroReparacion || filtroParte
        ? []
        : pendientesMaquina.filter(
            (t) =>
              t.id === editandoId ||
              (!nombresReparaciones.has((t.reparacion || "").trim().toLowerCase()) &&
                (filtroEstado === "" ||
                  (filtroEstado === "activas"
                    ? t.estado === "Pendiente" || t.estado === "En proceso"
                    : t.estado === filtroEstado)))
          ),
    [pendientesMaquina, nombresReparaciones, filtroReparacion, filtroParte, filtroEstado, editandoId]
  );

  const exportarExcel = () => {
    const titulo = `Historial de reparaciones - ${maquina?.maquina || ""}`;
    const headers = ["Fecha", "Reparación", "Parte", "Prioridad", "Estado", "Observaciones"];
    const cols = "ABCDEF";
    const estCentro = { alignment: { horizontal: "center", vertical: "center" } };
    const estIzq = { alignment: { horizontal: "left", vertical: "center" } };
    const estHeader = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "222222" } }, alignment: { horizontal: "center", vertical: "center" } };
    const estTitulo = { font: { bold: true, sz: 13 }, alignment: { horizontal: "left", vertical: "center" } };

    const wb = XLSXStyle.utils.book_new();
    const ws = {};

    const hoy = new Date();
    const fechaSerial = Math.round((Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) - Date.UTC(1899, 11, 30)) / 86400000);

    ws["A1"] = { v: titulo, t: "s", s: estTitulo };
    ws["A2"] = { v: fechaSerial, t: "n", s: { ...estTitulo, numFmt: "DD/MM/YYYY" } };
    ws["A3"] = { v: "", t: "s" };
    headers.forEach((h, i) => { ws[`${cols[i]}4`] = { v: h, t: "s", s: estHeader }; });

    filasFiltradas.forEach((r, rowIdx) => {
      const row = rowIdx + 5;
      ws[`A${row}`] = { v: r.fecha ? r.fecha.split("-").reverse().join("/") : "", t: "s", s: estCentro };
      ws[`B${row}`] = { v: r.reparacion || "", t: "s", s: estIzq };
      ws[`C${row}`] = { v: r.parte || "", t: "s", s: estCentro };
      ws[`D${row}`] = { v: r.prioridad || "", t: "s", s: estCentro };
      ws[`E${row}`] = { v: r.estado || "", t: "s", s: estCentro };
      ws[`F${row}`] = { v: r.observaciones || "", t: "s", s: estIzq };
    });

    const lastRow = filasFiltradas.length + 4;
    ws["!ref"] = `A1:F${Math.max(lastRow, 4)}`;
    ws["!cols"] = [{ wch: 14 }, { wch: 36 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 30 }];

    XLSXStyle.utils.book_append_sheet(wb, ws, "Reparaciones");
    XLSXStyle.writeFile(wb, `HistorialReparaciones_${maquina?.maquina || ""}.xlsx`);
  };

  if (detalleSel)
    return (
      <DetalleReparacion
        maquina={maquina}
        reparacion={detalleSel}
        onVolver={() => setDetalleSel(null)}
      />
    );

  if (repuestosSel) {
    const fila = filas.find((f) => f.id === repuestosSel);
    return (
      <DetalleRepuestos
        maquina={maquina}
        reparacion={fila}
        onVolver={() => setRepuestosSel(null)}
        onGuardar={(reps) => guardarRepuestos(repuestosSel, reps)}
      />
    );
  }

  return (
    <Container className="py-4">
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}
        className="mb-3"
      >
        <div></div>
        <h4 className="mb-0 text-center">
          Reparaciones - {maquina?.maquina}
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
          Agregar reparación
        </Button>
      </div>

      {cargando ? (
        <Spinner animation="border" className="d-block mx-auto my-5" />
      ) : (
      <>
      <div className="d-flex gap-2 mb-3 w-75">
        <div className="position-relative" style={{ width: 220, flex: "0 0 220px" }}>
          <Form.Select
            size="sm"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            style={{ minWidth: 0, ...(filtroEstado !== "" ? { backgroundImage: "none" } : {}) }}
          >
            <option value="activas">Pendientes y en proceso</option>
            <option value="Pendiente">Pendiente</option>
            <option value="En proceso">En proceso</option>
            <option value="Terminado">Terminado</option>
            <option value="">Todos</option>
          </Form.Select>
          {filtroEstado !== "" && (
            <button
              type="button"
              className="btn btn-sm text-warning position-absolute top-50 translate-middle-y end-0 me-1 p-0 border-0 fw-bold"
              aria-label="Limpiar"
              onClick={() => setFiltroEstado("")}
            >
              ✕
            </button>
          )}
        </div>
        <div className="position-relative" style={{ width: 220, flex: "0 0 220px" }}>
          <Form.Select
            size="sm"
            value={filtroReparacion}
            onChange={(e) => setFiltroReparacion(e.target.value)}
            style={{ minWidth: 0, ...(filtroReparacion ? { backgroundImage: "none" } : {}) }}
          >
            <option value="">Reparación (todas)</option>
            {reparacionesUnicas.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Form.Select>
          {filtroReparacion && (
            <button
              type="button"
              className="btn btn-sm text-warning position-absolute top-50 translate-middle-y end-0 me-1 p-0 border-0 fw-bold"
              aria-label="Limpiar"
              onClick={() => setFiltroReparacion("")}
            >
              ✕
            </button>
          )}
        </div>
        <div className="position-relative" style={{ width: 220, flex: "0 0 220px" }}>
          <Form.Select
            size="sm"
            value={filtroParte}
            onChange={(e) => setFiltroParte(e.target.value)}
            style={{ minWidth: 0, ...(filtroParte ? { backgroundImage: "none" } : {}) }}
          >
            <option value="">Parte (todas)</option>
            {partesUnicas.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </Form.Select>
          {filtroParte && (
            <button
              type="button"
              className="btn btn-sm text-warning position-absolute top-50 translate-middle-y end-0 me-1 p-0 border-0 fw-bold"
              aria-label="Limpiar"
              onClick={() => setFiltroParte("")}
            >
              ✕
            </button>
          )}
        </div>
      </div>
      <div style={{ maxHeight: "65vh", overflowY: "auto" }}>
      <Table striped bordered hover size="sm" className="text-center align-middle mb-0" style={{ tableLayout: "fixed", width: "100%" }}>
        <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
          <tr>
            <th style={{ width: "9%" }}>Fecha</th>
            <th style={{ width: "20%" }}>Reparación</th>
            <th style={{ width: "5%" }}>Detalle</th>
            <th style={{ width: "10%" }}>Parte</th>
            <th style={{ width: "9%" }}>Prioridad</th>
            <th style={{ width: "10%" }}>Estado</th>
            <th style={{ width: "13%" }}>Observaciones</th>
            <th style={{ width: "7%" }}>Máquina parada</th>
            <th style={{ width: "5%" }}>Repuestos</th>
            <th style={{ width: "12%" }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filasFiltradas.length === 0 && pendientesFiltradas.length === 0 && (
            <tr>
              <td colSpan={10} className="text-muted py-3">
                Sin reparaciones cargadas
              </td>
            </tr>
          )}
          {pendientesFiltradas.map((t) => {
            const editandoPend = editandoId === t.id;
            return (
            <tr key={t.id} style={{ backgroundColor: "#eef4fb" }}>
              <td>
                {editandoPend ? (
                  <Form.Control type="date" size="sm" value={pendEdit.fecha || ""} onChange={(e) => setPendEdit((p) => ({ ...p, fecha: e.target.value }))} />
                ) : (
                  t.fecha ? t.fecha.split("-").reverse().join("/") : "-"
                )}
              </td>
              <td className="text-start" style={{ wordBreak: "break-word" }}>
                {editandoPend ? (
                  <Form.Control size="sm" value={pendEdit.reparacion || ""} onChange={(e) => setPendEdit((p) => ({ ...p, reparacion: e.target.value }))} />
                ) : (
                  <>
                    <span className="badge bg-info text-dark me-1" title="Tarea cargada en Pendientes">P</span>
                    {t.reparacion || "-"}
                  </>
                )}
              </td>
              <td>-</td>
              <td>-</td>
              <td>-</td>
              <td>
                {editandoPend ? (
                  <Form.Select size="sm" value={pendEdit.estado} onChange={(e) => setPendEdit((p) => ({ ...p, estado: e.target.value }))}>
                    {ESTADOS.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </Form.Select>
                ) : (
                  <span style={{ color: COLOR_ESTADO[t.estado] || "#dee2e6", fontWeight: 600 }}>{t.estado || "-"}</span>
                )}
              </td>
              <td className="text-start">
                {editandoPend ? (
                  <Form.Control size="sm" value={pendEdit.observaciones || ""} onChange={(e) => setPendEdit((p) => ({ ...p, observaciones: e.target.value }))} />
                ) : t.observaciones ? (
                  <Button size="sm" variant="outline-secondary" className="py-0 px-2" onClick={() => verObservacion(t.observaciones)}>Ver</Button>
                ) : "-"}
              </td>
              <td>-</td>
              <td>-</td>
              <td>
                <div className="d-flex gap-1 justify-content-center align-items-center flex-wrap">
                  {editandoPend ? (
                    <Button size="sm" variant="outline-success" onClick={() => guardarPendiente(t)}>Listo</Button>
                  ) : (
                    <Button size="sm" variant="outline-warning" onClick={() => editarPendiente(t)}>Editar</Button>
                  )}
                  <Button size="sm" variant="outline-danger" onClick={() => borrarPendiente(t)}>Borrar</Button>
                </div>
              </td>
            </tr>
            );
          })}
          {filasFiltradas.map((f) => {
            const editando = editandoId === f.id;
            return (
            <tr key={f.id}>
              <td>
                {editando ? (
                  <Form.Control
                    type="date"
                    size="sm"
                    value={f.fecha}
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
                    value={f.reparacion}
                    onChange={(e) => editar(f.id, "reparacion", e.target.value)}
                  />
                ) : (
                  f.reparacion || "-"
                )}
              </td>
              <td>
                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={() => setDetalleSel(f)}
                >
                  +
                </Button>
              </td>
              <td>
                {editando ? (
                  <Form.Select
                    size="sm"
                    value={f.parte}
                    onChange={(e) => editar(f.id, "parte", e.target.value)}
                  >
                    <option value="">—</option>
                    {PARTES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Form.Select>
                ) : (
                  f.parte || "-"
                )}
              </td>
              <td>
                {editando ? (
                  <Form.Select
                    size="sm"
                    value={f.prioridad}
                    onChange={(e) => editar(f.id, "prioridad", e.target.value)}
                  >
                    {PRIORIDADES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Form.Select>
                ) : (
                  f.prioridad || "-"
                )}
              </td>
              <td>
                {editando ? (
                  <Form.Select
                    size="sm"
                    value={f.estado}
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
              <td className="text-start" style={{ maxWidth: 220 }}>
                {editando ? (
                  <div className="d-flex align-items-center gap-1">
                    <Form.Control
                      size="sm"
                      value={f.observaciones || ""}
                      onChange={(e) => editar(f.id, "observaciones", e.target.value)}
                      style={{ minWidth: 0 }}
                    />
                    {f.observaciones && (
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        className="py-0 px-1 flex-shrink-0"
                        onClick={() => verObservacion(f.observaciones)}
                      >
                        Ver
                      </Button>
                    )}
                  </div>
                ) : f.observaciones ? (
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    className="py-0 px-2"
                    onClick={() => verObservacion(f.observaciones)}
                  >
                    Ver
                  </Button>
                ) : (
                  "-"
                )}
              </td>
              <td>
                <div className="d-flex justify-content-center">
                  {editando ? (
                    <input
                      type="checkbox"
                      checked={!!f.maquinaParada}
                      onChange={(e) => editar(f.id, "maquinaParada", e.target.checked)}
                      style={{ cursor: "pointer", accentColor: "#ff0000", width: 20, height: 20 }}
                    />
                  ) : f.maquinaParada ? (
                    <i className="bi bi-check-square-fill" style={{ color: "#ff0000", fontSize: 20 }} />
                  ) : (
                    <i className="bi bi-square" style={{ color: "#adb5bd", fontSize: 20 }} />
                  )}
                </div>
              </td>
              <td>
                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={() => setRepuestosSel(f.id)}
                >
                  +
                </Button>
              </td>
              <td>
                <div className="d-flex gap-1 justify-content-center align-items-center flex-wrap">
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
      </>
      )}
    </Container>
  );
}

export default HistorialReparaciones;
