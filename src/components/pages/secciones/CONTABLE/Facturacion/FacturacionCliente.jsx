import { useState, useEffect } from "react";
import { Button, Table, Badge, Container, Spinner, Modal, Form, Row, Col } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { listarFacturas, editarFactura, borrarFactura } from "../../../../../helpers/queriesFacturas";

const hoy = new Date().toISOString().split("T")[0];

const formatoMoneda = (valor) => {
  if (valor === undefined || valor === null) return "-";
  return Number(valor).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
};

const formatearFecha = (fecha) => {
  if (!fecha) return "-";
  const p = fecha.split("-");
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : fecha;
};

const calcularTotalRemito = (items = []) =>
  items.reduce((sum, item) => sum + Number(item.cantidad) * Number(item.precioUnitario), 0);

const FacturacionCliente = () => {
  const navigate = useNavigate();
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [facturaVerId, setFacturaVerId] = useState(null);
  const facturaVer = facturas.find((f) => f._id === facturaVerId) || null;
  const [facturaEditar, setFacturaEditar] = useState(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    cargarFacturas();
  }, []);

  const cargarFacturas = async () => {
    try {
      const data = await listarFacturas();
      setFacturas(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const abrirEditar = (f) => {
    setFacturaEditar(f);
    reset({ fecha: f.fecha, tipoFactura: f.tipoFactura, numeroFactura: f.numeroFactura });
  };

  const guardarEdicion = async (data) => {
    const respuesta = await editarFactura(facturaEditar._id, data);
    if (respuesta?.ok) {
      const resultado = await respuesta.json();
      setFacturas(facturas.map((f) =>
        f._id === facturaEditar._id ? { ...f, ...resultado.factura, remitos: f.remitos } : f
      ));
      setFacturaEditar(null);
      Swal.fire({ icon: "success", title: "Factura actualizada", timer: 2000, showConfirmButton: false });
    } else {
      Swal.fire({ icon: "error", title: "Error", text: "No se pudo actualizar la factura" });
    }
  };

  const toggleEstado = async (factura) => {
    const nuevoEstado = factura.estadoPago === "Pagada" ? "Pendiente" : "Pagada";
    const respuesta = await editarFactura(factura._id, { estadoPago: nuevoEstado });
    if (respuesta?.ok) {
      const data = await respuesta.json();
      setFacturas(facturas.map((f) => (f._id === factura._id ? data.factura : f)));
    }
  };

  const eliminar = async (id) => {
    const result = await Swal.fire({
      title: "¿Eliminar factura?",
      text: "Los remitos volverán a estado 'sin facturar'",
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: "swal-btn-danger" },
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      const respuesta = await borrarFactura(id);
      if (respuesta?.ok) {
        setFacturas(facturas.filter((f) => f._id !== id));
        Swal.fire({ icon: "success", title: "Factura eliminada", timer: 2000, showConfirmButton: false });
      }
    }
  };

  const subtotal = facturaVer
    ? (facturaVer.remitos || []).reduce((sum, r) => sum + calcularTotalRemito(r.items), 0)
    : 0;
  const ivaRateVer = facturaVer?.tipoFactura === "Factura X" ? 0 : 0.21;

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Facturación <small className="text-muted fs-5">(IVA incluido)</small></h2>
        <Button variant="dark" onClick={() => navigate("/facturacion/nueva")}>
          + Nueva Factura
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <Table bordered striped hover size="sm" className="text-center align-middle">
          <thead className="table-dark">
            <tr>
              <th>Nro</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Tipo</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {facturas.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-muted py-3">
                  Sin facturas cargadas
                </td>
              </tr>
            ) : (
              facturas.map((f) => (
                <tr key={f._id}>
                  <td>{f.numeroFactura}</td>
                  <td>{formatearFecha(f.fecha)}</td>
                  <td>{f.cliente}</td>
                  <td>{f.tipoFactura}</td>
                  <td>{formatoMoneda(f.tipoFactura === "Factura X" ? f.total : f.total * 1.21)}</td>
                  <td>
                    <Badge
                      bg={f.estadoPago === "Pagada" ? "success" : "warning"}
                      text={f.estadoPago === "Pagada" ? undefined : "dark"}
                    >
                      {f.estadoPago}
                    </Badge>
                  </td>
                  <td>
                    <Button variant="outline-info" size="sm" className="me-1" onClick={() => setFacturaVerId(f._id)}>
                      Ver
                    </Button>
                    <Button variant="outline-warning" size="sm" className="me-1" onClick={() => abrirEditar(f)}>
                      Editar
                    </Button>
                    <Button variant="outline-secondary" size="sm" className="me-1" onClick={() => toggleEstado(f)}>
                      {f.estadoPago === "Pagada" ? "Marcar pendiente" : "Marcar pagada"}
                    </Button>
                    <Button variant="outline-danger" size="sm" onClick={() => eliminar(f._id)}>
                      Eliminar
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      )}

      {/* Modal ver detalle */}
      <Modal show={!!facturaVerId} onHide={() => setFacturaVerId(null)} size="lg" centered>
        <Modal.Header closeButton className="bg-dark text-white">
          <Modal.Title>
            Factura {facturaVer?.numeroFactura} — {facturaVer?.cliente}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex gap-4 mb-3 text-muted small">
            <span><strong>Fecha:</strong> {formatearFecha(facturaVer?.fecha)}</span>
            <span><strong>Tipo:</strong> {facturaVer?.tipoFactura}</span>
            <span>
              <strong>Estado:</strong>{" "}
              <Badge
                bg={facturaVer?.estadoPago === "Pagada" ? "success" : "warning"}
                text={facturaVer?.estadoPago === "Pagada" ? undefined : "dark"}
              >
                {facturaVer?.estadoPago}
              </Badge>
            </span>
          </div>
          <Table bordered size="sm" className="text-center align-middle">
            <thead className="table-dark">
              <tr>
                <th>N° Remito</th>
                <th>Fecha</th>
                <th>Obra</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {(facturaVer?.remitos || []).map((r) => (
                <tr key={r._id}>
                  <td>{r.remito}</td>
                  <td>{formatearFecha(r.fecha)}</td>
                  <td>{r.obra?.nombreobra}</td>
                  <td>{formatoMoneda(calcularTotalRemito(r.items))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="text-end">Subtotal:</td>
                <td>{formatoMoneda(subtotal)}</td>
              </tr>
              <tr>
                <td colSpan={3} className="text-end">IVA {ivaRateVer === 0 ? "0%" : "21%"}:</td>
                <td>{formatoMoneda(subtotal * ivaRateVer)}</td>
              </tr>
              <tr>
                <td colSpan={3} className="text-end fw-bold">Total + IVA:</td>
                <td className="fw-bold">{formatoMoneda(subtotal * (1 + ivaRateVer))}</td>
              </tr>
            </tfoot>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setFacturaVerId(null)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal editar factura */}
      <Modal show={!!facturaEditar} onHide={() => setFacturaEditar(null)} centered>
        <Modal.Header closeButton className="bg-dark text-white">
          <Modal.Title>Editar Factura</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit(guardarEdicion)}>
          <Modal.Body>
            <Row className="mb-3">
              <Col md={6}>
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
              <Col md={6}>
                <Form.Group>
                  <Form.Label>N° Factura</Form.Label>
                  <Form.Control
                    type="text"
                    {...register("numeroFactura", { required: true })}
                    isInvalid={!!errors.numeroFactura}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row className="mb-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Tipo de Factura</Form.Label>
                  <Form.Select {...register("tipoFactura", { required: true })} isInvalid={!!errors.tipoFactura}>
                    <option value="">Seleccionar...</option>
                    <option>Factura A</option>
                    <option>Factura X</option>
                    <option>Nota de Crédito</option>
                    <option>Nota de Débito</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setFacturaEditar(null)}>Cancelar</Button>
            <Button variant="dark" type="submit">Guardar</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default FacturacionCliente;
