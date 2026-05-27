import { useEffect, useState } from "react";
import { Button, Form, Modal, Spinner, Table } from "react-bootstrap";
import Swal from "sweetalert2";
import { listarBaterias, crearBateria, editarBateria, borrarBateria } from "../../../../../helpers/queriesBaterias";

const hoy = () => new Date().toLocaleDateString("en-CA");

const VACIO = { nombreBateria: "", marca: "", fecha: hoy() };

export default function Baterias() {
  const [baterias, setBaterias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const data = await listarBaterias();
      setBaterias(data);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const abrirAlta = () => { setEditando(null); setForm(VACIO); setShowModal(true); };

  const abrirEditar = (b) => {
    setEditando(b);
    setForm({ nombreBateria: b.nombreBateria, marca: b.marca, fecha: b.fecha });
    setShowModal(true);
  };

  const cerrar = () => { setShowModal(false); setEditando(null); setForm(VACIO); };

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const guardar = async () => {
    if (!form.nombreBateria.trim()) return Swal.fire("Atención", "El nombre de la batería es obligatorio.", "warning");
    if (!form.marca.trim())         return Swal.fire("Atención", "La marca es obligatoria.", "warning");
    if (!form.fecha)                return Swal.fire("Atención", "La fecha es obligatoria.", "warning");

    setGuardando(true);
    try {
      const res = editando
        ? await editarBateria(editando._id, form)
        : await crearBateria(form);

      if (res?.ok) {
        await cargar();
        cerrar();
        Swal.fire({ icon: "success", title: editando ? "Batería actualizada" : "Batería dada de alta", timer: 1500, showConfirmButton: false });
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

  if (cargando) return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <div className="w-75 mx-auto my-2">
      <h6 className="text-center mb-3">Baterías</h6>

      <div className="d-flex justify-content-end mb-2">
        <Button size="sm" variant="outline-success" onClick={abrirAlta}>+ Alta de batería</Button>
      </div>

      <div style={{ maxHeight: "65vh", overflowY: "auto" }}>
        <Table striped bordered hover className="text-center align-middle mb-0">
          <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
            <tr>
              <th>#</th>
              <th>Nombre batería</th>
              <th>Marca</th>
              <th>Fecha</th>
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
                  <td>{b.marca}</td>
                  <td>{b.fecha ? new Date(b.fecha + "T12:00:00").toLocaleDateString("es-AR") : "-"}</td>
                  <td>
                    <div className="d-flex gap-1 justify-content-center">
                      <Button size="sm" variant="outline-warning" onClick={() => abrirEditar(b)}>Editar</Button>
                      <Button size="sm" variant="outline-danger" onClick={() => eliminar(b._id)}>Borrar</Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* Modal alta / editar */}
      <Modal show={showModal} onHide={cerrar} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editando ? "Editar batería" : "Alta de batería"}</Modal.Title>
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
              <Form.Label>Marca <span className="text-danger">*</span></Form.Label>
              <Form.Control
                name="marca"
                value={form.marca}
                onChange={handleChange}
                placeholder="Ej: Bosch, Remy, Moura..."
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Fecha <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="date"
                name="fecha"
                value={form.fecha}
                onChange={handleChange}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cerrar}>Cancelar</Button>
          <Button variant="success" onClick={guardar} disabled={guardando}>
            {guardando ? <Spinner size="sm" animation="border" /> : editando ? "Guardar cambios" : "Dar de alta"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
