// Horómetro de Zamorano = desvío respecto de su jornada estándar.
// Base de entrada: 8:30. Base de salida: 17:00 entre semana, 12:00 los sábados
// (media jornada), para que un sábado normal dé 0.
export const calcularHorometroZamorano = (entra, sale, esSabado = false) => {
  const cierre = esSabado ? 12 * 60 : 17 * 60;
  let diff = 0;
  if (entra) { const [h, m] = entra.split(":").map(Number); diff += h * 60 + m - (8 * 60 + 30); }
  if (sale) { const [h, m] = sale.split(":").map(Number); diff -= h * 60 + m - cierre; }
  if (diff === 0) return "0";
  const neg = diff < 0;
  const abs = Math.abs(diff);
  const horas = Math.floor(abs / 60);
  const mins = abs % 60;
  const str = mins === 0 ? `${horas}` : `${horas}:${String(mins).padStart(2, "0")}`;
  return neg ? `-${str}` : str;
};

export const horometroStrAMins = (str) => {
  if (!str || str === "0") return 0;
  const neg = str.startsWith("-");
  const abs = neg ? str.slice(1) : str;
  const parts = abs.split(":");
  const total = parseInt(parts[0]) * 60 + (parts[1] ? parseInt(parts[1]) : 0);
  return neg ? -total : total;
};
