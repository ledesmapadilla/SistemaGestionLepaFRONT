import { useState } from "react";
import { Button, Card, Col, Container, Form, Modal, Row, Table } from "react-bootstrap";

// Mismos responsables que el select de repuestos.
const RESPONSABLES = [
  { nombre: "Zamorano", color: "#0d6efd" },
  { nombre: "Mauricio", color: "#198754" },
  { nombre: "Nelson", color: "#dc3545" },
  { nombre: "Juan José", color: "#6f42c1" },
  { nombre: "Nacho", color: "#fd7e14" },
  { nombre: "Agustín", color: "#0dcaf0" },
];

const ESTADOS = ["Pendiente", "En proceso", "Terminado"];
const COLOR_ESTADO = { Pendiente: "#6c757d", "En proceso": "#ffc107", Terminado: "#198754" };

const hoy = () => new Date().toLocaleDateString("en-CA");
const filaVacia = () => ({
  id: crypto.randomUUID(),
  fecha: hoy(),
  tarea: "",
  dias: "",
  estado: "Pendiente",
  observaciones: "",
});

export default function Pendientes() {
  const [modalResp, setModalResp] = useState(null); // responsable abierto
  const [tareasPorResp, setTareasPorResp] = useState({}); // { nombre: [filas] }

  const tareas = modalResp ? tareasPorResp[modalResp.nombre] || [] : [];

  const setTareas = (nuevas) =>
    setTareasPorResp((prev) => ({ ...prev, [modalResp.nombre]: nuevas }));

  const agregar = () => setTareas([...tareas, filaVacia()]);
  const editar = (id, campo, valor) =>
    setTareas(tareas.map((t) => (t.id === id ? { ...t, [campo]: valor } : t)));
  const borrar = (id) => setTareas(tareas.filter((t) => t.id !== id));

  return (
    <Container className="py-4">
      <h2 className="mb-1 fw-bold text-center">Pendientes</h2>
      <p className="text-muted mb-4 text-center">Seleccioná un responsable</p>
      <Row xs={1} sm={2} md={3} lg={3} className="g-3">
        {RESPONSABLES.map((r) => (
          <Col key={r.nombre}>
            <Card
              className="h-100 shadow-sm border-0"
              style={{ cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s" }}
              onClick={() => setModalResp(r)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "";
              }}
            >
              <Card.Body className="d-flex flex-column align-items-center text-center py-3">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center mb-2"
                  style={{ width: 44, height: 44, backgroundColor: r.color + "1a" }}
                >
                  <i className="bi bi-person-fill fs-5" style={{ color: r.color }} />
                </div>
                <Card.Title className="fw-semibold mb-0" style={{ fontSize: "0.95rem" }}>{r.nombre}</Card.Title>
              </Card.Body>
              <div style={{ height: 3, backgroundColor: r.color, borderRadius: "0 0 .375rem .375rem" }} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* ── Modal de tareas del responsable ── */}
      <Modal show={!!modalResp} onHide={() => setModalResp(null)} centered size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Pendientes - {modalResp?.nombre}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span className="text-muted">Fecha: {new Date().toLocaleDateString("es-AR")}</span>
            <Button size="sm" variant="outline-primary" onClick={agregar}>Agregar tarea</Button>
          </div>

          <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
            <Table striped bordered hover size="sm" className="text-center align-middle mb-0">
              <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr>
                  <th style={{ width: 150 }}>Fecha</th>
                  <th>Tarea</th>
                  <th style={{ width: 90 }}>Días</th>
                  <th style={{ width: 150 }}>Estado</th>
                  <th style={{ width: 260 }}>Observaciones</th>
                  <th style={{ width: 90 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tareas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-muted py-3">Sin tareas cargadas</td>
                  </tr>
                ) : (
                  tareas.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <Form.Control
                          size="sm"
                          type="date"
                          value={t.fecha}
                          onChange={(e) => editar(t.id, "fecha", e.target.value)}
                        />
                      </td>
                      <td>
                        <Form.Control
                          size="sm"
                          value={t.tarea}
                          onChange={(e) => editar(t.id, "tarea", e.target.value)}
                        />
                      </td>
                      <td>
                        <Form.Control
                          size="sm"
                          type="number"
                          value={t.dias}
                          onChange={(e) => editar(t.id, "dias", e.target.value)}
                        />
                      </td>
                      <td>
                        <Form.Select
                          size="sm"
                          value={t.estado}
                          style={{ color: COLOR_ESTADO[t.estado] || "#000", fontWeight: 600 }}
                          onChange={(e) => editar(t.id, "estado", e.target.value)}
                        >
                          {ESTADOS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </Form.Select>
                      </td>
                      <td>
                        <Form.Control
                          size="sm"
                          value={t.observaciones}
                          onChange={(e) => editar(t.id, "observaciones", e.target.value)}
                        />
                      </td>
                      <td>
                        <Button size="sm" variant="outline-danger" onClick={() => borrar(t.id)}>Borrar</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={() => setModalResp(null)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
