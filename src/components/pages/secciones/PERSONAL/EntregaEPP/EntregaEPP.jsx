import { useState, useEffect } from "react";
import { Container, Table, Button, Spinner, Form, Badge, Modal } from "react-bootstrap";
import { listarPersonal } from "../../../../../helpers/queriesPersonal.js";
import { registrarEntregaEPP } from "../../../../../helpers/queriesEntregaEPP.js";
import Swal from "sweetalert2";
import "../../../../../styles/clientes.css";

const EntregaEPP = () => {
  const [personal, setPersonal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");

  // Estados para el modal de Nueva Entrega
  const [showNuevaEntregaModal, setShowNuevaEntregaModal] = useState(false);
  const [personalSeleccionado, setPersonalSeleccionado] = useState("");
  const [formNuevaEntrega, setFormNuevaEntrega] = useState({
    fecha: new Date().toLocaleDateString("en-CA"), // YYYY-MM-DD local
    observaciones: ""
  });
  const [eppRows, setEppRows] = useState([
    { epp: "camisa", label: "Camisa", seleccionado: false, talle: "", cantidad: 1 },
    { epp: "pantalon", label: "Pantalón", seleccionado: false, talle: "", cantidad: 1 },
    { epp: "botines", label: "Botines", seleccionado: false, talle: "", cantidad: 1 },
    { epp: "otros", label: "Otros", seleccionado: false, talle: "", cantidad: 1 }
  ]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const cargarPersonal = async () => {
      setLoading(true);
      try {
        const response = await listarPersonal();
        if (response && response.ok) {
          const data = await response.json();
          // Ordenar alfabéticamente por nombre
          const ordenado = (data || []).sort((a, b) =>
            a.nombre.localeCompare(b.nombre)
          );
          setPersonal(ordenado);
        } else {
          setPersonal([]);
        }
      } catch (error) {
        console.error("Error cargando personal para EPP:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudo cargar la lista de personal.",
        });
      } finally {
        setLoading(false);
      }
    };

    cargarPersonal();
  }, []);

  const handleHistorial = (nombre) => {
    Swal.fire({
      title: `Historial de EPP - ${nombre}`,
      text: "Sección en desarrollo. Aquí se mostrará el historial de entregas.",
      icon: "info",
      confirmButtonColor: "#3085d6",
    });
  };

  const handleAbrirNuevaEntrega = (nombre) => {
    setPersonalSeleccionado(nombre);
    setFormNuevaEntrega({
      fecha: new Date().toLocaleDateString("en-CA"),
      observaciones: ""
    });
    setEppRows([
      { epp: "camisa", label: "Camisa", seleccionado: false, talle: "", cantidad: 1 },
      { epp: "pantalon", label: "Pantalón", seleccionado: false, talle: "", cantidad: 1 },
      { epp: "botines", label: "Botines", seleccionado: false, talle: "", cantidad: 1 },
      { epp: "otros", label: "Otros", seleccionado: false, talle: "", cantidad: 1 }
    ]);
    setShowNuevaEntregaModal(true);
  };

  const handleToggleRow = (idx) => {
    setEppRows((prev) =>
      prev.map((row, i) =>
        i === idx ? { ...row, seleccionado: !row.seleccionado } : row
      )
    );
  };

  const handleRowChange = (idx, field, value) => {
    setEppRows((prev) =>
      prev.map((row, i) =>
        i === idx ? { ...row, [field]: value } : row
      )
    );
  };

  const handleSubmitNuevaEntrega = async (e) => {
    e.preventDefault();

    const seleccionados = eppRows.filter((r) => r.seleccionado);
    if (seleccionados.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Atención",
        text: "Debe seleccionar al menos un elemento para entregar.",
      });
      return;
    }

    // Validar cantidad
    for (const item of seleccionados) {
      if (!item.cantidad || item.cantidad < 1) {
        Swal.fire({
          icon: "warning",
          title: "Atención",
          text: `La cantidad para ${item.label} debe ser al menos 1.`,
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = seleccionados.map((item) => ({
        personal: personalSeleccionado,
        fecha: formNuevaEntrega.fecha,
        epp: item.epp,
        talle: item.talle || "",
        cantidad: item.cantidad,
        observaciones: formNuevaEntrega.observaciones || ""
      }));

      const response = await registrarEntregaEPP(payload);

      if (response && response.ok) {
        Swal.fire({
          icon: "success",
          title: "Entrega registrada",
          text: `Se registraron las entregas de EPP para ${personalSeleccionado} correctamente.`,
          timer: 2200,
          showConfirmButton: false,
        });
        setShowNuevaEntregaModal(false);
      } else {
        const errorData = await response?.json().catch(() => null);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: errorData?.msg || "No se pudo registrar la entrega de EPP.",
        });
      }
    } catch (error) {
      console.error("Error al registrar entrega de EPP:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Ocurrió un error inesperado al registrar la entrega.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const personalFiltrado = personal.filter((p) =>
    (p.nombre || "").toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <Container className="mt-4 w-75">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Entrega de EPP <small className="text-muted" style={{ fontSize: "1rem", fontWeight: 400 }}>Control de Elementos de Protección Personal</small></h2>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="position-relative" style={{ width: "300px" }}>
          <Form.Control
            size="sm"
            type="text"
            placeholder="Buscar por nombre..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            style={{ paddingRight: "30px" }}
          />
          {filtro && (
            <button
              type="button"
              className="btn btn-sm text-warning position-absolute top-50 translate-middle-y end-0 me-2 p-0 border-0 fw-bold"
              aria-label="Limpiar"
              onClick={() => setFiltro("")}
            >
              ✕
            </button>
          )}
        </div>
        <div className="text-muted" style={{ fontSize: "0.9rem" }}>
          Total: {personalFiltrado.length} personas
        </div>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center my-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "65vh" }}>
          <Table striped bordered hover size="sm" className="text-center align-middle mb-0">
            <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
              <tr>
                <th style={{ minWidth: "250px" }}>Personal</th>
                <th style={{ minWidth: "120px" }}>Estado</th>
                <th style={{ minWidth: "220px" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {personalFiltrado.map((p) => (
                <tr key={p._id}>
                  <td className="text-start fw-semibold ps-3">
                    {p.nombre}
                  </td>
                  <td>
                    {p.activo !== false ? (
                      <Badge bg="success">Activo</Badge>
                    ) : (
                      <Badge bg="danger">Inactivo</Badge>
                    )}
                  </td>
                  <td>
                    <div className="d-flex gap-2 justify-content-center align-items-center">
                      <Button
                        variant="outline-info"
                        size="sm"
                        onClick={() => handleHistorial(p.nombre)}
                      >
                        Historial
                      </Button>
                      <Button
                        variant="outline-success"
                        size="sm"
                        onClick={() => handleAbrirNuevaEntrega(p.nombre)}
                      >
                        Nueva Entrega
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {personalFiltrado.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-muted py-3">
                    No se encontró personal que coincida con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      )}

      {/* Modal para Nueva Entrega de EPP */}
      <Modal show={showNuevaEntregaModal} onHide={() => !submitting && setShowNuevaEntregaModal(false)} size="lg" centered>
        <Modal.Header closeButton={!submitting}>
          <Modal.Title style={{ fontSize: "1.2rem" }}>Nueva Entrega de EPP - {personalSeleccionado}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitNuevaEntrega}>
          <Modal.Body>
            <Form.Group className="mb-3" controlId="fecha">
              <Form.Label style={{ fontSize: "0.9rem", fontWeight: 600 }}>Fecha de Entrega</Form.Label>
              <Form.Control
                type="date"
                required
                value={formNuevaEntrega.fecha}
                onChange={(e) => setFormNuevaEntrega({ ...formNuevaEntrega, fecha: e.target.value })}
                disabled={submitting}
              />
            </Form.Group>

            <Form.Label style={{ fontSize: "0.9rem", fontWeight: 600, display: "block" }}>Elementos a Entregar</Form.Label>
            <div className="table-responsive mb-3" style={{ border: "1px solid #495057", borderRadius: "4px" }}>
              <Table striped bordered hover size="sm" className="text-center align-middle mb-0" style={{ background: "#212529" }}>
                <thead className="table-dark">
                  <tr>
                    <th style={{ width: "60px" }}>Entregar</th>
                    <th>Elemento</th>
                    <th>Talle</th>
                    <th style={{ width: "100px" }}>Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {eppRows.map((row, idx) => (
                    <tr key={row.epp}>
                      <td>
                        <span
                          onClick={() => !submitting && handleToggleRow(idx)}
                          style={{
                            cursor: submitting ? "default" : "pointer",
                            fontSize: 20,
                            color: row.seleccionado ? "#198754" : "#495057",
                            userSelect: "none",
                            lineHeight: 1
                          }}
                        >
                          ●
                        </span>
                      </td>
                      <td className="text-start fw-semibold ps-3" style={{ color: row.seleccionado ? "#dee2e6" : "#6c757d" }}>
                        {row.label}
                      </td>
                      <td>
                        <Form.Control
                          size="sm"
                          type="text"
                          placeholder="Talle..."
                          disabled={!row.seleccionado || submitting}
                          value={row.talle}
                          onChange={(e) => handleRowChange(idx, "talle", e.target.value)}
                          style={{ fontSize: "0.85rem", background: row.seleccionado ? "#2b3035" : "#212529" }}
                        />
                      </td>
                      <td>
                        <Form.Control
                          size="sm"
                          type="number"
                          min="1"
                          required={row.seleccionado}
                          disabled={!row.seleccionado || submitting}
                          value={row.cantidad}
                          onChange={(e) => handleRowChange(idx, "cantidad", parseInt(e.target.value) || 1)}
                          style={{ fontSize: "0.85rem", background: row.seleccionado ? "#2b3035" : "#212529" }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            <Form.Group className="mb-3" controlId="observaciones">
              <Form.Label style={{ fontSize: "0.9rem", fontWeight: 600 }}>Observaciones Generales</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Detalles u observaciones de la entrega..."
                value={formNuevaEntrega.observaciones}
                onChange={(e) => setFormNuevaEntrega({ ...formNuevaEntrega, observaciones: e.target.value })}
                disabled={submitting}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowNuevaEntregaModal(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button variant="outline-success" type="submit" disabled={submitting}>
              {submitting ? "Guardando..." : "Guardar"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default EntregaEPP;
