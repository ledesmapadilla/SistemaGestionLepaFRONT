import { useState } from "react";
import { Modal, Table, Form, Button } from "react-bootstrap";
import Swal from "sweetalert2";
import AsyncButton from "../../../../shared/AsyncButton";
import { crearDevolucionProveedor } from "../../../../../helpers/queriesPagosProveedores";

// Devolución de un proveedor al que se le pagó de más (saldo negativo).
// Los cheques recibidos quedan en cartera en Contable → Cheques.

const hoy = new Date().toLocaleDateString("en-CA");

const formatoMoneda = (valor) =>
  Number(valor).toLocaleString("es-AR", { style: "currency", currency: "ARS" });

const parseMonto = (val) => parseFloat(String(val ?? "").replace(",", ".").trim()) || 0;

const esCheque = (tipo) => tipo === "Cheque" || tipo === "E-Cheq";

const medioVacio = (monto = "") => ({ id: Date.now() + Math.random(), medioPago: "Cheque", monto, numeroCheque: "", fechaCobro: "" });

const DevolucionProveedorModal = ({ show, onHide, proveedor, saldoAFavor, onGuardado }) => {
  const [fecha, setFecha] = useState(hoy);
  const [observaciones, setObservaciones] = useState("");
  const [medios, setMedios] = useState(() => [medioVacio(saldoAFavor.toFixed(2))]);
  const [guardando, setGuardando] = useState(false);

  const total = medios.reduce((s, m) => s + parseMonto(m.monto), 0);

  const actualizar = (id, campo, valor) =>
    setMedios((prev) => prev.map((m) => (m.id === id ? { ...m, [campo]: valor } : m)));

  const guardar = async () => {
    if (!fecha) return Swal.fire("Atención", "Ingresá la fecha.", "warning");
    for (const m of medios) {
      if (!(parseMonto(m.monto) > 0)) return Swal.fire("Atención", "Cada forma de cobro necesita un monto mayor a 0.", "warning");
      if (esCheque(m.medioPago) && (!m.numeroCheque.trim() || !m.fechaCobro))
        return Swal.fire("Atención", "Cada cheque necesita número y fecha de vencimiento.", "warning");
    }
    if (total > saldoAFavor + 0.01)
      return Swal.fire("Atención", `La devolución (${formatoMoneda(total)}) supera lo que nos debe (${formatoMoneda(saldoAFavor)}).`, "warning");

    setGuardando(true);
    try {
      const res = await crearDevolucionProveedor({
        fecha,
        proveedor,
        observaciones: observaciones.trim(),
        mediosPago: medios.map((m) => ({
          medioPago: m.medioPago,
          monto: parseMonto(m.monto),
          numeroCheque: esCheque(m.medioPago) ? m.numeroCheque.trim() : "",
          fechaCobro: esCheque(m.medioPago) ? m.fechaCobro : "",
        })),
      });
      if (res?.ok) {
        const hayCheques = medios.some((m) => esCheque(m.medioPago));
        await Swal.fire({
          icon: "success",
          title: "Devolución registrada",
          text: hayCheques ? "El cheque quedó en cartera en Contable → Cheques." : undefined,
          timer: 2500,
          showConfirmButton: false,
        });
        onGuardado?.();
      } else {
        const err = await res?.json().catch(() => ({}));
        Swal.fire("Error", err?.msg || "No se pudo registrar la devolución.", "error");
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>Devolución de {proveedor}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="small mb-3">
          Le pagamos de más: nos debe <strong>{formatoMoneda(saldoAFavor)}</strong>. Lo que cargues acá entra en su
          cuenta corriente como devolución.
        </p>
        <div className="d-flex gap-3 mb-3 align-items-center">
          <Form.Label className="mb-0">Fecha</Form.Label>
          <Form.Control type="date" max={hoy} style={{ width: "160px" }} value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <Form.Label className="mb-0 text-nowrap">Observaciones</Form.Label>
          <Form.Control type="text" placeholder="Observaciones (opcional)" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        </div>
        <div className="d-flex justify-content-end mb-2">
          <Button variant="outline-primary" size="sm" onClick={() => setMedios((prev) => [...prev, medioVacio()])}>+ Agregar</Button>
        </div>
        <Table bordered hover className="text-center align-middle">
          <thead className="table-dark">
            <tr>
              <th>Forma de cobro</th>
              <th>Monto</th>
              <th>N° Cheque</th>
              <th>Vencimiento</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {medios.map((m) => (
              <tr key={m.id}>
                <td>
                  <Form.Select size="sm" value={m.medioPago} onChange={(e) => actualizar(m.id, "medioPago", e.target.value)}>
                    <option>Cheque</option>
                    <option>E-Cheq</option>
                    <option>Efectivo</option>
                    <option>Transferencia</option>
                  </Form.Select>
                </td>
                <td>
                  <Form.Control
                    type="text"
                    size="sm"
                    placeholder="0.00"
                    value={m.monto}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => actualizar(m.id, "monto", e.target.value)}
                  />
                </td>
                <td>
                  {esCheque(m.medioPago) ? (
                    <Form.Control type="text" size="sm" placeholder="N° cheque" value={m.numeroCheque} onChange={(e) => actualizar(m.id, "numeroCheque", e.target.value)} />
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td>
                  {esCheque(m.medioPago) ? (
                    <Form.Control type="date" size="sm" value={m.fechaCobro} onChange={(e) => actualizar(m.id, "fechaCobro", e.target.value)} />
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td>
                  <Button variant="outline-danger" size="sm" disabled={medios.length === 1} onClick={() => setMedios((prev) => prev.filter((x) => x.id !== m.id))}>Quitar</Button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot style={{ borderTop: "2px solid #ffc107" }}>
            <tr>
              <td className="text-end fw-semibold">Total:</td>
              <td className="fw-bold">{formatoMoneda(total)}</td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        </Table>
      </Modal.Body>
      <Modal.Footer className="justify-content-center">
        <Button variant="outline-secondary" onClick={onHide}>Cancelar</Button>
        <AsyncButton variant="outline-success" onClick={guardar} loading={guardando}>Guardar devolución</AsyncButton>
      </Modal.Footer>
    </Modal>
  );
};

export default DevolucionProveedorModal;
