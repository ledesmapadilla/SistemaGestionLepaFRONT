import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Col, Container, Form, Modal, Row, Spinner, Table } from "react-bootstrap";
import Swal from "sweetalert2";
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
  const [estadoDerivado, setEstadoDerivado] = useState("");
  const [otraMaquina, setOtraMaquina] = useState(() => new Set()); // tareas manuales con máquina "Otra"
  const [nuevas, setNuevas] = useState(() => new Set()); // tareas manuales nuevas sin guardar
  const cancelarRef = useRef(() => {});
  const [cargando, setCargando] = useState(true);
  // Filtros del modal. Por defecto se ven las activas (no terminadas/colocadas).
  const [filtroEstado, setFiltroEstado] = useState("activas");
  const [filtroMaquina, setFiltroMaquina] = useState("");
  const [filtroTarea, setFiltroTarea] = useState("");
  // Modal resumen (todos los responsables juntos) y sus filtros.
  const [showResumen, setShowResumen] = useState(false);
  const [filtroRespR, setFiltroRespR] = useState("");
  const [filtroEstadoR, setFiltroEstadoR] = useState("activas");
  const [filtroMaquinaR, setFiltroMaquinaR] = useState("");

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

  // Si se abrió con el botón de anteojos, mostrar directo el resumen.
  useEffect(() => {
    if (pendientesModal?.resumenPendiente) {
      setShowResumen(true);
      pendientesModal.consumirResumen();
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

  // Cantidad de tareas Pendiente + En proceso de un responsable (derivadas + manuales).
  const contarPendientesEnProceso = (nombre) => {
    const derivadasResp = derivadas.filter((d) => (d.responsable || "").trim() === nombre.trim());
    const manuales = tareasPorResp[nombre] || [];
    return [...derivadasResp, ...manuales].filter(
      (t) => t.estado === "Pendiente" || t.estado === "En proceso"
    ).length;
  };

  // Resumen: todas las tareas de todos los responsables (derivadas + manuales).
  const filasResumen = useMemo(() => {
    const rows = derivadas.map((d) => ({
      responsable: d.responsable,
      tipo: d.tipo === "reparacion" ? "Reparación" : "Repuesto",
      fecha: d.fecha,
      maquina: d.maquina,
      tarea: d.tarea,
      estado: d.estado,
      observaciones: d.observaciones,
    }));
    Object.entries(tareasPorResp).forEach(([resp, ts]) => {
      (ts || []).forEach((t) =>
        rows.push({
          responsable: resp,
          tipo: "Tarea",
          fecha: t.fecha,
          maquina: t.maquina || "",
          tarea: t.tarea,
          estado: t.estado,
          observaciones: t.observaciones || "",
          fechaTerminado: t.fechaTerminado || "",
        })
      );
    });
    return rows;
  }, [derivadas, tareasPorResp]);

  const ordenResp = (nombre) => {
    const i = RESPONSABLES.findIndex((r) => r.nombre === nombre);
    return i === -1 ? 99 : i;
  };

  const maquinasResumen = [...new Set(filasResumen.map((f) => f.maquina).filter(Boolean))].sort();
  const filasResumenFiltradas = filasResumen
    .filter(
      (f) =>
        (filtroRespR === "" || f.responsable === filtroRespR) &&
        (filtroEstadoR === "" ||
          (filtroEstadoR === "activas"
            ? ["Pedido", "Pendiente", "En proceso"].includes(f.estado)
            : f.estado === filtroEstadoR)) &&
        (filtroMaquinaR === "" || f.maquina === filtroMaquinaR)
    )
    .sort((a, b) => {
      const dr = ordenResp(a.responsable) - ordenResp(b.responsable);
      if (dr !== 0) return dr;
      return (b.fecha || "").localeCompare(a.fecha || "");
    });

  // Desde el resumen, "Ver" abre la planilla de pendientes del responsable de esa fila.
  const irAPlanillaResumen = (f) => {
    const r = RESPONSABLES.find((x) => x.nombre === f.responsable);
    setShowResumen(false);
    if (r) abrir(r);
  };

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
        ? f.estado !== "Terminado" && f.estado !== "Colocado"
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

  const editarDerivado = (t) => { setEditandoId(t.id); setEstadoDerivado(t.estado); };

  // Guarda el nuevo estado de la fila derivada en la reparación o repuesto de origen.
  const guardarDerivado = async (t) => {
    const nuevosDocs = docsReparaciones.map((doc) => {
      if (String(doc.maquina?._id) !== String(t.maquinaId)) return doc;
      const reparaciones = (doc.reparaciones || []).map((r, ri) => {
        if (ri !== t.reparacionIndex) return r;
        // Reparación: cambia el estado de la reparación.
        if (t.tipo === "reparacion") return { ...r, estado: estadoDerivado };
        // Repuesto: cambia SOLO el estado del repuesto, no el de la reparación.
        const repuestos = (r.repuestos || []).map((rep, pi) =>
          pi === t.repuestoIndex ? { ...rep, estado: estadoDerivado } : rep
        );
        return { ...r, repuestos };
      });
      return { ...doc, reparaciones };
    });
    setDocsReparaciones(nuevosDocs);
    setEditandoId(null);
    const docAfectado = nuevosDocs.find((d) => String(d.maquina?._id) === String(t.maquinaId));
    const res = await guardarReparaciones(t.maquinaId, docAfectado?.reparaciones || []);
    if (res?.ok) {
      Swal.fire({ position: "center", icon: "success", title: "Estado actualizado", showConfirmButton: false, timer: 1200, timerProgressBar: true });
    } else {
      Swal.fire({ icon: "error", title: "Error", text: "No se pudo actualizar el estado" });
    }
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
    const res = await persistir(tareas);
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

  return (
    <Container className="py-2">
      <h2 className="mb-1 fw-bold text-center">Tareas pendientes</h2>
      <p className="text-muted mb-4 text-center">Seleccioná un responsable</p>
      <Row xs={2} sm={3} md={3} lg={3} className="g-4 mx-auto justify-content-center" style={{ maxWidth: 620 }}>
        {RESPONSABLES.map((r) => (
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
                <Card.Title className="fw-semibold mb-0" style={{ fontSize: "0.95rem" }}>{r.nombre}</Card.Title>
                {(() => {
                  const n = contarPendientesEnProceso(r.nombre);
                  return (
                    <span
                      className="badge rounded-pill mt-1"
                      title="Tareas pendientes o en proceso"
                      style={{ backgroundColor: n > 0 ? r.color : "#adb5bd", fontSize: "0.75rem" }}
                    >
                      {n}
                    </span>
                  );
                })()}
              </Card.Body>
              <div style={{ height: 3, backgroundColor: r.color, borderRadius: "0 0 .375rem .375rem" }} />
            </Card>
          </Col>
        ))}

        {/* Tarjeta de acceso al resumen general */}
        <Col key="resumen">
          <Card
            className="h-100 shadow-sm border-0"
            style={{ cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s" }}
            onClick={() => setShowResumen(true)}
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
                style={{ width: 44, height: 44, backgroundColor: "#49505722" }}
              >
                <span className="fw-bold fs-5" style={{ color: "#495057" }}>R</span>
              </div>
              <Card.Title className="fw-semibold mb-0" style={{ fontSize: "0.95rem" }}>Resumen</Card.Title>
            </Card.Body>
            <div style={{ height: 3, backgroundColor: "#495057", borderRadius: "0 0 .375rem .375rem" }} />
          </Card>
        </Col>
      </Row>

      {/* ── Modal de tareas del responsable ── */}
      <Modal show={!!modalResp} onHide={cerrar} centered size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Pendientes - {modalResp?.nombre}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span className="text-muted">Fecha: {new Date().toLocaleDateString("es-AR")}</span>
            <Button size="sm" variant="outline-primary" onClick={agregar}>Agregar tarea</Button>
          </div>

          {!cargando && (
            <div className="d-flex gap-2 mb-3 flex-wrap">
              <div className="position-relative" style={{ width: 200 }}>
                <Form.Select
                  size="sm"
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  style={{ minWidth: 0, ...(filtroEstado !== "" ? { backgroundImage: "none" } : {}) }}
                >
                  <option value="activas">Activas (sin terminar)</option>
                  <option value="Pedido">Pedido</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="En proceso">En proceso</option>
                  <option value="En taller">En taller</option>
                  <option value="Colocado">Colocado</option>
                  <option value="Terminado">Terminado</option>
                  <option value="">Todos</option>
                </Form.Select>
                {filtroEstado !== "" && (
                  <button type="button" className="btn btn-sm text-warning position-absolute top-50 translate-middle-y end-0 me-1 p-0 border-0 fw-bold" aria-label="Limpiar" onClick={() => setFiltroEstado("")}>✕</button>
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
                  <button type="button" className="btn btn-sm text-warning position-absolute top-50 translate-middle-y end-0 me-1 p-0 border-0 fw-bold" aria-label="Limpiar" onClick={() => setFiltroMaquina("")}>✕</button>
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
                  <button type="button" className="btn btn-sm text-warning position-absolute top-50 translate-middle-y end-0 me-1 p-0 border-0 fw-bold" aria-label="Limpiar" onClick={() => setFiltroTarea("")}>✕</button>
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
                  <th style={{ width: 150 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {derivadasFiltradas.map((t) => (
                  <tr key={t.id} style={{ backgroundColor: "#fbfbf3" }}>
                    <td>{t.fecha ? t.fecha.split("-").reverse().join("/") : "-"}</td>
                    <td>{t.maquina || "-"}</td>
                    <td className="text-start">{t.tarea || "-"}</td>
                    <td>{diasPendiente(t.fecha)}</td>
                    <td>
                      {editandoId === t.id ? (
                        <Form.Select size="sm" value={estadoDerivado} onChange={(e) => setEstadoDerivado(e.target.value)}>
                          {(t.tipo === "repuesto" ? ESTADOS_REPUESTO : ESTADOS).map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </Form.Select>
                      ) : (
                        <span style={{ color: COLOR_ESTADO[t.estado] || "#dee2e6", fontWeight: 600 }}>{t.estado || "-"}</span>
                      )}
                    </td>
                    <td>
                      {t.observaciones ? (
                        <Button size="sm" variant="outline-secondary" className="py-0 px-2" onClick={() => verObservacion(t.observaciones)}>Ver</Button>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <div className="d-flex gap-1 justify-content-center align-items-center">
                        {editandoId === t.id ? (
                          <Button size="sm" variant="outline-success" onClick={() => guardarDerivado(t)}>Listo</Button>
                        ) : (
                          <Button size="sm" variant="outline-warning" onClick={() => editarDerivado(t)}>Editar</Button>
                        )}
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
                ))}
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
                            <>
                              <Form.Select
                                size="sm"
                                value={
                                  maquinasReparaciones.includes(t.maquina)
                                    ? t.maquina
                                    : (t.maquina || otraMaquina.has(t.id)) ? "__otra__" : ""
                                }
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (v === "__otra__") {
                                    setOtraMaquina((prev) => new Set(prev).add(t.id));
                                    editar(t.id, "maquina", "");
                                  } else {
                                    setOtraMaquina((prev) => { const n = new Set(prev); n.delete(t.id); return n; });
                                    editar(t.id, "maquina", v);
                                  }
                                }}
                              >
                                <option value="">Seleccionar...</option>
                                {maquinasReparaciones.map((m) => (<option key={m} value={m}>{m}</option>))}
                                <option value="__otra__">Otra...</option>
                              </Form.Select>
                              {(otraMaquina.has(t.id) || (t.maquina && !maquinasReparaciones.includes(t.maquina))) && (
                                <Form.Control
                                  size="sm"
                                  className="mt-1"
                                  placeholder="Nombre de máquina"
                                  value={t.maquina || ""}
                                  onChange={(e) => editar(t.id, "maquina", e.target.value)}
                                />
                              )}
                            </>
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

      {/* ── Modal resumen (todos los responsables) ── */}
      <Modal show={showResumen} onHide={() => setShowResumen(false)} centered size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Resumen de tareas pendientes</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex gap-2 mb-3 flex-wrap">
            <div className="position-relative" style={{ width: 180 }}>
              <Form.Select
                size="sm"
                value={filtroRespR}
                onChange={(e) => setFiltroRespR(e.target.value)}
                style={{ minWidth: 0, ...(filtroRespR !== "" ? { backgroundImage: "none" } : {}) }}
              >
                <option value="">Responsable (todos)</option>
                {RESPONSABLES.map((r) => (<option key={r.nombre} value={r.nombre}>{r.nombre}</option>))}
              </Form.Select>
              {filtroRespR !== "" && (
                <button type="button" className="btn btn-sm text-warning position-absolute top-50 translate-middle-y end-0 me-1 p-0 border-0 fw-bold" aria-label="Limpiar" onClick={() => setFiltroRespR("")}>✕</button>
              )}
            </div>
            <div className="position-relative" style={{ width: 270 }}>
              <Form.Select
                size="sm"
                value={filtroEstadoR}
                onChange={(e) => setFiltroEstadoR(e.target.value)}
                style={{ minWidth: 0, ...(filtroEstadoR !== "" ? { backgroundImage: "none" } : {}) }}
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
              {filtroEstadoR !== "" && (
                <button type="button" className="btn btn-sm text-warning position-absolute top-50 translate-middle-y end-0 me-1 p-0 border-0 fw-bold" aria-label="Limpiar" onClick={() => setFiltroEstadoR("")}>✕</button>
              )}
            </div>
            <div className="position-relative" style={{ width: 200 }}>
              <Form.Select
                size="sm"
                value={filtroMaquinaR}
                onChange={(e) => setFiltroMaquinaR(e.target.value)}
                style={{ minWidth: 0, ...(filtroMaquinaR !== "" ? { backgroundImage: "none" } : {}) }}
              >
                <option value="">Máquina (todas)</option>
                {maquinasResumen.map((m) => (<option key={m} value={m}>{m}</option>))}
              </Form.Select>
              {filtroMaquinaR !== "" && (
                <button type="button" className="btn btn-sm text-warning position-absolute top-50 translate-middle-y end-0 me-1 p-0 border-0 fw-bold" aria-label="Limpiar" onClick={() => setFiltroMaquinaR("")}>✕</button>
              )}
            </div>
          </div>

          <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
            <Table striped bordered hover size="sm" className="text-center align-middle mb-0">
              <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr>
                  <th style={{ width: 130 }}>Responsable</th>
                  <th style={{ width: 100 }}>Tipo</th>
                  <th style={{ width: 120 }}>Máquina</th>
                  <th>Tarea</th>
                  <th style={{ width: 85 }}>Días pendiente</th>
                  <th style={{ width: 70 }}>Ver</th>
                </tr>
              </thead>
              <tbody>
                {filasResumenFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-muted py-3">Sin tareas</td>
                  </tr>
                ) : (
                  filasResumenFiltradas.map((f, idx) => {
                    const color = RESPONSABLES.find((r) => r.nombre === f.responsable)?.color || "#6c757d";
                    return (
                      <tr key={idx}>
                        <td style={{ color, fontWeight: 600 }}>{f.responsable}</td>
                        <td className="text-muted">{f.tipo}</td>
                        <td>{f.maquina || "-"}</td>
                        <td className="text-start">{f.tarea || "-"}</td>
                        <td>{diasPendiente(f.fecha, f.fechaTerminado)}</td>
                        <td>
                          <Button size="sm" variant="outline-success" className="py-0 px-2" onClick={() => irAPlanillaResumen(f)}>Ver</Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={() => setShowResumen(false)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
