import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Col, Container, Form, Modal, Row, Spinner, Table } from "react-bootstrap";
import Swal from "sweetalert2";
import XLSXStyle from "xlsx-js-style";
import { obtenerTodosPendientes, guardarPendientes } from "../../../../helpers/queriesPendientes";
import { obtenerTodasReparaciones, guardarReparaciones } from "../../../../helpers/queriesReparaciones";
import { listarMaquinas } from "../../../../helpers/queriesMaquinas";
import { usePendientesModal } from "../../../../context/PendientesModalContext";
import "../../../../styles/pendientes.css";

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
  const [responsableActivo, setResponsableActivo] = useState(null);   // responsable activo (filtro)
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

  const tareas = useMemo(() => {
    if (!responsableActivo) {
      const all = [];
      Object.entries(tareasPorResp).forEach(([resp, list]) => {
        (list || []).forEach(t => all.push({ ...t, responsable: resp }));
      });
      return all;
    }
    return (tareasPorResp[responsableActivo.nombre] || []).map(t => ({ ...t, responsable: responsableActivo.nombre }));
  }, [tareasPorResp, responsableActivo]);

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

  // Filas de reparaciones/repuestos del responsable activo (tolerante a espacios).
  const filasDerivadas = useMemo(() => {
    if (!responsableActivo) return derivadas;
    return derivadas.filter((d) => (d.responsable || "").trim() === responsableActivo.nombre.trim());
  }, [derivadas, responsableActivo]);

  // Cantidad de tareas Pendiente + En proceso de un responsable (derivadas + manuales).
  const contarPendientesEnProceso = (nombre) => {
    const derivadasResp = derivadas.filter((d) => (d.responsable || "").trim() === nombre.trim());
    const manuales = tareasPorResp[nombre] || [];
    return [...derivadasResp, ...manuales].filter(
      (t) => t.estado === "Pendiente" || t.estado === "En proceso"
    ).length;
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

  // Opciones de los filtros (a partir de todas las filas del responsable activo).
  const filasModal = useMemo(() => [...filasDerivadas, ...tareas], [filasDerivadas, tareas]);
  const maquinasUnicas = useMemo(() => [...new Set(filasModal.map((f) => f.maquina).filter(Boolean))].sort(), [filasModal]);
  const tareasUnicas = useMemo(() => [...new Set(filasModal.map((f) => f.tarea).filter(Boolean))].sort(), [filasModal]);

  const coincideFiltro = (f) =>
    (filtroEstado === "" ||
      (filtroEstado === "activas"
        ? ["Pedido", "Pendiente", "En proceso", "En taller"].includes(f.estado)
        : f.estado === filtroEstado)) &&
    (filtroMaquina === "" || f.maquina === filtroMaquina) &&
    (filtroTarea === "" || f.tarea === filtroTarea);

  const derivadasFiltradas = useMemo(() => filasDerivadas.filter((f) => f.id === editandoId || coincideFiltro(f)), [filasDerivadas, editandoId, filtroEstado, filtroMaquina, filtroTarea]);
  const tareasFiltradas = useMemo(() => tareas.filter((f) => f.id === editandoId || coincideFiltro(f)), [tareas, editandoId, filtroEstado, filtroMaquina, filtroTarea]);

  const cambiarResponsableDeTarea = (id, nuevoResp) => {
    let oldResp = "";
    let taskObj = null;
    for (const [rName, list] of Object.entries(tareasPorResp)) {
      const found = (list || []).find((t) => t.id === id);
      if (found) {
        oldResp = rName;
        taskObj = found;
        break;
      }
    }
    
    if (oldResp && nuevoResp && oldResp !== nuevoResp && taskObj) {
      setTareasPorResp((prev) => {
        const filteredOld = (prev[oldResp] || []).filter((t) => t.id !== id);
        const updatedNew = [...(prev[nuevoResp] || []), { ...taskObj, responsable: nuevoResp }];
        return {
          ...prev,
          [oldResp]: filteredOld,
          [nuevoResp]: updatedNew,
        };
      });
    }
  };

  // Guarda en la base las tareas del responsable (guardado automático).
  const persistir = async (respNombre, nuevas) => {
    const res = await guardarPendientes(respNombre, nuevas);
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
      let respNombre = "";
      for (const [rName, list] of Object.entries(tareasPorResp)) {
        if ((list || []).some((t) => t.id === editandoId)) {
          respNombre = rName;
          break;
        }
      }
      if (respNombre) {
        const filteredList = (tareasPorResp[respNombre] || []).filter((t) => t.id !== editandoId);
        setTareasPorResp((prev) => ({ ...prev, [respNombre]: filteredList }));
      }
      setNuevas((prev) => { const n = new Set(prev); n.delete(editandoId); return n; });
    }
  };
  cancelarRef.current = () => { descartarSiNueva(); setEditandoId(null); };

  const limpiarFiltros = () => { setFiltroEstado("activas"); setFiltroMaquina(""); setFiltroTarea(""); };
  
  const listRef = useRef(null);
  const abrir = (r) => {
    setResponsableActivo(r);
    setEditandoId(null);
    limpiarFiltros();
    setTimeout(() => {
      listRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };
  const cerrar = () => {
    descartarSiNueva();
    setResponsableActivo(null);
    setEditandoId(null);
    limpiarFiltros();
  };

  // Navega al módulo de reparaciones abriendo la máquina (y los repuestos) correspondientes.
  const irAReparaciones = (t) => {
    pendientesModal?.cerrar();
    navigate("/mantenimiento/reparaciones", {
      state: { maquinaId: t.maquinaId, repuestosDe: t.tipo === "repuesto" ? t.reparacionId : undefined },
    });
  };

  const verObservacion = (texto) =>
    Swal.fire({ title: "Observaciones", text: texto, confirmButtonText: "Cerrar", confirmButtonColor: "#6c757d" });

  // Exporta a Excel las tareas visibles.
  const exportarExcelPendientes = () => {
    const nombre = responsableActivo?.nombre || "Todos";
    const filas = [...derivadasFiltradas, ...tareasFiltradas];
    const headers = ["Fecha", "Responsable", "Máquina", "Tarea", "Días pendiente", "Estado", "Observaciones"];
    const cols = ["A", "B", "C", "D", "E", "F", "G"];
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
        f.responsable || "-",
        f.maquina || "-",
        f.tarea || "-",
        diasPendiente(f.fecha, f.fechaTerminado),
        f.estado || "-",
        f.observaciones || "-",
      ];
      vals.forEach((v, i) => {
        ws[`${cols[i]}${row}`] = { v: v ?? "-", t: typeof v === "number" ? "n" : "s", s: { alignment: i === 3 || i === 6 ? leftAlign : centerAlign } };
      });
    });

    ws["!ref"] = `A1:G${filas.length + 3}`;
    ws["!cols"] = [{ wch: 12 }, { wch: 15 }, { wch: 16 }, { wch: 34 }, { wch: 14 }, { wch: 14 }, { wch: 30 }];

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
    const resp = responsableActivo ? responsableActivo.nombre : RESPONSABLES[0].nombre;
    const nueva = {
      ...filaVacia(),
      responsable: resp,
    };
    setTareasPorResp((prev) => ({
      ...prev,
      [resp]: [...(prev[resp] || []), nueva],
    }));
    setEditandoId(nueva.id);
    setNuevas((prev) => new Set(prev).add(nueva.id));
  };
  
  const editar = (id, campo, valor) => {
    let respNombre = "";
    for (const [rName, list] of Object.entries(tareasPorResp)) {
      if ((list || []).some((t) => t.id === id)) {
        respNombre = rName;
        break;
      }
    }
    if (respNombre) {
      const updatedList = (tareasPorResp[respNombre] || []).map((t) => {
        if (t.id !== id) return t;
        const actualizada = { ...t, [campo]: valor };
        if (campo === "estado") {
          actualizada.fechaTerminado = valor === "Terminado" ? (t.fechaTerminado || hoy()) : "";
        }
        return actualizada;
      });
      setTareasPorResp((prev) => ({ ...prev, [respNombre]: updatedList }));
    }
  };

  const finalizarEdicion = async () => {
    const id = editandoId;
    let respNombre = "";
    let fila = null;
    for (const [rName, list] of Object.entries(tareasPorResp)) {
      const found = (list || []).find((t) => t.id === id);
      if (found) {
        respNombre = rName;
        fila = found;
        break;
      }
    }
    
    if (fila && !(fila.tarea || "").trim()) {
      return Swal.fire({ icon: "warning", title: "Atención", text: "La tarea es obligatoria." });
    }
    if (fila && !(fila.maquina || "").trim()) {
      return Swal.fire({ icon: "warning", title: "Atención", text: "La máquina es obligatoria." });
    }
    setEditandoId(null);
    setNuevas((prev) => { const n = new Set(prev); n.delete(id); return n; });
    
    const listForResp = tareasPorResp[respNombre] || [];
    const [res] = await Promise.all([
      persistir(respNombre, listForResp),
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
    
    let respNombre = "";
    for (const [rName, list] of Object.entries(tareasPorResp)) {
      if ((list || []).some((t) => t.id === id)) {
        respNombre = rName;
        break;
      }
    }
    
    if (respNombre) {
      const nuevasList = (tareasPorResp[respNombre] || []).filter((t) => t.id !== id);
      setTareasPorResp((prev) => ({ ...prev, [respNombre]: nuevasList }));
      setEditandoId((prev) => (prev === id ? null : prev));
      await persistir(respNombre, nuevasList);
      Swal.fire({ position: "center", icon: "success", title: "Tarea eliminada", showConfirmButton: false, timer: 1200, timerProgressBar: true });
    }
  };

  const stats = useMemo(() => {
    let activas = 0;
    let enProceso = 0;
    let urgentes = 0;
    let totalDias = 0;
    let contDias = 0;

    const todasManuales = [];
    Object.values(tareasPorResp).forEach((list) => {
      todasManuales.push(...(list || []));
    });

    const todas = [...todasManuales, ...derivadas];

    todas.forEach((t) => {
      const active = ["Pedido", "Pendiente", "En proceso", "En taller"].includes(t.estado);
      if (active) {
        activas++;
        if (t.estado === "En proceso") {
          enProceso++;
        }
        const dias = diasPendiente(t.fecha, t.fechaTerminado);
        if (typeof dias === "number") {
          totalDias += dias;
          contDias++;
          if (dias > 7) {
            urgentes++;
          }
        }
      }
    });

    return {
      activas,
      enProceso,
      urgentes,
      avgDias: contDias > 0 ? totalDias / contDias : 0,
    };
  }, [tareasPorResp, derivadas]);

  return (
    <>
      <div className="pendientes-bg" />
      <Container className="content-wrapper py-4">
        <h2 className="mb-1 fw-bold text-center text-dark">Panel de Control de Pendientes</h2>
        <p className="text-muted mb-4 text-center">Gestión visual e indicadores de tareas por responsable</p>

        {/* Métrica superior */}
        <Row className="g-3 mb-5 justify-content-center">
          <Col xs={6} md={3}>
            <div className="metric-card">
              <div className="metric-number text-primary">{stats.activas}</div>
              <div className="metric-label">Tareas Activas</div>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="metric-card">
              <div className="metric-number text-warning">{stats.enProceso}</div>
              <div className="metric-label">En Proceso</div>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="metric-card">
              <div className="metric-number text-danger">{stats.urgentes}</div>
              <div className="metric-label">Urgentes (>7 días)</div>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="metric-card">
              <div className="metric-number text-success">
                {stats.avgDias ? stats.avgDias.toFixed(0) : 0}d
              </div>
              <div className="metric-label">Promedio de espera</div>
            </div>
          </Col>
        </Row>

        <Row className="g-4 justify-content-center">
          {RESPONSABLES.map((r) => {
            const pendingCount = contarPendientesEnProceso(r.nombre);
            const totalTasks = [
              ...derivadas.filter((d) => (d.responsable || "").trim() === r.nombre.trim()),
              ...(tareasPorResp[r.nombre] || []),
            ];
            const completedCount = totalTasks.filter(
              (t) => t.estado === "Terminado" || t.estado === "Colocado"
            ).length;
            const totalCount = totalTasks.length;
            const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;
            const esActivo = responsableActivo?.nombre === r.nombre;

            return (
              <Col key={r.nombre} xs={12} sm={6} md={4} lg={3}>
                <div
                  className={`glass-panel p-4 d-flex flex-column h-100 position-relative ${esActivo ? "selected-card" : ""}`}
                  onClick={() => abrir(r)}
                  style={{
                    cursor: "pointer",
                    border: esActivo ? `2px solid ${r.color}` : "1px solid rgba(255, 255, 255, 0.25)",
                    boxShadow: esActivo ? `0 12px 30px ${r.color}25` : "",
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{
                        width: 48,
                        height: 48,
                        backgroundColor: r.color + "22",
                        border: `1px solid ${r.color}44`,
                      }}
                    >
                      <i className="bi bi-person-fill fs-4" style={{ color: r.color }} />
                    </div>
                    {pendingCount > 0 ? (
                      <span
                        className="badge rounded-pill text-white"
                        style={{ backgroundColor: r.color, fontSize: "0.78rem", padding: "6px 12px" }}
                      >
                        {pendingCount} pendientes
                      </span>
                    ) : (
                      <span
                        className="badge rounded-pill bg-success-subtle text-success border border-success-subtle"
                        style={{ fontSize: "0.78rem", padding: "6px 12px" }}
                      >
                        Al día
                      </span>
                    )}
                  </div>

                  <h4 className="fw-bold mb-1 text-dark" style={{ fontSize: "1.1rem" }}>
                    {r.nombre}
                  </h4>
                  <p className="text-muted small mb-3">Responsable</p>

                  <div className="mt-auto">
                    <div className="d-flex justify-content-between small text-muted mb-1">
                      <span>Progreso de tareas</span>
                      <span>{pct}%</span>
                    </div>
                    <div
                      className="progress"
                      style={{ height: "6px", backgroundColor: "rgba(0,0,0,0.06)" }}
                    >
                      <div
                        className="progress-bar"
                        role="progressbar"
                        style={{ width: `${pct}%`, backgroundColor: r.color }}
                        aria-valuenow={pct}
                        aria-valuemin="0"
                        aria-valuemax="100"
                      />
                    </div>
                  </div>
                </div>
              </Col>
            );
          })}

          {/* Card de Resumen */}
          <Col xs={12} sm={6} md={4} lg={3}>
            <div
              className={`glass-panel p-4 d-flex flex-column h-100 justify-content-center align-items-center text-center ${!responsableActivo ? "selected-card" : ""}`}
              onClick={() => setResponsableActivo(null)}
              style={{
                cursor: "pointer",
                border: !responsableActivo ? "2px solid #fd7e14" : "1px dashed rgba(245, 158, 11, 0.5)",
                background: "rgba(255, 255, 255, 0.3)",
              }}
            >
              <div
                className="rounded-circle d-flex align-items-center justify-content-center mb-3"
                style={{
                  width: 52,
                  height: 52,
                  backgroundColor: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid rgba(245, 158, 11, 0.2)",
                }}
              >
                <i className="bi bi-grid-1x2-fill fs-4 text-warning" />
              </div>
              <h4 className="fw-bold text-dark mb-1" style={{ fontSize: "1.1rem" }}>
                Resumen General
              </h4>
              <p className="text-muted small mb-0">Ver todas las tareas juntas</p>
            </div>
          </Col>
        </Row>

        {/* ── Planilla de tareas inline ── */}
        <div ref={listRef} className="glass-panel p-4 mt-5" style={{ background: "rgba(255, 255, 255, 0.65)" }}>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: 40, height: 40, backgroundColor: (responsableActivo?.color || "#6c757d") + "22" }}
              >
                <i className="bi bi-person-badge-fill fs-5" style={{ color: responsableActivo?.color || "#6c757d" }} />
              </div>
              <h3 className="fw-bold text-dark mb-0" style={{ fontSize: "1.35rem" }}>
                Planilla de Tareas: {responsableActivo ? responsableActivo.nombre : "Todos"}
              </h3>
            </div>

            <div className="d-flex gap-2 align-items-center">
              <Button size="sm" variant="outline-dark" className="rounded-pill px-3" onClick={exportarExcelPendientes}>
                <i className="bi bi-file-earmark-excel-fill text-success me-1" /> Exportar Excel
              </Button>
              <Button size="sm" variant="warning" className="rounded-pill px-3 fw-semibold text-white" onClick={agregar}>
                <i className="bi bi-plus-lg me-1" /> Agregar Tarea
              </Button>
              {responsableActivo && (
                <Button size="sm" variant="outline-secondary" className="rounded-pill px-3" onClick={cerrar}>
                  Ver todos
                </Button>
              )}
            </div>
          </div>

          {!cargando && (
            <div className="d-flex gap-2 mb-4 flex-wrap">
              <Form.Select
                size="sm"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="rounded-pill px-3"
                style={{ width: "220px" }}
              >
                <option value="activas">Pedido / Pendiente / En proceso</option>
                <option value="Pedido">Pedido</option>
                <option value="Pendiente">Pendiente</option>
                <option value="En proceso">En proceso</option>
                <option value="En taller">En taller</option>
                <option value="Colocado">Colocado</option>
                <option value="Terminado">Terminado</option>
                <option value="">Todos los estados</option>
              </Form.Select>

              <Form.Select
                size="sm"
                value={filtroMaquina}
                onChange={(e) => setFiltroMaquina(e.target.value)}
                className="rounded-pill px-3"
                style={{ width: "180px" }}
              >
                <option value="">Todas las máquinas</option>
                {maquinasUnicas.map((m) => (<option key={m} value={m}>{m}</option>))}
              </Form.Select>
            </div>
          )}

          {cargando ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="warning" />
            </div>
          ) : (
            <div className="pe-1">
              {/* Render Derived (reparaciones/repuestos) Tasks */}
              {derivadasFiltradas.map((t) => {
                const enEdicion = editandoId === t.id;
                const dias = diasPendiente(t.fecha);
                const diasClass = dias <= 3 ? "fresh" : dias <= 7 ? "warning" : "danger";
                const respColor = RESPONSABLES.find((r) => r.nombre === t.responsable)?.color || "#6c757d";

                if (enEdicion) {
                  return (
                    <div key={t.id} className="task-item-card flex-column align-items-stretch gap-3 w-100 border-warning bg-light">
                      <Row className="g-2">
                        {t.tipo === "reparacion" && (
                          <Col xs={12} md={3}>
                            <Form.Label className="small fw-bold text-muted mb-1">Fecha</Form.Label>
                            <Form.Control size="sm" type="date" value={derivadoEdit.fecha || ""} onChange={(e) => setDerivadoEdit((p) => ({ ...p, fecha: e.target.value }))} />
                          </Col>
                        )}
                        <Col xs={12} md={t.tipo === "reparacion" ? 9 : 12}>
                          <Form.Label className="small fw-bold text-muted mb-1">Tarea</Form.Label>
                          <Form.Control size="sm" value={derivadoEdit.tarea || ""} onChange={(e) => setDerivadoEdit((p) => ({ ...p, tarea: e.target.value }))} />
                        </Col>
                        <Col xs={12} md={4}>
                          <Form.Label className="small fw-bold text-muted mb-1">Estado</Form.Label>
                          <Form.Select size="sm" value={derivadoEdit.estado} onChange={(e) => setDerivadoEdit((p) => ({ ...p, estado: e.target.value }))}>
                            {(t.tipo === "repuesto" ? ESTADOS_REPUESTO : ESTADOS).map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </Form.Select>
                        </Col>
                        <Col xs={12} md={8}>
                          <Form.Label className="small fw-bold text-muted mb-1">Observaciones</Form.Label>
                          <Form.Control size="sm" value={derivadoEdit.observaciones || ""} onChange={(e) => setDerivadoEdit((p) => ({ ...p, observaciones: e.target.value }))} />
                        </Col>
                      </Row>
                      <div className="d-flex justify-content-end gap-2 mt-2">
                        <Button size="sm" variant="outline-secondary" className="rounded-pill px-3" onClick={() => setEditandoId(null)}>Cancelar</Button>
                        <Button size="sm" variant="success" className="rounded-pill px-3" onClick={() => guardarDerivado(t)}>Guardar</Button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={t.id} className="task-item-card d-flex flex-wrap flex-md-nowrap align-items-center justify-content-between gap-3" style={{ borderLeft: `4px solid ${respColor}` }}>
                    <div className="d-flex flex-column gap-1" style={{ flex: 1 }}>
                      <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                        <span className="text-muted small fw-semibold">
                          {t.fecha ? t.fecha.split("-").reverse().join("/") : "-"}
                        </span>
                        {!responsableActivo && (
                          <span className="badge rounded-pill text-white fw-bold px-2 py-0" style={{ backgroundColor: respColor, fontSize: '0.72rem' }}>
                            {t.responsable}
                          </span>
                        )}
                        <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle rounded-pill px-2 py-0" style={{ fontSize: '0.72rem' }}>
                          {t.maquina || "Sin máquina"}
                        </span>
                        <span className="badge bg-info-subtle text-info border border-info-subtle rounded-pill px-2 py-0" style={{ fontSize: '0.72rem' }}>
                          {t.tipo === "repuesto" ? "Repuesto derivado" : "Reparación derivada"}
                        </span>
                        <span className={`days-badge ${diasClass}`}>
                          <i className="bi bi-clock" /> {dias} {dias === 1 ? "día" : "días"}
                        </span>
                      </div>
                      <div className="task-title">{t.tarea}</div>
                      {t.observaciones && (
                        <div className="text-muted small mt-1">
                          <i className="bi bi-info-circle me-1" /> {t.observaciones}
                        </div>
                      )}
                    </div>

                    <div className="d-flex align-items-center gap-3">
                      <span className="state-badge" style={{ backgroundColor: (COLOR_ESTADO[t.estado] || "#6c757d") + "1a", color: COLOR_ESTADO[t.estado] || "#6c757d", border: `1px solid ${COLOR_ESTADO[t.estado]}33` }}>
                        {t.estado}
                      </span>

                      <div className="d-flex gap-1">
                        <Button size="sm" variant="outline-warning" className="border-0 rounded-circle" onClick={() => editarDerivado(t)} title="Editar"><i className="bi bi-pencil-fill" /></Button>
                        <Button size="sm" variant="outline-danger" className="border-0 rounded-circle" onClick={() => borrarDerivado(t)} title="Eliminar"><i className="bi bi-trash-fill" /></Button>
                        <Button size="sm" variant="outline-info" className="border-0 rounded-circle" onClick={() => irAReparaciones(t)} title={t.tipo === "repuesto" ? "Ver Repuestos" : "Ver Reparación"}><i className="bi bi-gear-fill" /></Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Render Manual Tasks */}
              {tareasFiltradas.map((t) => {
                const editando = editandoId === t.id;
                const dias = diasPendiente(t.fecha, t.fechaTerminado);
                const diasClass = dias <= 3 ? "fresh" : dias <= 7 ? "warning" : "danger";
                const respColor = RESPONSABLES.find((r) => r.nombre === t.responsable)?.color || "#6c757d";

                if (editando) {
                  return (
                    <div key={t.id} className="task-item-card flex-column align-items-stretch gap-3 w-100 border-warning bg-light">
                      <Row className="g-2">
                        <Col xs={12} md={3}>
                          <Form.Label className="small fw-bold text-muted mb-1">Fecha</Form.Label>
                          <Form.Control size="sm" type="date" value={t.fecha} onChange={(e) => editar(t.id, "fecha", e.target.value)} />
                        </Col>
                        {!responsableActivo && (
                          <Col xs={12} md={3}>
                            <Form.Label className="small fw-bold text-muted mb-1">Responsable</Form.Label>
                            <Form.Select size="sm" value={t.responsable || ""} onChange={(e) => cambiarResponsableDeTarea(t.id, e.target.value)}>
                              {RESPONSABLES.map((r) => (<option key={r.nombre} value={r.nombre}>{r.nombre}</option>))}
                            </Form.Select>
                          </Col>
                        )}
                        <Col xs={12} md={responsableActivo ? 5 : 3}>
                          <Form.Label className="small fw-bold text-muted mb-1">Máquina</Form.Label>
                          <Form.Select
                            size="sm"
                            value={t.maquina || ""}
                            onChange={(e) => editar(t.id, "maquina", e.target.value)}
                          >
                            <option value="">Seleccionar...</option>
                            {maquinasReparaciones.map((m) => (<option key={m} value={m}>{m}</option>))}
                            <option value="Otra">Otra</option>
                          </Form.Select>
                        </Col>
                        <Col xs={12} md={4}>
                          <Form.Label className="small fw-bold text-muted mb-1">Estado</Form.Label>
                          <Form.Select size="sm" value={t.estado} onChange={(e) => editar(t.id, "estado", e.target.value)}>
                            {ESTADOS.map((s) => (<option key={s} value={s}>{s}</option>))}
                          </Form.Select>
                        </Col>
                        <Col xs={12} md={6}>
                          <Form.Label className="small fw-bold text-muted mb-1">Tarea</Form.Label>
                          <Form.Control size="sm" value={t.tarea} onChange={(e) => editar(t.id, "tarea", e.target.value)} />
                        </Col>
                        <Col xs={12} md={6}>
                          <Form.Label className="small fw-bold text-muted mb-1">Observaciones</Form.Label>
                          <Form.Control size="sm" value={t.observaciones} onChange={(e) => editar(t.id, "observaciones", e.target.value)} />
                        </Col>
                      </Row>
                      <div className="d-flex justify-content-end gap-2 mt-2">
                        <Button size="sm" variant="outline-secondary" className="rounded-pill px-3" onClick={() => cancelarRef.current()}>Cancelar</Button>
                        <Button size="sm" variant="success" className="rounded-pill px-3" onClick={finalizarEdicion}>Guardar</Button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={t.id} className="task-item-card d-flex flex-wrap flex-md-nowrap align-items-center justify-content-between gap-3" style={{ borderLeft: `4px solid ${respColor}` }}>
                    <div className="d-flex flex-column gap-1" style={{ flex: 1 }}>
                      <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                        <span className="text-muted small fw-semibold">
                          {t.fecha ? t.fecha.split("-").reverse().join("/") : "-"}
                        </span>
                        {!responsableActivo && (
                          <span className="badge rounded-pill text-white fw-bold px-2 py-0" style={{ backgroundColor: respColor, fontSize: '0.72rem' }}>
                            {t.responsable}
                          </span>
                        )}
                        <span className="badge bg-warning-subtle text-warning border border-warning-subtle rounded-pill px-2 py-0" style={{ fontSize: '0.72rem' }}>
                          {t.maquina || "Sin máquina"}
                        </span>
                        <span className={`days-badge ${diasClass}`}>
                          <i className="bi bi-clock" /> {dias} {dias === 1 ? "día" : "días"}
                        </span>
                      </div>
                      <div className="task-title">{t.tarea}</div>
                      {t.observaciones && (
                        <div className="text-muted small mt-1">
                          <i className="bi bi-info-circle me-1" /> {t.observaciones}
                        </div>
                      )}
                    </div>

                    <div className="d-flex align-items-center gap-3">
                      <span className="state-badge" style={{ backgroundColor: (COLOR_ESTADO[t.estado] || "#6c757d") + "1a", color: COLOR_ESTADO[t.estado] || "#6c757d", border: `1px solid ${COLOR_ESTADO[t.estado]}33` }}>
                        {t.estado}
                      </span>

                      <div className="d-flex gap-1">
                        <Button size="sm" variant="outline-warning" className="border-0 rounded-circle" onClick={() => setEditandoId(t.id)} title="Editar"><i className="bi bi-pencil-fill" /></Button>
                        <Button size="sm" variant="outline-danger" className="border-0 rounded-circle" onClick={() => borrar(t.id)} title="Eliminar"><i className="bi bi-trash-fill" /></Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {derivadasFiltradas.length === 0 && tareasFiltradas.length === 0 && (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-card-checklist fs-2 mb-2 d-block" />
                  No hay tareas registradas con los filtros actuales
                </div>
              )}
            </div>
          )}
        </div>
      </Container>
    </>
  );
}
