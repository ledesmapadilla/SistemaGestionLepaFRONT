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

// Semana en curso, de lunes a sábado, como { desde, hasta } en "YYYY-MM-DD".
// Es el valor sugerido al mandar una tarea "A semanal".
export const semanaActual = () => {
  const a = new Date();
  const lunes = new Date(a.getFullYear(), a.getMonth(), a.getDate() - ((a.getDay() + 6) % 7));
  const sabado = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 5);
  return { desde: lunes.toLocaleDateString("en-CA"), hasta: sabado.toLocaleDateString("en-CA") };
};
