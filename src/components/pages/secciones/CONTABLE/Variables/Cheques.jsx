import React, { useState, useEffect } from "react";
import { listarCobros, actualizarEstadoCheque } from "../../../../../helpers/queriesCobros.js";
import { Spinner, Modal, Button, Form } from "react-bootstrap";
import ChequesTabla from "./ChequesTabla.jsx";

const Cheques = () => {
  const [loading, setLoading] = useState(true);
  const [cheques, setCheques] = useState([]);
  const [modalPago, setModalPago] = useState(null);
  const [proveedor, setProveedor] = useState("");
  const [observaciones, setObservaciones] = useState("");

  useEffect(() => {
    const cargar = async () => {
      try {
        const cobros = await listarCobros();
        const filas = [];
        cobros.forEach((cobro) => {
          const medios = Array.isArray(cobro.mediosPago) ? cobro.mediosPago : [];
          medios.forEach((m, medioIndex) => {
            if (m.medioPago === "Cheque" || m.medioPago === "E-Cheq") {
              filas.push({
                _id: `${cobro._id}-${medioIndex}`,
                cobroId: cobro._id,
                medioIndex,
                cliente: cobro.cliente,
                numeroCheque: m.numeroCheque || "-",
                valor: m.monto,
                fechaVencimiento: m.fechaCobro || "",
                tipo: m.medioPago,
                estado: m.estado || "En cartera",
                proveedor: m.proveedor || "",
                observaciones: m.observaciones || "",
              });
            }
          });
        });
        filas.sort((a, b) => (a.fechaVencimiento || "").localeCompare(b.fechaVencimiento || ""));
        setCheques(filas);
      } catch (error) {
        console.error("Error al cargar cheques:", error);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const handleUtilizar = async (fila, uso) => {
    if (uso === "Pago proveedores") {
      setModalPago(fila);
      setProveedor("");
      setObservaciones("");
      return;
    }
    if (uso === "En cartera") {
      await actualizarEstadoCheque(fila.cobroId, fila.medioIndex, "En cartera", "", "");
      setCheques((prev) =>
        prev.map((c) =>
          c._id === fila._id ? { ...c, estado: "En cartera", proveedor: "", observaciones: "" } : c
        )
      );
      return;
    }
    await actualizarEstadoCheque(fila.cobroId, fila.medioIndex, uso, "", "");
    setCheques((prev) =>
      prev.map((c) =>
        c._id === fila._id ? { ...c, estado: uso, proveedor: "", observaciones: "" } : c
      )
    );
  };

  const confirmarPagoProveedor = async () => {
    if (!proveedor.trim()) return;
    await actualizarEstadoCheque(
      modalPago.cobroId,
      modalPago.medioIndex,
      "Pago proveedores",
      observaciones.trim(),
      proveedor.trim()
    );
    setCheques((prev) =>
      prev.map((c) =>
        c._id === modalPago._id
          ? { ...c, estado: "Pago proveedores", proveedor: proveedor.trim(), observaciones: observaciones.trim() }
          : c
      )
    );
    setModalPago(null);
  };

  const formatoMoneda = (valor) =>
    Number(valor).toLocaleString("es-AR", { style: "currency", currency: "ARS" });

  const formatearFecha = (fecha) => {
    if (!fecha) return "-";
    const p = fecha.split("-");
    return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : fecha;
  };

  if (loading) return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <>
      <ChequesTabla cheques={cheques} onUtilizar={handleUtilizar} />

      <Modal show={!!modalPago} onHide={() => setModalPago(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Pago a proveedor</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-1"><strong>N° Cheque:</strong> {modalPago?.numeroCheque}</p>
          <p className="mb-1"><strong>Fecha de cobro:</strong> {formatearFecha(modalPago?.fechaVencimiento)}</p>
          <p className="mb-1"><strong>Razón social cheque:</strong> {modalPago?.cliente}</p>
          <p className="mb-3"><strong>Monto:</strong> {modalPago ? formatoMoneda(modalPago.valor) : ""}</p>

          <Form.Group className="mb-3">
            <Form.Label>Proveedor <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="text"
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
              placeholder="Nombre del proveedor"
            />
          </Form.Group>

          <Form.Group>
            <Form.Label>Observaciones</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={() => setModalPago(null)}>Cancelar</Button>
          <Button variant="outline-success" onClick={confirmarPagoProveedor} disabled={!proveedor.trim()}>
            Confirmar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Cheques;
