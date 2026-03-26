import React, { useState, useEffect } from "react";
import { Table, Button, Container, Form, Spinner, Row, Col } from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import { listarAceites, editarCompraAPI, borrarCompraAPI } from "../../../../../helpers/queriesAceites";
import AceiteCompraModal from "./AceiteCompraModal";

const AceiteTablaCompra = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [aceites, setAceites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState(searchParams.get("tipo") || "");

  const [showEditModal, setShowEditModal] = useState(false);
  const [compraAEditar, setCompraAEditar] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const resp = await listarAceites();
      if (resp?.ok) setAceites(await resp.json());
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  // Aplanar solo los movimientos de INGRESO (compras)
  const compras = [];
  aceites.forEach((aceite) => {
    (aceite.movimientos || []).forEach((mov) => {
      if (mov.tipoMov === "INGRESO") {
        compras.push({ ...mov, tipoAceite: aceite.tipo, aceiteId: aceite._id });
      }
    });
  });

  // Ordenar por fecha más reciente primero
  compras.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  // Filtro de búsqueda
  const busq = busqueda.toLowerCase().trim();
  const filtradas = compras.filter((c) =>
    (c.tipoAceite || "").toLowerCase().includes(busq) ||
    (c.proveedor || "").toLowerCase().includes(busq)
  );

  const formatoMiles = (valor) => {
    if (valor === undefined || valor === null) return "-";
    return new Intl.NumberFormat("es-AR").format(valor);
  };

  // --- EDITAR ---
  const abrirEditar = (compra) => {
    setCompraAEditar(compra);
    setShowEditModal(true);
  };

  const handleEditar = async (datos) => {
    try {
      const resp = await editarCompraAPI(compraAEditar.aceiteId, compraAEditar._id, datos);
      if (resp?.ok) {
        Swal.fire({ icon: "success", title: "Compra actualizada", timer: 2000, showConfirmButton: false });
        setShowEditModal(false);
        setCompraAEditar(null);
        cargarDatos();
      } else {
        Swal.fire("Error", "No se pudo actualizar", "error");
      }
    } catch (error) {
      Swal.fire("Error", "Error de conexión", "error");
    }
  };

  // --- BORRAR ---
  const handleBorrar = async (compra) => {
    const result = await Swal.fire({
      title: "¿Borrar esta compra?",
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: 'swal-btn-danger' },
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    });
    if (result.isConfirmed) {
      const resp = await borrarCompraAPI(compra.aceiteId, compra._id);
      if (resp?.ok) {
        Swal.fire({ icon: "success", title: "Compra eliminada", timer: 2000, showConfirmButton: false });
        cargarDatos();
      } else {
        Swal.fire("Error", "No se pudo eliminar", "error");
      }
    }
  };

  if (loading) return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <Container className="my-3" fluid>
      <div className="text-center">
        <h4>Compras de Aceite</h4>
      </div>

      <Row className="align-items-center mb-3">
        <Col xs={12} md={4}>
          <Form.Control
            type="search"
            placeholder="Buscar por tipo de aceite o proveedor..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </Col>
        <Col xs={12} md={8} className="d-flex justify-content-end gap-2 mt-3 mt-md-0">
          {busqueda && <Button variant="outline-warning" onClick={() => setBusqueda("")}>Ver todas las compras</Button>}
          <Button variant="outline-success" onClick={() => navigate(-1)} className="px-4">Volver</Button>
        </Col>
      </Row>

      <Row className="justify-content-center">
        <Col xs={12}>
          <div className="table-responsive shadow-sm rounded">
            <Table striped bordered hover className="text-center align-middle mb-0" size="sm">
              <thead className="table-dark">
                <tr>
                  <th>Fecha</th>
                  <th>Proveedor</th>
                  <th>Tipo de Aceite</th>
                  <th>Marca</th>
                  <th>Cantidad (Lts)</th>
                  <th>Precio ($)</th>
                  <th>$/Lts</th>
                  <th>Observaciones</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 ? (
                  <tr><td colSpan="9" className="py-3">No hay compras registradas</td></tr>
                ) : (
                  filtradas.map((c, i) => (
                    <tr key={c._id || i}>
                      <td>{new Date(c.fecha).toLocaleDateString("es-AR")}</td>
                      <td>{c.proveedor || "-"}</td>
                      <td>{c.tipoAceite}</td>
                      <td>{c.marca || "-"}</td>
                      <td>{c.litros}</td>
                      <td>${formatoMiles(c.precio)}</td>
                      <td>{c.precio && c.litros ? `$${formatoMiles(Math.round(c.precio / c.litros))}` : "-"}</td>
                      <td>{c.observaciones || "-"}</td>
                      <td>
                        <div className="d-flex gap-1 justify-content-center">
                          <Button size="sm" variant="outline-warning" onClick={() => abrirEditar(c)}>Editar</Button>
                          <Button size="sm" variant="outline-danger" onClick={() => handleBorrar(c)}>Borrar</Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Col>
      </Row>

      <AceiteCompraModal
        show={showEditModal}
        onHide={() => { setShowEditModal(false); setCompraAEditar(null); }}
        onSubmit={handleEditar}
        editando={true}
        compra={compraAEditar}
      />
    </Container>
  );
};

export default AceiteTablaCompra;
