// Reglas de cobros y saldo a favor, compartidas por NuevoCobro, EditarCobro y
// CobrosTabla. Espejo de Back: src/helpers/saldoAFavor.js (el backend valida).

// Forma de pago que no es plata nueva: consume el saldo que el cliente dejó
// en cobros anteriores (pagó de más o dejó un anticipo).
export const SALDO_A_FAVOR = "Saldo a favor";

export const MEDIOS_PAGO = ["Efectivo", "Cheque", "E-Cheq", "Retenciones", "Transferencia", "Canje"];

export const esCheque = (tipo) => tipo === "Cheque" || tipo === "E-Cheq";

const num = (v) => parseFloat(v) || 0;

// Lo que el cobro cancela de facturas.
export const imputadoCobro = (c) =>
  (c?.pagos || []).reduce((s, p) => s + num(p.montoCobrado), 0);

// Plata que realmente entró (sin la aplicación de saldo a favor).
export const recibidoCobro = (c) =>
  c?.mediosPago?.length
    ? c.mediosPago.filter((m) => m.medioPago !== SALDO_A_FAVOR).reduce((s, m) => s + num(m.monto), 0)
    : imputadoCobro(c);

export const usadoSaldoAFavor = (mediosPago) =>
  (mediosPago || []).filter((m) => m.medioPago === SALDO_A_FAVOR).reduce((s, m) => s + num(m.monto), 0);

// Lo que un cobro deja a favor (+) o consume del saldo a favor (−).
export const movimientoSaldoAFavor = (c) =>
  Math.round((recibidoCobro(c) - imputadoCobro(c)) * 100) / 100;

// { cliente: saldo a favor disponible } sumando todos los cobros, salvo `excluirId`.
export const saldosAFavorPorCliente = (cobros, excluirId = null) => {
  const saldos = {};
  (cobros || []).forEach((c) => {
    if (excluirId && c._id === excluirId) return;
    saldos[c.cliente] = (saldos[c.cliente] || 0) + recibidoCobro(c) - imputadoCobro(c);
  });
  Object.keys(saldos).forEach((k) => {
    saldos[k] = Math.max(0, Math.round(saldos[k] * 100) / 100);
  });
  return saldos;
};

// Valida las formas de pago de un cobro. Devuelve { title, text } o null.
export const validarMediosPago = (mediosPago, { imputado, hayFacturas, saldoDisponible, chequesExistentes }) => {
  if (mediosPago.length === 0)
    return { title: "Sin forma de pago", text: "Agregá al menos una forma de pago" };
  for (const m of mediosPago) {
    const esE = m.medioPago === "E-Cheq";
    if (!m.medioPago)
      return { title: "Forma de pago incompleta", text: "Seleccioná el tipo en cada forma de pago" };
    if (!(num(m.monto) > 0))
      return { title: "Monto inválido", text: "Ingresá un monto válido en cada forma de pago" };
    if (esCheque(m.medioPago) && !m.numeroCheque)
      return { title: `Número de ${esE ? "e-cheq" : "cheque"} faltante`, text: `Ingresá el número de ${esE ? "e-cheq" : "cheque"}` };
    if (esCheque(m.medioPago) && !m.fechaCobro)
      return { title: "Fecha de cobro faltante", text: `Ingresá la fecha de cobro del ${esE ? "e-cheq" : "cheque"}` };
    if (esCheque(m.medioPago) && chequesExistentes?.has(m.numeroCheque))
      return { title: `${esE ? "E-Cheq" : "Cheque"} duplicado`, text: `El ${esE ? "e-cheq" : "cheque"} N° ${m.numeroCheque} ya existe en otro cobro` };
  }
  const usado = usadoSaldoAFavor(mediosPago);
  const total = mediosPago.reduce((s, m) => s + num(m.monto), 0);
  const fmt = (v) => Number(v).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
  if (usado > 0 && !hayFacturas)
    return { title: "Saldo a favor", text: "El saldo a favor solo se usa para cobrar facturas" };
  if (usado > saldoDisponible + 0.01)
    return { title: "Saldo a favor insuficiente", text: `El cliente tiene ${fmt(saldoDisponible)} a favor y se quieren usar ${fmt(usado)}` };
  if (usado > imputado + 0.01)
    return { title: "Saldo a favor", text: `El saldo a favor usado (${fmt(usado)}) no puede superar lo imputado a facturas (${fmt(imputado)})` };
  if (total < imputado - 0.01)
    return { title: "Los montos no alcanzan", text: `Las formas de pago (${fmt(total)}) no cubren lo imputado a facturas (${fmt(imputado)})` };
  return null;
};
