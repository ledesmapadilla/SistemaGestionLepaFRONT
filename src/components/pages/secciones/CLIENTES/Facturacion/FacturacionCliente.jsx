import { useState, useEffect } from "react";
import { Button, Table, Container, Spinner, Modal, Form, Row, Col } from "react-bootstrap";
import XLSXStyle from "xlsx-js-style";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { listarFacturas, editarFactura, borrarFactura } from "../../../../../helpers/queriesFacturas";

const hoy = new Date().toLocaleDateString("en-CA");

const formatoMoneda = (valor) => {
  if (valor === undefined || valor === null) return "-";
  return Number(valor).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
};

const formatearFecha = (fecha) => {
  if (!fecha) return "-";
  const p = fecha.split("-");
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : fecha;
};

const labelEstado = (e) => (e === "Pendiente" ? "Impaga" : e ?? "-");

const obrasDeFactura = (f) => {
  const nombres = [...new Set((f.remitos || []).map((r) => r.obra?.nombreobra).filter(Boolean))];
  return nombres.join(", ") || "-";
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
  const [filtroNumero, setFiltroNumero] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Pendiente");
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
      title: "¿Borrar factura?",
      text: "Los remitos volverán a estado 'sin facturar'",
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: "swal-btn-danger" },
      confirmButtonText: "Sí, borrar",
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

  const exportarExcel = () => {
    const headers = ["N° Factura", "Fecha", "Cliente", "Obra", "Tipo", "Total (con iva)", "Estado"];
    const cols = ["A", "B", "C", "D", "E", "F", "G"];
    const currencyFmt = '"$"#,##0.00';
    const centerAlign = { horizontal: "center", vertical: "center" };
    const leftAlign = { horizontal: "left", vertical: "center" };

    const filas = facturasFiltradas.map((f) => [
      f.numeroFactura,
      formatearFecha(f.fecha),
      f.cliente,
      obrasDeFactura(f),
      f.tipoFactura,
      f.tipoFactura === "Factura X" ? f.total : f.total * 1.21,
      labelEstado(f.estadoPago),
    ]);

    const ws = {};
    ws["A1"] = { v: "LISTADO DE FACTURAS", t: "s", s: { font: { bold: true, sz: 14 }, alignment: leftAlign } };

    headers.forEach((h, i) => {
      ws[`${cols[i]}3`] = { v: h, t: "s", s: { font: { bold: true }, alignment: centerAlign } };
    });

    filas.forEach((fila, rowIdx) => {
      fila.forEach((val, colIdx) => {
        const isCurrency = colIdx === 5 && typeof val === "number";
        ws[`${cols[colIdx]}${rowIdx + 4}`] = {
          v: val ?? "-",
          t: isCurrency ? "n" : typeof val === "number" ? "n" : "s",
          s: { alignment: centerAlign, ...(isCurrency ? { numFmt: currencyFmt } : {}) },
          ...(isCurrency ? { z: currencyFmt } : {}),
        };
      });
    });

    ws["!ref"] = `A1:G${filas.length + 3}`;
    ws["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 28 }, { wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 12 }];

    const libro = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(libro, ws, "Facturas");
    XLSXStyle.writeFile(libro, "Listado_Facturas.xlsx");
  };

  const estiloX = {
    position: "absolute", right: "10px", top: "50%",
    transform: "translateY(-50%)", cursor: "pointer",
    color: "#fff", fontSize: "14px", fontWeight: "900",
    zIndex: 5, userSelect: "none",
  };
  const selectActivo = { backgroundImage: "none" };

  const clientesUnicos = [...new Set(facturas.map((f) => f.cliente).filter(Boolean))].sort();

  const facturasFiltradas = facturas.filter((f) => {
    const coincideNumero = filtroNumero === "" || f.numeroFactura?.toString().includes(filtroNumero);
    const coincideCliente = filtroCliente === "" || f.cliente === filtroCliente;
    const coincideEstado = filtroEstado === "" || f.estadoPago === filtroEstado;
    return coincideNumero && coincideCliente && coincideEstado;
  });

  const subtotal = facturaVer
    ? (facturaVer.remitos || []).reduce((sum, r) => sum + calcularTotalRemito(r.items), 0)
    : 0;
  const ivaRateVer = facturaVer?.tipoFactura === "Factura X" ? 0 : 0.21;

  return (
    <Container className="py-4">
      <h6 className="text-center mb-2">Listado de facturas <small className="text-muted">(iva incluido)</small></h6>
      <div className="d-flex justify-content-end align-items-center mb-3">
        <div className="d-flex gap-2">
          <Button variant="outline-light" onClick={exportarExcel}>Excel</Button>
          <Button variant="outline-success" onClick={() => navigate(-1)}>Volver</Button>
          <Button variant="outline-primary" onClick={() => navigate("/facturacion/nueva")}>Nueva Factura</Button>
        </div>
      </div>

      <div className="d-flex gap-3 mb-3">
        <Form.Select
          value={filtroNumero}
          onChange={(e) => setFiltroNumero(e.target.value)}
          style={{ maxWidth: "180px" }}
        >
          <option value="">Todos los N°</option>
          {[...new Set(facturas.map((f) => f.numeroFactura).filter(Boolean))].sort().map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </Form.Select>
        <Form.Select
          value={filtroCliente}
          onChange={(e) => setFiltroCliente(e.target.value)}
          style={{ maxWidth: "250px" }}
        >
          <option value="">Todos los clientes</option>
          {clientesUnicos.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Form.Select>
        <div style={{ position: "relative", width: "180px" }}>
          <Form.Select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            style={filtroEstado ? selectActivo : {}}
          >
            <option value="">Todos los estados</option>
            <option value="Pendiente">Impaga</option>
            <option value="Pagada">Pagada</option>
          </Form.Select>
          {filtroEstado && (
            <span onClick={() => setFiltroEstado("")} style={estiloX}>✕</span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <Table striped bordered hover className="text-center align-middle">
          <thead className="table-dark">
            <tr>
              <th>Nro</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Obra</th>
              <th>Tipo</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {facturasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-muted py-3">
                  Sin facturas cargadas
                </td>
              </tr>
            ) : (
              facturasFiltradas.map((f) => (
                <tr key={f._id}>
                  <td>{f.numeroFactura}</td>
                  <td>{formatearFecha(f.fecha)}</td>
                  <td>{f.cliente}</td>
                  <td className="text-muted">{obrasDeFactura(f)}</td>
                  <td>{f.tipoFactura}</td>
                  <td>{formatoMoneda(f.tipoFactura === "Factura X" ? f.total : f.total * 1.21)}</td>
                  <td>{labelEstado(f.estadoPago)}</td>
                  <td className="d-flex gap-1 justify-content-center align-items-center">
                    <Button variant="outline-success" size="sm" onClick={() => setFacturaVerId(f._id)}>Ver</Button>
                    <Button variant="outline-warning" size="sm" onClick={() => abrirEditar(f)}>Editar</Button>
                    <Button variant="outline-danger" size="sm" onClick={() => eliminar(f._id)}>Borrar</Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      )}

      {/* Modal ver detalle */}
      <Modal show={!!facturaVerId} onHide={() => setFacturaVerId(null)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            Factura {facturaVer?.numeroFactura} — {facturaVer?.cliente}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex gap-4 mb-3 text-muted small">
            <span><strong>Fecha:</strong> {formatearFecha(facturaVer?.fecha)}</span>
            <span><strong>Tipo:</strong> {facturaVer?.tipoFactura}</span>
            <span><strong>Estado:</strong> {labelEstado(facturaVer?.estadoPago)}</span>
          </div>
          <Table striped bordered hover className="text-center align-middle">
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
                  <td className="text-muted" title={r.obra?.nombreobra}>{r.obra?.nombreobra}</td>
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
          <Button variant="outline-secondary" onClick={() => setFacturaVerId(null)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal editar factura */}
      <Modal show={!!facturaEditar} onHide={() => setFacturaEditar(null)} centered>
        <Modal.Header closeButton>
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
            <Button variant="outline-secondary" onClick={() => setFacturaEditar(null)}>Cancelar</Button>
            <Button variant="outline-success" type="submit">Guardar</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default FacturacionCliente;
