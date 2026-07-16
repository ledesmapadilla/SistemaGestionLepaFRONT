import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Col, Container, Form, Modal, Row, Spinner, Table } from "react-bootstrap";
import Swal from "sweetalert2";
import XLSXStyle from "xlsx-js-style";
import { obtenerTodosPendientes, guardarPendientes } from "../../../../helpers/queriesPendientes";
import { obtenerTodasReparaciones, guardarReparaciones } from "../../../../helpers/queriesReparaciones";
import { listarMaquinas } from "../../../../helpers/queriesMaquinas";
import { usePendientesModal } from "../../../../context/PendientesModalContext";

// Mismos responsables que el select de repuestos.
const RESPONSABLES = [
  { nombre: "Zamorano", color: "#0d6efd" },
  { nombre: "Mauricio", color: "#198754" },
  { nombre: "Nelson", color: "#dc3545" },
  { nombre: "Juan José", color: "#6f42c1" },
  { nombre: "Nacho", color: "#fd7e14" },
  { nombre: "Agustín", color: "#0dcaf0" },
];

const ESTADOS = ["Pendiente", "En proceso", "Terminado"];
const ESTADOS_REPUESTO = ["Pedido", "Pendiente", "En taller", "Colocado"];

// Estilo estándar del proyecto para el botón ✕ que limpia un select de filtro.
const estiloX = {
  position: "absolute", right: "10px", top: "50%",
  transform: "translateY(-50%)", cursor: "pointer",
  color: "#fff", fontSize: "14px", fontWeight: "900",
  zIndex: 5, userSelect: "none",
};
const COLOR_ESTADO = {
  Pendiente: "#6c757d",
  "En proceso": "#ffc107",
  Terminado: "#198754",
  // Estados de repuestos
  Pedido: "#0dcaf0",
  "En taller": "#fd7e14",
  Colocado: "#198754",
};

const hoy = () => new Date().toLocaleDateString("en-CA");

