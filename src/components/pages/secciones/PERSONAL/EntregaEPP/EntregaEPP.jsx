import { useState, useEffect } from "react";
import { Container, Table, Button, Spinner, Form, Badge, Modal } from "react-bootstrap";
import { listarPersonal, editarPersonal } from "../../../../../helpers/queriesPersonal.js";
import { registrarEntregaEPP, obtenerEntregasEPP, borrarEntregaEPP } from "../../../../../helpers/queriesEntregaEPP.js";
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
    fecha: new Date().toLocaleDateString("en-CA") // YYYY-MM-DD local
  });
  const [eppRows, setEppRows] = useState([
    { epp: "camisa", label: "Camisa", seleccionado: false, talle: "", cantidad: 1, observaciones: "" },
    { epp: "pantalon", label: "Pantalón", seleccionado: false, talle: "", cantidad: 1, observaciones: "" },
    { epp: "botines", label: "Botines", seleccionado: false, talle: "", cantidad: 1, observaciones: "" },
    { epp: "otros", label: "Otros", seleccionado: false, talle: "", cantidad: 1, observaciones: "" }
  ]);
  const [submitting, setSubmitting] = useState(false);

  // Estados para el modal de Talles (se remueve 'otros')
  const [showTallesModal, setShowTallesModal] = useState(false);
  const [personIdTalles, setPersonIdTalles] = useState("");
  const [nombreTalles, setNombreTalles] = useState("");
  const [formTalles, setFormTalles] = useState({
    camisa: "",
    pantalon: "",
    botines: ""
  });
  const [submittingTalles, setSubmittingTalles] = useState(false);

  // Estados para el modal de Historial
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [personalHistorial, setPersonalHistorial] = useState("");
  const [historial, setHistorial] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

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

  const handleAbrirHistorial = async (nombre) => {
    setPersonalHistorial(nombre);
    setShowHistorialModal(true);
    setLoadingHistorial(true);
    try {
      const response = await obtenerEntregasEPP(nombre);
      if (response && response.ok) {
        const data = await response.json();
        setHistorial(data || []);
      } else {
        setHistorial([]);
      }
    } catch (error) {
      console.error("Error cargando historial de EPP:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo cargar el historial de entregas.",
      });
    } finally {
      setLoadingHistorial(false);
    }
  };

  const handleBorrarEntrega = async (id) => {
    const result = await Swal.fire({
      title: "¿Eliminar registro de entrega?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        const response = await borrarEntregaEPP(id);
        if (response && response.ok) {
          setHistorial((prev) => prev.filter((item) => item._id !== id));
          Swal.fire({
            icon: "success",
            title: "Registro eliminado",
            timer: 1500,
            showConfirmButton: false,
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo eliminar el registro.",
          });
        }
      } catch (error) {
        console.error("Error al borrar entrega:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Ocurrió un error inesperado al eliminar.",
        });
      }
    }
  };

  const handleAbrirNuevaEntrega = (p) => {
    setPersonalSeleccionado(p.nombre);
    setFormNuevaEntrega({
      fecha: new Date().toLocaleDateString("en-CA")
    });
    setEppRows([
      { epp: "camisa", label: "Camisa", seleccionado: false, talle: p.talles?.camisa || "", cantidad: 1, observaciones: "" },
      { epp: "pantalon", label: "Pantalón", seleccionado: false, talle: p.talles?.pantalon || "", cantidad: 1, observaciones: "" },
      { epp: "botines", label: "Botines", seleccionado: false, talle: p.talles?.botines || "", cantidad: 1, observaciones: "" },
      { epp: "otros", label: "Otros", seleccionado: false, talle: "", cantidad: 1, observaciones: "" }
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

    // Validar cantidad y observaciones para "otros"
    for (const item of seleccionados) {
      if (!item.cantidad || item.cantidad < 1) {
        Swal.fire({
          icon: "warning",
          title: "Atención",
          text: `La cantidad para ${item.label} debe ser al menos 1.`,
        });
        return;
      }
      if (item.epp === "otros" && (!item.observaciones || !item.observaciones.trim())) {
        Swal.fire({
          icon: "warning",
          title: "Atención",
          text: 'Debe especificar qué elemento está entregando en las observaciones de "Otros".',
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
        talle: item.epp !== "otros" ? (item.talle || "") : "",
        cantidad: item.cantidad,
        observaciones: item.observaciones || ""
      }));

      const response = await registrarEntregaEPP(payload);

      if (response && response.ok) {
        Swal.fire({
          icon: "success",
          title: "Entrega registrada",
          timer: 1500,
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

  // Funciones para el modal de Talles
  const handleAbrirTalles = (p) => {
    setPersonIdTalles(p._id);
    setNombreTalles(p.nombre);
    setFormTalles({
      camisa: p.talles?.camisa || "",
      pantalon: p.talles?.pantalon || "",
      botines: p.talles?.botines || ""
    });
    setShowTallesModal(true);
  };

  const handleSubmitTalles = async (e) => {
    e.preventDefault();
    setSubmittingTalles(true);
    try {
      const response = await editarPersonal(personIdTalles, {
        talles: formTalles
      });

      if (response && response.ok) {
        // Actualizar lista localmente
        setPersonal((prev) =>
          prev.map((item) =>
            item._id === personIdTalles ? { ...item, talles: formTalles } : item
          )
        );
        Swal.fire({
          icon: "success",
          title: "Talles guardados",
          timer: 1500,
          showConfirmButton: false,
        });
        setShowTallesModal(false);
      } else {
        const errorData = await response?.json().catch(() => null);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: errorData?.msg || "No se pudieron guardar los talles.",
        });
      }
    } catch (error) {
      console.error("Error al guardar talles:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Ocurrió un error inesperado al guardar los talles.",
      });
    } finally {
      setSubmittingTalles(false);
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
                <th style={{ width: "320px" }}>Acciones</th>
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
                    <div className="d-flex justify-content-between align-items-center px-2">
                      <div className="d-flex gap-2">
                        <Button
                          variant="outline-info"
                          size="sm"
                          onClick={() => handleAbrirHistorial(p.nombre)}
                        >
                          Historial
                        </Button>
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={() => handleAbrirNuevaEntrega(p)}
                        >
                          Nueva Entrega
                        </Button>
                      </div>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleAbrirTalles(p)}
                      >
                        Talles
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
            <Form.Group className="mb-3" controlId="fecha" style={{ maxWidth: "160px" }}>
              <Form.Label style={{ fontSize: "0.9rem", fontWeight: 600 }}>Fecha</Form.Label>
              <Form.Control
                size="sm"
                type="date"
                required
                value={formNuevaEntrega.fecha}
                onChange={(e) => setFormNuevaEntrega({ ...formNuevaEntrega, fecha: e.target.value })}
                disabled={submitting}
              />
            </Form.Group>

            <Form.Label style={{ fontSize: "0.9rem", fontWeight: 600, display: "block" }}>Elementos a Entregar</Form.Label>
            <div className="table-responsive mb-2" style={{ border: "1px solid #495057", borderRadius: "4px" }}>
              <Table striped bordered hover size="sm" className="text-center align-middle mb-0" style={{ background: "#212529" }}>
                <thead className="table-dark">
                  <tr>
                    <th style={{ minWidth: "100px" }}>Elemento</th>
                    <th style={{ width: "80px" }}>Entregar</th>
                    <th style={{ width: "70px" }}>Talle</th>
                    <th style={{ width: "80px" }}>Cant</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {eppRows.map((row, idx) => (
                    <tr key={row.epp}>
                      <td className="text-start fw-semibold ps-3" style={{ color: row.seleccionado ? "#dee2e6" : "#6c757d" }}>
                        {row.label}
                      </td>
                      <td>
                        <div className="d-flex justify-content-center align-items-center">
                          <input
                            type="radio"
                            checked={row.seleccionado}
                            onChange={() => {}} // Evitar warning de React
                            onClick={() => !submitting && handleToggleRow(idx)}
                            style={{
                              cursor: submitting ? "not-allowed" : "pointer",
                              accentColor: "#198754",
                              width: 20,
                              height: 20
                            }}
                          />
                        </div>
                      </td>
                      <td>
                        {row.epp !== "otros" ? (
                          <Form.Control
                            size="sm"
                            type="text"
                            disabled={!row.seleccionado || submitting}
                            value={row.talle}
                            onChange={(e) => handleRowChange(idx, "talle", e.target.value)}
                            style={{ fontSize: "0.82rem", background: row.seleccionado ? "#2b3035" : "#212529" }}
                          />
                        ) : (
                          <span className="text-muted">-</span>
                        )}
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
                          style={{ fontSize: "0.82rem", background: row.seleccionado ? "#2b3035" : "#212529" }}
                        />
                      </td>
                      <td>
                        <Form.Control
                          size="sm"
                          type="text"
                          required={row.seleccionado && row.epp === "otros"}
                          disabled={!row.seleccionado || submitting}
                          value={row.observaciones}
                          onChange={(e) => handleRowChange(idx, "observaciones", e.target.value)}
                          style={{ fontSize: "0.82rem", background: row.seleccionado ? "#2b3035" : "#212529" }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
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

      {/* Modal para Talles de EPP */}
      <Modal show={showTallesModal} onHide={() => !submittingTalles && setShowTallesModal(false)} centered>
        <Modal.Header closeButton={!submittingTalles}>
          <Modal.Title style={{ fontSize: "1.2rem" }}>Talles de EPP - {nombreTalles}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitTalles}>
          <Modal.Body className="d-flex flex-column align-items-center">
            <Form.Group className="mb-3 w-100" controlId="talleCamisa" style={{ maxWidth: "120px" }}>
              <Form.Label style={{ fontSize: "0.9rem", fontWeight: 600 }}>Camisa</Form.Label>
              <Form.Control
                size="sm"
                type="text"
                className="text-center"
                value={formTalles.camisa}
                onChange={(e) => setFormTalles({ ...formTalles, camisa: e.target.value })}
                disabled={submittingTalles}
              />
            </Form.Group>

            <Form.Group className="mb-3 w-100" controlId="tallePantalon" style={{ maxWidth: "120px" }}>
              <Form.Label style={{ fontSize: "0.9rem", fontWeight: 600 }}>Pantalón</Form.Label>
              <Form.Control
                size="sm"
                type="text"
                className="text-center"
                value={formTalles.pantalon}
                onChange={(e) => setFormTalles({ ...formTalles, pantalon: e.target.value })}
                disabled={submittingTalles}
              />
            </Form.Group>

            <Form.Group className="mb-3 w-100" controlId="talleBotines" style={{ maxWidth: "120px" }}>
              <Form.Label style={{ fontSize: "0.9rem", fontWeight: 600 }}>Botines</Form.Label>
              <Form.Control
                size="sm"
                type="text"
                className="text-center"
                value={formTalles.botines}
                onChange={(e) => setFormTalles({ ...formTalles, botines: e.target.value })}
                disabled={submittingTalles}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowTallesModal(false)} disabled={submittingTalles}>
              Cancelar
            </Button>
            <Button variant="outline-success" type="submit" disabled={submittingTalles}>
              {submittingTalles ? "Guardando..." : "Guardar"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal para Historial de EPP */}
      <Modal show={showHistorialModal} onHide={() => setShowHistorialModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: "1.2rem" }}>Historial de EPP - {personalHistorial}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingHistorial ? (
            <div className="d-flex justify-content-center my-4">
              <Spinner animation="border" />
            </div>
          ) : (
            <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
              <Table striped bordered hover size="sm" className="text-center align-middle mb-0">
                <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                  <tr>
                    <th>Fecha</th>
                    <th>Elemento</th>
                    <th>Talle</th>
                    <th>Cant</th>
                    <th>Observaciones</th>
                    <th style={{ width: "60px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((row) => {
                    const labelEPP = {
                      camisa: "Camisa",
                      pantalon: "Pantalón",
                      botines: "Botines",
                      otros: "Otros"
                    }[row.epp] || row.epp;

                    return (
                      <tr key={row._id}>
                        <td className="text-nowrap">{row.fecha ? row.fecha.split("-").reverse().join("/") : "-"}</td>
                        <td className="fw-semibold">{labelEPP}</td>
                        <td>{row.talle || "-"}</td>
                        <td>{row.cantidad}</td>
                        <td className="text-start ps-3" style={{ fontSize: "0.85rem" }}>
                          {row.observaciones || "-"}
                        </td>
                        <td>
                          <span
                            onClick={() => handleBorrarEntrega(row._id)}
                            style={{ cursor: "pointer", color: "#dc3545", fontWeight: 900, fontSize: 16, userSelect: "none" }}
                            title="Eliminar registro"
                          >
                            ✕
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {historial.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-muted py-3">
                        No hay entregas registradas para este operario.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowHistorialModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default EntregaEPP;
