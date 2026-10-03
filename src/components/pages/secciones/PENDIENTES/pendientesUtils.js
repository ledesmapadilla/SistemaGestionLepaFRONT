// Constantes y helpers compartidos por Pendientes y Tareas para la semana.

// Mismos responsables que el select de repuestos.
export const RESPONSABLES = [
  { nombre: "Zamorano", color: "#0d6efd" },
  { nombre: "Mauricio", color: "#198754" },
  { nombre: "Nelson", color: "#dc3545" },
  { nombre: "Juan José", color: "#6f42c1" },
  { nombre: "Nacho", color: "#fd7e14" },
  { nombre: "Agustín", color: "#0dcaf0" },
];

export const ESTADOS = ["Pendiente", "En proceso", "Terminado"];
export const ESTADOS_REPUESTO = ["Pedido", "Pendiente", "En taller", "Colocado"];

export const COLOR_ESTADO = {
  Pendiente: "#6c757d",
  "En proceso": "#ffc107",
  Terminado: "#198754",
  // Estados de repuestos
  Pedido: "#0dcaf0",
  "En taller": "#fd7e14",
  Colocado: "#198754",
};

export const hoy = () => new Date().toLocaleDateString("en-CA");

export const parseFechaLocal = (f) => {
  const [y, m, d] = f.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// "YYYY-MM-DD" → "DD/MM/YYYY".
export const fechaAR = (f) => (f ? f.split("-").reverse().join("/") : "-");

// Días desde que se generó la tarea (fecha). Suma hasta hoy mientras no esté
// terminada; si tiene fechaTerminado, el conteo se congela en esa fecha.
export const diasPendiente = (fecha, fechaTerminado) => {
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

// Lunes de la semana que viene ("YYYY-MM-DD"). Es el desde sugerido al mandar una
// tarea "A semanal"; si hoy es lunes, también sugiere el de la semana próxima.
export const lunesSiguiente = () => {
  const a = new Date();
  const dias = (8 - a.getDay()) % 7 || 7;
  return new Date(a.getFullYear(), a.getMonth(), a.getDate() + dias).toLocaleDateString("en-CA");
};

// Sábado de la semana de `desde` (el mismo día si `desde` ya es sábado; si es
// domingo, el sábado siguiente). Es el hasta de la semana.
export const sabadoDeSemana = (desde) => {
  const d = parseFechaLocal(desde);
  const dias = (6 - d.getDay() + 7) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + dias).toLocaleDateString("en-CA");
};

// ── Lógica compartida entre Pendientes y Tareas para la semana ──
// Funciones puras: reciben el estado y devuelven el nuevo, sin guardar nada.

// Filas derivadas de reparaciones: las reparaciones se asignan solo a Zamorano;
// los repuestos se asignan a su responsable (Zamorano, Nelson, etc.).
// El `id` de cada fila es el `origenId` que guardan las tareas de la semana.
export const derivarFilasReparaciones = (docsReparaciones) => {
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
};

// Aplica a la reparación o repuesto de origen de la fila derivada `t` los campos
// editados (`campos`: fecha, tarea, estado, observaciones). La fecha solo se
// aplica a reparaciones: el repuesto usa la de su reparación.
export const aplicarEdicionDerivada = (docsReparaciones, t, campos) =>
  docsReparaciones.map((doc) => {
    if (String(doc.maquina?._id) !== String(t.maquinaId)) return doc;
    const reparaciones = (doc.reparaciones || []).map((r, ri) => {
      if (ri !== t.reparacionIndex) return r;
      if (t.tipo === "reparacion") {
        return { ...r, fecha: campos.fecha, reparacion: campos.tarea, estado: campos.estado, observaciones: campos.observaciones };
      }
      const repuestos = (r.repuestos || []).map((rep, pi) =>
        pi === t.repuestoIndex ? { ...rep, repuesto: campos.tarea, estado: campos.estado, observaciones: campos.observaciones } : rep
      );
      return { ...r, repuestos };
    });
    return { ...doc, reparaciones };
  });

// Si la tarea manual está vinculada a una reparación (por reparacionId o por
// máquina + nombre), le copia sus campos comunes.
// Devuelve { docs, maquinas } con los ids de las máquinas a guardar.
export const aplicarTareaAReparaciones = (docsReparaciones, tarea) => {
  const nombreMaq = (tarea.maquina || "").trim().toLowerCase();
  const nombreTarea = (tarea.tarea || "").trim().toLowerCase();
  const maquinas = new Set();
  const docs = docsReparaciones.map((doc) => {
    const maq = (doc.maquina?.maquina || "").trim().toLowerCase();
    const reparaciones = (doc.reparaciones || []).map((r) => {
      const porVinculo = tarea.reparacionId && r.id === tarea.reparacionId;
      const porNombre = maq === nombreMaq && (r.reparacion || "").trim().toLowerCase() === nombreTarea;
      if (porVinculo || porNombre) {
        maquinas.add(String(doc.maquina?._id));
        return { ...r, fecha: tarea.fecha, reparacion: tarea.tarea, estado: tarea.estado, observaciones: tarea.observaciones };
      }
      return r;
    });
    return { ...doc, reparaciones };
  });
  return { docs, maquinas: [...maquinas] };
};

// Inverso: copia la reparación a la(s) tarea(s) manuales vinculadas (por vínculo
// o por máquina + nombre). `mapa` es { responsable: tareas[] }.
// Devuelve { mapa, responsables } con los responsables a guardar.
export const aplicarReparacionATareas = (mapa, rep, maquinaNombre) => {
  const nombreMaq = (maquinaNombre || "").trim().toLowerCase();
  const nombreRep = (rep.reparacion || "").trim().toLowerCase();
  const responsables = new Set();
  const nuevoMapa = {};
  Object.entries(mapa).forEach(([resp, ts]) => {
    nuevoMapa[resp] = (ts || []).map((task) => {
      const porVinculo = rep.pendResp && rep.pendTaskId && resp === rep.pendResp && task.id === rep.pendTaskId;
      const porNombre = (task.maquina || "").trim().toLowerCase() === nombreMaq && (task.tarea || "").trim().toLowerCase() === nombreRep;
      if (porVinculo || porNombre) {
        responsables.add(resp);
        return { ...task, fecha: rep.fecha, tarea: rep.reparacion, estado: rep.estado, observaciones: rep.observaciones };
      }
      return task;
    });
  });
  return { mapa: nuevoMapa, responsables: [...responsables] };
};

// Doc de reparaciones de una máquina.
export const docDeMaquina = (docsReparaciones, maquinaId) =>
  docsReparaciones.find((d) => String(d.maquina?._id) === String(maquinaId));