const parseFechaLocal = (f) => {
  const [y, m, d] = f.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// Días desde que se generó la tarea (fecha). Suma hasta hoy mientras no esté
// terminada; si tiene fechaTerminado, el conteo se congela en esa fecha.
const diasPendiente = (fecha, fechaTerminado) => {
  if (!fecha) return "-";
  const inicio = parseFechaLocal(fecha);
  let fin;
  if (fechaTerminado) {
    fin = parseFechaLocal(fechaTerminado);
  } else {
    const a = new Date();
    fin = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  }
  const diff = Math.floor((fin - inicio) / 86400000);
  return diff < 0 ? 0 : diff;
};

const filaVacia = () => ({
  id: crypto.randomUUID(),
  fecha: hoy(),
  maquina: "",
  tarea: "",
  estado: "Pendiente",
  observaciones: "",
});

export default function Pendientes() {
  const navigate = useNavigate();
  const pendientesModal = usePendientesModal();
  const [modalResp, setModalResp] = useState(null);   // responsable abierto
  const [tareasPorResp, setTareasPorResp] = useState({});
  // Docs de reparaciones por máquina (fuente de las filas derivadas de Zamorano).
  const [docsReparaciones, setDocsReparaciones] = useState([]);
  // Todas las máquinas (mismas tarjetas que Mantenimiento > Reparaciones).
  const [maquinas, setMaquinas] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [derivadoEdit, setDerivadoEdit] = useState({}); // borrador de edición de fila derivada
  const [nuevas, setNuevas] = useState(() => new Set()); // tareas manuales nuevas sin guardar
  const cancelarRef = useRef(() => {});
  const [cargando, setCargando] = useState(true);
  // Filtros del modal. Por defecto se ven las activas (no terminadas/colocadas).
  const [filtroEstado, setFiltroEstado] = useState("activas");
  const [filtroMaquina, setFiltroMaquina] = useState("");
  const [filtroTarea, setFiltroTarea] = useState("");

  useEffect(() => {
    const cargar = async () => {
      try {
        const [resPend, resReps, resMaq] = await Promise.all([
          obtenerTodosPendientes(),
          obtenerTodasReparaciones(),
          listarMaquinas(),
        ]);

        if (resMaq?.ok) {
          const dataMaq = await resMaq.json();
          setMaquinas(Array.isArray(dataMaq) ? dataMaq : []);
        }

        if (resPend?.ok) {
          const data = await resPend.json();
          const mapa = {};
          (Array.isArray(data) ? data : []).forEach((doc) => {
            mapa[doc.responsable] = (doc.tareas || []).map((t) => ({
              ...t,
              id: t.id || crypto.randomUUID(),
            }));
          });
          setTareasPorResp(mapa);
        }

        if (resReps?.ok) {
          const docs = await resReps.json();
          setDocsReparaciones(Array.isArray(docs) ? docs : []);
        }
      } catch (error) {
        console.error("Error al cargar pendientes:", error);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  // Salir del modo edición con Esc (descartando la fila nueva incompleta).
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") cancelarRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Si se abrió desde el resumen para un responsable, abrir su planilla directo.
  useEffect(() => {
    const nombre = pendientesModal?.respInicial;
    if (nombre) {
      const r = RESPONSABLES.find((x) => x.nombre === nombre);
      if (r) abrir(r);
      pendientesModal.consumirResp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tareas = modalResp ? tareasPorResp[modalResp.nombre] || [] : [];

  // Filas derivadas de reparaciones: las reparaciones se asignan solo a Zamorano;
  // los repuestos se asignan a su responsable (Zamorano, Nelson, etc.).
  const derivadas = useMemo(() => {
    const rows = [];
    docsReparaciones.forEach((doc) => {
      const nombreMaq = doc.maquina?.maquina || "Máquina";
      const maquinaId = doc.maquina?._id || null;
      (doc.reparaciones || []).forEach((r, ri) => {
        rows.push({
          id: `rep-${maquinaId || nombreMaq}-${r.id || ri}`,
          tipo: "reparacion",
          responsable: "Zamorano",
          maquinaId,
          reparacionId: r.id,
          reparacionIndex: ri,
          fecha: r.fecha,
          maquina: nombreMaq,
          tarea: r.reparacion,
          estado: r.estado,
          observaciones: r.observaciones || "",
        });
        // Repuestos: van a la tarjeta de su responsable (cualquier estado; el filtro controla la vista).
        (r.repuestos || []).forEach((rep, pi) => {
          if (rep.responsable) {
            rows.push({
              id: `repu-${maquinaId || nombreMaq}-${r.id || ri}-${rep.id || pi}`,
              tipo: "repuesto",
              responsable: rep.responsable,
              maquinaId,
              reparacionId: r.id,
              reparacionIndex: ri,
              repuestoIndex: pi,
              fecha: r.fecha,
              maquina: nombreMaq,
              tarea: rep.repuesto,
              estado: rep.estado,
              observaciones: rep.observaciones || "",
            });
          }
        });
      });
    });
    return rows;
  }, [docsReparaciones]);

  // Filas de reparaciones/repuestos del responsable abierto (tolerante a espacios).
  const filasDerivadas = modalResp
    ? derivadas.filter((d) => (d.responsable || "").trim() === modalResp.nombre.trim())
    : [];

  // Máquinas para el select al cargar una tarea (todas las tarjetas de Reparaciones).
  // Las camionetas (Fiat, Nissan, Ranger) van juntas al final del listado.
  const CAMIONETAS = ["Fiat", "Nissan", "Ranger"];
  const maquinasReparaciones = [...new Set(maquinas.map((m) => m.maquina).filter(Boolean))]
    .sort((a, b) => {
      const ca = CAMIONETAS.indexOf(a);
      const cb = CAMIONETAS.indexOf(b);
      if (ca !== -1 && cb !== -1) return ca - cb;
      if (ca !== -1) return 1;
      if (cb !== -1) return -1;
      return a.localeCompare(b, "es", { numeric: true });
    });

  // Opciones de los filtros (a partir de todas las filas del responsable abierto).
  const filasModal = [...filasDerivadas, ...tareas];
  const maquinasUnicas = [...new Set(filasModal.map((f) => f.maquina).filter(Boolean))].sort();
  const tareasUnicas = [...new Set(filasModal.map((f) => f.tarea).filter(Boolean))].sort();

  const coincideFiltro = (f) =>
    (filtroEstado === "" ||
      (filtroEstado === "activas"
        ? ["Pedido", "Pendiente", "En proceso"].includes(f.estado)
        : f.estado === filtroEstado)) &&
    (filtroMaquina === "" || f.maquina === filtroMaquina) &&
    (filtroTarea === "" || f.tarea === filtroTarea);

  const derivadasFiltradas = filasDerivadas.filter((f) => f.id === editandoId || coincideFiltro(f));
  const tareasFiltradas = tareas.filter((f) => f.id === editandoId || coincideFiltro(f));

  const setTareas = (nuevas) =>
    setTareasPorResp((prev) => ({ ...prev, [modalResp.nombre]: nuevas }));

  // Guarda en la base las tareas del responsable (guardado automático).
  const persistir = async (nuevas) => {
    const res = await guardarPendientes(modalResp.nombre, nuevas);
    if (!res?.ok) {
      Swal.fire({ icon: "error", title: "Error", text: "No se pudieron guardar los cambios" });
    }
    return res;
  };

  // Si la tarea está vinculada a una reparación (reparacionId), copia sus campos
  // comunes a esa reparación y guarda su máquina (sincronización interna).
  const sincronizarReparacionDesdeTarea = async (tarea) => {
    if (!tarea) return;
    const nombreMaq = (tarea.maquina || "").trim().toLowerCase();
    const nombreTarea = (tarea.tarea || "").trim().toLowerCase();
    const maquinasAfectadas = new Set();
    const nuevosDocs = docsReparaciones.map((doc) => {
      const maq = (doc.maquina?.maquina || "").trim().toLowerCase();
      const reparaciones = (doc.reparaciones || []).map((r) => {
        const porVinculo = tarea.reparacionId && r.id === tarea.reparacionId;
        const porNombre = maq === nombreMaq && (r.reparacion || "").trim().toLowerCase() === nombreTarea;
        if (porVinculo || porNombre) {
          maquinasAfectadas.add(String(doc.maquina?._id));
          return { ...r, fecha: tarea.fecha, reparacion: tarea.tarea, estado: tarea.estado, observaciones: tarea.observaciones };
        }
        return r;
      });
      return { ...doc, reparaciones };
    });
    if (maquinasAfectadas.size === 0) return;
    setDocsReparaciones(nuevosDocs);
    await Promise.all(
      [...maquinasAfectadas].map((mid) => {
        const doc = nuevosDocs.find((d) => String(d.maquina?._id) === String(mid));
        return guardarReparaciones(mid, doc?.reparaciones || []);
      })
    );
  };

  // Inverso: sincroniza la(s) tarea(s) vinculadas a esta reparación (por vínculo
  // o por máquina + nombre).
  const sincronizarTareaDesdeReparacion = async (rep, maquinaNombre) => {
    if (!rep) return;
    const nombreMaq = (maquinaNombre || "").trim().toLowerCase();
    const nombreRep = (rep.reparacion || "").trim().toLowerCase();
    const afectados = new Set();
    const nuevoMapa = {};
    Object.entries(tareasPorResp).forEach(([resp, ts]) => {
      nuevoMapa[resp] = (ts || []).map((task) => {
        const porVinculo = rep.pendResp && rep.pendTaskId && resp === rep.pendResp && task.id === rep.pendTaskId;
        const porNombre = (task.maquina || "").trim().toLowerCase() === nombreMaq && (task.tarea || "").trim().toLowerCase() === nombreRep;
        if (porVinculo || porNombre) {
          afectados.add(resp);
          return { ...task, fecha: rep.fecha, tarea: rep.reparacion, estado: rep.estado, observaciones: rep.observaciones };
        }
        return task;
      });
    });
    if (afectados.size === 0) return;
    setTareasPorResp(nuevoMapa);
    await Promise.all([...afectados].map((resp) => guardarPendientes(resp, nuevoMapa[resp])));
  };

  // Si la fila en edición es nueva y sin guardar, la descarta (evita que quede
  // una tarea incompleta —p. ej. sin máquina— y se persista en el próximo guardado).
  const descartarSiNueva = () => {
    if (editandoId && nuevas.has(editandoId)) {
      setTareas(tareas.filter((t) => t.id !== editandoId));
      setNuevas((prev) => { const n = new Set(prev); n.delete(editandoId); return n; });
    }
  };
  cancelarRef.current = () => { descartarSiNueva(); setEditandoId(null); };

  const limpiarFiltros = () => { setFiltroEstado("activas"); setFiltroMaquina(""); setFiltroTarea(""); };
  const abrir = (r) => { setModalResp(r); setEditandoId(null); limpiarFiltros(); };
  const cerrar = () => { descartarSiNueva(); setModalResp(null); setEditandoId(null); limpiarFiltros(); };

  // Navega al módulo de reparaciones abriendo la máquina (y los repuestos) correspondientes.
  const irAReparaciones = (t) => {
    pendientesModal?.cerrar();
    navigate("/mantenimiento/reparaciones", {
      state: { maquinaId: t.maquinaId, repuestosDe: t.tipo === "repuesto" ? t.reparacionId : undefined },
    });
  };

  const verObservacion = (texto) =>
    Swal.fire({ title: "Observaciones", text: texto, confirmButtonText: "Cerrar", confirmButtonColor: "#6c757d" });

  // Exporta a Excel las tareas visibles del responsable abierto.
  const exportarExcelPendientes = () => {
    const nombre = modalResp?.nombre || "";
    const filas = [...derivadasFiltradas, ...tareasFiltradas];
    const headers = ["Fecha", "Máquina", "Tarea", "Días pendiente", "Estado", "Observaciones"];
    const cols = ["A", "B", "C", "D", "E", "F"];
    const centerAlign = { horizontal: "center", vertical: "center" };
    const leftAlign = { horizontal: "left", vertical: "center" };

    const ws = {};
    ws["A1"] = { v: `TAREAS PENDIENTES - ${nombre.toUpperCase()}`, t: "s", s: { font: { bold: true, sz: 14 }, alignment: leftAlign } };
    ws["A2"] = { v: `Fecha: ${new Date().toLocaleDateString("es-AR")}`, t: "s", s: { alignment: leftAlign } };
    headers.forEach((h, i) => {
      ws[`${cols[i]}3`] = { v: h, t: "s", s: { font: { bold: true }, alignment: centerAlign } };
    });
    filas.forEach((f, idx) => {
      const row = idx + 4;
      const vals = [
        f.fecha ? f.fecha.split("-").reverse().join("/") : "-",
        f.maquina || "-",
        f.tarea || "-",
        diasPendiente(f.fecha, f.fechaTerminado),
        f.estado || "-",
        f.observaciones || "-",
      ];
      vals.forEach((v, i) => {
        ws[`${cols[i]}${row}`] = { v: v ?? "-", t: typeof v === "number" ? "n" : "s", s: { alignment: i === 2 || i === 5 ? leftAlign : centerAlign } };
      });
    });

    ws["!ref"] = `A1:F${filas.length + 3}`;
    ws["!cols"] = [{ wch: 12 }, { wch: 16 }, { wch: 34 }, { wch: 14 }, { wch: 14 }, { wch: 30 }];

    const libro = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(libro, ws, "Pendientes");
    XLSXStyle.writeFile(libro, `Pendientes_${nombre}.xlsx`);
  };

  const editarDerivado = (t) => {
    setEditandoId(t.id);
    setDerivadoEdit({ fecha: t.fecha || "", tarea: t.tarea || "", estado: t.estado, observaciones: t.observaciones || "" });
  };

  // Persiste los docs de reparaciones de la máquina afectada y avisa.
  const persistirDocsReparaciones = async (nuevosDocs, maquinaId, titulo) => {
    setDocsReparaciones(nuevosDocs);
    const docAfectado = nuevosDocs.find((d) => String(d.maquina?._id) === String(maquinaId));
    const res = await guardarReparaciones(maquinaId, docAfectado?.reparaciones || []);
    if (res?.ok) {
      Swal.fire({ position: "center", icon: "success", title: titulo, showConfirmButton: false, timer: 1200, timerProgressBar: true });
    } else {
      Swal.fire({ icon: "error", title: "Error", text: "No se pudieron guardar los cambios" });
    }
    return res;
  };

  // Guarda todos los campos editados en la reparación o repuesto de origen.
  const guardarDerivado = async (t) => {
    const nuevosDocs = docsReparaciones.map((doc) => {
      if (String(doc.maquina?._id) !== String(t.maquinaId)) return doc;
      const reparaciones = (doc.reparaciones || []).map((r, ri) => {
        if (ri !== t.reparacionIndex) return r;
        if (t.tipo === "reparacion") {
          // Reparación: fecha, nombre (tarea), estado y observaciones.
          return { ...r, fecha: derivadoEdit.fecha, reparacion: derivadoEdit.tarea, estado: derivadoEdit.estado, observaciones: derivadoEdit.observaciones };
        }
        // Repuesto: nombre (tarea), estado y observaciones (la fecha es la de la reparación).
        const repuestos = (r.repuestos || []).map((rep, pi) =>
          pi === t.repuestoIndex ? { ...rep, repuesto: derivadoEdit.tarea, estado: derivadoEdit.estado, observaciones: derivadoEdit.observaciones } : rep
        );
        return { ...r, repuestos };
      });
      return { ...doc, reparaciones };
    });
    setEditandoId(null);
    const docAf = nuevosDocs.find((d) => String(d.maquina?._id) === String(t.maquinaId));
    // Guardado y sincronización (si la reparación está vinculada a una tarea) en paralelo.
    await Promise.all([
      persistirDocsReparaciones(nuevosDocs, t.maquinaId, "Guardado"),
      t.tipo === "reparacion"
        ? sincronizarTareaDesdeReparacion(docAf?.reparaciones?.[t.reparacionIndex], t.maquina)
        : Promise.resolve(),
    ]);
  };

  // Borra la reparación (o el repuesto) de origen.
  const borrarDerivado = async (t) => {
    const { isConfirmed } = await Swal.fire({
      title: t.tipo === "repuesto" ? "¿Eliminar repuesto?" : "¿Eliminar reparación?",
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: "swal-btn-danger" },
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    });
    if (!isConfirmed) return;
    const nuevosDocs = docsReparaciones.map((doc) => {
      if (String(doc.maquina?._id) !== String(t.maquinaId)) return doc;
      let reparaciones;
      if (t.tipo === "reparacion") {
        reparaciones = (doc.reparaciones || []).filter((r, ri) => ri !== t.reparacionIndex);
      } else {
        reparaciones = (doc.reparaciones || []).map((r, ri) =>
          ri !== t.reparacionIndex ? r : { ...r, repuestos: (r.repuestos || []).filter((rep, pi) => pi !== t.repuestoIndex) }
        );
      }
      return { ...doc, reparaciones };
    });
    setEditandoId((prev) => (prev === t.id ? null : prev));
    await persistirDocsReparaciones(nuevosDocs, t.maquinaId, t.tipo === "repuesto" ? "Repuesto eliminado" : "Reparación eliminada");
  };

  const agregar = () => {
    const nueva = filaVacia();
    setTareas([...tareas, nueva]);
    setEditandoId(nueva.id);
    setNuevas((prev) => new Set(prev).add(nueva.id));
  };
  const editar = (id, campo, valor) =>
    setTareas(tareas.map((t) => {
      if (t.id !== id) return t;
      const actualizada = { ...t, [campo]: valor };
      // Al pasar a "Terminado" se congela el conteo guardando la fecha; si se
      // reabre la tarea, se limpia para que vuelva a sumar.
      if (campo === "estado") {
        actualizada.fechaTerminado = valor === "Terminado" ? (t.fechaTerminado || hoy()) : "";
      }
      return actualizada;
    }));

  const finalizarEdicion = async () => {
    const id = editandoId;
    const fila = tareas.find((t) => t.id === id);
    if (fila && !(fila.tarea || "").trim()) {
      return Swal.fire({ icon: "warning", title: "Atención", text: "La tarea es obligatoria." });
    }
    if (fila && !(fila.maquina || "").trim()) {
      return Swal.fire({ icon: "warning", title: "Atención", text: "La máquina es obligatoria." });
    }
    setEditandoId(null);
    setNuevas((prev) => { const n = new Set(prev); n.delete(id); return n; });
    // Guardado y sincronización en paralelo.
    const [res] = await Promise.all([
      persistir(tareas),
      sincronizarReparacionDesdeTarea(fila),
    ]);
    if (res?.ok) {
      Swal.fire({ position: "center", icon: "success", title: "Guardado", showConfirmButton: false, timer: 1200, timerProgressBar: true });
    }
  };

  const borrar = async (id) => {
    const { isConfirmed } = await Swal.fire({
      title: "¿Eliminar tarea?",
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: "swal-btn-danger" },
      confirmButtonText: "Sí, borrar",
    });
    if (!isConfirmed) return;
    const nuevas = tareas.filter((t) => t.id !== id);
    setTareas(nuevas);
    setEditandoId((prev) => (prev === id ? null : prev));
    await persistir(nuevas);
    Swal.fire({ position: "center", icon: "success", title: "Tarea eliminada", showConfirmButton: false, timer: 1200, timerProgressBar: true });
  };

  const obtenerTareasActivasDeResponsable = (nombre) => {
    const derivadasResp = derivadas.filter((d) => (d.responsable || "").trim() === nombre.trim());
    const manuales = tareasPorResp[nombre] || [];
    return [...derivadasResp, ...manuales].filter(
      (t) => t.estado === "Pendiente" || t.estado === "En proceso"
    );
  };

  return (
    <Container className="py-4">
      <h2 className="mb-3 fw-bold text-center">Pendientes</h2>

      <Row xs={1} sm={2} md={3} lg={3} className="g-3 mx-auto justify-content-center" style={{ maxWidth: 900 }}>
        {RESPONSABLES.map((r) => {
          const activeTasks = obtenerTareasActivasDeResponsable(r.nombre);

          return (
            <Col key={r.nombre}>
              <Card
                className="h-100 shadow-sm border-0"
                style={{ cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s" }}
                onClick={() => abrir(r)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "";
                }}
              >
                <Card.Body className="d-flex flex-column align-items-center text-center py-3">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center mb-2"
                    style={{ width: 44, height: 44, backgroundColor: r.color + "1a" }}
                  >
                    <i className="bi bi-person-fill fs-5" style={{ color: r.color }} />
                  </div>
                  <Card.Title className="fw-semibold mb-2" style={{ fontSize: "1rem" }}>{r.nombre}</Card.Title>

                  {activeTasks.length === 0 ? (
                    <span className="text-muted fst-italic small">Sin pendientes</span>
                  ) : (
                    <div className="text-start w-100" style={{ fontSize: "0.8rem", lineHeight: 1.5 }}>
                      {activeTasks.map((t) => (
                        <div key={t.id} className="text-truncate" style={{ color: "#adb5bd" }}>
                          • {t.maquina ? `${t.maquina} - ${t.tarea}` : t.tarea}
                        </div>
                      ))}
                    </div>
                  )}
                </Card.Body>
                <div style={{ height: 4, backgroundColor: r.color, borderRadius: "0 0 .375rem .375rem" }} />
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* ── Modal de tareas del responsable ── */}
      <Modal show={!!modalResp} onHide={cerrar} centered size="xl" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Pendientes - {modalResp?.nombre}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span className="text-muted">Fecha: {new Date().toLocaleDateString("es-AR")}</span>
            <div className="d-flex gap-2">
              <Button size="sm" variant="outline-light" onClick={exportarExcelPendientes}>Excel</Button>
              <Button size="sm" variant="outline-primary" onClick={agregar}>Agregar tarea</Button>
            </div>
          </div>

          {!cargando && (
            <div className="d-flex gap-2 mb-3 flex-wrap">
              <div className="position-relative" style={{ width: 270 }}>
                <Form.Select
                  size="sm"
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  style={{ minWidth: 0, ...(filtroEstado !== "" ? { backgroundImage: "none" } : {}) }}
                >
                  <option value="activas">Pedido / Pendiente / En proceso</option>
                  <option value="Pedido">Pedido</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="En proceso">En proceso</option>
                  <option value="En taller">En taller</option>
                  <option value="Colocado">Colocado</option>
                  <option value="Terminado">Terminado</option>
                  <option value="">Todos</option>
                </Form.Select>
                {filtroEstado !== "" && (
                  <span onClick={() => setFiltroEstado("")} style={estiloX}>✕</span>
                )}
              </div>
              <div className="position-relative" style={{ width: 200 }}>
                <Form.Select
                  size="sm"
                  value={filtroMaquina}
                  onChange={(e) => setFiltroMaquina(e.target.value)}
                  style={{ minWidth: 0, ...(filtroMaquina ? { backgroundImage: "none" } : {}) }}
                >
                  <option value="">Máquina (todas)</option>
                  {maquinasUnicas.map((m) => (<option key={m} value={m}>{m}</option>))}
                </Form.Select>
                {filtroMaquina && (
                  <span onClick={() => setFiltroMaquina("")} style={estiloX}>✕</span>
                )}
              </div>
              <div className="position-relative" style={{ width: 280 }}>
                <Form.Select
                  size="sm"
                  value={filtroTarea}
                  onChange={(e) => setFiltroTarea(e.target.value)}
                  style={{ minWidth: 0, ...(filtroTarea ? { backgroundImage: "none" } : {}) }}
                >
                  <option value="">Tarea (todas)</option>
                  {tareasUnicas.map((t) => (<option key={t} value={t}>{t}</option>))}
                </Form.Select>
                {filtroTarea && (
                  <span onClick={() => setFiltroTarea("")} style={estiloX}>✕</span>
                )}
              </div>
            </div>
          )}

          {cargando ? (
            <Spinner animation="border" className="d-block mx-auto my-4" />
          ) : (
          <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
            <Table striped bordered hover size="sm" className="text-center align-middle mb-0">
              <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr>
                  <th style={{ width: 95 }}>Fecha</th>
                  <th style={{ width: 110 }}>Máquina</th>
                  <th>Tarea</th>
                  <th style={{ width: 85 }}>Días pendiente</th>
                  <th style={{ width: 110 }}>Estado</th>
                  <th style={{ width: 80 }}>Obs.</th>
                  <th style={{ width: 230 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {derivadasFiltradas.map((t) => {
                  const enEdicion = editandoId === t.id;
                  return (
                  <tr key={t.id} style={{ backgroundColor: "#fbfbf3" }}>
                    <td>
                      {enEdicion && t.tipo === "reparacion" ? (
                        <Form.Control size="sm" type="date" value={derivadoEdit.fecha || ""} onChange={(e) => setDerivadoEdit((p) => ({ ...p, fecha: e.target.value }))} />
                      ) : (
                        t.fecha ? t.fecha.split("-").reverse().join("/") : "-"
                      )}
                    </td>
                    <td>{t.maquina || "-"}</td>
                    <td className="text-start">
                      {enEdicion ? (
                        <Form.Control size="sm" value={derivadoEdit.tarea || ""} onChange={(e) => setDerivadoEdit((p) => ({ ...p, tarea: e.target.value }))} />
                      ) : (
                        t.tarea || "-"
                      )}
                    </td>
                    <td>{diasPendiente(t.fecha)}</td>
                    <td>
                      {enEdicion ? (
                        <Form.Select size="sm" value={derivadoEdit.estado} onChange={(e) => setDerivadoEdit((p) => ({ ...p, estado: e.target.value }))}>
                          {(t.tipo === "repuesto" ? ESTADOS_REPUESTO : ESTADOS).map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </Form.Select>
                      ) : (
                        <span style={{ color: COLOR_ESTADO[t.estado] || "#dee2e6", fontWeight: 600 }}>{t.estado || "-"}</span>
                      )}
                    </td>
                    <td>
                      {enEdicion ? (
                        <Form.Control size="sm" value={derivadoEdit.observaciones || ""} onChange={(e) => setDerivadoEdit((p) => ({ ...p, observaciones: e.target.value }))} />
                      ) : t.observaciones ? (
                        <Button size="sm" variant="outline-secondary" className="py-0 px-2" onClick={() => verObservacion(t.observaciones)}>Ver</Button>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <div className="d-flex gap-1 justify-content-center align-items-center flex-nowrap text-nowrap">
                        {enEdicion ? (
                          <Button size="sm" variant="outline-success" onClick={() => guardarDerivado(t)}>Listo</Button>
                        ) : (
                          <Button size="sm" variant="outline-warning" onClick={() => editarDerivado(t)}>Editar</Button>
                        )}
                        <Button size="sm" variant="outline-danger" onClick={() => borrarDerivado(t)}>Borrar</Button>
                        <Button
                          size="sm"
                          variant={t.tipo === "repuesto" ? "outline-info" : "outline-secondary"}
                          onClick={() => irAReparaciones(t)}
                        >
                          {t.tipo === "repuesto" ? "Repuestos" : "Reparación"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
                {tareasFiltradas.length === 0 && derivadasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-muted py-3">Sin tareas cargadas</td>
                  </tr>
                ) : (
                  tareasFiltradas.map((t) => {
                    const editando = editandoId === t.id;
                    return (
                      <tr key={t.id}>
                        <td>
                          {editando ? (
                            <Form.Control size="sm" type="date" value={t.fecha} onChange={(e) => editar(t.id, "fecha", e.target.value)} />
                          ) : (
                            t.fecha ? t.fecha.split("-").reverse().join("/") : "-"
                          )}
                        </td>
                        <td>
                          {editando ? (
                            <Form.Select
                              size="sm"
                              value={t.maquina || ""}
                              onChange={(e) => editar(t.id, "maquina", e.target.value)}
                            >
                              <option value="">Seleccionar...</option>
                              {maquinasReparaciones.map((m) => (<option key={m} value={m}>{m}</option>))}
                              <option value="Otra">Otra</option>
                            </Form.Select>
                          ) : (
                            t.maquina || "-"
                          )}
                        </td>
                        <td className={editando ? "" : "text-start"}>
                          {editando ? (
                            <Form.Control size="sm" value={t.tarea} onChange={(e) => editar(t.id, "tarea", e.target.value)} />
                          ) : (
                            t.tarea || "-"
                          )}
                        </td>
                        <td>{diasPendiente(t.fecha, t.fechaTerminado)}</td>
                        <td>
                          {editando ? (
                            <Form.Select size="sm" value={t.estado} onChange={(e) => editar(t.id, "estado", e.target.value)}>
                              {ESTADOS.map((s) => (<option key={s} value={s}>{s}</option>))}
                            </Form.Select>
                          ) : (
                            <span style={{ color: COLOR_ESTADO[t.estado] || "#dee2e6", fontWeight: 600 }}>{t.estado || "-"}</span>
                          )}
                        </td>
                        <td>
                          {editando ? (
                            <Form.Control size="sm" value={t.observaciones} onChange={(e) => editar(t.id, "observaciones", e.target.value)} />
                          ) : t.observaciones ? (
                            <Button size="sm" variant="outline-secondary" className="py-0 px-2" onClick={() => verObservacion(t.observaciones)}>Ver</Button>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          <div className="d-flex gap-1 justify-content-center">
                            {editando ? (
                              <Button size="sm" variant="outline-success" onClick={finalizarEdicion}>Listo</Button>
                            ) : (
                              <Button size="sm" variant="outline-warning" onClick={() => setEditandoId(t.id)}>Editar</Button>
                            )}
                            <Button size="sm" variant="outline-danger" onClick={() => borrar(t.id)}>Borrar</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>
          )}
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={cerrar}>Cerrar</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
