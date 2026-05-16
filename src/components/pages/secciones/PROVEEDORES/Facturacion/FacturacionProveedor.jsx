import { useState, useEffect } from "react";
import { Button, Table, Container, Spinner, Modal, Form, Row, Col } from "react-bootstrap";
import XLSXStyle from "xlsx-js-style";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  listarFacturasProveedores,
  editarFacturaProveedor,
  borrarFacturaProveedor,
} from "../../../../../helpers/queriesFacturasProveedores";
import { listarObras } from "../../../../../helpers/queriesObras";
import "../../../../../styles/clientes.css";

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

const FacturacionProveedor = () => {
  const navigate = useNavigate();
  const [facturas, setFacturas] = useState([]);
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [facturaVerId, setFacturaVerId] = useState(null);
  const facturaVer = facturas.find((f) => f._id === facturaVerId) || null;
  const [facturaEditar, setFacturaEditar] = useState(null);
  const [filtroNumero, setFiltroNumero] = useState("");
  const [filtroProveedor, setFiltroProveedor] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Pendiente");
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();
  const [editandoTotal, setEditandoTotal] = useState(false);
  const [inputTotal, setInputTotal] = useState("");

  useEffect(() => {
    cargarFacturas();
  }, []);

  const cargarFacturas = async () => {
    try {
      const [data, resObras] = await Promise.all([
        listarFacturasProveedores(),
        listarObras(),
      ]);
      setFacturas(data);
      const dataObras = resObras?.ok ? await resObras.json() : [];
      setObras(dataObras.filter((o) => o.estado === "En curso"));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const abrirEditar = (f) => {
    setFacturaEditar(f);
    reset({
      fecha: f.fecha,
      tipoFactura: f.tipoFactura,
      numeroFactura: f.numeroFactura,
      concepto: f.concepto,
      obra: f.obra || "",
      total: f.total,
    });
  };

  const guardarEdicion = async (data) => {
    const respuesta = await editarFacturaProveedor(facturaEditar._id, data);
    if (respuesta?.ok) {
      const resultado = await respuesta.json();
      setFacturas(facturas.map((f) =>
        f._id === facturaEditar._id ? { ...f, ...resultado.factura } : f
      ));
      setFacturaEditar(null);
      Swal.fire({ icon: "success", title: "Factura actualizada", timer: 2000, showConfirmButton: false });
    } else {
      Swal.fire({ icon: "error", title: "Error", text: "No se pudo actualizar la factura" });
    }
  };

  const eliminar = async (id) => {
    const result = await Swal.fire({
      title: "¿Borrar factura?",
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: "swal-btn-danger" },
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      const respuesta = await borrarFacturaProveedor(id);
      if (respuesta?.ok) {
        setFacturas(facturas.filter((f) => f._id !== id));
        Swal.fire({ icon: "success", title: "Factura eliminada", timer: 2000, showConfirmButton: false });
      }
    }
  };

  const exportarExcel = () => {
    const headers = ["N° Factura", "Fecha", "Proveedor", "Concepto", "Obra", "Tipo", "Total", "Estado"];
    const cols = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const currencyFmt = '"$"#,##0.00';
    const centerAlign = { horizontal: "center", vertical: "center" };
    const leftAlign = { horizontal: "left", vertical: "center" };

    const filas = facturasFiltradas.map((f) => [
      f.numeroFactura,
      formatearFecha(f.fecha),
      f.proveedor,
      f.concepto || "-",
      f.obra || "-",
      f.tipoFactura,
      f.total,
      labelEstado(f.estadoPago),
    ]);

    const ws = {};
    ws["A1"] = { v: "LISTADO DE FACTURAS — PROVEEDORES", t: "s", s: { font: { bold: true, sz: 14 }, alignment: leftAlign } };

    headers.forEach((h, i) => {
      ws[`${cols[i]}3`] = { v: h, t: "s", s: { font: { bold: true }, alignment: centerAlign } };
    });

    filas.forEach((fila, rowIdx) => {
      fila.forEach((val, colIdx) => {
        const isCurrency = colIdx === 6 && typeof val === "number";
        ws[`${cols[colIdx]}${rowIdx + 4}`] = {
          v: val ?? "-",
          t: isCurrency ? "n" : typeof val === "number" ? "n" : "s",
          s: { alignment: centerAlign, ...(isCurrency ? { numFmt: currencyFmt } : {}) },
          ...(isCurrency ? { z: currencyFmt } : {}),
        };
      });
    });

    ws["!ref"] = `A1:H${filas.length + 3}`;
    ws["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 28 }, { wch: 28 }, { wch: 28 }, { wch: 18 }, { wch: 16 }, { wch: 12 }];

    const libro = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(libro, ws, "Facturas Proveedores");
    XLSXStyle.writeFile(libro, "Listado_Facturas_Proveedores.xlsx");
  };

  const estiloX = {
    position: "absolute", right: "10px", top: "50%",
    transform: "translateY(-50%)", cursor: "pointer",
    color: "#fff", fontSize: "14px", fontWeight: "900",
    zIndex: 5, userSelect: "none",
  };
  const selectActivo = { backgroundImage: "none" };

  const proveedoresUnicos = [...new Set(facturas.map((f) => f.proveedor).filter(Boolean))].sort();

  const facturasFiltradas = facturas.filter((f) => {
    const coincideNumero = filtroNumero === "" || f.numeroFactura?.toString().includes(filtroNumero);
    const coincideProveedor = filtroProveedor === "" || f.proveedor === filtroProveedor;
    const coincideEstado = filtroEstado === "" || f.estadoPago === filtroEstado;
    return coincideNumero && coincideProveedor && coincideEstado;
  });

  return (
    <Container className="py-4">
      <h6 className="text-center mb-2">Facturación Proveedores <small className="text-muted">(iva incluido)</small></h6>
      <div className="d-flex justify-content-end align-items-center mb-3">
        <div className="d-flex gap-2">
          <Button variant="outline-light" onClick={exportarExcel}>Excel</Button>
          <Button variant="outline-success" onClick={() => navigate(-1)}>Volver</Button>
          <Button variant="outline-primary" onClick={() => navigate("/facturacion-proveedores/nueva")}>Nueva Factura</Button>
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
          value={filtroProveedor}
          onChange={(e) => setFiltroProveedor(e.target.value)}
          style={{ maxWidth: "250px" }}
        >
          <option value="">Todos los proveedores</option>
          {proveedoresUnicos.map((p) => (
            <option key={p} value={p}>{p}</option>
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
              <th>N° Factura</th>
              <th>Fecha</th>
              <th>Proveedor</th>
              <th>Concepto</th>
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
                <td colSpan={9} className="text-muted py-3">
                  Sin facturas cargadas
                </td>
              </tr>
            ) : (
              facturasFiltradas.map((f) => (
                <tr key={f._id}>
                  <td>{f.numeroFactura}</td>
                  <td>{formatearFecha(f.fecha)}</td>
                  <td>{f.proveedor}</td>
                  <td className="text-muted">{f.concepto || "-"}</td>
                  <td className="text-muted">{f.obra || "-"}</td>
                  <td>{f.tipoFactura}</td>
                  <td>{formatoMoneda(f.total)}</td>
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
      <Modal show={!!facturaVerId} onHide={() => setFacturaVerId(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            Factura {facturaVer?.numeroFactura} — {facturaVer?.proveedor}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex flex-column gap-2 text-muted small">
            <span><strong>Fecha:</strong> {formatearFecha(facturaVer?.fecha)}</span>
            <span><strong>Tipo:</strong> {facturaVer?.tipoFactura}</span>
            <span><strong>Concepto:</strong> {facturaVer?.concepto || "-"}</span>
            <span><strong>Obra:</strong> {facturaVer?.obra || "-"}</span>
            <span><strong>Total:</strong> {formatoMoneda(facturaVer?.total)}</span>
            <span><strong>Estado:</strong> {labelEstado(facturaVer?.estadoPago)}</span>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setFacturaVerId(null)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal editar */}
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
                    <option>Factura B</option>
                    <option>Factura C</option>
                    <option>Factura X</option>
                    <option>Nota de Crédito</option>
                    <option>Nota de Débito</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row className="mb-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Concepto</Form.Label>
                  <Form.Control
                    type="text"
                    {...register("concepto")}
                    placeholder="Descripción del servicio o producto"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row className="mb-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Obra a imputar</Form.Label>
                  <Form.Select {...register("obra")}>
                    <option value="">Sin imputar</option>
                    {obras.map((o) => (
                      <option key={o._id} value={o.nombreobra}>{o.nombreobra}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row className="mb-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Total</Form.Label>
                  <Form.Control
                    type="text"
                    value={editandoTotal ? inputTotal : formatoMoneda(watch("total") ?? 0)}
                    onFocus={() => { setEditandoTotal(true); setInputTotal(String(watch("total") ?? "")); }}
                    onChange={(e) => setInputTotal(e.target.value)}
                    onBlur={() => { setValue("total", parseFloat(inputTotal) || 0, { shouldValidate: true }); setEditandoTotal(false); }}
                    isInvalid={!!errors.total}
                  />
                  <input type="hidden" {...register("total", { required: true })} />
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

export default FacturacionProveedor;
