// Orden único de las listas de personal: Zamorano primero, el resto alfabético,
// y Nacho y Agustín siempre al final. Vive acá para que Asistencia y Gastos
// Semanales muestren siempre el mismo orden.

// Sin acentos, sin puntuación y en minúscula, para que el orden no dependa de
// cómo esté escrito el nombre en cada pantalla.
const clave = (s) =>
  (s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.,;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const PRIMERO = ["zamorano"];
const ULTIMO = ["nacho", "agustin"];

const prioridad = (nombre) => {
  const k = clave(nombre);
  if (PRIMERO.some((n) => k.includes(n))) return 0;
  if (ULTIMO.some((n) => k.includes(n))) return 2;
  return 1;
};

// localeCompare en "es": ordena bien acentos y la ñ, que con una comparación
// común quedaría después de la Z.
export const compararPersonal = (a, b) => {
  const pa = prioridad(a);
  const pb = prioridad(b);
  if (pa !== pb) return pa - pb;
  return (a || "").localeCompare(b || "", "es", { sensitivity: "base" });
};

// `getNombre` permite usarlo con filas ({ personal }), con el legajo ({ nombre })
// o con un array de strings.
export const ordenarPersonal = (filas, getNombre = (f) => f?.personal) =>
  [...filas].sort((a, b) => compararPersonal(getNombre(a), getNombre(b)));

export default ordenarPersonal;
