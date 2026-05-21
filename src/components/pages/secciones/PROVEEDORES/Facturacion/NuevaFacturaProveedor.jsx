import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button, Container, Form, Row, Col, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { crearFacturaProveedor, listarFacturasProveedores } from "../../../../../helpers/queriesFacturasProveedores";
import { listarProveedores } from "../../../../../helpers/queriesProveedores";
import { listarObras } from "../../../../../helpers/queriesObras";

const hoy = new Date().toLocaleDateString("en-CA");

const formatoMoneda = (valor) =>
  Number(valor).toLocaleString("es-AR", { style: "currency", currency: "ARS" });

const NuevaFacturaProveedor = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm();

  const [proveedores, setProveedores] = useState([]);
  const [obras, setObras] = useState([]);
  const [todasFacturas, setTodasFacturas] = useState([]);
  const [numerosExistentes, setNumerosExistentes] = useState([]);
  const [loadingDatos, setLoadingDatos] = useState(true);
  const [editandoTotal, setEditandoTotal] = useState(false);

  const tipoFactura = watch("tipoFactura");
  const totalRaw = watch("total");
  const ivaRate = (tipoFactura === "Factura X" || tipoFactura === "Factura B") ? 0 : 0.21;
  const totalConIvaNum = totalRaw ? parseFloat(String(totalRaw).replace(",", ".")) : 0;
  const totalSinIva = totalConIvaNum / (1 + ivaRate);

  register("total", { required: "El total es obligatorio", validate: (v) => parseFloat(String(v).replace(",", ".")) >= 0 || "Debe ser positivo" });

  useEffect(() => {
    const cargar = async () => {
      try {
        const [resProveedores, resObras, facturas] = await Promise.all([
          listarProveedores(),
          listarObras("?estado=En curso"),
          listarFacturasProveedores(),
        ]);
        const dataProveedores = resProveedores?.ok ? await resProveedores.json() : [];
        const dataObras = resObras?.ok ? await resObras.json() : [];
        setProveedores(dataProveedores);
        setObras(dataObras.filter((o) => o.estado === "En curso"));
        setTodasFacturas(facturas);
        setNumerosExistentes(facturas.map((f) => f.numeroFactura?.toString().trim()));
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingDatos(false);
      }
    };
    cargar();
  }, []);

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

  const onSubmit = async (data) => {
    const payload = {
      fecha: data.fecha,
      tipoFactura: data.tipoFactura,
      numeroFactura: data.numeroFactura,
      proveedor: data.proveedor,
      concepto: data.concepto || "",
      obra: data.obra || "",
      total: totalConIvaNum / (1 + ivaRate),
    };

    try {
      const respuesta = await crearFacturaProveedor(payload);
      if (respuesta?.ok) {
        Swal.fire({ icon: "success", title: "Factura creada", timer: 2000, showConfirmButton: false });
        navigate("/facturacion-proveedores");
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
        <h6 className="mb-0">Nueva Factura — Proveedor</h6>
        <Button variant="outline-success" onClick={() => navigate("/facturacion-proveedores")}>Volver</Button>
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
          <Col md={4}>
            <Form.Group>
              <Form.Label>Proveedor</Form.Label>
              <Form.Select
                {...register("proveedor", { required: "El proveedor es obligatorio" })}
                isInvalid={!!errors.proveedor}
              >
                <option value="">Seleccionar...</option>
                {proveedores.map((p) => (
                  <option key={p._id} value={p.razonsocial}>{p.razonsocial}</option>
                ))}
              </Form.Select>
              <Form.Text className="text-danger">{errors.proveedor?.message}</Form.Text>
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
                <option>Factura B</option>
                <option>Factura C</option>
                <option>Factura X</option>
                <option>Nota de Crédito</option>
                <option>Nota de Débito</option>
              </Form.Select>
              <Form.Text className="text-danger">{errors.tipoFactura?.message}</Form.Text>
            </Form.Group>
          </Col>
          <Col md={3}>
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
                    "Este número ya existe",
                })}
                isInvalid={!!errors.numeroFactura}
              />
              <Form.Text className="text-danger">{errors.numeroFactura?.message}</Form.Text>
            </Form.Group>
          </Col>
        </Row>

        <Row className="mb-3">
          <Col md={4}>
            <Form.Group>
              <Form.Label>Concepto</Form.Label>
              <Form.Control
                type="text"
                placeholder="Descripción del servicio o producto"
                {...register("concepto")}
              />
            </Form.Group>
          </Col>
          <Col md={4}>
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
          <Col md={2}>
            <Form.Group>
              <Form.Label>Total + iva ({ivaRate === 0 ? "0%" : "21%"})</Form.Label>
              <Form.Control
                type="text"
                placeholder="0.00"
                value={editandoTotal ? (totalRaw ?? "") : (totalRaw ? formatoMoneda(Number(totalRaw)) : "")}
                onFocus={() => setEditandoTotal(true)}
                onChange={(e) => setValue("total", e.target.value, { shouldValidate: true })}
                onBlur={() => setEditandoTotal(false)}
                onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                isInvalid={!!errors.total}
              />
              <Form.Text className="text-danger">{errors.total?.message}</Form.Text>
            </Form.Group>
          </Col>
          <Col md={2} className="d-flex flex-column justify-content-end">
            <Form.Group>
              <Form.Label>Total sin iva</Form.Label>
              <Form.Control
                type="text"
                readOnly
                className="text-muted"
                value={totalConIvaNum ? formatoMoneda(totalSinIva) : ""}
              />
            </Form.Group>
          </Col>
        </Row>

        <div className="d-flex justify-content-end gap-2 mt-3">
          <Button variant="outline-secondary" onClick={() => navigate("/facturacion-proveedores")}>Cancelar</Button>
          <Button type="submit" variant="outline-success">Guardar Factura</Button>
        </div>
      </Form>
    </Container>
  );
};

export default NuevaFacturaProveedor;
