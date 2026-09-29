const formatoMoneda = (valor) =>
  Number(valor).toLocaleString("es-AR", { style: "currency", currency: "ARS" });

// Recibido / imputado / lo que queda a favor del cliente en un cobro.
const ResumenCobro = ({ recibido, usadoSaldo, imputado, excedente }) => (
  <div className="d-flex justify-content-end gap-3 small">
    <span>Recibido: <strong>{formatoMoneda(recibido)}</strong></span>
    {usadoSaldo > 0.01 && <span>Saldo a favor usado: <strong>{formatoMoneda(usadoSaldo)}</strong></span>}
    <span>Imputado a facturas: <strong>{formatoMoneda(imputado)}</strong></span>
    {excedente > 0.01 && (
      <span className="text-success fw-semibold">Queda a favor del cliente: {formatoMoneda(excedente)}</span>
    )}
    {excedente < -0.01 && (
      <span className="text-danger fw-semibold">Falta cubrir: {formatoMoneda(-excedente)}</span>
    )}
  </div>
);

export default ResumenCobro;
