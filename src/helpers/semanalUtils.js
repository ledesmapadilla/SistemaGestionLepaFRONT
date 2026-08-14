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

// ============================================================================
// Jornal y valor hora — criterio único de todo el proyecto
// ============================================================================
// El sueldo semanal se reparte entre los días que la persona trabaja
// (`cantJornales`, 5 ó 5.5), no entre una cantidad fija de horas:
//   jornal = semanal / cantJornales
//   hora   = jornal / 8
// Se divide por 8 y no por 9 porque la hora de almuerzo no se paga. Antes
// varias pantallas dividían el semanal por 44 fijo, que solo daba bien para
// quien trabaja 5.5 jornales; con 5 jornales el divisor correcto es 40.

// Horas pagas que tiene un jornal.
export const HORAS_POR_JORNAL = 8;

// Jornales a usar cuando el legajo no los tiene cargados (entradas viejas del
// historial, anteriores al campo `cantJornales`).
export const JORNALES_POR_DEFECTO = 5.5;

// Cantidad de jornales semanales vigente en `fechaRef`. Si esa entrada no lo
// tiene cargado (las viejas, anteriores al campo, quedaron en 0), se usa el
// primer valor que sí figure en el historial: los jornales son cómo trabaja la
// persona, no cambian con cada aumento. Recién si no hay ninguno cae en 5.5.
export const jornalesVigente = (semanal, fechaRef) => {
  const cant = Number(semanalVigente(semanal, fechaRef)?.cantJornales || 0);
  if (cant > 0) return cant;
  const conJornales = (Array.isArray(semanal) ? semanal : [])
    .map((s) => Number(s?.cantJornales || 0))
    .filter((c) => c > 0);
  return conJornales.length > 0 ? conJornales[0] : JORNALES_POR_DEFECTO;
};

// Valor del jornal ($ de un día de trabajo) a partir de valores sueltos.
export const valorJornalDe = (valorSemanal, cantJornales) => {
  const valor = Number(valorSemanal) || 0;
  if (valor <= 0) return 0;
  const cant = Number(cantJornales) > 0 ? Number(cantJornales) : JORNALES_POR_DEFECTO;
  return valor / cant;
};

// Valor de la hora a partir de valores sueltos (una fila ya armada).
export const valorHoraDe = (valorSemanal, cantJornales) =>
  valorJornalDe(valorSemanal, cantJornales) / HORAS_POR_JORNAL;

// Valor del jornal vigente en `fechaRef`. 0 si no hay dato.
export const valorJornalVigente = (semanal, fechaRef) =>
  valorJornalDe(valorSemanalVigente(semanal, fechaRef), jornalesVigente(semanal, fechaRef));

// Valor de la hora vigente en `fechaRef`, redondeado a 2 decimales (es lo que
// se guarda en el remito como `costoHoraPersonal`).
export const valorHoraVigente = (semanal, fechaRef) =>
  Math.round(
    (valorHoraDe(valorSemanalVigente(semanal, fechaRef), jornalesVigente(semanal, fechaRef))) * 100
  ) / 100;
