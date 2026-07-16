import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Col, Container, Form, Modal, Row, Spinner } from "react-bootstrap";
import Swal from "sweetalert2";
import XLSXStyle from "xlsx-js-style";
import { obtenerTodosPendientes, guardarPendientes } from "../../../../helpers/queriesPendientes";
import { obtenerTodasReparaciones, guardarReparaciones } from "../../../../helpers/queriesReparaciones";
import { listarMaquinas } from "../../../../helpers/queriesMaquinas";
import "../../../../styles/pendientes.css";

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
  Pedido: "#0dcaf0",
  "En taller": "#fd7e14",
  Colocado: "#198754",
};

const hoy = () => new Date().toLocaleDateString("en-CA");

const parseFechaLocal = (f) => {
  const [y, m, d] = f.split("-").map(Number);
  return new Date(y, m - 1, d);
};

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
  const [tareasPorResp, setTareasPorResp] = useState({});
  const [docsReparaciones, setDocsReparaciones] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalEdicion, setModalEdicion] = useState(null); // { tipo: 'agregar'|'editar'|'editar-derivado', responsable: string, task: any }
  const [derivadoEdit, setDerivadoEdit] = useState({});

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

  const CAMIONETAS = ["Fiat", "Nissan", "Ranger"];
  const maquinasReparaciones = useMemo(() => {
    return [...new Set(maquinas.map((m) => m.maquina).filter(Boolean))].sort((a, b) => {
      const ca = CAMIONETAS.indexOf(a);
      const cb = CAMIONETAS.indexOf(b);
      if (ca !== -1 && cb !== -1) return ca - cb;
      if (ca !== -1) return 1;
      if (cb !== -1) return -1;
      return a.localeCompare(b, "es", { numeric: true });
    });
  }, [maquinas]);

  const obtenerTareasActivasDeResponsable = (nombre) => {
    const manuales = tareasPorResp[nombre] || [];
    const derivadasResp = derivadas.filter((d) => (d.responsable || "").trim() === nombre.trim());
    return [...derivadasResp, ...manuales].filter(
      (t) => t.estado !== "Terminado" && t.estado !== "Colocado"
    );
  };

  const persistir = async (respNombre, nuevas) => {
    const res = await guardarPendientes(respNombre, nuevas);
    if (!res?.ok) {
      Swal.fire({ icon: "error", title: "Error", text: "No se pudieron guardar los cambios" });
    }
    return res;
  };

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

  const completarTareaRapido = async (t, respNombre) => {
    const { isConfirmed } = await Swal.fire({
      title: "¿Completar tarea?",
      text: t.tarea,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, completar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#198754",
    });
    if (!isConfirmed) return;

    if (t.tipo === "reparacion" || t.tipo === "repuesto") {
      const nuevosDocs = docsReparaciones.map((doc) => {
        if (String(doc.maquina?._id) !== String(t.maquinaId)) return doc;
        const reparaciones = (doc.reparaciones || []).map((r, ri) => {
          if (ri !== t.reparacionIndex) return r;
          if (t.tipo === "reparacion") {
            return { ...r, estado: "Terminado" };
          }
          const repuestos = (r.repuestos || []).map((rep, pi) =>
            pi === t.repuestoIndex ? { ...rep, estado: "Colocado" } : rep
          );
          return { ...r, repuestos };
        });
        return { ...doc, reparaciones };
      });
      const docAf = nuevosDocs.find((d) => String(d.maquina?._id) === String(t.maquinaId));
      await Promise.all([
        persistirDocsReparaciones(nuevosDocs, t.maquinaId, "Tarea completada"),
        t.tipo === "reparacion"
          ? sincronizarTareaDesdeReparacion({ ...docAf?.reparaciones?.[t.reparacionIndex], estado: "Terminado" }, t.maquina)
          : Promise.resolve(),
      ]);
    } else {
      const updatedList = (tareasPorResp[respNombre] || []).map((task) => {
        if (task.id !== t.id) return task;
        return { ...task, estado: "Terminado", fechaTerminado: hoy() };
      });
      setTareasPorResp((prev) => ({ ...prev, [respNombre]: updatedList }));
      await persistir(respNombre, updatedList);
      Swal.fire({ position: "center", icon: "success", title: "Tarea completada", showConfirmButton: false, timer: 1200, timerProgressBar: true });
    }
  };

  const eliminarTareaRapido = async (t, respNombre) => {
    const { isConfirmed } = await Swal.fire({
      title: t.tipo === "repuesto" ? "¿Eliminar repuesto?" : t.tipo === "reparacion" ? "¿Eliminar reparación?" : "¿Eliminar tarea?",
      text: t.tarea,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc3545",
    });
    if (!isConfirmed) return;

    if (t.tipo === "reparacion" || t.tipo === "repuesto") {
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
      await persistirDocsReparaciones(nuevosDocs, t.maquinaId, t.tipo === "repuesto" ? "Repuesto eliminado" : "Reparación eliminada");
    } else {
      const nuevasList = (tareasPorResp[respNombre] || []).filter((task) => task.id !== t.id);
      setTareasPorResp((prev) => ({ ...prev, [respNombre]: nuevasList }));
      await persistir(respNombre, nuevasList);
      Swal.fire({ position: "center", icon: "success", title: "Tarea eliminada", showConfirmButton: false, timer: 1200, timerProgressBar: true });
    }
  };

  const abrirAgregar = (respNombre) => {
    setModalEdicion({
      tipo: "agregar",
      responsable: respNombre,
      task: {
        fecha: hoy(),
        maquina: "",
        tarea: "",
        estado: "Pendiente",
        observaciones: "",
      },
    });
  };

  const abrirEditar = (t, respNombre) => {
    if (t.tipo === "reparacion" || t.tipo === "repuesto") {
      setModalEdicion({
        tipo: "editar-derivado",
        responsable: respNombre,
        task: t,
      });
      setDerivadoEdit({
        fecha: t.fecha || "",
        tarea: t.tarea || "",
        estado: t.estado,
        observaciones: t.observaciones || "",
      });
    } else {
      setModalEdicion({
        tipo: "editar",
        responsable: respNombre,
        task: { ...t },
      });
    }
  };

  const guardarEdicion = async () => {
    const { tipo, responsable, task } = modalEdicion;
    if (tipo !== "editar-derivado" && !(task.tarea || "").trim()) {
      return Swal.fire({ icon: "warning", title: "Atención", text: "La tarea es obligatoria." });
    }
    if (tipo !== "editar-derivado" && !(task.maquina || "").trim()) {
      return Swal.fire({ icon: "warning", title: "Atención", text: "La máquina es obligatoria." });
    }

    if (tipo === "agregar") {
      const nueva = {
        ...task,
        id: crypto.randomUUID(),
      };
      const nuevasList = [...(tareasPorResp[responsable] || []), nueva];
      setTareasPorResp((prev) => ({ ...prev, [responsable]: nuevasList }));
      const [res] = await Promise.all([
        persistir(responsable, nuevasList),
        sincronizarReparacionDesdeTarea(nueva),
      ]);
      if (res?.ok) {
        Swal.fire({ position: "center", icon: "success", title: "Tarea guardada", showConfirmButton: false, timer: 1200, timerProgressBar: true });
        setModalEdicion(null);
      }
    } else if (tipo === "editar") {
      const updatedList = (tareasPorResp[responsable] || []).map((item) => {
        if (item.id !== task.id) return item;
        const actualizada = { ...task };
        if (task.estado === "Terminado") {
          actualizada.fechaTerminado = task.fechaTerminado || hoy();
        } else {
          actualizada.fechaTerminado = "";
        }
        return actualizada;
      });
      setTareasPorResp((prev) => ({ ...prev, [responsable]: updatedList }));
      const [res] = await Promise.all([
        persistir(responsable, updatedList),
        sincronizarReparacionDesdeTarea(task),
      ]);
      if (res?.ok) {
        Swal.fire({ position: "center", icon: "success", title: "Cambios guardados", showConfirmButton: false, timer: 1200, timerProgressBar: true });
        setModalEdicion(null);
      }
    } else if (tipo === "editar-derivado") {
      if (!derivadoEdit.tarea.trim()) {
        return Swal.fire({ icon: "warning", title: "Atención", text: "La tarea es obligatoria." });
      }
      const nuevosDocs = docsReparaciones.map((doc) => {
        if (String(doc.maquina?._id) !== String(task.maquinaId)) return doc;
        const reparaciones = (doc.reparaciones || []).map((r, ri) => {
          if (ri !== task.reparacionIndex) return r;
          if (task.tipo === "reparacion") {
            return {
              ...r,
              fecha: derivadoEdit.fecha,
              reparacion: derivadoEdit.tarea,
              estado: derivadoEdit.estado,
              observaciones: derivadoEdit.observaciones,
            };
          }
          const repuestos = (r.repuestos || []).map((rep, pi) =>
            pi === task.repuestoIndex
              ? {
                  ...rep,
                  repuesto: derivadoEdit.tarea,
                  estado: derivadoEdit.estado,
                  observaciones: derivadoEdit.observaciones,
                }
              : rep
          );
          return { ...r, repuestos };
        });
        return { ...doc, reparaciones };
      });
      const docAf = nuevosDocs.find((d) => String(d.maquina?._id) === String(task.maquinaId));
      await Promise.all([
        persistirDocsReparaciones(nuevosDocs, task.maquinaId, "Cambios guardados"),
        task.tipo === "reparacion"
          ? sincronizarTareaDesdeReparacion(docAf?.reparaciones?.[task.reparacionIndex], task.maquina)
          : Promise.resolve(),
      ]);
      setModalEdicion(null);
    }
  };

  const exportarExcelResponsable = (nombre, tareasActivas) => {
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
    tareasActivas.forEach((t, idx) => {
      const row = idx + 4;
      const vals = [
        t.fecha ? t.fecha.split("-").reverse().join("/") : "-",
        t.maquina || "-",
        t.tarea || "-",
        diasPendiente(t.fecha, t.fechaTerminado),
        t.estado || "-",
        t.observaciones || "-",
      ];
      vals.forEach((v, i) => {
        ws[`${cols[i]}${row}`] = { v: v ?? "-", t: typeof v === "number" ? "n" : "s", s: { alignment: i === 2 || i === 5 ? leftAlign : centerAlign } };
      });
    });

    ws["!ref"] = `A1:F${tareasActivas.length + 3}`;
    ws["!cols"] = [{ wch: 12 }, { wch: 16 }, { wch: 34 }, { wch: 14 }, { wch: 14 }, { wch: 30 }];

    const libro = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(libro, ws, "Pendientes");
    XLSXStyle.writeFile(libro, `Pendientes_${nombre}.xlsx`);
  };

  const irAReparaciones = (t) => {
    navigate("/mantenimiento/reparaciones", {
      state: { maquinaId: t.maquinaId, repuestosDe: t.tipo === "repuesto" ? t.reparacionId : undefined },
    });
  };

  return (
    <>
      <div className="pendientes-bg" />
      <div className="pendientes-overlay" />
      <Container className="content-wrapper py-4">
        <h2 className="mb-1 fw-bold text-center text-white">Tareas Pendientes</h2>
        <p className="text-white text-opacity-75 mb-5 text-center">Listado general de pendientes por responsable</p>

        {cargando ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="light" />
          </div>
        ) : (
          <Row className="g-4 justify-content-center">
            {RESPONSABLES.map((r) => {
              const tareasActivas = obtenerTareasActivasDeResponsable(r.nombre);
              return (
                <Col key={r.nombre} xs={12} md={6} lg={4}>
                  <div className="glass-panel p-4 d-flex flex-column h-100 position-relative">
                    
                    {/* Encabezado de la tarjeta */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center"
                          style={{
                            width: 38,
                            height: 38,
                            backgroundColor: r.color + "1d",
                            border: `1px solid ${r.color}35`,
                          }}
                        >
                          <i className="bi bi-person-fill fs-5" style={{ color: r.color }} />
                        </div>
                        <h4 className="fw-bold text-dark mb-0 animate-title" style={{ fontSize: "1.15rem" }}>
                          {r.nombre}
                        </h4>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline-success" 
                          className="p-1 border-0 rounded-circle d-flex align-items-center justify-content-center" 
                          style={{ width: 28, height: 28 }}
                          onClick={() => exportarExcelResponsable(r.nombre, tareasActivas)} 
                          title="Exportar Excel"
                        >
                          <i className="bi bi-file-earmark-excel" />
                        </Button>
                        <span
                          className="badge rounded-pill text-white fw-bold px-2.5 py-1"
                          style={{ backgroundColor: r.color, fontSize: "0.78rem" }}
                        >
                          {tareasActivas.length}
                        </span>
                      </div>
                    </div>

                    <hr className="my-2 text-muted" style={{ opacity: 0.15 }} />

                    {/* Contenedor scroleable de tareas */}
                    <div
                      className="custom-scrollbar overflow-y-auto mb-3 pe-1"
                      style={{ maxHeight: "360px", minHeight: "220px", flex: 1 }}
                    >
                      {tareasActivas.length === 0 ? (
                        <div className="text-muted text-center py-5 fs-7">
                          <i className="bi bi-check2-circle fs-3 d-block mb-1 text-success" />
                          Sin tareas pendientes
                        </div>
                      ) : (
                        tareasActivas.map((t) => {
                          const dias = diasPendiente(t.fecha, t.fechaTerminado);
                          const diasClass = dias <= 3 ? "fresh" : dias <= 7 ? "warning" : "danger";
                          return (
                            <div
                              key={t.id}
                              className="card-task-item d-flex justify-content-between align-items-center gap-2"
                              style={{ borderLeft: `3.5px solid ${r.color}` }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="d-flex align-items-center gap-2 flex-wrap mb-1" style={{ fontSize: "0.68rem" }}>
                                  <span className="text-muted fw-semibold">
                                    {t.fecha ? t.fecha.split("-").reverse().join("/") : "-"}
                                  </span>
                                  {t.maquina && (
                                    <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-1.5 py-0.5 rounded">
                                      {t.maquina}
                                    </span>
                                  )}
                                  {t.tipo === "repuesto" && (
                                    <span className="badge bg-info-subtle text-info border border-info-subtle px-1.5 py-0.5 rounded">
                                      Repuesto
                                    </span>
                                  )}
                                  <span className={`days-badge ${diasClass} px-1 py-0 rounded`}>
                                    {dias}d
                                  </span>
                                </div>
                                <div className="task-title text-truncate-2" title={t.tarea}>
                                  {t.tarea}
                                </div>
                                {t.observaciones && (
                                  <div className="text-muted small mt-1 text-truncate" style={{ fontSize: "0.72rem", fontStyle: "italic" }} title={t.observaciones}>
                                    <i className="bi bi-info-circle me-1" /> {t.observaciones}
                                  </div>
                                )}
                              </div>

                              <div className="d-flex align-items-center gap-1 flex-shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline-success"
                                  className="p-1 border-0 rounded-circle"
                                  onClick={() => completarTareaRapido(t, r.nombre)}
                                  title="Marcar como Completada"
                                >
                                  <i className="bi bi-check-circle-fill text-success fs-6" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline-warning"
                                  className="p-1 border-0 rounded-circle"
                                  onClick={() => abrirEditar(t, r.nombre)}
                                  title="Editar"
                                >
                                  <i className="bi bi-pencil-fill text-warning" style={{ fontSize: "0.85rem" }} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline-danger"
                                  className="p-1 border-0 rounded-circle"
                                  onClick={() => eliminarTareaRapido(t, r.nombre)}
                                  title="Eliminar"
                                >
                                  <i className="bi bi-trash-fill text-danger" style={{ fontSize: "0.85rem" }} />
                                </Button>
                                {t.maquinaId && (
                                  <Button
                                    size="sm"
                                    variant="outline-info"
                                    className="p-1 border-0 rounded-circle"
                                    onClick={() => irAReparaciones(t)}
                                    title={t.tipo === "repuesto" ? "Ver Repuestos" : "Ver Reparación"}
                                  >
                                    <i className="bi bi-gear-fill text-info" style={{ fontSize: "0.85rem" }} />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Botón para agregar tarea al final de cada tarjeta */}
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      className="w-100 rounded-pill fw-semibold border-dotted py-1.5 mt-auto"
                      style={{ fontSize: "0.82rem", borderStyle: "dashed" }}
                      onClick={() => abrirAgregar(r.nombre)}
                    >
                      <i className="bi bi-plus-lg me-1" /> Agregar tarea
                    </Button>
                  </div>
                </Col>
              );
            })}
          </Row>
        )}
      </Container>

      {/* ── Modal de Edición / Creación de Tareas Manuales y Derivadas ── */}
      <Modal show={!!modalEdicion} onHide={() => setModalEdicion(null)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold fs-5">
            {modalEdicion?.tipo === "agregar" ? "Agregar Tarea" : "Editar Tarea"} - {modalEdicion?.responsable}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          {modalEdicion?.tipo === "editar-derivado" ? (
            // Formulario de tareas derivadas
            <Form className="d-flex flex-column gap-3">
              {modalEdicion.task?.tipo === "reparacion" && (
                <div>
                  <Form.Label className="form-label-bold">Fecha</Form.Label>
                  <Form.Control
                    type="date"
                    value={derivadoEdit.fecha || ""}
                    onChange={(e) => setDerivadoEdit((p) => ({ ...p, fecha: e.target.value }))}
                  />
                </div>
              )}
              <div>
                <Form.Label className="form-label-bold">Máquina</Form.Label>
                <Form.Control
                  type="text"
                  disabled
                  value={modalEdicion.task?.maquina || ""}
                />
              </div>
              <div>
                <Form.Label className="form-label-bold">Tarea</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={derivadoEdit.tarea || ""}
                  onChange={(e) => setDerivadoEdit((p) => ({ ...p, tarea: e.target.value }))}
                />
              </div>
              <div>
                <Form.Label className="form-label-bold">Estado</Form.Label>
                <Form.Select
                  value={derivadoEdit.estado || ""}
                  onChange={(e) => setDerivadoEdit((p) => ({ ...p, estado: e.target.value }))}
                >
                  {(modalEdicion.task?.tipo === "repuesto" ? ESTADOS_REPUESTO : ESTADOS).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Form.Select>
              </div>
              <div>
                <Form.Label className="form-label-bold">Observaciones</Form.Label>
                <Form.Control
                  type="text"
                  value={derivadoEdit.observaciones || ""}
                  onChange={(e) => setDerivadoEdit((p) => ({ ...p, observaciones: e.target.value }))}
                />
              </div>
            </Form>
          ) : (
            // Formulario de tareas manuales (agregar/editar)
            modalEdicion && (
              <Form className="d-flex flex-column gap-3">
                <div>
                  <Form.Label className="form-label-bold">Fecha</Form.Label>
                  <Form.Control
                    type="date"
                    value={modalEdicion.task.fecha || ""}
                    onChange={(e) =>
                      setModalEdicion((p) => ({
                        ...p,
                        task: { ...p.task, fecha: e.target.value },
                      }))
                    }
                  />
                </div>
                <div>
                  <Form.Label className="form-label-bold">Máquina</Form.Label>
                  <Form.Select
                    value={modalEdicion.task.maquina || ""}
                    onChange={(e) =>
                      setModalEdicion((p) => ({
                        ...p,
                        task: { ...p.task, maquina: e.target.value },
                      }))
                    }
                  >
                    <option value="">Seleccionar máquina...</option>
                    {maquinasReparaciones.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                    <option value="Otra">Otra</option>
                  </Form.Select>
                </div>
                <div>
                  <Form.Label className="form-label-bold">Tarea</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Detalle de la tarea..."
                    value={modalEdicion.task.tarea || ""}
                    onChange={(e) =>
                      setModalEdicion((p) => ({
                        ...p,
                        task: { ...p.task, tarea: e.target.value },
                      }))
                    }
                  />
                </div>
                <div>
                  <Form.Label className="form-label-bold">Estado</Form.Label>
                  <Form.Select
                    value={modalEdicion.task.estado || "Pendiente"}
                    onChange={(e) =>
                      setModalEdicion((p) => ({
                        ...p,
                        task: { ...p.task, estado: e.target.value },
                      }))
                    }
                  >
                    {ESTADOS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Form.Select>
                </div>
                <div>
                  <Form.Label className="form-label-bold">Observaciones</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Notas adicionales..."
                    value={modalEdicion.task.observaciones || ""}
                    onChange={(e) =>
                      setModalEdicion((p) => ({
                        ...p,
                        task: { ...p.task, observaciones: e.target.value },
                      }))
                    }
                  />
                </div>
              </Form>
            )
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="outline-secondary" className="rounded-pill px-4" onClick={() => setModalEdicion(null)}>
            Cancelar
          </Button>
          <Button variant="warning" className="rounded-pill px-4 fw-semibold text-white" onClick={guardarEdicion}>
            Guardar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
