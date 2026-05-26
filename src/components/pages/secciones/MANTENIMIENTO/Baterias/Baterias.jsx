import { useEffect, useState } from "react";
import { Button, Container, Form, Modal, Spinner, Table } from "react-bootstrap";
import Swal from "sweetalert2";
import { listarBaterias, crearBateria, editarBateria, borrarBateria } from "../../../../../helpers/queriesBaterias";
import { API } from "../../../../../helpers/api";
import authFetch from "../../../../../helpers/authFetch";

const VACIO = { nombreBateria: "", maquina: "", observaciones: "" };

export default function Baterias() {
  const [baterias, setBaterias] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null); // null = crear, objeto = editar
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const [bats, maqRes] = await Promise.all([
        listarBaterias(),
        authFetch(API.maquinas),
      ]);
      setBaterias(bats);
      const maqData = maqRes?.ok ? await maqRes.json() : [];
      setMaquinas(maqData);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => {
    setEditando(null);
    setForm(VACIO);
    setShowModal(true);
  };

  const abrirEditar = (b) => {
    setEditando(b);
    setForm({
      nombreBateria: b.nombreBateria,
      maquina: b.maquina?._id || b.maquina || "",
      observaciones: b.observaciones || "",
    });
    setShowModal(true);
  };

  const cerrar = () => { setShowModal(false); setEditando(null); setForm(VACIO); };

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const guardar = async () => {
    if (!form.nombreBateria.trim()) return Swal.fire("Atención", "El nombre de la batería es obligatorio.", "warning");
    if (!form.maquina) return Swal.fire("Atención", "Seleccioná una máquina.", "warning");

    setGuardando(true);
    try {
      const res = editando
        ? await editarBateria(editando._id, form)
        : await crearBateria(form);

      if (res?.ok) {
        await cargar();
        cerrar();
        Swal.fire({ icon: "success", title: editando ? "Batería actualizada" : "Batería creada", timer: 1500, showConfirmButton: false });
      } else {
        Swal.fire("Error", "No se pudo guardar la batería.", "error");
      }
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    const { isConfirmed } = await Swal.fire({
      title: "¿Eliminar batería?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonText: "Cancelar",
      confirmButtonText: "Sí, borrar",
    });
    if (!isConfirmed) return;
    const res = await borrarBateria(id);
    if (res?.ok) {
      setBaterias((prev) => prev.filter((b) => b._id !== id));
      Swal.fire({ icon: "success", title: "Batería eliminada", timer: 1500, showConfirmButton: false });
    } else {
      Swal.fire("Error", "No se pudo eliminar la batería.", "error");
    }
  };

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-1">
        <h2 className="fw-bold mb-0">Baterías</h2>
        <Button variant="warning" onClick={abrirCrear}>+ Nueva batería</Button>
      </div>
      <hr style={{ borderColor: "#ffc107", borderWidth: 2, opacity: 1 }} className="mb-4" />

      {cargando ? (
        <div className="d-flex justify-content-center mt-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <Table striped bordered hover className="text-center align-middle">
          <thead className="table-dark">
            <tr>
              <th>#</th>
              <th>Nombre batería</th>
              <th>Máquina</th>
              <th>Observaciones</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {baterias.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-muted py-3">Sin baterías registradas</td>
              </tr>
            ) : (
              baterias.map((b, i) => (
                <tr key={b._id}>
                  <td>{i + 1}</td>
                  <td>{b.nombreBateria}</td>
                  <td>{b.maquina?.maquina || "-"}</td>
                  <td>{b.observaciones || "-"}</td>
                  <td className="d-flex gap-1 justify-content-center">
                    <Button variant="outline-warning" size="sm" onClick={() => abrirEditar(b)}>Editar</Button>
                    <Button variant="outline-danger" size="sm" onClick={() => eliminar(b._id)}>Borrar</Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      )}

      {/* Modal crear / editar */}
      <Modal show={showModal} onHide={cerrar} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editando ? "Editar batería" : "Nueva batería"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Nombre batería <span className="text-danger">*</span></Form.Label>
              <Form.Control
                name="nombreBateria"
                value={form.nombreBateria}
                onChange={handleChange}
                placeholder="Ej: Batería 12V 100Ah"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Máquina <span className="text-danger">*</span></Form.Label>
              <Form.Select name="maquina" value={form.maquina} onChange={handleChange}>
                <option value="">Seleccionar máquina...</option>
                {maquinas.map((m) => (
                  <option key={m._id} value={m._id}>{m.maquina}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Observaciones</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="observaciones"
                value={form.observaciones}
                onChange={handleChange}
                placeholder="Observaciones opcionales..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cerrar}>Cancelar</Button>
          <Button variant="warning" onClick={guardar} disabled={guardando}>
            {guardando ? <Spinner size="sm" animation="border" /> : editando ? "Guardar cambios" : "Crear"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
