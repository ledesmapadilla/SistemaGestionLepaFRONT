// Pendientes para la próxima reunión: se anotan acá y se van dando por
// terminados a medida que se hacen. Se entra desde el botón lateral Reunión.
import { useEffect, useMemo, useState } from "react";
import { Table, Spinner, Button, Form, Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import AsyncButton from "../../../shared/AsyncButton";
import {
  listarPendientesReunion,
  crearPendienteReunion,
  editarPendienteReunion,
  borrarPendienteReunion,
} from "../../../../helpers/queriesPendientesReunion";

// Mismos responsables que la sección Pendientes.
const RESPONSABLES = ["Zamorano", "Mauricio", "Nelson", "Juan José", "Nacho", "Agustín"];

const hoy = () => new Date().toLocaleDateString("en-CA");

const formatoFecha = (f) => {
  if (!f) return "-";
  const [a, m, d] = f.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
};

const vacio = () => ({ fecha: hoy(), tarea: "", responsable: "", observaciones: "" });

const avisoOk = (title) =>
  Swal.fire({ position: "center", icon: "success", title, showConfirmButton: false, timer: 1200, timerProgressBar: true });

const PendientesReunion = () => {
  const navigate = useNavigate();
  const [pendientes, setPendientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("Pendiente"); // "Pendiente" | "Terminado" | ""
  const [form, setForm] = useState(null); // null = modal cerrado
  const [editandoId, setEditandoId] = useState(null);

  useEffect(() => {
    listarPendientesReunion()
      .then(setPendientes)
      .catch((error) => console.error(error))
      .finally(() => setLoading(false));
  }, []);

  const visibles = useMemo(
    () => pendientes.filter((p) => filtro === "" || p.estado === filtro),
    [pendientes, filtro]
  );

  const reemplazar = (doc) => setPendientes((prev) => prev.map((p) => (p._id === doc._id ? doc : p)));

  const abrirNuevo = () => { setEditandoId(null); setForm(vacio()); };
  const abrirEditar = (p) => {
    setEditandoId(p._id);
    setForm({ fecha: p.fecha, tarea: p.tarea, responsable: p.responsable || "", observaciones: p.observaciones || "" });
  };
  const cerrarModal = () => setForm(null);

  const guardar = async () => {
    if (!form.tarea.trim()) {
      return Swal.fire({ icon: "warning", title: "Atención", text: "La tarea es obligatoria." });
    }
    try {
      if (editandoId) {
        reemplazar(await editarPendienteReunion(editandoId, form));
      } else {
        const nuevo = await crearPendienteReunion(form);
        setPendientes((prev) => [nuevo, ...prev]);
      }
      cerrarModal();
      avisoOk("Guardado");
    } catch (error) {
      Swal.fire({ icon: "error", title: "Error", text: error.message });
    }
  };

  const cambiarEstado = async (p) => {
    const estado = p.estado === "Terminado" ? "Pendiente" : "Terminado";
    try {
      reemplazar(await editarPendienteReunion(p._id, { estado }));
      avisoOk(estado === "Terminado" ? "Terminado" : "Reabierto");
    } catch (error) {
      Swal.fire({ icon: "error", title: "Error", text: error.message });
    }
  };

  const borrar = async (p) => {
    const { isConfirmed } = await Swal.fire({
      title: "¿Eliminar pendiente?",
      text: p.tarea,
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: "swal-btn-danger" },
      confirmButtonText: "Sí, borrar",
    });
    if (!isConfirmed) return;
    try {
      await borrarPendienteReunion(p._id);
      setPendientes((prev) => prev.filter((x) => x._id !== p._id));
      avisoOk("Pendiente eliminado");
    } catch (error) {
      Swal.fire({ icon: "error", title: "Error", text: error.message });
    }
  };

  if (loading)
    return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <div className="w-75 mx-auto my-2">
      <h6 className="text-center mb-3">Pendientes para la reunión</h6>
      <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
        <Form.Select
          size="sm"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          style={{ maxWidth: 180 }}
        >
          <option value="Pendiente">Pendientes</option>
          <option value="Terminado">Terminados</option>
          <option value="">Todos</option>
        </Form.Select>
        <div className="d-flex gap-2">
          <Button size="sm" variant="outline-primary" onClick={abrirNuevo}>Agregar pendiente</Button>
          <Button size="sm" variant="outline-success" onClick={() => navigate(-1)}>Volver</Button>
        </div>
      </div>

      <div className="table-responsive shadow-sm">
        <Table striped bordered hover className="text-center align-middle" size="sm">
          <thead className="table-dark">
            <tr>
              <th>Fecha</th>
              <th>Tarea</th>
              <th>Responsable</th>
              <th>Estado</th>
              <th>Observaciones</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-4 text-muted">
                  {filtro === "Pendiente" ? "No hay pendientes para la reunión" : "Sin registros"}
                </td>
              </tr>
            ) : (
              visibles.map((p) => {
                const terminado = p.estado === "Terminado";
                return (
                  <tr key={p._id}>
                    <td>{formatoFecha(p.fecha)}</td>
                    <td className="text-start" style={terminado ? { textDecoration: "line-through", opacity: 0.7 } : undefined}>
                      {p.tarea}
                    </td>
                    <td>{p.responsable || "-"}</td>
                    <td className={terminado ? "text-success" : "text-warning"}>
                      {terminado ? `Terminado ${formatoFecha(p.fechaTerminado)}` : "Pendiente"}
                    </td>
                    <td className="text-start">{p.observaciones || "-"}</td>
                    <td className="text-nowrap">
                      <AsyncButton
                        size="sm"
                        variant={terminado ? "outline-secondary" : "outline-success"}
                        className="me-1"
                        onClick={() => cambiarEstado(p)}
                      >
                        {terminado ? "Reabrir" : "Terminar"}
                      </AsyncButton>
                      <Button size="sm" variant="outline-warning" className="me-1" onClick={() => abrirEditar(p)}>
                        Editar
                      </Button>
                      <AsyncButton size="sm" variant="outline-danger" onClick={() => borrar(p)}>
                        Borrar
                      </AsyncButton>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </div>

      <Modal show={form !== null} onHide={cerrarModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editandoId ? "Editar pendiente" : "Nuevo pendiente"}</Modal.Title>
        </Modal.Header>
        {form && (
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Fecha</Form.Label>
              <Form.Control
                type="date"
                value={form.fecha}
                onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Tarea *</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                autoFocus
                value={form.tarea}
                onChange={(e) => setForm((f) => ({ ...f, tarea: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Responsable</Form.Label>
              <Form.Select
                value={form.responsable}
                onChange={(e) => setForm((f) => ({ ...f, responsable: e.target.value }))}
              >
                <option value="">Sin asignar</option>
                {RESPONSABLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>Observaciones</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={form.observaciones}
                onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
              />
            </Form.Group>
          </Modal.Body>
        )}
        <Modal.Footer>
          <Button variant="secondary" onClick={cerrarModal}>Cancelar</Button>
          <AsyncButton variant="primary" onClick={guardar}>Guardar</AsyncButton>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default PendientesReunion;
