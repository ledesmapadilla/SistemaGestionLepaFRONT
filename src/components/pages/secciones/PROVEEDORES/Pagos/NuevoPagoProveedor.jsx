import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button, Table, Container, Form, Spinner, Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import AsyncButton from "../../../../shared/AsyncButton";
import { crearPagoProveedor, listarPagosProveedores } from "../../../../../helpers/queriesPagosProveedores";
import { listarFacturasProveedores } from "../../../../../helpers/queriesFacturasProveedores";
import { listarChequesEnCartera, actualizarEstadoCheque } from "../../../../../helpers/queriesCobros";
import { crearChequePropio, listarChequesPropio } from "../../../../../helpers/queriesChequesPropio";

const hoy = new Date().toLocaleDateString("en-CA");

const formatearFecha = (fecha) => {
  if (!fecha) return "-";
  const p = fecha.split("-");
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : fecha;
};

const formatearFechaBarra = (fecha) => {
  if (!fecha) return "-";
  const p = fecha.split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : fecha;
};

const formatoMoneda = (valor) =>
  Number(valor).toLocaleString("es-AR", { style: "currency", currency: "ARS" });

const estiloX = {
  position: "absolute", right: "10px", top: "50%",
  transform: "translateY(-50%)", cursor: "pointer",
  color: "#fff", fontSize: "14px", fontWeight: "900",
  zIndex: 5, userSelect: "none",
};

const totalFactura = (f) =>
  f.tipoFactura === "Factura X" || f.tipoFactura === "Factura B" ? f.total : f.total * 1.21;

