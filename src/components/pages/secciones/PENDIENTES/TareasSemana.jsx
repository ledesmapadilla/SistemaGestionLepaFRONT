import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Col, Container, Form, Modal, Row, Spinner, Table } from "react-bootstrap";
import Swal from "sweetalert2";
import { obtenerTareasSemana, guardarTareasSemana } from "../../../../helpers/queriesTareasSemana";
import {
  RESPONSABLES, ESTADOS, ESTADOS_REPUESTO, COLOR_ESTADO, hoy, fechaAR, diasPendiente,
} from "./pendientesUtils";

// Estados que cuentan como cerrados: congelan los días y no suman al contador de la tarjeta.
const CERRADOS = ["Terminado", "Colocado"];

// Agrupa las tareas por semana (desde/hasta), de la más reciente a la más vieja.
const agruparPorSemana = (tareas) => {
  const grupos = new Map();
  tareas.forEach((t) => {
    const clave = `${t.desde}|${t.hasta}`;
    if (!grupos.has(clave)) grupos.set(clave, { desde: t.desde, hasta: t.hasta, tareas: [] });
    grupos.get(clave).tareas.push(t);
  });
  return [...grupos.values()]
    .sort((a, b) => b.desde.localeCompare(a.desde) || b.hasta.localeCompare(a.hasta))
    .map((g) => ({ ...g, tareas: g.tareas.sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "")) }));
};

