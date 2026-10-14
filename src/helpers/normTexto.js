// Comparación de nombres (clientes, obras, proveedores, máquinas) sin distinguir
// mayúsculas, acentos ni espacios de más: "Nougues ", "nougues" y "NOUGUÉS"
// son el mismo. Usar siempre esto al cruzar nombres entre colecciones.

export const normTexto = (s) =>
  (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

export const mismoTexto = (a, b) => normTexto(a) === normTexto(b);

// Lista de nombres sin repetidos según normTexto (se queda con la primera forma).
export const unicosTexto = (lista) => {
  const vistos = new Set();
  return (lista || []).filter((s) => {
    const k = normTexto(s);
    if (!k || vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
};
