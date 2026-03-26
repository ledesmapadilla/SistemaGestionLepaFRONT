import React, { useState, useEffect } from "react";
import { Table, Button, Container, Spinner, Row, Col, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import { listarAceites, registrarCompraAPI, registrarConsumoAPI, borrarAceite, editarCompraAPI, borrarCompraAPI } from "../../../../../helpers/queriesAceites";
import { listarMaquinas } from "../../../../../helpers/queriesMaquinas";
import { listarObras } from "../../../../../helpers/queriesObras";

import AceiteCompraModal from "./AceiteCompraModal";
import AceiteConsumoModal from "./AceiteConsumoModal";

const AceiteTabla = () => {
  const navigate = useNavigate();
  const [aceites, setAceites] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCompraModal, setShowCompraModal] = useState(false);
  const [showConsumoModal, setShowConsumoModal] = useState(false);
  const [showEditConsumoModal, setShowEditConsumoModal] = useState(false);
  const [consumoAEditar, setConsumoAEditar] = useState(null);

  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroMaquina, setFiltroMaquina] = useState("");
  const [filtroRS, setFiltroRS] = useState("");
  const [filtroObra, setFiltroObra] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [respAceites, respMaquinas, respObras] = await Promise.all([
        listarAceites(),
        listarMaquinas(),
        listarObras()
      ]);
      if (respAceites?.ok) setAceites(await respAceites.json());
      if (respMaquinas?.ok) setMaquinas(await respMaquinas.json());
      if (respObras?.ok) setObras(await respObras.json());
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calcular saldo por tipo de aceite
  const resumen = aceites.map((aceite) => {
    let saldo = 0;
    (aceite.movimientos || []).forEach((mov) => {
      if (mov.tipoMov === "INGRESO") {
        saldo += mov.litros;
      } else {
        saldo -= mov.litros;
      }
    });
    return { _id: aceite._id, tipo: aceite.tipo, saldo };
  });

  // Aplanar consumos (SALIDA)
  const consumos = [];
  aceites.forEach((aceite) => {
    (aceite.movimientos || []).forEach((mov) => {
      if (mov.tipoMov === "SALIDA") {
        consumos.push({ ...mov, tipoAceite: aceite.tipo, aceiteId: aceite._id });
      }
    });
  });
  consumos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  // Listas únicas para filtros
  const tiposUnicos = [...new Set(consumos.map((c) => c.tipoAceite))];
  const maquinasUnicas = [...new Set(consumos.map((c) => c.maquina).filter(Boolean))];
  const obrasUnicas = [...new Set(consumos.map((c) => c.obra).filter(Boolean))];
  const rsUnicas = [...new Set(
    consumos.map((c) => obras.find((o) => o.nombreobra === c.obra)?.razonsocial).filter(Boolean)
  )];

  // Filtrar consumos
  const consumosFiltrados = consumos.filter((c) => {
    if (filtroTipo && c.tipoAceite !== filtroTipo) return false;
    if (filtroMaquina && c.maquina !== filtroMaquina) return false;
    if (filtroObra && c.obra !== filtroObra) return false;
    if (filtroRS) {
      const rs = obras.find((o) => o.nombreobra === c.obra)?.razonsocial || "";
      if (rs !== filtroRS) return false;
    }
    return true;
  });

  // --- COMPRA ---
  const handleCompra = async (datos) => {
    try {
      // Buscar el aceite que coincida con el tipo seleccionado
      const aceite = aceites.find((a) => a.tipo === datos.tipoAceite);
      if (!aceite) {
        Swal.fire("Error", "No se encontró el tipo de aceite", "error");
        return;
      }
      const resp = await registrarCompraAPI(aceite._id, datos);
      if (resp?.ok) {
        Swal.fire({ icon: "success", title: "Compra registrada", timer: 2000, showConfirmButton: false });
        setShowCompraModal(false);
        cargarDatos();
      } else {
        const err = await resp.json();
        Swal.fire("Error", err.msg || "No se pudo registrar", "error");
      }
    } catch (error) {
      Swal.fire("Error", "Error de conexión", "error");
    }
  };

  // --- CONSUMO ---
  const handleConsumo = async (datos) => {
    try {
      const aceite = aceites.find((a) => a.tipo === datos.tipoAceite);
      if (!aceite) {
        Swal.fire("Error", "No se encontró el tipo de aceite", "error");
        return;
      }
      const resp = await registrarConsumoAPI(aceite._id, datos);
      if (resp?.ok) {
        Swal.fire({ icon: "success", title: "Consumo registrado", timer: 2000, showConfirmButton: false });
        setShowConsumoModal(false);
        cargarDatos();
      } else {
        const err = await resp.json();
        Swal.fire("Error", err.msg || "No se pudo registrar", "error");
      }
    } catch (error) {
      Swal.fire("Error", "Error de conexión", "error");
    }
  };

  // --- BORRAR ---
  const handleBorrar = async (id) => {
    const result = await Swal.fire({
      title: "¿Borrar aceite?",
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: 'swal-btn-danger' },
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    });
    if (result.isConfirmed) {
      const resp = await borrarAceite(id);
      if (resp?.ok) {
        Swal.fire({ icon: "success", title: "Aceite borrado", timer: 2000, showConfirmButton: false });
        cargarDatos();
      } else {
        Swal.fire("Error", "No se pudo eliminar", "error");
      }
    }
  };

  // --- VER CONSUMO ---
  const handleVerConsumo = (c) => {
    Swal.fire({
      title: "Detalle del Consumo",
      html: `
        <div style="text-align:left">
          <p><b>Fecha:</b> ${new Date(c.fecha).toLocaleDateString("es-AR")}</p>
          <p><b>Tipo de Aceite:</b> ${c.tipoAceite}</p>
          <p><b>Litros:</b> ${c.litros}</p>
          <p><b>Máquina:</b> ${c.maquina || "-"}</p>
          <p><b>Obra:</b> ${c.obra || "-"}</p>
          <p><b>Observaciones:</b> ${c.observaciones || "-"}</p>
        </div>
      `,
      confirmButtonText: "Cerrar",
      confirmButtonColor: "#198754",
    });
  };

  // --- EDITAR CONSUMO ---
  const abrirEditarConsumo = (c) => {
    setConsumoAEditar(c);
    setShowEditConsumoModal(true);
  };

  const handleEditarConsumo = async (datos) => {
    try {
      const resp = await editarCompraAPI(consumoAEditar.aceiteId, consumoAEditar._id, {
        fecha: datos.fecha,
        cantidad: datos.litros,
        maquina: datos.maquina,
        obra: datos.obra,
        observaciones: datos.observaciones,
      });
      if (resp?.ok) {
        Swal.fire({ icon: "success", title: "Consumo actualizado", timer: 2000, showConfirmButton: false });
        setShowEditConsumoModal(false);
        setConsumoAEditar(null);
        cargarDatos();
      } else {
        Swal.fire("Error", "No se pudo actualizar", "error");
      }
    } catch (error) {
      Swal.fire("Error", "Error de conexión", "error");
    }
  };

  // --- BORRAR CONSUMO ---
  const handleBorrarConsumo = async (c) => {
    const result = await Swal.fire({
      title: "¿Borrar este consumo?",
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: 'swal-btn-danger' },
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    });
    if (result.isConfirmed) {
      const resp = await borrarCompraAPI(c.aceiteId, c._id);
      if (resp?.ok) {
        Swal.fire({ icon: "success", title: "Consumo borrado", timer: 2000, showConfirmButton: false });
        cargarDatos();
      } else {
        Swal.fire("Error", "No se pudo borrar", "error");
      }
    }
  };

  if (loading) return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <Container className="my-3" fluid>
      <div className="text-center">
        <h4>Movimientos de Aceites</h4>
      </div>

      <Row className="align-items-center mb-3">
        <Col xs={12} className="d-flex justify-content-between mt-3 mt-md-0">
          <div className="d-flex gap-2">
            <Button variant="outline-primary" onClick={() => setShowCompraModal(true)}>Compra de Aceite</Button>
            <Button variant="outline-danger" onClick={() => setShowConsumoModal(true)}>Consumo de Aceite</Button>
          </div>
          <Button variant="outline-success" onClick={() => navigate(-1)} className="px-4">Volver</Button>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col xs={12} md={3}>
          <div className="position-relative">
            <Form.Select size="sm" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} style={filtroTipo ? { backgroundImage: "none" } : {}}>
              <option value="">Tipo de Aceite (todos)</option>
              {tiposUnicos.map((t) => <option key={t} value={t}>{t}</option>)}
            </Form.Select>
            {filtroTipo && <button type="button" className="btn btn-sm text-warning position-absolute top-50 translate-middle-y end-0 me-1 p-0 border-0 fw-bold" aria-label="Limpiar" onClick={() => setFiltroTipo("")}>✕</button>}
          </div>
        </Col>
        <Col xs={12} md={3} className="mt-2 mt-md-0">
          <div className="position-relative">
            <Form.Select size="sm" value={filtroMaquina} onChange={(e) => setFiltroMaquina(e.target.value)} style={filtroMaquina ? { backgroundImage: "none" } : {}}>
              <option value="">Máquina (todas)</option>
              {maquinasUnicas.map((m) => <option key={m} value={m}>{m}</option>)}
            </Form.Select>
            {filtroMaquina && <button type="button" className="btn btn-sm text-warning position-absolute top-50 translate-middle-y end-0 me-1 p-0 border-0 fw-bold" aria-label="Limpiar" onClick={() => setFiltroMaquina("")}>✕</button>}
          </div>
        </Col>
        <Col xs={12} md={3} className="mt-2 mt-md-0">
          <div className="position-relative">
            <Form.Select size="sm" value={filtroRS} onChange={(e) => setFiltroRS(e.target.value)} style={filtroRS ? { backgroundImage: "none" } : {}}>
              <option value="">Razón Social (todas)</option>
              {rsUnicas.map((rs) => <option key={rs} value={rs}>{rs}</option>)}
            </Form.Select>
            {filtroRS && <button type="button" className="btn btn-sm text-warning position-absolute top-50 translate-middle-y end-0 me-1 p-0 border-0 fw-bold" aria-label="Limpiar" onClick={() => setFiltroRS("")}>✕</button>}
          </div>
        </Col>
        <Col xs={12} md={3} className="mt-2 mt-md-0">
          <div className="position-relative">
            <Form.Select size="sm" value={filtroObra} onChange={(e) => setFiltroObra(e.target.value)} style={filtroObra ? { backgroundImage: "none" } : {}}>
              <option value="">Obra (todas)</option>
              {obrasUnicas.map((o) => <option key={o} value={o}>{o}</option>)}
            </Form.Select>
            {filtroObra && <button type="button" className="btn btn-sm text-warning position-absolute top-50 translate-middle-y end-0 me-1 p-0 border-0 fw-bold" aria-label="Limpiar" onClick={() => setFiltroObra("")}>✕</button>}
          </div>
        </Col>
      </Row>

      <Row className="justify-content-center">
        <Col xs={12}>
          <div className="table-responsive shadow-sm rounded">
            <Table striped bordered hover className="text-center align-middle mb-0" size="sm">
              <thead className="table-dark">
                <tr>
                  <th>Fecha</th>
                  <th>Tipo Aceite</th>
                  <th>Litros</th>
                  <th>Máquina</th>
                  <th>Obra</th>
                  <th>Razón Social</th>
                  <th>STOCK</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {resumen.length === 0 && consumosFiltrados.length === 0 ? (
                  <tr><td colSpan="8" className="py-3">No hay movimientos registrados</td></tr>
                ) : (
                  <>
                    {resumen.map((item) => (
                      <tr key={item._id}>
                        <td>-</td>
                        <td className="text-start text-success fw-bold">Stock {item.tipo}</td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                        <td className="fw-bold">{item.saldo}</td>
                        <td>
                          <Button size="sm" variant="outline-primary" onClick={() => navigate(`/compras-aceites?tipo=${encodeURIComponent(item.tipo)}`)}>Ver detalle de compra</Button>
                        </td>
                      </tr>
                    ))}
                    {consumosFiltrados.map((c, i) => (
                      <tr key={c._id || i}>
                        <td>{new Date(c.fecha).toLocaleDateString("es-AR")}</td>
                        <td>{c.tipoAceite}</td>
                        <td>{c.litros}</td>
                        <td>{c.maquina || "-"}</td>
                        <td>{c.obra || "-"}</td>
                        <td>{obras.find((o) => o.nombreobra === c.obra)?.razonsocial || "-"}</td>
                        <td>-</td>
                        <td>
                          <div className="d-flex gap-1 justify-content-center">
                            <Button size="sm" variant="outline-primary" onClick={() => handleVerConsumo(c)}>Ver</Button>
                            <Button size="sm" variant="outline-warning" onClick={() => abrirEditarConsumo(c)}>Editar</Button>
                            <Button size="sm" variant="outline-danger" onClick={() => handleBorrarConsumo(c)}>Borrar</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </Table>
          </div>
        </Col>
      </Row>

      <AceiteCompraModal
        show={showCompraModal}
        onHide={() => setShowCompraModal(false)}
        onSubmit={handleCompra}
      />

      <AceiteConsumoModal
        show={showConsumoModal}
        onHide={() => setShowConsumoModal(false)}
        onSubmit={handleConsumo}
      />

      <AceiteConsumoModal
        show={showEditConsumoModal}
        onHide={() => { setShowEditConsumoModal(false); setConsumoAEditar(null); }}
        onSubmit={handleEditarConsumo}
        editando={true}
        consumo={consumoAEditar}
      />
    </Container>
  );
};

export default AceiteTabla;