export default function TareasSemana() {
  const navigate = useNavigate();
  const [tareasPorResp, setTareasPorResp] = useState({});
  const [cargando, setCargando] = useState(true);
  const [modalResp, setModalResp] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [borrador, setBorrador] = useState({});

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await obtenerTareasSemana();
        if (res?.ok) {
          const data = await res.json();
          const mapa = {};
          (Array.isArray(data) ? data : []).forEach((doc) => { mapa[doc.responsable] = doc.tareas || []; });
          setTareasPorResp(mapa);
        }
      } catch (error) {
        console.error("Error al cargar tareas de la semana:", error);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  const tareas = modalResp ? tareasPorResp[modalResp.nombre] || [] : [];
  const semanas = agruparPorSemana(tareas);

  const abrir = (r) => { setModalResp(r); setEditandoId(null); };
  const cerrar = () => { setModalResp(null); setEditandoId(null); };

  // Guarda todas las tareas semanales del responsable abierto.
  const persistir = async (nuevas, titulo) => {
    const previas = tareas;
    setTareasPorResp((prev) => ({ ...prev, [modalResp.nombre]: nuevas }));
    const res = await guardarTareasSemana(modalResp.nombre, nuevas);
    if (res?.ok) {
      Swal.fire({ position: "center", icon: "success", title: titulo, showConfirmButton: false, timer: 1200, timerProgressBar: true });
    } else {
      setTareasPorResp((prev) => ({ ...prev, [modalResp.nombre]: previas }));
      Swal.fire({ icon: "error", title: "Error", text: "No se pudieron guardar los cambios" });
    }
  };

  const editar = (t) => {
    setEditandoId(t.id);
    setBorrador({ estado: t.estado, observaciones: t.observaciones || "" });
  };

  const guardar = async (t) => {
    const nuevas = tareas.map((x) => {
      if (x.id !== t.id) return x;
      const cerrada = CERRADOS.includes(borrador.estado);
      return {
        ...x,
        estado: borrador.estado,
        observaciones: borrador.observaciones,
        // Al cerrarla se congela el conteo de días; si se reabre, vuelve a sumar.
        fechaTerminado: cerrada ? x.fechaTerminado || hoy() : "",
      };
    });
    setEditandoId(null);
    await persistir(nuevas, "Guardado");
  };

  const borrar = async (t) => {
    const { isConfirmed } = await Swal.fire({
      title: "¿Quitar la tarea de la semana?",
      text: "La tarea sigue en Pendientes.",
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: "swal-btn-danger" },
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    });
    if (!isConfirmed) return;
    setEditandoId((prev) => (prev === t.id ? null : prev));
    await persistir(tareas.filter((x) => x.id !== t.id), "Tarea quitada");
  };

  const verObservacion = (texto) =>
    Swal.fire({ title: "Observaciones", text: texto, confirmButtonText: "Cerrar", confirmButtonColor: "#6c757d" });

  return (
    <Container className="py-4">
      <div className="d-flex align-items-center justify-content-center position-relative mb-4">
        <Button
          variant="outline-light"
          size="sm"
          className="position-absolute start-0"
          onClick={() => navigate("/pendientes")}
        >
          ← Pendientes
        </Button>
        <h2 className="fw-bold text-center mb-0">Tareas para la semana</h2>
      </div>

      {cargando ? (
        <Spinner animation="border" className="d-block mx-auto my-4" />
      ) : (
        <Row xs={1} sm={2} md={3} className="g-3 mx-auto justify-content-center" style={{ maxWidth: 900 }}>
          {RESPONSABLES.map((r) => {
            const activas = (tareasPorResp[r.nombre] || []).filter((t) => !CERRADOS.includes(t.estado)).length;
            return (
              <Col key={r.nombre}>
                <Card
                  className="h-100 shadow-sm border-0"
                  style={{ cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s" }}
                  onClick={() => abrir(r)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "";
                  }}
                >
                  <Card.Body className="d-flex align-items-center justify-content-center gap-2 py-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{ width: 36, height: 36, backgroundColor: r.color + "1a" }}
                    >
                      <i className="bi bi-person-fill" style={{ color: r.color }} />
                    </div>
                    <span className="fw-semibold">{r.nombre}</span>
                    {activas > 0 && (
                      <span
                        className="badge rounded-pill text-white fw-bold"
                        title="Tareas de la semana sin terminar"
                        style={{ backgroundColor: r.color, fontSize: "0.7rem" }}
                      >
                        {activas}
                      </span>
                    )}
                  </Card.Body>
                  <div style={{ height: 4, backgroundColor: r.color, borderRadius: "0 0 .375rem .375rem" }} />
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* ── Modal con las semanas del responsable ── */}
      <Modal show={!!modalResp} onHide={cerrar} centered size="xl" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Tareas para la semana - {modalResp?.nombre}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: "70vh" }}>
          {semanas.length === 0 && (
            <p className="text-muted text-center py-3 mb-0">
              Sin tareas. Se agregan desde Pendientes con el botón "A semanal".
            </p>
          )}
          {semanas.map((s) => (
            <div key={`${s.desde}|${s.hasta}`} className="mb-4">
              <h5 className="fw-semibold mb-2">
                Tareas para la semana del {fechaAR(s.desde)} hasta {fechaAR(s.hasta)}
              </h5>
              <Table striped bordered hover size="sm" className="text-center align-middle mb-0">
                <thead className="table-dark">
                  <tr>
                    <th style={{ width: 95 }}>Fecha</th>
                    <th style={{ width: 110 }}>Máquina</th>
                    <th>Tarea</th>
                    <th style={{ width: 85 }}>Días pendiente</th>
                    <th style={{ width: 120 }}>Estado</th>
                    <th style={{ width: 160 }}>Obs.</th>
                    <th style={{ width: 150 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {s.tareas.map((t) => {
                    const enEdicion = editandoId === t.id;
                    return (
                      <tr key={t.id}>
                        <td>{fechaAR(t.fecha)}</td>
                        <td>{t.maquina || "-"}</td>
                        <td className="text-start">{t.tarea || "-"}</td>
                        <td>{diasPendiente(t.fecha, t.fechaTerminado)}</td>
                        <td>
                          {enEdicion ? (
                            <Form.Select size="sm" value={borrador.estado} onChange={(e) => setBorrador((p) => ({ ...p, estado: e.target.value }))}>
                              {(t.tipo === "repuesto" ? ESTADOS_REPUESTO : ESTADOS).map((e) => (
                                <option key={e} value={e}>{e}</option>
                              ))}
                            </Form.Select>
                          ) : (
                            <span style={{ color: COLOR_ESTADO[t.estado] || "#dee2e6", fontWeight: 600 }}>{t.estado || "-"}</span>
                          )}
                        </td>
                        <td>
                          {enEdicion ? (
                            <Form.Control size="sm" value={borrador.observaciones} onChange={(e) => setBorrador((p) => ({ ...p, observaciones: e.target.value }))} />
                          ) : t.observaciones ? (
                            <Button size="sm" variant="outline-secondary" className="py-0 px-2" onClick={() => verObservacion(t.observaciones)}>Ver</Button>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          <div className="d-flex gap-1 justify-content-center">
                            {enEdicion ? (
                              <Button size="sm" variant="outline-success" onClick={() => guardar(t)}>Listo</Button>
                            ) : (
                              <Button size="sm" variant="outline-warning" onClick={() => editar(t)}>Editar</Button>
                            )}
                            <Button size="sm" variant="outline-danger" onClick={() => borrar(t)}>Borrar</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          ))}
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={cerrar}>Cerrar</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
