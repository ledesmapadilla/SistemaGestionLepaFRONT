import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button, Table, Container, Form, Row, Col, Spinner, InputGroup } from "react-bootstrap";
import "bootstrap-icons/font/bootstrap-icons.css";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { crearFactura } from "../../../../../helpers/queriesFacturas";
import { listarRemitos } from "../../../../../helpers/queriesRemitos";

const hoy = new Date().toISOString().split("T")[0];

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
    formState: { errors },
  } = useForm();

  const [todosRemitos, setTodosRemitos] = useState([]);
  const [remitosDisponibles, setRemitosDisponibles] = useState([]);
  const [remitosSeleccionados, setRemitosSeleccionados] = useState([]);
  const [remitoElegido, setRemitoElegido] = useState("");
  const [loadingDatos, setLoadingDatos] = useState(true);
  const [totalBase, setTotalBase] = useState(0);
  const [inputSinIva, setInputSinIva] = useState("");
  const [inputConIva, setInputConIva] = useState("");
  const [editandoSinIva, setEditandoSinIva] = useState(false);
  const [editandoConIva, setEditandoConIva] = useState(false);

  const clienteSeleccionado = watch("cliente");
  const tipoFactura = watch("tipoFactura");
  const ivaRate = tipoFactura === "Factura X" ? 0 : 0.21;

  useEffect(() => {
    const cargar = async () => {
      try {
        const sinFacturar = await listarRemitos("Sin facturar");
        setTodosRemitos(sinFacturar);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingDatos(false);
      }
    };
    cargar();
  }, []);

  const clientesConRemitos = [
    ...new Set(todosRemitos.map((r) => r.obra?.razonsocial).filter(Boolean)),
  ].sort();

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
        !idsSeleccionados.includes(r._id)
    );
    setRemitosDisponibles(filtrados);
    setRemitoElegido("");
  }, [clienteSeleccionado, todosRemitos, remitosSeleccionados]);

  const agregarRemito = () => {
    if (!remitoElegido) return;
    const remito = todosRemitos.find((r) => r._id === remitoElegido);
    if (!remito) return;
    setRemitosSeleccionados((prev) => [...prev, remito]);
    setRemitoElegido("");
  };

  const quitarRemito = (id) => {
    setRemitosSeleccionados(remitosSeleccionados.filter((r) => r._id !== id));
  };

  const totalCalculado = remitosSeleccionados.reduce(
    (sum, r) => sum + calcularTotalRemito(r.items),
    0
  );

  useEffect(() => {
    setTotalBase(totalCalculado);
  }, [remitosSeleccionados, tipoFactura]);

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
      total: totalBase,
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
      <div className="d-flex align-items-center mb-4 gap-3">
        <Button variant="outline-secondary" size="sm" onClick={() => navigate("/facturacion")}>
          ← Volver
        </Button>
        <h2 className="mb-0">Nueva Factura</h2>
      </div>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <Row className="mb-3">
          <Col md={3}>
            <Form.Group>
              <Form.Label>Fecha</Form.Label>
              <Form.Control
                type="date"
                max={hoy}
                {...register("fecha", { required: true })}
                isInvalid={!!errors.fecha}
              />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>Tipo de Factura</Form.Label>
              <Form.Select
                {...register("tipoFactura", { required: true })}
                isInvalid={!!errors.tipoFactura}
              >
                <option value="">Seleccionar...</option>
                <option>Factura A</option>
                <option>Factura X</option>
                <option>Nota de Crédito</option>
                <option>Nota de Débito</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>Número de Factura</Form.Label>
              <Form.Control
                type="text"
                {...register("numeroFactura", { required: true })}
                isInvalid={!!errors.numeroFactura}
              />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>Cliente</Form.Label>
              <Form.Select
                {...register("cliente", { required: true })}
                isInvalid={!!errors.cliente}
              >
                <option value="">Seleccionar...</option>
                {clientesConRemitos.map((nombre) => (
                  <option key={nombre} value={nombre}>
                    {nombre}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>

        <Row className="mb-3">
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
                      ? "Sin remitos sin facturar para este cliente"
                      : "Seleccionar remito..."
                    : "Primero elegí un cliente"}
                </option>
                {remitosDisponibles.map((r) => (
                  <option key={r._id} value={r._id}>
                    Remito #{r.remito} — {r.obra?.nombreobra} ({formatearFecha(r.fecha)})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>

        {remitosSeleccionados.length > 0 && (
          <Table bordered size="sm" className="text-center align-middle mb-2">
            <thead className="table-dark">
              <tr>
                <th>N° Remito</th>
                <th>Fecha</th>
                <th>Obra</th>
                <th>Precio Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {remitosSeleccionados.map((r) => (
                <tr key={r._id}>
                  <td>{r.remito}</td>
                  <td>{formatearFecha(r.fecha)}</td>
                  <td>{r.obra?.nombreobra}</td>
                  <td>{formatoMoneda(calcularTotalRemito(r.items))}</td>
                  <td>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => quitarRemito(r._id)}
                    >
                      Quitar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="text-end">Subtotal (sin IVA):</td>
                <td>
                  <InputGroup size="sm">
                    <Form.Control
                      type="text"
                      className="text-center"
                      value={editandoSinIva ? inputSinIva : formatoMoneda(totalBase)}
                      onFocus={() => { setEditandoSinIva(true); setInputSinIva(String(totalBase)); }}
                      onChange={(e) => setInputSinIva(e.target.value)}
                      onBlur={() => { setTotalBase(parseFloat(inputSinIva) || 0); setEditandoSinIva(false); }}
                    />
                    <InputGroup.Text><i className="bi bi-pencil" /></InputGroup.Text>
                  </InputGroup>
                </td>
                <td></td>
              </tr>
              <tr>
                <td colSpan={3} className="text-end">IVA {ivaRate === 0 ? "0%" : "21%"}:</td>
                <td>{formatoMoneda(totalBase * ivaRate)}</td>
                <td></td>
              </tr>
              <tr>
                <td colSpan={3} className="text-end fw-bold">Total + IVA:</td>
                <td>
                  <InputGroup size="sm">
                    <Form.Control
                      type="text"
                      className="text-center fw-bold"
                      value={editandoConIva ? inputConIva : formatoMoneda(totalBase * (1 + ivaRate))}
                      onFocus={() => { setEditandoConIva(true); setInputConIva(String(+(totalBase * (1 + ivaRate)).toFixed(2))); }}
                      onChange={(e) => setInputConIva(e.target.value)}
                      onBlur={() => { setTotalBase((parseFloat(inputConIva) || 0) / (1 + ivaRate)); setEditandoConIva(false); }}
                    />
                    <InputGroup.Text><i className="bi bi-pencil" /></InputGroup.Text>
                  </InputGroup>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </Table>
        )}

        <div className="d-flex justify-content-end mt-4 gap-2">
          <Button variant="outline-secondary" onClick={() => navigate("/facturacion")}>
            Cancelar
          </Button>
          <Button variant="outline-light" onClick={agregarRemito} disabled={!remitoElegido}>
            + Agregar Remito
          </Button>
          <Button type="submit" variant="dark">
            Guardar Factura
          </Button>
        </div>
      </Form>
    </Container>
  );
};

export default NuevaFactura;
