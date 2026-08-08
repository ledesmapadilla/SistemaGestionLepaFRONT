// Cálculo de la Dif. horaria del día, compartido por Asistencia, la página del
// día y Gastos Semanales, para que las tres muestren siempre lo mismo.

// Zamorano tiene horario propio (entra 8:30 en vez de 8:00), así que su jornada
// esperada es distinta a la del resto. Se lo identifica por nombre porque es la
// misma convención que usa el resto de la app.
export const esZamorano = (nombre) =>
  !!nombre && String(nombre).toLowerCase().includes("zamorano");

// A partir de esta hora de salida el sábado se considera jornada completa y se
// le descuenta la hora de almuerzo (que la jornada corta no incluye).
export const SABADO_ALMUERZO_DESDE = 15 * 60;

// Jornada esperada del día, en minutos.
//   Resto:    8:00 a 17:00 (9 hs) de lun a vie, 8:00 a 12:00 (4 hs) el sábado.
//   Zamorano: 8:30 a 17:00 (8:30 hs) de lun a vie, 8:30 a 12:00 (3:30) el sábado.
export const jornadaEsperadaMin = (nombre, esSabado = false) => {
  if (esZamorano(nombre)) return esSabado ? 210 : 510;
  return esSabado ? 240 : 540;
};

// "hh:mm" -> minutos. null si no es válido.
export const parseHoraMin = (str) => {
  if (!str) return null;
  const [h, m] = String(str).split(":").map(Number);
  if (isNaN(h)) return null;
  return h * 60 + (isNaN(m) ? 0 : m);
};

// Dif. del día en minutos: jornada esperada - (sale - entra). null si falta
// dato. Positivo = trabajó de menos (descuenta); negativo = trabajó de más
// (suma como extra). Si el sábado sale después de las 15:00 se descuenta la
// hora de almuerzo.
export const difMinDia = (entra, sale, esSabado = false, nombre = "") => {
  const e = parseHoraMin(entra);
  const s = parseHoraMin(sale);
  if (e == null || s == null) return null;
  const almuerzo = esSabado && s > SABADO_ALMUERZO_DESDE ? 60 : 0;
  return jornadaEsperadaMin(nombre, esSabado) - (s - e - almuerzo);
};

// minutos -> "hh:mm" (con signo)
export const minsAHHMM = (mins) => {
  const neg = mins < 0;
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${neg ? "-" : ""}${h}:${String(m).padStart(2, "0")}`;
};

// Color de la Dif.: verde si trabajó de más, rojo si trabajó de menos.
export const colorDif = (mins) => (mins < 0 ? "#198754" : mins > 0 ? "#dc3545" : undefined);