const NuevoPagoProveedor = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm();

  const [todasFacturas, setTodasFacturas] = useState([]);
  const [facturasDisponibles, setFacturasDisponibles] = useState([]);
  const [facturasSeleccionadas, setFacturasSeleccionadas] = useState([]);
  const [facturaElegida, setFacturaElegida] = useState("");
  const [pagadoPorFactura, setPagadoPorFactura] = useState({});
  const [mediosPago, setMediosPago] = useState([]);
  const [showModalPago, setShowModalPago] = useState(false);
  const [loadingDatos, setLoadingDatos] = useState(true);
  const [editandoMontoId, setEditandoMontoId] = useState(null);
  const [chequesEnCartera, setChequesEnCartera] = useState([]);
  const [chequesPropioCargados, setChequesPropioCargados] = useState([]);

  const proveedorSeleccionado = watch("proveedor");
  const { onChange: onChangeProveedor, ...proveedorReg } = register("proveedor", { required: "El proveedor es obligatorio" });

  const parseMonto = (val) => {
    if (val === undefined || val === null) return 0;
    const s = String(val).replace(",", ".").trim();
    return parseFloat(s) || 0;
  };

  const saldoFactura = (f) =>
    Math.max(0, totalFactura(f) - (pagadoPorFactura[f._id?.toString()] || 0));

  const aplicarAsignacionFIFO = (facturasList, mediosList) => {
    const totalMedios = mediosList.reduce((sum, m) => sum + parseMonto(m.monto), 0);
    const ordenadas = [...facturasList].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    let restante = totalMedios;
    const mapMonto = {};
    ordenadas.forEach((f) => {
      const saldo = saldoFactura(f);
      const pagar = Math.min(restante, saldo);
      mapMonto[f._id] = pagar;
      restante -= pagar;
    });
    return facturasList.map((f) => ({
      ...f,
      montoPagado: (mapMonto[f._id] || 0).toFixed(2),
    }));
  };

  useEffect(() => {
    const cargar = async () => {
      try {
        const [facturasResult, pagosResult, chequesCarteraResult, chequesProResult] = await Promise.allSettled([
          listarFacturasProveedores("Pendiente"),
          listarPagosProveedores(),
          listarChequesEnCartera(),
          listarChequesPropio(),
        ]);

        const mapa = {};
        if (pagosResult.status === "fulfilled") {
          pagosResult.value.forEach((pago) => {
            (pago.pagos || []).forEach((item) => {
              const id = (item.factura?._id ?? item.factura)?.toString();
              if (id) mapa[id] = (mapa[id] || 0) + (item.montoPagado || 0);
            });
          });
        }
        setPagadoPorFactura(mapa);

        if (facturasResult.status === "fulfilled") {
          setTodasFacturas(
            facturasResult.value.filter((f) => {
              if (f.tipoFactura === "Nota de Crédito") return false;
              const saldo = totalFactura(f) - (mapa[f._id?.toString()] || 0);
              return saldo > 0.01;
            })
          );
        }

        if (chequesProResult.status === "fulfilled") {
          setChequesPropioCargados(chequesProResult.value);
        }

        if (chequesCarteraResult.status === "fulfilled") {
          setChequesEnCartera(chequesCarteraResult.value);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingDatos(false);
      }
    };
    cargar();
  }, []);

  const proveedoresConFacturas = [
    ...new Set(todasFacturas.map((f) => f.proveedor).filter(Boolean)),
  ].sort();

  useEffect(() => {
    if (!proveedorSeleccionado) {
      setFacturasDisponibles([]);
      setFacturaElegida("");
      return;
    }

    const cargarPagosYFiltrar = async () => {
      try {
        const pagosProveedor = await listarPagosProveedores(proveedorSeleccionado);
        const mapa = {};
        pagosProveedor.forEach((pago) => {
          (pago.pagos || []).forEach((item) => {
            const id = (item.factura?._id ?? item.factura)?.toString();
            if (id) mapa[id] = (mapa[id] || 0) + (item.montoPagado || 0);
          });
        });
        
        setPagadoPorFactura((prev) => ({ ...prev, ...mapa }));

        const idsSeleccionados = facturasSeleccionadas.map((f) => f._id);
        const filtradas = todasFacturas.filter(
          (f) => f.proveedor === proveedorSeleccionado && !idsSeleccionados.includes(f._id)
        );
        setFacturasDisponibles(filtradas);
        setFacturaElegida("");
      } catch (error) {
        console.error(error);
      }
    };

    cargarPagosYFiltrar();
  }, [proveedorSeleccionado, todasFacturas, facturasSeleccionadas]);

  // Se eliminó el useEffect que sincronizaba automáticamente el monto del medio de pago único
  // con la suma de las facturas seleccionadas, permitiendo ingresar cualquier monto (criterio cheque).

  const agregarFactura = () => {
    if (!facturaElegida) return;
    const factura = todasFacturas.find((f) => f._id === facturaElegida);
    if (!factura) return;
    setFacturasSeleccionadas((prev) => {
      const nuevaLista = [
        ...prev,
        { ...factura, montoPagado: "0.00" },
      ];
      if (mediosPago.length > 0) {
        return aplicarAsignacionFIFO(nuevaLista, mediosPago);
      }
      return nuevaLista;
    });
    setFacturaElegida("");
  };

  const quitarFactura = (id) => {
    setFacturasSeleccionadas((prev) => {
      const nuevaLista = prev.filter((f) => f._id !== id);
      if (mediosPago.length > 0) {
        return aplicarAsignacionFIFO(nuevaLista, mediosPago);
      }
      return nuevaLista;
    });
  };

  const esCheque = (tipo) => ["Cheque propio", "Cheque tercero", "E-Cheq propio", "E-Cheq tercero"].includes(tipo);
  const esChequeTercero = (tipo) => ["Cheque tercero", "E-Cheq tercero"].includes(tipo);

  const tipoCobroParaTercero = (tipo) => tipo === "Cheque tercero" ? "Cheque" : "E-Cheq";

  const chequesDisponibles = (tipoPago, medioId) => {
    const tipoRequerido = tipoCobroParaTercero(tipoPago);
    const yaUsados = new Set(mediosPago.filter(m => m.id !== medioId && m.chequeId).map(m => m.chequeId));
    return chequesEnCartera.filter(c => c.tipo === tipoRequerido && !yaUsados.has(c._id));
  };

  const seleccionarCheque = (medioId, chequeLocalId) => {
    if (!chequeLocalId) {
      setMediosPago(prev => {
        const nuevos = prev.map(m => m.id !== medioId ? m : { ...m, numeroCheque: "", clienteCheque: "", fechaCobro: "", monto: "", cobroId: null, medioIndex: null, chequeId: null });
        setTimeout(() => {
          setFacturasSeleccionadas((prevFacts) => aplicarAsignacionFIFO(prevFacts, nuevos));
        }, 0);
        return nuevos;
      });
      return;
    }
    const cheque = chequesEnCartera.find(c => c._id === chequeLocalId);
    if (!cheque) return;
    setMediosPago(prev => {
      const nuevos = prev.map(m => m.id !== medioId ? m : {
        ...m,
        numeroCheque: cheque.numeroCheque,
        clienteCheque: cheque.cliente,
        fechaCobro: cheque.fechaVencimiento,
        monto: cheque.valor.toFixed(2),
        cobroId: cheque.cobroId,
        medioIndex: cheque.medioIndex,
        chequeId: cheque._id,
      });
      setTimeout(() => {
        setFacturasSeleccionadas((prevFacts) => aplicarAsignacionFIFO(prevFacts, nuevos));
      }, 0);
      return nuevos;
    });
  };

  const agregarMedioPago = () => {
    setMediosPago((prev) => {
      const totalActualMedios = prev.reduce((sum, m) => sum + parseMonto(m.monto), 0);
      const defaultMonto = totalActualMedios > 0 ? "0.00" : totalSaldoSeleccionado.toFixed(2);
      const nuevos = [...prev, { id: Date.now(), medioPago: "", monto: defaultMonto, numeroCheque: "", clienteCheque: "", fechaCobro: "", cobroId: null, medioIndex: null, chequeId: null }];
      setTimeout(() => {
        setFacturasSeleccionadas((prevFacts) => aplicarAsignacionFIFO(prevFacts, nuevos));
      }, 0);
      return nuevos;
    });
  };

  const quitarMedioPago = (id) => {
    setMediosPago((prev) => {
      const nuevos = prev.filter((m) => m.id !== id);
      setTimeout(() => {
        setFacturasSeleccionadas((prevFacts) => {
          if (nuevos.length > 0) {
            return aplicarAsignacionFIFO(prevFacts, nuevos);
          } else {
            return prevFacts.map((f) => ({
              ...f,
              montoPagado: saldoFactura(f).toFixed(2),
            }));
          }
        });
      }, 0);
      return nuevos;
    });
  };

  const cerrarModalPago = () => {
    if (mediosPago.length === 0) { setShowModalPago(false); return; }
    for (const m of mediosPago) {
      if (!m.medioPago) {
        Swal.fire({ icon: "warning", title: "Forma de pago incompleta", text: "Seleccioná el tipo en cada forma de pago" });
        return;
      }
      const parsedMonto = parseMonto(m.monto);
      if (isNaN(parsedMonto) || parsedMonto <= 0) {
        Swal.fire({ icon: "warning", title: "Monto inválido", text: "Ingresá un monto válido en cada forma de pago" });
        return;
      }
      if (esCheque(m.medioPago) && !m.numeroCheque) {
        Swal.fire({ icon: "warning", title: "Número de cheque faltante", text: "Ingresá el número de cheque" });
        return;
      }
      if (esCheque(m.medioPago) && !m.fechaCobro) {
        Swal.fire({ icon: "warning", title: "Fecha de vencimiento faltante", text: "Ingresá la fecha de vencimiento del cheque" });
        return;
      }
    }
    
    const totalMediosPago = mediosPago.reduce((sum, m) => sum + parseMonto(m.monto), 0);
    const totalSaldoSeleccionado = facturasSeleccionadas.reduce((sum, f) => sum + saldoFactura(f), 0);

    if (totalMediosPago > totalSaldoSeleccionado + 0.01) {
      if (facturasDisponibles.length > 0) {
        Swal.fire({
          icon: "info",
          title: "Monto excedente",
          text: "El pago supera el monto de las facturas seleccionadas. Por favor, agregá otra factura para aplicar el pago completo.",
        });
      } else {
        Swal.fire({
          icon: "info",
          title: "Saldo a favor",
          text: "No se adeudan más facturas. El saldo restante del pago se acreditará a futuras facturas.",
        });
      }
    }

    setShowModalPago(false);
  };

  const actualizarMedioPago = (id, campo, valor) => {
    setMediosPago((prev) => {
      const nuevos = prev.map((m) => (m.id !== id ? m : { ...m, [campo]: valor }));
      if (campo === "monto" || campo === "medioPago") {
        setTimeout(() => {
          setFacturasSeleccionadas((prevFacts) => aplicarAsignacionFIFO(prevFacts, nuevos));
        }, 0);
      }
      return nuevos;
    });
  };

  const totalSaldoSeleccionado = facturasSeleccionadas.reduce(
    (sum, f) => sum + saldoFactura(f), 0
  );

  const totalPagado = facturasSeleccionadas.reduce(
    (sum, f) => sum + parseMonto(f.montoPagado), 0
  );

  const onSubmit = async (data) => {
    if (facturasSeleccionadas.length === 0) {
      Swal.fire({ icon: "warning", title: "Sin facturas", text: "Agregá al menos una factura al pago" });
      return;
    }

    for (const f of facturasSeleccionadas) {
      const monto = parseMonto(f.montoPagado);
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
      const parsedMonto = parseMonto(m.monto);
      if (isNaN(parsedMonto) || parsedMonto <= 0) {
        Swal.fire({ icon: "warning", title: "Monto inválido", text: "Ingresá un monto válido en cada forma de pago" });
        return;
      }
      if (esCheque(m.medioPago) && !m.numeroCheque) {
        Swal.fire({ icon: "warning", title: "Número de cheque faltante", text: "Ingresá el número de cheque" });
        return;
      }
      if (esCheque(m.medioPago) && !m.fechaCobro) {
        Swal.fire({ icon: "warning", title: "Fecha de vencimiento faltante", text: "Ingresá la fecha de vencimiento del cheque" });
        return;
      }
    }

    const totalMediosPago = mediosPago.reduce((sum, m) => sum + parseMonto(m.monto), 0);
    const totalFacturasPagadas = facturasSeleccionadas.reduce((sum, f) => sum + parseMonto(f.montoPagado), 0);

    if (totalFacturasPagadas > totalMediosPago + 0.01) {
      Swal.fire({
        icon: "warning",
        title: "Monto excedido",
        text: `El total asignado a las facturas (${formatoMoneda(totalFacturasPagadas)}) no puede superar la suma de las formas de pago (${formatoMoneda(totalMediosPago)})`,
      });
      return;
    }

    const asignaciones = facturasSeleccionadas
      .map((f) => ({
        factura: f._id,
        montoPagado: parseFloat(parseMonto(f.montoPagado).toFixed(2)),
      }))
      .filter((a) => a.montoPagado > 0.01);

    const payload = {
      fecha: data.fecha?.substring(0, 10),
      proveedor: data.proveedor,
      observaciones: data.observaciones || "",
      mediosPago: mediosPago.map((m) => ({
        medioPago: m.medioPago,
        monto: parseMonto(m.monto),
        numeroCheque: m.numeroCheque || "",
        fechaCobro: m.fechaCobro || "",
      })),
      pagos: asignaciones,
    };

    try {
      const respuesta = await crearPagoProveedor(payload);
      if (respuesta?.ok) {
        await Promise.all(
          mediosPago
            .filter(m => m.cobroId != null)
            .map(m => actualizarEstadoCheque(m.cobroId, m.medioIndex, "Pago proveedores", "", data.proveedor))
        );

        // Alta automática en Contable → Cheque propio de los cheques/e-cheq propios emitidos.
        // Se omiten los que ya existen (para no duplicar si se dieron de alta manualmente).
        const chequesPropiosNuevos = mediosPago.filter(
          (m) =>
            (m.medioPago === "Cheque propio" || m.medioPago === "E-Cheq propio") &&
            m.numeroCheque?.trim() &&
            !chequesPropioCargados.some(
              (c) => c.numeroCheque.trim().toLowerCase() === m.numeroCheque.trim().toLowerCase()
            )
        );
        const altasFallidas = (
          await Promise.all(
            chequesPropiosNuevos.map((m) =>
              crearChequePropio({
                numeroCheque: m.numeroCheque.trim(),
                monto: parseMonto(m.monto),
                fechaCobro: m.fechaCobro,
                proveedor: data.proveedor,
                tipo: m.medioPago === "E-Cheq propio" ? "E-Cheq" : "Físico",
              })
                .then((r) => !!r?.ok)
                .catch(() => false)
            )
          )
        ).filter((ok) => !ok).length;

        if (altasFallidas > 0) {
          Swal.fire({
            icon: "warning",
            title: "Pago registrado",
            text: `El pago se registró, pero ${altasFallidas} cheque(s) propio(s) no se pudieron dar de alta en Contable. Cargalos manualmente.`,
          });
        } else {
          Swal.fire({ icon: "success", title: "Pago registrado", timer: 2000, showConfirmButton: false });
        }
        navigate("/pago-proveedores");
      } else {
        const err = await respuesta.json();
        Swal.fire({ icon: "error", title: "Error", text: err.msg || "No se pudo registrar el pago" });
      }
    } catch {
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
        <h6 className="mb-0">Nuevo Pago a Proveedor <small className="text-muted">(iva incluido)</small></h6>
        <Button variant="outline-success" onClick={() => navigate("/pago-proveedores")}>Volver</Button>
      </div>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <div className="d-flex flex-column gap-3 mb-4">
          <div className="d-flex align-items-center gap-2">
            <Form.Label className="mb-0 text-nowrap" style={{ width: "80px" }}>Fecha</Form.Label>
            <Form.Control
              type="date"
              max={hoy}
              style={{ width: "160px" }}
              {...register("fecha", { required: "La fecha es obligatoria" })}
              isInvalid={!!errors.fecha}
            />
          </div>
          <div className="d-flex align-items-center gap-3">
            <div className="d-flex align-items-center gap-2">
              <Form.Label className="mb-0 text-nowrap" style={{ width: "80px" }}>Proveedor</Form.Label>
              <div style={{ position: "relative", width: "260px" }}>
                <Form.Select
                  {...proveedorReg}
                  onChange={(e) => { onChangeProveedor(e); setFacturasSeleccionadas([]); setMediosPago([]); }}
                  isInvalid={!!errors.proveedor}
                  style={proveedorSeleccionado ? { backgroundImage: "none" } : undefined}
                >
                  <option value="">Seleccionar...</option>
                  {proveedoresConFacturas.map((nombre) => (
                    <option key={nombre} value={nombre}>{nombre}</option>
                  ))}
                </Form.Select>
                {proveedorSeleccionado && (
                  <span
                    onClick={() => { setValue("proveedor", ""); setFacturasSeleccionadas([]); setMediosPago([]); }}
                    style={estiloX}
                  >✕</span>
                )}
              </div>
            </div>
            <div className="d-flex align-items-center gap-2 flex-grow-1">
              <Form.Label className="mb-0 text-nowrap">Observaciones</Form.Label>
              <Form.Control
                type="text"
                placeholder="Observaciones (opcional)"
                {...register("observaciones")}
              />
            </div>
          </div>
          <div className="d-flex align-items-center gap-3">
            <div className="d-flex align-items-center gap-2">
              <Form.Label className="mb-0 text-nowrap" style={{ width: "80px" }}>Factura</Form.Label>
              <Form.Select
                style={{ width: "380px" }}
                value={facturaElegida}
                onChange={(e) => setFacturaElegida(e.target.value)}
                disabled={!proveedorSeleccionado}
              >
                <option value="">
                  {proveedorSeleccionado
                    ? facturasDisponibles.length === 0
                      ? "Sin facturas pendientes para este proveedor"
                      : "Seleccionar factura..."
                    : "Primero elegí un proveedor"}
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
          <Button type="button" variant="outline-secondary" onClick={() => navigate("/pago-proveedores")}>Cancelar</Button>
          {facturasSeleccionadas.length > 0 && (
            <Button type="button" variant="outline-primary" onClick={() => {
              if (mediosPago.length === 0) agregarMedioPago();
              setShowModalPago(true);
            }}>
              {mediosPago.length > 0 ? `Formas de pago (${mediosPago.length})` : "+ Agregar forma de pago"}
            </Button>
          )}
          <AsyncButton type="submit" variant="outline-success" loading={isSubmitting}>Guardar Pago</AsyncButton>
        </div>

        {facturasSeleccionadas.length > 0 && (
          <Table striped bordered hover className="text-center align-middle mb-4">
            <thead className="table-dark">
              <tr>
                <th>Tipo</th>
                <th>N° Factura</th>
                <th>Fecha factura</th>
                <th>Total factura</th>
                <th>Saldo pendiente</th>
                <th>Monto pagado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...facturasSeleccionadas]
                .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                .map((f) => (
                  <tr key={f._id}>
                    <td>{f.tipoFactura}</td>
                    <td>{f.numeroFactura}</td>
                    <td>{formatearFecha(f.fecha)}</td>
                    <td>{formatoMoneda(totalFactura(f))}</td>
                    <td>{formatoMoneda(saldoFactura(f))}</td>
                    <td>
                      <Form.Control
                        type="text"
                        size="sm"
                        style={{ width: "220px", margin: "0 auto", textAlign: "center" }}
                        value={parseMonto(f.montoPagado) === 0 ? "" : formatoMoneda(f.montoPagado)}
                        placeholder="Completar en forma de pago"
                        readOnly
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
                <td>{formatoMoneda(facturasSeleccionadas.reduce((sum, f) => sum + totalFactura(f), 0))}</td>
                <td>{formatoMoneda(facturasSeleccionadas.reduce((sum, f) => sum + saldoFactura(f) - parseMonto(f.montoPagado), 0))}</td>
                <td className="fw-bold">{formatoMoneda(totalPagado)}</td>
                <td></td>
              </tr>
            </tfoot>
          </Table>
        )}
      </Form>

      <Modal show={showModalPago} onHide={cerrarModalPago} size="xl" centered>
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
                <th>Cliente</th>
                <th>Vencimiento</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {mediosPago.map((m) => (
                <tr key={m.id}>
                  <td style={{ minWidth: "145px" }}>
                    <Form.Select size="sm" value={m.medioPago} onChange={(e) => actualizarMedioPago(m.id, "medioPago", e.target.value)}>
                      <option value="">Seleccionar...</option>
                      <option>Cheque propio</option>
                      <option>Cheque tercero</option>
                      <option>E-Cheq propio</option>
                      <option>E-Cheq tercero</option>
                      <option>Retenciones</option>
                      <option>Efectivo</option>
                      <option>Transferencia</option>
                    </Form.Select>
                  </td>
                  <td style={{ minWidth: "105px" }}>
                    <Form.Control
                      type="text"
                      size="sm"
                      value={editandoMontoId === m.id ? m.monto : (m.monto ? formatoMoneda(m.monto) : "")}
                      placeholder="0.00"
                      readOnly={!!m.chequeId}
                      onFocus={(e) => { if (!m.chequeId) { setEditandoMontoId(m.id); const el = e.target; setTimeout(() => el.select(), 0); } }}
                      onChange={(e) => { if (!m.chequeId) actualizarMedioPago(m.id, "monto", e.target.value); }}
                      onBlur={() => setEditandoMontoId(null)}
                    />
                  </td>
                  <td style={{ minWidth: "155px" }}>
                    {esCheque(m.medioPago) ? (
                      esChequeTercero(m.medioPago) ? (
                        m.chequeId ? (
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            <span className="small">
                              {m.medioPago === "E-Cheq tercero" ? `E-Cheq ${m.numeroCheque}` : `N°${m.numeroCheque}`}
                            </span>
                            <Button size="sm" variant="outline-secondary" style={{ padding: "0 5px", fontSize: "11px", lineHeight: "1.4" }} onClick={() => seleccionarCheque(m.id, null)}>✕</Button>
                          </div>
                        ) : (
                          <Form.Select size="sm" value="" onChange={(e) => seleccionarCheque(m.id, e.target.value)}>
                            <option value="">Seleccionar cheque...</option>
                            {chequesDisponibles(m.medioPago, m.id).map(c => (
                              <option key={c._id} value={c._id}>
                                {c.tipo === "E-Cheq" ? `E-Cheq ${c.numeroCheque}` : `N°${c.numeroCheque}`} — {c.cliente} — {formatoMoneda(c.valor)}
                              </option>
                            ))}
                          </Form.Select>
                        )
                      ) : (
                        <Form.Control type="text" size="sm" placeholder="N° cheque" value={m.numeroCheque} onChange={(e) => actualizarMedioPago(m.id, "numeroCheque", e.target.value)} />
                      )
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td style={{ minWidth: "120px" }}>
                    {esCheque(m.medioPago) ? (
                      m.chequeId ? (
                        <span className="small">{m.clienteCheque}</span>
                      ) : (
                        <Form.Control type="text" size="sm" placeholder="Cliente" value={m.clienteCheque} onChange={(e) => actualizarMedioPago(m.id, "clienteCheque", e.target.value)} />
                      )
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td style={{ minWidth: "115px" }}>
                    {esCheque(m.medioPago) ? (
                      m.chequeId ? (
                        <span className="small">{formatearFechaBarra(m.fechaCobro)}</span>
                      ) : (
                        <Form.Control type="date" size="sm" value={m.fechaCobro} onChange={(e) => actualizarMedioPago(m.id, "fechaCobro", e.target.value)} />
                      )
                    ) : (
                      <span className="text-muted">—</span>
                    )}
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
                <td className="fw-bold">{formatoMoneda(mediosPago.reduce((sum, m) => sum + parseMonto(m.monto), 0))}</td>
                <td colSpan={4}></td>
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

export default NuevoPagoProveedor;
