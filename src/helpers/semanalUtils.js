// Utilidades para el historial de `semanal` de Personal.
// El campo `semanal` es un array `[{ valor, fecha, cantJornales }]` que guarda el
// historial de sueldos. Un valor nuevo con fecha F recién "corre" a partir de esa
// fecha: los cálculos anteriores a F deben usar el valor que estaba vigente
// entonces, no el último cargado.

// Devuelve la entrada del historial vigente en `fechaRef` (string "YYYY-MM-DD"):
// la última con `fecha <= fechaRef`. Si ninguna califica (todas futuras respecto
// de fechaRef) usa la más antigua. Fechas legadas "-" cuentan desde el inicio.
// Tolera el formato viejo (Number) devolviendo esa única entrada.
export const semanalVigente = (semanal, fechaRef) => {
  if (Array.isArray(semanal)) {
    if (semanal.length === 0) return null;
    const ordenado = [...semanal].sort((a, b) =>
      String(a.fecha || "").localeCompare(String(b.fecha || ""))
    );
    if (!fechaRef) return ordenado[ordenado.length - 1];
    let elegido = null;
    for (const item of ordenado) {
      if (String(item.fecha || "") <= fechaRef) elegido = item;
    }
    return elegido || ordenado[0];
  }
  // Formato viejo: un solo número.
  if (semanal != null && semanal !== "") return { valor: Number(semanal) || 0, cantJornales: 0, fecha: "-" };
  return null;
};

// Valor semanal ($) vigente en `fechaRef`. 0 si no hay dato.
export const valorSemanalVigente = (semanal, fechaRef) =>
  Number(semanalVigente(semanal, fechaRef)?.valor || 0);
