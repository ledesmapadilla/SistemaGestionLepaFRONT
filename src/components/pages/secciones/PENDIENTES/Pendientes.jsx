import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Col, Container, Form, Modal, Row, Spinner, Table } from "react-bootstrap";
import Swal from "sweetalert2";
import { obtenerTodosPendientes, guardarPendientes } from "../../../../helpers/queriesPendientes";
import { obtenerTodasReparaciones } from "../../../../helpers/queriesReparaciones";

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
const COLOR_ESTADO = {
  Pendiente: "#6c757d",
  "En proceso": "#ffc107",
  Terminado: "#198754",
  // Estados de repuestos
  Pedido: "#0dcaf0",
  "En taller": "#fd7e14",
  Colocado: "#198754",
};

const hoy = () => new Date().toLocaleDateString("en-CA");

const parseFechaLocal = (f) => {
  const [y, m, d] = f.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// Días desde que se generó la tarea (fecha). Suma hasta hoy mientras no esté
// terminada; si tiene fechaTerminado, el conteo se congela en esa fecha.
const diasPendiente = (fecha, fechaTerminado) => {
  if (!fecha) return "-";
  const inicio = parseFechaLocal(fecha);
  let fin;
  if (fechaTerminado) {
    fin = parseFechaLocal(fechaTerminado);
  } else {
    const a = new Date();
    fin = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  }
  const diff = Math.floor((fin - inicio) / 86400000);
  return diff < 0 ? 0 : diff;
};

const filaVacia = () => ({
  id: crypto.randomUUID(),
  fecha: hoy(),
  maquina: "",
  tarea: "",
  estado: "Pendiente",
  observaciones: "",
});

export default function Pendientes() {
  const navigate = useNavigate();
  const [modalResp, setModalResp] = useState(null);   // responsable abierto
  const [tareasPorResp, setTareasPorResp] = useState({});
  // Reparaciones activas (pendiente / en proceso) que se muestran como tareas de Zamorano.
  const [reparacionesZamorano, setReparacionesZamorano] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const [resPend, resReps] = await Promise.all([
          obtenerTodosPendientes(),
          obtenerTodasReparaciones(),
        ]);

        if (resPend?.ok) {
          const data = await resPend.json();
          const mapa = {};
          (Array.isArray(data) ? data : []).forEach((doc) => {
            mapa[doc.responsable] = (doc.tareas || []).map((t) => ({
              ...t,
              id: t.id || crypto.randomUUID(),
            }));
          });
          setTareasPorResp(mapa);
        }

        if (resReps?.ok) {
          const docs = await resReps.json();
          const derivadas = [];
          (Array.isArray(docs) ? docs : []).forEach((doc) => {
            const nombreMaq = doc.maquina?.maquina || "Máquina";
            const maquinaId = doc.maquina?._id || null;
            (doc.reparaciones || []).forEach((r) => {
              if (r.estado === "Pendiente" || r.estado === "En proceso") {
                derivadas.push({
                  id: `rep-${maquinaId || nombreMaq}-${r.id}`,
                  tipo: "reparacion",
                  maquinaId,
                  fecha: r.fecha,
                  maquina: nombreMaq,
                  tarea: r.reparacion,
                  estado: r.estado,
                  observaciones: r.observaciones || "",
                });
              }
              // Repuestos a cargo de Zamorano que todavía no están colocados.
              (r.repuestos || []).forEach((rep) => {
                if (rep.responsable === "Zamorano" && rep.estado !== "Colocado") {
                  derivadas.push({
                    id: `repu-${maquinaId || nombreMaq}-${r.id}-${rep.id}`,
                    tipo: "repuesto",
                    maquinaId,
                    reparacionId: r.id,
                    fecha: r.fecha,
                    maquina: nombreMaq,
                    tarea: rep.repuesto,
                    estado: rep.estado,
                    observaciones: rep.observaciones || "",
                  });
                }
              });
            });
          });
          setReparacionesZamorano(derivadas);
        }
      } catch (error) {
        console.error("Error al cargar pendientes:", error);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  // Salir del modo edición con Esc
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setEditandoId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const tareas = modalResp ? tareasPorResp[modalResp.nombre] || [] : [];
  // Reparaciones activas que se listan (solo lectura) en el modal de Zamorano.
  const filasDerivadas = modalResp?.nombre === "Zamorano" ? reparacionesZamorano : [];

  const setTareas = (nuevas) =>
    setTareasPorResp((prev) => ({ ...prev, [modalResp.nombre]: nuevas }));

  // Guarda en la base las tareas del responsable (guardado automático).
  const persistir = async (nuevas) => {
    const res = await guardarPendientes(modalResp.nombre, nuevas);
    if (!res?.ok) {
      Swal.fire({ icon: "error", title: "Error", text: "No se pudieron guardar los cambios" });
    }
    return res;
  };

  const abrir = (r) => { setModalResp(r); setEditandoId(null); };
  const cerrar = () => { setModalResp(null); setEditandoId(null); };

  // Navega al módulo de reparaciones abriendo la máquina (y los repuestos) correspondientes.
  const irAReparaciones = (t) =>
    navigate("/mantenimiento/reparaciones", {
      state: { maquinaId: t.maquinaId, repuestosDe: t.tipo === "repuesto" ? t.reparacionId : undefined },
    });

  const agregar = () => {
    const nueva = filaVacia();
    setTareas([...tareas, nueva]);
    setEditandoId(nueva.id);
  };
  const editar = (id, campo, valor) =>
    setTareas(tareas.map((t) => {
      if (t.id !== id) return t;
      const actualizada = { ...t, [campo]: valor };
      // Al pasar a "Terminado" se congela el conteo guardando la fecha; si se
      // reabre la tarea, se limpia para que vuelva a sumar.
      if (campo === "estado") {
        actualizada.fechaTerminado = valor === "Terminado" ? (t.fechaTerminado || hoy()) : "";
      }
      return actualizada;
    }));

  const finalizarEdicion = async () => {
    const fila = tareas.find((t) => t.id === editandoId);
    if (fila && !(fila.tarea || "").trim()) {
      return Swal.fire({ icon: "warning", title: "Atención", text: "La tarea es obligatoria." });
    }
    setEditandoId(null);
    const res = await persistir(tareas);
    if (res?.ok) {
      Swal.fire({ position: "center", icon: "success", title: "Guardado", showConfirmButton: false, timer: 1200, timerProgressBar: true });
    }
  };

  const borrar = async (id) => {
    const { isConfirmed } = await Swal.fire({
      title: "¿Eliminar tarea?",
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: "swal-btn-danger" },
      confirmButtonText: "Sí, borrar",
    });
    if (!isConfirmed) return;
    const nuevas = tareas.filter((t) => t.id !== id);
    setTareas(nuevas);
    setEditandoId((prev) => (prev === id ? null : prev));
    await persistir(nuevas);
    Swal.fire({ position: "center", icon: "success", title: "Tarea eliminada", showConfirmButton: false, timer: 1200, timerProgressBar: true });
  };

  return (
    <Container className="py-4 d-flex flex-column justify-content-center" style={{ minHeight: "80vh" }}>
      <h2 className="mb-1 fw-bold text-center">Pendientes</h2>
      <p className="text-muted mb-4 text-center">Seleccioná un responsable</p>
      <Row xs={2} sm={3} md={3} lg={3} className="g-4 mx-auto justify-content-center" style={{ maxWidth: 620 }}>
        {RESPONSABLES.map((r) => (
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
      <Modal show={!!modalResp} onHide={cerrar} centered size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Pendientes - {modalResp?.nombre}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span className="text-muted">Fecha: {new Date().toLocaleDateString("es-AR")}</span>
            <Button size="sm" variant="outline-primary" onClick={agregar}>Agregar tarea</Button>
          </div>

          {cargando ? (
            <Spinner animation="border" className="d-block mx-auto my-4" />
          ) : (
          <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
            <Table striped bordered hover size="sm" className="text-center align-middle mb-0">
              <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr>
                  <th style={{ width: 150 }}>Fecha</th>
                  <th style={{ width: 160 }}>Máquina</th>
                  <th>Tarea</th>
                  <th style={{ width: 120 }}>Días pendiente</th>
                  <th style={{ width: 150 }}>Estado</th>
                  <th style={{ width: 260 }}>Observaciones</th>
                  <th style={{ width: 150 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filasDerivadas.map((t) => (
                  <tr key={t.id} style={{ backgroundColor: "#fbfbf3" }}>
                    <td>{t.fecha ? t.fecha.split("-").reverse().join("/") : "-"}</td>
                    <td>{t.maquina || "-"}</td>
                    <td className="text-start">{t.tarea || "-"}</td>
                    <td>{diasPendiente(t.fecha)}</td>
                    <td>
                      <span style={{ color: COLOR_ESTADO[t.estado] || "#dee2e6", fontWeight: 600 }}>{t.estado || "-"}</span>
                    </td>
                    <td className="text-start">{t.observaciones || "-"}</td>
                    <td>
                      <Button
                        size="sm"
                        variant={t.tipo === "repuesto" ? "outline-info" : "outline-secondary"}
                        onClick={() => irAReparaciones(t)}
                      >
                        {t.tipo === "repuesto" ? "Repuestos" : "Reparación"}
                      </Button>
                    </td>
                  </tr>
                ))}
                {tareas.length === 0 && filasDerivadas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-muted py-3">Sin tareas cargadas</td>
                  </tr>
                ) : (
                  tareas.map((t) => {
                    const editando = editandoId === t.id;
                    return (
                      <tr key={t.id}>
                        <td>
                          {editando ? (
                            <Form.Control size="sm" type="date" value={t.fecha} onChange={(e) => editar(t.id, "fecha", e.target.value)} />
                          ) : (
                            t.fecha ? t.fecha.split("-").reverse().join("/") : "-"
                          )}
                        </td>
                        <td>
                          {editando ? (
                            <Form.Control size="sm" value={t.maquina || ""} onChange={(e) => editar(t.id, "maquina", e.target.value)} />
                          ) : (
                            t.maquina || "-"
                          )}
                        </td>
                        <td className={editando ? "" : "text-start"}>
                          {editando ? (
                            <Form.Control size="sm" value={t.tarea} onChange={(e) => editar(t.id, "tarea", e.target.value)} />
                          ) : (
                            t.tarea || "-"
                          )}
                        </td>
                        <td>{diasPendiente(t.fecha, t.fechaTerminado)}</td>
                        <td>
                          {editando ? (
                            <Form.Select size="sm" value={t.estado} onChange={(e) => editar(t.id, "estado", e.target.value)}>
                              {ESTADOS.map((s) => (<option key={s} value={s}>{s}</option>))}
                            </Form.Select>
                          ) : (
                            <span style={{ color: COLOR_ESTADO[t.estado] || "#dee2e6", fontWeight: 600 }}>{t.estado || "-"}</span>
                          )}
                        </td>
                        <td className={editando ? "" : "text-start"}>
                          {editando ? (
                            <Form.Control size="sm" value={t.observaciones} onChange={(e) => editar(t.id, "observaciones", e.target.value)} />
                          ) : (
                            t.observaciones || "-"
                          )}
                        </td>
                        <td>
                          <div className="d-flex gap-1 justify-content-center">
                            {editando ? (
                              <Button size="sm" variant="outline-success" onClick={finalizarEdicion}>Listo</Button>
                            ) : (
                              <Button size="sm" variant="outline-warning" onClick={() => setEditandoId(t.id)}>Editar</Button>
                            )}
                            <Button size="sm" variant="outline-danger" onClick={() => borrar(t.id)}>Borrar</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>
          )}
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={cerrar}>Cerrar</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
