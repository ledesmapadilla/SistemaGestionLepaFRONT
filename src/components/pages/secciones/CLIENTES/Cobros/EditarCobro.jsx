import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button, Table, Container, Form, Spinner, Modal } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { editarCobro, listarCobros } from "../../../../../helpers/queriesCobros";
import { listarFacturas } from "../../../../../helpers/queriesFacturas";

const hoy = new Date().toLocaleDateString("en-CA");

const formatearFecha = (fecha) => {
  if (!fecha) return "-";
  const p = fecha.split("-");
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : fecha;
};

const formatoMoneda = (valor) =>
  Number(valor).toLocaleString("es-AR", { style: "currency", currency: "ARS" });

const totalConIva = (f) =>
  f?.tipoFactura === "Factura X" ? f.total : (f?.total ?? 0) * 1.21;

const EditarCobro = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm();

  const [todasFacturas, setTodasFacturas] = useState([]);
  const [facturasDisponibles, setFacturasDisponibles] = useState([]);
  const [facturasSeleccionadas, setFacturasSeleccionadas] = useState([]);
  const [facturaElegida, setFacturaElegida] = useState("");
  const [cobradoPorFactura, setCobradoPorFactura] = useState({});
  const [mediosPago, setMediosPago] = useState([]);
  const [showModalPago, setShowModalPago] = useState(false);
  const [loadingDatos, setLoadingDatos] = useState(true);
  const [editandoMontoId, setEditandoMontoId] = useState(null);

  const clienteSeleccionado = watch("cliente");
  const { onChange: onChangeCliente, ...clienteReg } = register("cliente", { required: "El cliente es obligatorio" });

  const saldoFactura = (f) =>
    Math.max(0, totalConIva(f) - (cobradoPorFactura[f._id] || 0));

  useEffect(() => {
    const cargar = async () => {
      try {
        const [facturasResult, cobrosResult] = await Promise.allSettled([
          listarFacturas(),
          listarCobros(),
        ]);

        let cobro = null;
        const mapa = {};

        if (cobrosResult.status === "fulfilled") {
          cobro = cobrosResult.value.find((c) => c._id === id);
          cobrosResult.value.forEach((c) => {
            if (c._id === id) return;
            (c.pagos || []).forEach((pago) => {
              const fid = pago.factura?._id ?? pago.factura;
              if (fid) mapa[fid] = (mapa[fid] || 0) + (pago.montoCobrado || 0);
            });
          });
        }
        setCobradoPorFactura(mapa);

        if (facturasResult.status === "fulfilled") {
          const idsEnCobro = new Set((cobro?.pagos || []).map((p) => p.factura?._id ?? p.factura));
          setTodasFacturas(
            facturasResult.value.filter((f) => {
              if (idsEnCobro.has(f._id)) return true;
              return (totalConIva(f) - (mapa[f._id] || 0)) > 0.01;
            })
          );
        }

        if (cobro) {
          reset({
            fecha: cobro.fecha?.split("T")[0] ?? "",
            cliente: cobro.cliente ?? "",
          });
          setFacturasSeleccionadas(
            (cobro.pagos || []).map((p) => ({
              ...(p.factura || {}),
              montoCobrado: (p.montoCobrado ?? 0).toFixed(2),
            }))
          );
          setMediosPago(
            (cobro.mediosPago || []).map((m, i) => ({
              id: Date.now() + i,
              medioPago: m.medioPago || "",
              monto: (m.monto ?? "").toString(),
              numeroCheque: m.numeroCheque || "",
              fechaCobro: m.fechaCobro || "",
            }))
          );
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingDatos(false);
      }
    };
    cargar();
  }, [id]);

  const clientesConFacturas = [
    ...new Set(todasFacturas.map((f) => f.cliente).filter(Boolean)),
  ].sort();

  useEffect(() => {
    if (!clienteSeleccionado) {
      setFacturasDisponibles([]);
      setFacturaElegida("");
      return;
    }
    const idsSeleccionados = facturasSeleccionadas.map((f) => f._id);
    const filtradas = todasFacturas.filter(
      (f) => f.cliente === clienteSeleccionado && !idsSeleccionados.includes(f._id)
    );
    setFacturasDisponibles(filtradas);
    setFacturaElegida("");
  }, [clienteSeleccionado, todasFacturas, facturasSeleccionadas]);

  useEffect(() => {
    if (mediosPago.length !== 1) return;
    const newTotal = facturasSeleccionadas.reduce(
      (sum, f) => sum + (parseFloat(f.montoCobrado) || 0), 0
    );
    setMediosPago((prev) => [{ ...prev[0], monto: newTotal.toFixed(2) }]);
  }, [facturasSeleccionadas]);

  const agregarFactura = () => {
    if (!facturaElegida) return;
    const factura = todasFacturas.find((f) => f._id === facturaElegida);
    if (!factura) return;
    setFacturasSeleccionadas((prev) => [
      ...prev,
      { ...factura, montoCobrado: saldoFactura(factura).toFixed(2) },
    ]);
    setFacturaElegida("");
  };

  const quitarFactura = (fid) => {
    setFacturasSeleccionadas(facturasSeleccionadas.filter((f) => f._id !== fid));
  };

  const esCheque = (tipo) => tipo === "Cheque" || tipo === "E-Cheq";

  const agregarMedioPago = () => {
    setMediosPago((prev) => [
      ...prev,
      { id: Date.now(), medioPago: "", monto: totalCobrado.toFixed(2), numeroCheque: "", fechaCobro: "" },
    ]);
  };

  const quitarMedioPago = (mid) => {
    setMediosPago((prev) => prev.filter((m) => m.id !== mid));
  };

  const cerrarModalPago = () => {
    if (mediosPago.length === 0) { setShowModalPago(false); return; }
    for (const m of mediosPago) {
      if (!m.medioPago) {
        Swal.fire({ icon: "warning", title: "Forma de pago incompleta", text: "Seleccioná el tipo en cada forma de pago" });
        return;
      }
      if (isNaN(parseFloat(m.monto)) || parseFloat(m.monto) <= 0) {
        Swal.fire({ icon: "warning", title: "Monto inválido", text: "Ingresá un monto válido en cada forma de pago" });
        return;
      }
      if (esCheque(m.medioPago) && !m.numeroCheque) {
        Swal.fire({ icon: "warning", title: "Número de cheque faltante", text: "Ingresá el número de cheque" });
        return;
      }
      if (esCheque(m.medioPago) && !m.fechaCobro) {
        Swal.fire({ icon: "warning", title: "Fecha de cobro faltante", text: "Ingresá la fecha de cobro del cheque" });
        return;
      }
    }
    const totalMediosPago = mediosPago.reduce((sum, m) => sum + (parseFloat(m.monto) || 0), 0);
    if (Math.abs(totalMediosPago - totalCobrado) > 0.01) {
      Swal.fire({
        icon: "warning",
        title: "Los montos no coinciden",
        text: `La suma de las formas de pago (${formatoMoneda(totalMediosPago)}) debe ser igual al total cobrado (${formatoMoneda(totalCobrado)})`,
      });
      return;
    }
    setShowModalPago(false);
  };

  const actualizarMedioPago = (mid, campo, valor) => {
    setMediosPago((prev) =>
      prev.map((m) => (m.id !== mid ? m : { ...m, [campo]: valor }))
    );
  };

  const actualizarCampo = (fid, campo, valor) => {
    if (campo === "montoCobrado") {
      const factura = facturasSeleccionadas.find((f) => f._id === fid);
      if (factura && parseFloat(valor) > saldoFactura(factura)) {
        Swal.fire({
          icon: "warning",
          title: "Cobro mayor al saldo",
          text: "El monto ingresado supera el saldo pendiente de la factura",
          timer: 2500,
          showConfirmButton: false,
        });
      }
    }
    setFacturasSeleccionadas((prev) =>
      prev.map((f) => (f._id === fid ? { ...f, [campo]: valor } : f))
    );
  };

  const totalSeleccionado = facturasSeleccionadas.reduce(
    (sum, f) => sum + saldoFactura(f),
    0
  );

  const totalCobrado = facturasSeleccionadas.reduce(
    (sum, f) => sum + (parseFloat(f.montoCobrado) || 0),
    0
  );

  const onSubmit = async (data) => {
    if (facturasSeleccionadas.length === 0) {
      Swal.fire({ icon: "warning", title: "Sin facturas", text: "Agregá al menos una factura al cobro" });
      return;
    }
    for (const f of facturasSeleccionadas) {
      const monto = parseFloat(f.montoCobrado);
      if (isNaN(monto) || monto <= 0) {
        Swal.fire({ icon: "warning", title: "Monto inválido", text: `Ingresá un monto válido para la factura N° ${f.numeroFactura}` });
        return;
      }
    }
    if (mediosPago.length === 0) {
      Swal.fire({ icon: "warning", title: "Sin forma de pago", text: "Agregá al menos una forma de pago" });
      return;
    }
    for (const m of mediosPago) {
      if (!m.medioPago) {
        Swal.fire({ icon: "warning", title: "Forma de pago incompleta", text: "Seleccioná el tipo en cada forma de pago" });
        return;
      }
      if (isNaN(parseFloat(m.monto)) || parseFloat(m.monto) <= 0) {
        Swal.fire({ icon: "warning", title: "Monto inválido", text: "Ingresá un monto válido en cada forma de pago" });
        return;
      }
      if (esCheque(m.medioPago) && !m.numeroCheque) {
        Swal.fire({ icon: "warning", title: "Número de cheque faltante", text: "Ingresá el número de cheque" });
        return;
      }
      if (esCheque(m.medioPago) && !m.fechaCobro) {
        Swal.fire({ icon: "warning", title: "Fecha de cobro faltante", text: "Ingresá la fecha de cobro del cheque" });
        return;
      }
    }
    const totalMediosPago = mediosPago.reduce((sum, m) => sum + (parseFloat(m.monto) || 0), 0);
    if (Math.abs(totalMediosPago - totalCobrado) > 0.01) {
      Swal.fire({
        icon: "warning",
        title: "Los montos no coinciden",
        text: `La suma de las formas de pago (${formatoMoneda(totalMediosPago)}) debe ser igual al total cobrado (${formatoMoneda(totalCobrado)})`,
      });
      return;
    }

    const payload = {
      fecha: data.fecha,
      cliente: data.cliente,
      mediosPago: mediosPago.map((m) => ({
        medioPago: m.medioPago,
        monto: parseFloat(m.monto),
        numeroCheque: m.numeroCheque || "",
        fechaCobro: m.fechaCobro || "",
      })),
      pagos: facturasSeleccionadas.map((f) => ({
        factura: f._id,
        montoCobrado: parseFloat(f.montoCobrado),
      })),
    };

    try {
      const respuesta = await editarCobro(id, payload);
      if (respuesta?.ok) {
        Swal.fire({ icon: "success", title: "Cobro actualizado", timer: 2000, showConfirmButton: false });
        navigate("/cobro-factura");
      } else {
        const err = await respuesta.json();
        Swal.fire({ icon: "error", title: "Error", text: err.msg || "No se pudo actualizar el cobro" });
      }
    } catch (error) {
      Swal.fire({ icon: "error", title: "Error inesperado", text: "No se pudo procesar la solicitud" });
    }
  };

  if (loadingDatos) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container className="py-4 w-75">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h6 className="mb-0">Editar Cobro</h6>
        <Button variant="outline-success" onClick={() => navigate("/cobro-factura")}>Volver</Button>
      </div>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <div className="d-flex flex-column gap-3 mb-4">
          <div className="d-flex align-items-center gap-3">
            <div className="d-flex align-items-center gap-2">
              <Form.Label className="mb-0 text-nowrap">Fecha</Form.Label>
              <Form.Control
                type="date"
                max={hoy}
                style={{ width: "160px" }}
                {...register("fecha", { required: "La fecha es obligatoria" })}
                isInvalid={!!errors.fecha}
              />
            </div>
            <div className="d-flex align-items-center gap-2">
              <Form.Label className="mb-0 text-nowrap">Cliente</Form.Label>
              <Form.Select
                style={{ width: "220px" }}
                {...clienteReg}
                onChange={(e) => { onChangeCliente(e); setFacturasSeleccionadas([]); setMediosPago([]); }}
                isInvalid={!!errors.cliente}
              >
                <option value="">Seleccionar...</option>
                {clientesConFacturas.map((nombre) => (
                  <option key={nombre} value={nombre}>{nombre}</option>
                ))}
              </Form.Select>
            </div>
          </div>
          <div className="d-flex align-items-center gap-3">
            <div className="d-flex align-items-center gap-2">
              <Form.Label className="mb-0 text-nowrap">Factura</Form.Label>
              <Form.Select
                style={{ width: "340px" }}
                value={facturaElegida}
                onChange={(e) => setFacturaElegida(e.target.value)}
                disabled={!clienteSeleccionado}
              >
                <option value="">
                  {clienteSeleccionado
                    ? facturasDisponibles.length === 0
                      ? "Sin facturas pendientes para este cliente"
                      : "Seleccionar factura..."
                    : "Primero elegí un cliente"}
                </option>
                {facturasDisponibles.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.tipoFactura} N° {f.numeroFactura} — {formatearFecha(f.fecha)} — Saldo: {formatoMoneda(saldoFactura(f))}
                  </option>
                ))}
              </Form.Select>
            </div>
            {facturasSeleccionadas.length > 0 && (
              <Button type="button" variant="outline-primary" size="sm" onClick={() => {
                if (mediosPago.length === 0) agregarMedioPago();
                setShowModalPago(true);
              }}>
                {mediosPago.length > 0 ? `Formas de pago (${mediosPago.length})` : "+ Agregar forma de pago"}
              </Button>
            )}
          </div>
        </div>

        <div className="d-flex justify-content-end mb-3 gap-2">
          <Button type="button" variant="outline-secondary" onClick={() => navigate("/cobro-factura")}>Cancelar</Button>
          <Button type="button" variant="outline-primary" onClick={agregarFactura} disabled={!facturaElegida}>+ Agregar Factura</Button>
          <Button type="submit" variant="outline-success">Guardar Cambios</Button>
        </div>

        {facturasSeleccionadas.length > 0 && (
          <Table striped bordered hover className="text-center align-middle mb-4">
            <thead className="table-dark">
              <tr>
                <th>Tipo</th>
                <th>N° Factura</th>
                <th>Fecha</th>
                <th>Total factura</th>
                <th>Saldo pendiente</th>
                <th>Monto cobrado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {facturasSeleccionadas.map((f) => (
                <tr key={f._id}>
                  <td>{f.tipoFactura}</td>
                  <td>{f.numeroFactura}</td>
                  <td>{formatearFecha(f.fecha)}</td>
                  <td>{formatoMoneda(totalConIva(f))}</td>
                  <td>{formatoMoneda(saldoFactura(f))}</td>
                  <td>
                    <Form.Control
                      type="text"
                      size="sm"
                      style={{ width: "130px", margin: "0 auto", textAlign: "center" }}
                      value={editandoMontoId === f._id ? f.montoCobrado : formatoMoneda(f.montoCobrado)}
                      onFocus={() => setEditandoMontoId(f._id)}
                      onChange={(e) => actualizarCampo(f._id, "montoCobrado", e.target.value)}
                      onBlur={() => setEditandoMontoId(null)}
                    />
                  </td>
                  <td>
                    <Button variant="outline-danger" size="sm" onClick={() => quitarFactura(f._id)}>Quitar</Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot style={{ borderTop: "2px solid #ffc107" }}>
              <tr>
                <td colSpan={3} className="text-end">Total facturas:</td>
                <td>{formatoMoneda(facturasSeleccionadas.reduce((sum, f) => sum + totalConIva(f), 0))}</td>
                <td>{formatoMoneda(totalSeleccionado)}</td>
                <td className="fw-bold">{formatoMoneda(totalCobrado)}</td>
                <td></td>
              </tr>
            </tfoot>
          </Table>
        )}
      </Form>

      <Modal show={showModalPago} onHide={cerrarModalPago} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Formas de pago</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex justify-content-end mb-2">
            <Button variant="outline-primary" size="sm" onClick={agregarMedioPago}>+ Agregar</Button>
          </div>
          <Table bordered hover className="text-center align-middle">
            <thead className="table-dark">
              <tr>
                <th>Forma de pago</th>
                <th>Monto</th>
                <th>N° Cheque</th>
                <th>Fecha cobro</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {mediosPago.map((m) => (
                <tr key={m.id}>
                  <td style={{ minWidth: "160px" }}>
                    <Form.Select size="sm" value={m.medioPago} onChange={(e) => actualizarMedioPago(m.id, "medioPago", e.target.value)}>
                      <option value="">Seleccionar...</option>
                      <option>Efectivo</option>
                      <option>Cheque</option>
                      <option>E-Cheq</option>
                      <option>Retenciones</option>
                      <option>Transferencia</option>
                    </Form.Select>
                  </td>
                  <td style={{ minWidth: "120px" }}>
                    <Form.Control
                      type="text"
                      size="sm"
                      value={editandoMontoId === m.id ? m.monto : (m.monto ? formatoMoneda(m.monto) : "")}
                      placeholder="0.00"
                      onFocus={() => setEditandoMontoId(m.id)}
                      onChange={(e) => actualizarMedioPago(m.id, "monto", e.target.value)}
                      onBlur={() => setEditandoMontoId(null)}
                    />
                  </td>
                  <td style={{ minWidth: "130px" }}>
                    {esCheque(m.medioPago)
                      ? <Form.Control type="text" size="sm" placeholder="N° cheque" value={m.numeroCheque} onChange={(e) => actualizarMedioPago(m.id, "numeroCheque", e.target.value)} />
                      : <span className="text-muted">—</span>}
                  </td>
                  <td style={{ minWidth: "140px" }}>
                    {esCheque(m.medioPago)
                      ? <Form.Control type="date" size="sm" value={m.fechaCobro} onChange={(e) => actualizarMedioPago(m.id, "fechaCobro", e.target.value)} />
                      : <span className="text-muted">—</span>}
                  </td>
                  <td>
                    <Button variant="outline-danger" size="sm" onClick={() => quitarMedioPago(m.id)}>Quitar</Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot style={{ borderTop: "2px solid #ffc107" }}>
              <tr>
                <td className="text-end fw-semibold">Total:</td>
                <td className="fw-bold">{formatoMoneda(mediosPago.reduce((sum, m) => sum + (parseFloat(m.monto) || 0), 0))}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-primary" onClick={cerrarModalPago}>OK</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default EditarCobro;
