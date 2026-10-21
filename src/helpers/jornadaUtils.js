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

// De lun a vie se almuerza de 13:00 a 14:00 y esa hora no cuenta como trabajada.
export const ALMUERZO_DESDE = 13 * 60;
export const ALMUERZO_HASTA = 14 * 60;

// Jornada esperada del día, en minutos de trabajo efectivo (sin almuerzo).
//   Resto:    8:00 a 17:00 = 8 hs de lun a vie, 8:00 a 12:00 (4 hs) el sábado.
//   Zamorano: 8:30 a 17:00 = 7:30 hs de lun a vie, 8:30 a 12:00 (3:30) el sábado.
export const jornadaEsperadaMin = (nombre, esSabado = false) => {
  if (esZamorano(nombre)) return esSabado ? 210 : 450;
  return esSabado ? 240 : 480;
};

// Minutos de almuerzo que caen dentro del horario trabajado.
//   Lun a vie: la parte de [entra, sale] que se pisa con 13:00 a 14:00.
//   Sábado: 1 hora si sale después de las 15:00 (jornada larga); si no, nada.
const almuerzoMin = (e, s, esSabado) => {
  if (esSabado) return s > SABADO_ALMUERZO_DESDE ? 60 : 0;
  return Math.max(0, Math.min(s, ALMUERZO_HASTA) - Math.max(e, ALMUERZO_DESDE));
};

// "hh:mm" -> minutos. null si no es válido.
export const parseHoraMin = (str) => {
  if (!str) return null;
  const [h, m] = String(str).split(":").map(Number);
  if (isNaN(h)) return null;
  return h * 60 + (isNaN(m) ? 0 : m);
};

// Quien trabaja 5 días (cantJornales 1 a 5, no 5.5) no trabaja sábados ni
// domingos: son su día libre. `fecha` es un Date.
export const trabajaCincoDias = (cantJornales) => {
  const c = Number(cantJornales) || 0;
  return c > 0 && c <= 5;
};
export const esDiaLibre = (cantJornales, fecha) => {
  const dia = fecha.getDay();
  return (dia === 6 || dia === 0) && trabajaCincoDias(cantJornales);
};

// Desde esta fecha el día libre se habilita y lo trabajado se paga. Antes, esas
// filas quedaban bloqueadas pero se guardaban con el horario por defecto aunque
// la persona no fuera, así que las semanas viejas no las toman.
export const DIA_LIBRE_PAGO_DESDE = "2026-10-17";
export const pagaDiaLibre = (fecha) => {
  const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
  return key >= DIA_LIBRE_PAGO_DESDE;
};

// Dif. del día en minutos: jornada esperada - (sale - entra - almuerzo). null
// si falta dato. Positivo = trabajó de menos (descuenta); negativo = trabajó de
// más (suma como extra).
// En un día libre (`libre`) no hay jornada esperada: todo lo trabajado es extra.
// El almuerzo se descuenta con el criterio del sábado (si sale después de las 15).
export const difMinDia = (entra, sale, esSabado = false, nombre = "", libre = false) => {
  const e = parseHoraMin(entra);
  const s = parseHoraMin(sale);
  if (e == null || s == null) return null;
  const esperada = libre ? 0 : jornadaEsperadaMin(nombre, esSabado);
  return esperada - (s - e - almuerzoMin(e, s, esSabado || libre));
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
