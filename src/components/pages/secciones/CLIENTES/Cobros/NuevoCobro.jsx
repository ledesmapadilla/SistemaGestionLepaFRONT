import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button, Table, Container, Form, Spinner, Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import AsyncButton from "../../../../shared/AsyncButton";
import ResumenCobro from "./ResumenCobro";
import { crearCobro, listarCobros } from "../../../../../helpers/queriesCobros";
import { listarFacturas } from "../../../../../helpers/queriesFacturas";
import { listarClientes } from "../../../../../helpers/queriesClientes";
import {
  SALDO_A_FAVOR,
  MEDIOS_PAGO,
  esCheque,
  saldosAFavorPorCliente,
  usadoSaldoAFavor,
  validarMediosPago,
} from "../../../../../helpers/cobrosUtils";

const hoy = new Date().toLocaleDateString("en-CA");

const formatearFecha = (fecha) => {
  if (!fecha) return "-";
  const p = fecha.split("-");
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : fecha;
};

const formatoMoneda = (valor) =>
  Number(valor).toLocaleString("es-AR", { style: "currency", currency: "ARS" });

const totalConIva = (f) =>
  f.tipoFactura === "Factura X" ? f.total : f.total * 1.21;

const NuevoCobro = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();

  const [todasFacturas, setTodasFacturas] = useState([]);
  const [facturasDisponibles, setFacturasDisponibles] = useState([]);
  const [facturasSeleccionadas, setFacturasSeleccionadas] = useState([]);
  const [facturaElegida, setFacturaElegida] = useState("");
  const [cobradoPorFactura, setCobradoPorFactura] = useState({});
  const [mediosPago, setMediosPago] = useState([]);
  const [showModalPago, setShowModalPago] = useState(false);
  const [loadingDatos, setLoadingDatos] = useState(true);
  const [editandoMontoId, setEditandoMontoId] = useState(null);
  const [obsModal, setObsModal] = useState(null); // { id, texto }
  const [obsTexto, setObsTexto] = useState("");
  const [chequesExistentes, setChequesExistentes] = useState(new Set());
  const [saldosAFavor, setSaldosAFavor] = useState({});
  const [clientesAlta, setClientesAlta] = useState([]);

  const clienteSeleccionado = watch("cliente");
  const { onChange: onChangeCliente, ...clienteReg } = register("cliente", { required: "El cliente es obligatorio" });

  const saldoDisponible = saldosAFavor[clienteSeleccionado] || 0;

  const saldoFactura = (f) =>
    Math.max(0, totalConIva(f) - (cobradoPorFactura[f._id] || 0));

  useEffect(() => {
    const cargar = async () => {
      try {
        const [facturasResult, cobrosResult, clientesResult] = await Promise.allSettled([
          listarFacturas(),
          listarCobros(),
          listarClientes(),
        ]);

        const mapa = {};
        if (cobrosResult.status === "fulfilled") {
          const cheques = new Set();
          cobrosResult.value.forEach((cobro) => {
            (cobro.pagos || []).forEach((pago) => {
              const id = pago.factura?._id ?? pago.factura;
              if (id) mapa[id] = (mapa[id] || 0) + (pago.montoCobrado || 0);
            });
            (cobro.mediosPago || []).forEach((m) => {
              if ((m.medioPago === "Cheque" || m.medioPago === "E-Cheq") && m.numeroCheque)
                cheques.add(m.numeroCheque);
            });
          });
          setChequesExistentes(cheques);
          setSaldosAFavor(saldosAFavorPorCliente(cobrosResult.value));
        }
        setCobradoPorFactura(mapa);

        if (facturasResult.status === "fulfilled") {
          setTodasFacturas(
            facturasResult.value.filter((f) => {
              // Una factura anulada por Nota de Crédito no se cobra.
              if (f.estadoPago === "Anulada") return false;
              // Una Nota de Crédito no es cobrable.
              if (f.tipoFactura === "Nota de Crédito") return false;
              const saldo = totalConIva(f) - (mapa[f._id] || 0);
              return saldo > 0.01;
            })
          );
        }

        // Todos los clientes del alta: un anticipo puede venir de un cliente
        // que todavía no tiene facturas pendientes.
        if (clientesResult.status === "fulfilled" && clientesResult.value?.ok) {
          const lista = await clientesResult.value.json();
          setClientesAlta((Array.isArray(lista) ? lista : []).map((c) => c.razonsocial).filter(Boolean));
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingDatos(false);
      }
    };
    cargar();
  }, []);

  const clientesOpciones = [
    ...new Set([...todasFacturas.map((f) => f.cliente), ...clientesAlta].filter(Boolean)),
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

  // Con una sola forma de pago, su monto sigue a lo imputado a facturas
  // (el saldo a favor, hasta lo disponible).
  const cambiarFacturas = (nuevas) => {
    setFacturasSeleccionadas(nuevas);
    if (mediosPago.length !== 1 || nuevas.length === 0) return;
    const total = nuevas.reduce((sum, f) => sum + (parseFloat(f.montoCobrado) || 0), 0);
    const monto = mediosPago[0].medioPago === SALDO_A_FAVOR ? Math.min(total, saldoDisponible) : total;
    setMediosPago([{ ...mediosPago[0], monto: monto.toFixed(2) }]);
  };

  const agregarFactura = () => {
    if (!facturaElegida) return;
    const factura = todasFacturas.find((f) => f._id === facturaElegida);
    if (!factura) return;
    cambiarFacturas([
      ...facturasSeleccionadas,
      { ...factura, montoCobrado: saldoFactura(factura).toFixed(2) },
    ]);
    setFacturaElegida("");
  };

  const quitarFactura = (id) => {
    cambiarFacturas(facturasSeleccionadas.filter((f) => f._id !== id));
  };

  const totalSeleccionado = facturasSeleccionadas.reduce(
    (sum, f) => sum + saldoFactura(f),
    0
  );

  // Lo que se imputa a facturas.
  const totalCobrado = facturasSeleccionadas.reduce(
    (sum, f) => sum + (parseFloat(f.montoCobrado) || 0),
    0
  );

  const totalMediosPago = mediosPago.reduce((sum, m) => sum + (parseFloat(m.monto) || 0), 0);
  const usadoSaldo = usadoSaldoAFavor(mediosPago);
  // Plata nueva que no se imputa a facturas: queda a favor del cliente.
  const excedente = Math.round((totalMediosPago - totalCobrado) * 100) / 100;
  const esAnticipo = facturasSeleccionadas.length === 0;

  const nuevaFila = (medioPago, monto) => ({
    id: Date.now() + Math.random(), medioPago, monto, numeroCheque: "", fechaCobro: "",
  });

  const agregarMedioPago = () => {
    const restante = totalCobrado - totalMediosPago;
    setMediosPago((prev) => [...prev, nuevaFila("", restante > 0.01 ? restante.toFixed(2) : "")]);
  };

  // Al abrir por primera vez: si el cliente tiene saldo a favor se precarga
  // para cobrar las facturas; lo que falte va en otra fila.
  const abrirFormasPago = () => {
    if (mediosPago.length === 0) {
      const filas = [];
      let restante = totalCobrado;
      if (saldoDisponible > 0.01 && totalCobrado > 0) {
        const usar = Math.min(saldoDisponible, totalCobrado);
        filas.push(nuevaFila(SALDO_A_FAVOR, usar.toFixed(2)));
        restante -= usar;
      }
      if (restante > 0.01 || filas.length === 0)
        filas.push(nuevaFila("", restante > 0.01 ? restante.toFixed(2) : ""));
      setMediosPago(filas);
    }
    setShowModalPago(true);
  };

  const quitarMedioPago = (id) => {
    setMediosPago((prev) => prev.filter((m) => m.id !== id));
  };

  const errorMediosPago = () =>
    validarMediosPago(mediosPago, {
      imputado: totalCobrado,
      hayFacturas: !esAnticipo,
      saldoDisponible,
      chequesExistentes,
    });

  const cerrarModalPago = () => {
    if (mediosPago.length === 0) { setShowModalPago(false); return; }
    const error = errorMediosPago();
    if (error) {
      Swal.fire({ icon: "warning", ...error });
      return;
    }
    setShowModalPago(false);
  };

  const actualizarMedioPago = (id, campo, valor) => {
    setMediosPago((prev) =>
      prev.map((m) => (m.id !== id ? m : { ...m, [campo]: valor }))
    );
  };

  const actualizarCampo = (id, campo, valor) => {
    if (campo === "montoCobrado") {
      const factura = facturasSeleccionadas.find((f) => f._id === id);
      if (factura && parseFloat(valor) > saldoFactura(factura) + 0.01) {
        Swal.fire({
          icon: "warning",
          title: "Cobro mayor al saldo",
          text: "A la factura se le imputa como máximo su saldo. Lo que pague de más cargalo en las formas de pago y queda a favor del cliente.",
          timer: 3500,
          showConfirmButton: false,
        });
      }
    }
    cambiarFacturas(
      facturasSeleccionadas.map((f) => (f._id === id ? { ...f, [campo]: valor } : f))
    );
  };

  const onSubmit = async (data) => {
    for (const f of facturasSeleccionadas) {
      const monto = parseFloat(f.montoCobrado);
      if (isNaN(monto) || monto <= 0) {
        Swal.fire({ icon: "warning", title: "Monto inválido", text: `Ingresá un monto válido para la factura N° ${f.numeroFactura}` });
        return;
      }
      if (monto > saldoFactura(f) + 0.01) {
        Swal.fire({
          icon: "warning",
          title: "Cobro mayor al saldo",
          text: `A la factura N° ${f.numeroFactura} se le puede imputar hasta ${formatoMoneda(saldoFactura(f))}. Lo que sobre queda a favor del cliente.`,
        });
        return;
      }
    }

    const error = errorMediosPago();
    if (error) {
      Swal.fire({ icon: "warning", ...error });
      return;
    }

    if (esAnticipo || excedente > 0.01) {
      const confirmar = await Swal.fire({
        icon: "question",
        title: esAnticipo ? "¿Registrar anticipo?" : "Queda saldo a favor",
        text: esAnticipo
          ? `Se registran ${formatoMoneda(excedente)} a favor de ${data.cliente}, para cobrar facturas futuras.`
          : `Se imputan ${formatoMoneda(totalCobrado)} a facturas y quedan ${formatoMoneda(excedente)} a favor de ${data.cliente}.`,
        showCancelButton: true,
        confirmButtonText: "Sí, registrar",
        cancelButtonText: "Cancelar",
      });
      if (!confirmar.isConfirmed) return;
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
        observaciones: f.observaciones || "",
      })),
    };

    try {
      const respuesta = await crearCobro(payload);
      if (respuesta?.ok) {
        Swal.fire({ icon: "success", title: esAnticipo ? "Anticipo registrado" : "Cobro registrado", timer: 2000, showConfirmButton: false });
        navigate("/cobro-factura");
      } else {
        const err = await respuesta.json();
        Swal.fire({ icon: "error", title: "Error", text: err.msg || "No se pudo registrar el cobro" });
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
        <h6 className="mb-0">Nuevo Cobro</h6>
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
                {clientesOpciones.map((nombre) => (
                  <option key={nombre} value={nombre}>{nombre}</option>
                ))}
              </Form.Select>
            </div>
            {saldoDisponible > 0.01 && (
              <span className="border border-success rounded px-2 py-1 text-success fw-semibold" style={{ fontSize: "0.85rem" }}>
                Saldo a favor disponible: {formatoMoneda(saldoDisponible)}
              </span>
            )}
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
            <Button type="button" variant="outline-primary" size="sm" onClick={agregarFactura} disabled={!facturaElegida}>+ Agregar Factura</Button>
          </div>
        </div>

        <div className="d-flex justify-content-end mb-3 gap-2">
          <Button type="button" variant="outline-secondary" onClick={() => navigate("/cobro-factura")}>Cancelar</Button>
          {clienteSeleccionado && (
            <Button type="button" variant="outline-primary" onClick={abrirFormasPago}>
              {mediosPago.length > 0 ? `Formas de pago (${mediosPago.length})` : "+ Agregar forma de pago"}
            </Button>
          )}
          <AsyncButton type="submit" variant="outline-success" loading={isSubmitting}>
            {esAnticipo ? "Guardar Anticipo" : "Guardar Cobro"}
          </AsyncButton>
        </div>

        {clienteSeleccionado && esAnticipo && (
          <p className="text-muted small text-end mb-3">
            Sin facturas, el cobro se guarda como <strong>anticipo</strong>: todo lo recibido queda a favor del cliente.
          </p>
        )}

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
                <th>Observaciones</th>
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
                      onFocus={(e) => { setEditandoMontoId(f._id); const el = e.target; setTimeout(() => el.select(), 0); }}
                      onChange={(e) => actualizarCampo(f._id, "montoCobrado", e.target.value)}
                      onBlur={() => setEditandoMontoId(null)}
                    />
                  </td>
                  <td>
                    <Button
                      size="sm"
                      variant={f.observaciones ? "outline-info" : "outline-secondary"}
                      onClick={() => { setObsModal(f._id); setObsTexto(f.observaciones || ""); }}
                      title={f.observaciones || "Sin observaciones"}
                    >
                      {f.observaciones ? "Ver obs." : "+ Obs."}
                    </Button>
                  </td>
                  <td>
                    <Button variant="outline-danger" size="sm" onClick={() => quitarFactura(f._id)}>Quitar</Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot style={{ borderTop: "2px solid #ffc107" }}>
              <tr>
                <td colSpan={4} className="text-end">Total facturas:</td>
                <td>{formatoMoneda(facturasSeleccionadas.reduce((sum, f) => sum + totalConIva(f), 0))}</td>
                <td>{formatoMoneda(totalSeleccionado)}</td>
                <td className="fw-bold">{formatoMoneda(totalCobrado)}</td>
                <td></td>
              </tr>
            </tfoot>
          </Table>
        )}

        {mediosPago.length > 0 && (
          <ResumenCobro
            recibido={totalMediosPago - usadoSaldo}
            usadoSaldo={usadoSaldo}
            imputado={totalCobrado}
            excedente={excedente}
          />
        )}
      </Form>

      <Modal show={!!obsModal} onHide={() => setObsModal(null)} centered size="sm">
        <Modal.Header closeButton><Modal.Title>Observaciones</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Control
            as="textarea"
            rows={4}
            value={obsTexto}
            onChange={(e) => setObsTexto(e.target.value)}
            placeholder="Ingresá una observación..."
            autoFocus
          />
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={() => setObsModal(null)}>Cancelar</Button>
          <Button variant="outline-success" onClick={() => {
            actualizarCampo(obsModal, "observaciones", obsTexto);
            setObsModal(null);
          }}>Guardar</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showModalPago} onHide={cerrarModalPago} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Formas de pago</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="text-muted small">
              {saldoDisponible > 0.01 && `Saldo a favor disponible: ${formatoMoneda(saldoDisponible)}`}
            </span>
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
                      {MEDIOS_PAGO.map((mp) => <option key={mp}>{mp}</option>)}
                      {((saldoDisponible > 0.01 && !esAnticipo) || m.medioPago === SALDO_A_FAVOR) && (
                        <option>{SALDO_A_FAVOR}</option>
                      )}
                    </Form.Select>
                  </td>
                  <td style={{ minWidth: "120px" }}>
                    <Form.Control
                      type="text"
                      size="sm"
                      value={editandoMontoId === m.id ? m.monto : (m.monto ? formatoMoneda(m.monto) : "")}
                      placeholder="0.00"
                      onFocus={(e) => { setEditandoMontoId(m.id); const el = e.target; setTimeout(() => el.select(), 0); }}
                      onChange={(e) => actualizarMedioPago(m.id, "monto", e.target.value)}
                      onBlur={() => setEditandoMontoId(null)}
                    />
                  </td>
                  <td style={{ minWidth: "130px" }}>
                    {esCheque(m.medioPago)
                      ? <Form.Control type="text" size="sm" placeholder={m.medioPago === "E-Cheq" ? "N° e-cheq" : "N° cheque"} value={m.numeroCheque} onChange={(e) => actualizarMedioPago(m.id, "numeroCheque", e.target.value)} />
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
                <td className="fw-bold">{formatoMoneda(totalMediosPago)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </Table>
          <ResumenCobro
            recibido={totalMediosPago - usadoSaldo}
            usadoSaldo={usadoSaldo}
            imputado={totalCobrado}
            excedente={excedente}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-primary" onClick={cerrarModalPago}>OK</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default NuevoCobro;
