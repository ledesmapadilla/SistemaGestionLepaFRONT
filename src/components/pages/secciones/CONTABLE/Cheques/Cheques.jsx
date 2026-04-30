import React, { useState, useEffect } from "react";
import { listarCobros, actualizarEstadoCheque } from "../../../../../helpers/queriesCobros.js";
import { listarProveedores } from "../../../../../helpers/queriesProveedores.js";
import { Spinner, Modal, Button, Form, InputGroup } from "react-bootstrap";
import ChequesTabla from "./ChequesTabla.jsx";

const Cheques = () => {
  const [loading, setLoading] = useState(true);
  const [cheques, setCheques] = useState([]);
  const [proveedores, setProveedores] = useState([]);

  const [modalPago, setModalPago] = useState(null);
  const [proveedor, setProveedor] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [modalCambio, setModalCambio] = useState(null);
  const [tasaInteres, setTasaInteres] = useState("");
  const [gastos, setGastos] = useState("");
  const [montoDescontado, setMontoDescontado] = useState("");
  const [empresaCambio, setEmpresaCambio] = useState("");
  const [obsCambio, setObsCambio] = useState("");

  const [modalVer, setModalVer] = useState(null);
  const [obsVer, setObsVer] = useState("");

  useEffect(() => {
    const cargar = async () => {
      try {
        const [cobros, resProveedores] = await Promise.all([listarCobros(), listarProveedores()]);
        const listaProveedores = await resProveedores.json();
        setProveedores(listaProveedores.map((p) => p.razonsocial).sort());
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
                tasaInteres: m.tasaInteres ?? null,
                gastosPorc: m.gastosPorc ?? null,
                montoDescontado: m.montoDescontado ?? null,
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
    if (uso === "Cambio") {
      setModalCambio(fila);
      setTasaInteres("");
      setGastos("");
      setMontoDescontado("");
      setEmpresaCambio("");
      setObsCambio("");
      return;
    }
    if (uso === "En cartera") {
      await actualizarEstadoCheque(fila.cobroId, fila.medioIndex, "En cartera", "", "", { tasaInteres: null, gastosPorc: null, montoDescontado: null });
      setCheques((prev) =>
        prev.map((c) =>
          c._id === fila._id ? { ...c, estado: "En cartera", proveedor: "", tasaInteres: null, gastosPorc: null, montoDescontado: null, observaciones: "" } : c
        )
      );
      return;
    }
    await actualizarEstadoCheque(fila.cobroId, fila.medioIndex, uso, "", "", { tasaInteres: null, gastosPorc: null, montoDescontado: null });
    setCheques((prev) =>
      prev.map((c) =>
        c._id === fila._id ? { ...c, estado: uso, proveedor: "", tasaInteres: null, gastosPorc: null, montoDescontado: null, observaciones: "" } : c
      )
    );
  };

  const confirmarPagoProveedor = async () => {
    if (!proveedor.trim()) return;
    await actualizarEstadoCheque(
      modalPago.cobroId, modalPago.medioIndex,
      "Pago proveedores", observaciones.trim(), proveedor.trim(),
      { tasaInteres: null, gastosPorc: null, montoDescontado: null }
    );
    setCheques((prev) =>
      prev.map((c) =>
        c._id === modalPago._id
          ? { ...c, estado: "Pago proveedores", proveedor: proveedor.trim(), tasaInteres: null, gastosPorc: null, montoDescontado: null, observaciones: observaciones.trim() }
          : c
      )
    );
    setModalPago(null);
  };

  const parsearNumero = (val) => {
    if (val === "" || val == null) return null;
    const s = String(val).trim();
    let limpio;
    if (s.includes(",") && s.includes(".")) {
      // "1.234,56" → dot=miles, comma=decimal
      limpio = s.replace(/\./g, "").replace(",", ".");
    } else if (s.includes(",")) {
      // "2,5" → comma=decimal
      limpio = s.replace(",", ".");
    } else {
      // "2.5" → dot=decimal
      limpio = s;
    }
    const n = parseFloat(limpio);
    return isNaN(n) ? null : n;
  };

  const formatearPorcentaje = (val, setter) => {
    const n = parsearNumero(val);
    if (n != null) setter(n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const confirmarCambio = async () => {
    const extras = {
      tasaInteres: parsearNumero(tasaInteres),
      gastosPorc: parsearNumero(gastos),
      montoDescontado: parsearNumero(montoDescontado),
    };
    await actualizarEstadoCheque(
      modalCambio.cobroId, modalCambio.medioIndex,
      "Cambio", obsCambio.trim(), empresaCambio.trim(), extras
    );
    setCheques((prev) =>
      prev.map((c) =>
        c._id === modalCambio._id
          ? { ...c, estado: "Cambio", proveedor: empresaCambio.trim(), ...extras, observaciones: obsCambio.trim() }
          : c
      )
    );
    setModalCambio(null);
  };

  const formatoMoneda = (valor) =>
    Number(valor).toLocaleString("es-AR", { style: "currency", currency: "ARS" });

  const formatearFecha = (fecha) => {
    if (!fecha) return "-";
    const p = fecha.split("-");
    return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : fecha;
  };

  const datosFijosCheque = (fila) => (
    <>
      <p className="mb-1"><strong>N° Cheque:</strong> {fila?.numeroCheque}</p>
      <p className="mb-1"><strong>Fecha de cobro:</strong> {formatearFecha(fila?.fechaVencimiento)}</p>
      <p className="mb-1"><strong>Razón social cheque:</strong> {fila?.cliente}</p>
      <p className="mb-3"><strong>Monto:</strong> {fila ? formatoMoneda(fila.valor) : ""}</p>
    </>
  );

  if (loading) return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <>
      <ChequesTabla
        cheques={cheques}
        onUtilizar={handleUtilizar}
        onVer={(c) => { setModalVer(c); setObsVer(c.observaciones || ""); }}
      />

      {/* Modal Ver */}
      <Modal show={!!modalVer} onHide={() => setModalVer(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Detalle del cheque</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-1">Cliente: <span className="text-secondary">{modalVer?.cliente}</span></p>
          <p className="mb-1">N° Cheque: <span className="text-secondary">{modalVer?.numeroCheque}</span></p>
          <p className="mb-1">Tipo: <span className="text-secondary">{modalVer?.tipo}</span></p>
          <p className="mb-1">Fecha de cobro: <span className="text-secondary">{formatearFecha(modalVer?.fechaVencimiento)}</span></p>
          <p className="mb-1">Monto: <span className="text-secondary">{modalVer ? formatoMoneda(modalVer.valor) : ""}</span></p>
          <p className="mb-1">Estado: <span className="text-secondary">{modalVer?.estado}</span></p>
          {modalVer?.proveedor && (
            <p className="mb-1">
              {modalVer.estado === "Cambio" ? "Empresa:" : "Proveedor:"} <span className="text-secondary">{modalVer.proveedor}</span>
            </p>
          )}
          {modalVer?.estado === "Cambio" && (
            <>
              {modalVer.tasaInteres != null && <p className="mb-1">Tasa interés: <span className="text-secondary">{Number(modalVer.tasaInteres).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span></p>}
              {modalVer.gastosPorc != null && <p className="mb-1">Gastos: <span className="text-secondary">{Number(modalVer.gastosPorc).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span></p>}
              {modalVer.montoDescontado != null && <p className="mb-1">Monto descontado: <span className="text-secondary">{formatoMoneda(modalVer.montoDescontado)}</span></p>}
            </>
          )}
          <Form.Group className="mt-2">
            <Form.Label className="fw-normal">Observaciones</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={obsVer}
              onChange={(e) => setObsVer(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={() => setModalVer(null)}>Cerrar</Button>
          <Button
            variant="outline-success"
            onClick={async () => {
              await actualizarEstadoCheque(modalVer.cobroId, modalVer.medioIndex, modalVer.estado, obsVer.trim(), modalVer.proveedor || "", {
                tasaInteres: modalVer.tasaInteres ?? null,
                gastosPorc: modalVer.gastosPorc ?? null,
                montoDescontado: modalVer.montoDescontado ?? null,
              });
              setCheques((prev) =>
                prev.map((c) => c._id === modalVer._id ? { ...c, observaciones: obsVer.trim() } : c)
              );
              setModalVer(null);
            }}
          >
            Guardar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Pago proveedor */}
      <Modal show={!!modalPago} onHide={() => setModalPago(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Pago a proveedor</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {datosFijosCheque(modalPago)}
          <Form.Group className="mb-3">
            <Form.Label>Proveedor <span style={{ color: "#fff" }}>*</span></Form.Label>
            <Form.Select value={proveedor} onChange={(e) => setProveedor(e.target.value)}>
              <option value="">Seleccionar proveedor...</option>
              {proveedores.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
              <option value="Retiro socios">Retiro socios</option>
              <option value="Otros">Otros</option>
            </Form.Select>
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

      {/* Modal Cambio */}
      <Modal show={!!modalCambio} onHide={() => setModalCambio(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Cambio de cheque</Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-2">
          <p className="mb-0">N° Cheque: <span className="text-secondary">{modalCambio?.numeroCheque}</span></p>
          <p className="mb-0">Fecha de cobro: <span className="text-secondary">{formatearFecha(modalCambio?.fechaVencimiento)}</span></p>
          <p className="mb-0">Razón social cheque: <span className="text-secondary">{modalCambio?.cliente}</span></p>
          <p className="mb-2">Monto: <span className="text-secondary">{modalCambio ? formatoMoneda(modalCambio.valor) : ""}</span></p>

          <Form.Group className="mb-2">
            <Form.Label className="mb-1 fw-normal">Tasa interés</Form.Label>
            <InputGroup className="w-50 mx-auto">
              <Form.Control
                size="sm"
                type="text"
                value={tasaInteres}
                onChange={(e) => setTasaInteres(e.target.value)}
                onBlur={() => formatearPorcentaje(tasaInteres, setTasaInteres)}
                placeholder="0,00"
              />
              <InputGroup.Text>%</InputGroup.Text>
            </InputGroup>
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label className="mb-1 fw-normal">Gastos</Form.Label>
            <InputGroup className="w-50 mx-auto">
              <Form.Control
                size="sm"
                type="text"
                value={gastos}
                onChange={(e) => setGastos(e.target.value)}
                onBlur={() => formatearPorcentaje(gastos, setGastos)}
                placeholder="0,00"
              />
              <InputGroup.Text>%</InputGroup.Text>
            </InputGroup>
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label className="mb-1 fw-normal">Monto descontado</Form.Label>
            <InputGroup className="w-50 mx-auto">
              <InputGroup.Text>$</InputGroup.Text>
              <Form.Control
                size="sm"
                type="text"
                value={montoDescontado}
                onChange={(e) => setMontoDescontado(e.target.value)}
                onBlur={() => {
                  const n = parsearNumero(montoDescontado);
                  if (n != null) setMontoDescontado(n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                }}
                placeholder="0,00"
              />
            </InputGroup>
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label className="mb-1 fw-normal">Empresa</Form.Label>
            <Form.Control
              size="sm"
              className="w-50 mx-auto"
              type="text"
              value={empresaCambio}
              onChange={(e) => setEmpresaCambio(e.target.value)}
              placeholder="Nombre de la empresa"
            />
          </Form.Group>

          <Form.Group>
            <Form.Label className="mb-1 fw-normal">Observaciones</Form.Label>
            <Form.Control
              size="sm"
              as="textarea"
              rows={1}
              value={obsCambio}
              onChange={(e) => setObsCambio(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="justify-content-center py-2">
          <Button variant="outline-secondary" onClick={() => setModalCambio(null)}>Cancelar</Button>
          <Button variant="outline-success" onClick={confirmarCambio}>
            Confirmar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Cheques;
