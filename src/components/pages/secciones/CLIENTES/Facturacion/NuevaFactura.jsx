import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button, Table, Container, Form, Row, Col, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { crearFactura, listarFacturas } from "../../../../../helpers/queriesFacturas";
import { listarRemitos, listarRemitosDisponibles } from "../../../../../helpers/queriesRemitos";

const hoy = new Date().toLocaleDateString("en-CA");

const formatearFecha = (fecha) => {
  if (!fecha) return "-";
  const p = fecha.split("-");
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : fecha;
};

const calcularTotalRemito = (items = []) =>
  items.reduce((sum, item) => sum + Number(item.cantidad) * Number(item.precioUnitario), 0);

const formatoMoneda = (valor) =>
  Number(valor).toLocaleString("es-AR", { style: "currency", currency: "ARS" });

const NuevaFactura = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm();

  const [todosRemitos, setTodosRemitos] = useState([]);
  const [remitosDisponibles, setRemitosDisponibles] = useState([]);
  const [remitosSeleccionados, setRemitosSeleccionados] = useState([]);
  const [montosAFacturar, setMontosAFacturar] = useState({});
  const [inputFocusadoId, setInputFocusadoId] = useState(null);
  const [remitoElegido, setRemitoElegido] = useState("");
  const [obraSeleccionada, setObraSeleccionada] = useState("");
  const [loadingDatos, setLoadingDatos] = useState(true);
  const [numerosExistentes, setNumerosExistentes] = useState([]);
  const [todasFacturas, setTodasFacturas] = useState([]);
  const [totalEditado, setTotalEditado] = useState(null);
  const [totalFocusado, setTotalFocusado] = useState(false);
  const [totalInputStr, setTotalInputStr] = useState("0");

  const clienteSeleccionado = watch("cliente");
  const tipoFactura = watch("tipoFactura");
  const ivaRate = tipoFactura === "Factura X" ? 0 : 0.21;
  const esNotaCredito = tipoFactura === "Nota de Crédito";
  const signo = esNotaCredito ? -1 : 1;

  const totalBase =
    Object.values(montosAFacturar).reduce((sum, m) => sum + (Number(m) || 0), 0) * signo;

  const totalEfectivo = totalEditado !== null ? totalEditado * signo : totalBase;

  useEffect(() => {
    const cargar = async () => {
      setLoadingDatos(true);
      try {
        const [remitosRaw, facturas] = await Promise.all([
          esNotaCredito ? listarRemitos("Facturado") : listarRemitosDisponibles(),
          listarFacturas(),
        ]);
        setTodosRemitos(remitosRaw);
        setRemitosSeleccionados([]);
        setMontosAFacturar({});
        setNumerosExistentes(facturas.map((f) => f.numeroFactura?.toString().trim()));
        setTodasFacturas(facturas);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingDatos(false);
      }
    };
    cargar();
  }, [esNotaCredito]);

  useEffect(() => {
    if (tipoFactura === "Factura X") {
      const numerosX = todasFacturas
        .filter((f) => f.tipoFactura === "Factura X")
        .map((f) => Number(f.numeroFactura))
        .filter((n) => !isNaN(n));
      const siguiente = numerosX.length > 0 ? Math.max(...numerosX) + 1 : 1;
      setValue("numeroFactura", siguiente, { shouldValidate: true });
    } else {
      setValue("numeroFactura", "", { shouldValidate: false });
    }
  }, [tipoFactura, todasFacturas]);

  const clientesConRemitos = [
    ...new Set(todosRemitos.map((r) => r.obra?.razonsocial).filter(Boolean)),
  ].sort();

  const obrasConRemitos = clienteSeleccionado
    ? [...new Set(
        todosRemitos
          .filter((r) => r.obra?.razonsocial === clienteSeleccionado)
          .map((r) => r.obra?.nombreobra)
          .filter(Boolean)
      )].sort()
    : [];

  useEffect(() => {
    setObraSeleccionada("");
  }, [clienteSeleccionado]);

  useEffect(() => {
    if (!clienteSeleccionado) {
      setRemitosDisponibles([]);
      setRemitoElegido("");
      return;
    }
    const idsSeleccionados = remitosSeleccionados.map((r) => r._id);
    const filtrados = todosRemitos.filter(
      (r) =>
        r.obra?.razonsocial === clienteSeleccionado &&
        (!obraSeleccionada || r.obra?.nombreobra === obraSeleccionada) &&
        !idsSeleccionados.includes(r._id)
    );
    setRemitosDisponibles(filtrados);
    setRemitoElegido("");
  }, [clienteSeleccionado, obraSeleccionada, todosRemitos, remitosSeleccionados]);

  const agregarRemito = () => {
    if (!remitoElegido) return;
    const remito = todosRemitos.find((r) => r._id === remitoElegido);
    if (!remito) return;
    const totalRem = calcularTotalRemito(remito.items);
    const saldo = esNotaCredito
      ? totalRem
      : totalRem - (remito.montoFacturado || 0);
    setRemitosSeleccionados((prev) => [...prev, remito]);
    setMontosAFacturar((prev) => ({ ...prev, [remito._id]: saldo }));
    setTotalEditado(null);
    setRemitoElegido("");
  };

  const quitarRemito = (id) => {
    setRemitosSeleccionados(remitosSeleccionados.filter((r) => r._id !== id));
    setMontosAFacturar((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setTotalEditado(null);
  };

  const onSubmit = async (data) => {
    if (remitosSeleccionados.length === 0) {
      Swal.fire({ icon: "warning", title: "Sin remitos", text: "Agregá al menos un remito a la factura" });
      return;
    }

    const payload = {
      fecha: data.fecha,
      tipoFactura: data.tipoFactura,
      numeroFactura: data.numeroFactura,
      cliente: data.cliente,
      remitos: remitosSeleccionados.map((r) => r._id),
      total: totalEfectivo,
      montosPorRemito: remitosSeleccionados.map((r) => ({
        remitoId: r._id,
        monto: Number(montosAFacturar[r._id]) || 0,
      })),
    };

    try {
      const respuesta = await crearFactura(payload);
      if (respuesta?.ok) {
        Swal.fire({ icon: "success", title: "Factura creada", timer: 2000, showConfirmButton: false });
        navigate("/facturacion");
      } else {
        const err = await respuesta.json();
        Swal.fire({ icon: "error", title: "Error", text: err.msg || "No se pudo crear la factura" });
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
        <h6 className="mb-0">Nueva Factura</h6>
        <Button variant="outline-success" onClick={() => navigate("/facturacion")}>Volver</Button>
      </div>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <Row className="mb-3">
          <Col md={2}>
            <Form.Group>
              <Form.Label>Fecha</Form.Label>
              <Form.Control
                type="date"
                max={hoy}
                {...register("fecha", { required: "La fecha es obligatoria" })}
                isInvalid={!!errors.fecha}
              />
              <Form.Text className="text-danger">{errors.fecha?.message}</Form.Text>
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>Cliente</Form.Label>
              <Form.Select
                {...register("cliente", { required: "El cliente es obligatorio" })}
                isInvalid={!!errors.cliente}
              >
                <option value="">Seleccionar...</option>
                {clientesConRemitos.map((nombre) => (
                  <option key={nombre} value={nombre}>{nombre}</option>
                ))}
              </Form.Select>
              <Form.Text className="text-danger">{errors.cliente?.message}</Form.Text>
            </Form.Group>
          </Col>
          <Col md={2}>
            <Form.Group>
              <Form.Label>Obra</Form.Label>
              <Form.Select
                value={obraSeleccionada}
                onChange={(e) => setObraSeleccionada(e.target.value)}
                disabled={!clienteSeleccionado}
              >
                <option value="">
                  {clienteSeleccionado ? "Todas las obras" : "Primero elegí un cliente"}
                </option>
                {obrasConRemitos.map((nombre) => (
                  <option key={nombre} value={nombre}>{nombre}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>Tipo de Factura</Form.Label>
              <Form.Select
                {...register("tipoFactura", { required: "El tipo es obligatorio" })}
                isInvalid={!!errors.tipoFactura}
              >
                <option value="">Seleccionar...</option>
                <option>Factura A</option>
                <option>Factura X</option>
                <option>Nota de Crédito</option>
                <option>Nota de Débito</option>
              </Form.Select>
              <Form.Text className="text-danger">{errors.tipoFactura?.message}</Form.Text>
            </Form.Group>
          </Col>
          <Col md={2}>
            <Form.Group>
              <Form.Label>Número de Factura</Form.Label>
              <Form.Control
                type="text"
                readOnly={tipoFactura === "Factura X"}
                className={tipoFactura === "Factura X" ? "text-muted" : ""}
                {...register("numeroFactura", {
                  required: "El número es obligatorio",
                  validate: (v) =>
                    !numerosExistentes.includes(v?.toString().trim()) ||
                    "Este número de factura ya existe",
                })}
                isInvalid={!!errors.numeroFactura}
              />
              <Form.Text className="text-danger">{errors.numeroFactura?.message}</Form.Text>
            </Form.Group>
          </Col>
        </Row>

        <Row className="mb-3 align-items-end">
          <Col md={6}>
            <Form.Group>
              <Form.Label>Remito</Form.Label>
              <Form.Select
                value={remitoElegido}
                onChange={(e) => setRemitoElegido(e.target.value)}
                disabled={!clienteSeleccionado}
              >
                <option value="">
                  {clienteSeleccionado
                    ? remitosDisponibles.length === 0
                      ? obraSeleccionada
                        ? "Sin remitos con saldo para esta obra"
                        : "Sin remitos con saldo para este cliente"
                      : "Seleccionar remito..."
                    : "Primero elegí un cliente"}
                </option>
                {remitosDisponibles.map((r) => {
                  const saldo = calcularTotalRemito(r.items) - (r.montoFacturado || 0);
                  return (
                    <option key={r._id} value={r._id}>
                      Remito #{r.remito} — {r.obra?.nombreobra} ({formatearFecha(r.fecha)})
                      {r.montoFacturado > 0 ? ` · Saldo: ${formatoMoneda(saldo)}` : ""}
                    </option>
                  );
                })}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={6} className="d-flex justify-content-end gap-2">
            <Button variant="outline-secondary" onClick={() => navigate("/facturacion")}>Cancelar</Button>
            <Button variant="outline-primary" onClick={agregarRemito} disabled={!remitoElegido}>+ Agregar Remito</Button>
            <Button type="submit" variant="outline-success">Guardar Factura</Button>
          </Col>
        </Row>

        {remitosSeleccionados.length > 0 && (
          <Table striped bordered hover className="text-center align-middle mb-2">
            <thead className="table-dark">
              <tr>
                <th>N° Remito</th>
                <th>Fecha</th>
                <th>Obra</th>
                <th>Saldo disponible</th>
                <th>A facturar</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {remitosSeleccionados.map((r) => {
                const totalRem = calcularTotalRemito(r.items);
                const saldo = esNotaCredito ? totalRem : totalRem - (r.montoFacturado || 0);
                return (
                  <tr key={r._id}>
                    <td>{r.remito}</td>
                    <td>{formatearFecha(r.fecha)}</td>
                    <td className="text-muted" title={r.obra?.nombreobra}>{r.obra?.nombreobra}</td>
                    <td>{formatoMoneda(saldo * signo)}</td>
                    <td>
                      <Form.Control
                        type="text"
                        size="sm"
                        disabled={esNotaCredito}
                        value={
                          inputFocusadoId === r._id
                            ? (montosAFacturar[r._id] ?? "")
                            : formatoMoneda(montosAFacturar[r._id] ?? saldo)
                        }
                        onFocus={() => {
                          setInputFocusadoId(r._id);
                          setMontosAFacturar((prev) => ({ ...prev, [r._id]: "" }));
                        }}
                        onBlur={() => {
                          setInputFocusadoId(null);
                          setMontosAFacturar((prev) => {
                            const v = prev[r._id];
                            return v === "" || v == null
                              ? { ...prev, [r._id]: 0 }
                              : prev;
                          });
                        }}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === "") {
                            setMontosAFacturar((prev) => ({ ...prev, [r._id]: "" }));
                            return;
                          }
                          const val = parseFloat(raw) || 0;
                          setMontosAFacturar((prev) => ({
                            ...prev,
                            [r._id]: Math.min(val, saldo),
                          }));
                        }}
                        style={{ width: "140px", textAlign: "right" }}
                      />
                    </td>
                    <td>
                      <Button variant="outline-danger" size="sm" onClick={() => quitarRemito(r._id)}>Quitar</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot style={{ borderTop: "2px solid #ffc107" }}>
              <tr>
                <td colSpan={4} className="text-end">
                  Subtotal (sin IVA):
                  {totalEditado !== null && (
                    <span
                      className="ms-2 text-warning"
                      style={{ fontSize: "0.75rem", cursor: "pointer" }}
                      title="Volver al calculado"
                      onClick={() => setTotalEditado(null)}
                    >
                      ↺ calculado: {formatoMoneda(Math.abs(totalBase))}
                    </span>
                  )}
                </td>
                <td>
                  <Form.Control
                    type="text"
                    size="sm"
                    value={totalFocusado ? totalInputStr : formatoMoneda(Math.abs(totalEfectivo))}
                    onFocus={() => {
                      setTotalFocusado(true);
                      setTotalInputStr("0");
                    }}
                    onBlur={() => {
                      setTotalFocusado(false);
                      const val = parseFloat(totalInputStr);
                      setTotalEditado(isNaN(val) ? 0 : val);
                    }}
                    onChange={(e) => setTotalInputStr(e.target.value)}
                    style={{ width: "140px", textAlign: "right" }}
                  />
                </td>
                <td></td>
              </tr>
              <tr>
                <td colSpan={4} className="text-end">IVA {ivaRate === 0 ? "0%" : "21%"}:</td>
                <td>{formatoMoneda(Math.abs(totalEfectivo) * ivaRate)}</td>
                <td></td>
              </tr>
              <tr>
                <td colSpan={4} className="text-end fw-bold">Total + IVA:</td>
                <td className="fw-bold">{formatoMoneda(Math.abs(totalEfectivo) * (1 + ivaRate))}</td>
                <td></td>
              </tr>
            </tfoot>
          </Table>
        )}
      </Form>
    </Container>
  );
};

export default NuevaFactura;
