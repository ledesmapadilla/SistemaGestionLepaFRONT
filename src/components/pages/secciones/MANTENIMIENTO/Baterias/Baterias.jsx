import { useEffect, useState } from "react";
import { Button, Form, Modal, Spinner, Table } from "react-bootstrap";
import Swal from "sweetalert2";
import { listarBaterias, crearBateria } from "../../../../../helpers/queriesBaterias";
import {
  listarRegistrosBaterias,
  crearRegistroBateria,
  editarRegistroBateria,
  borrarRegistroBateria,
} from "../../../../../helpers/queriesRegistroBaterias";
import { API } from "../../../../../helpers/api";
import authFetch from "../../../../../helpers/authFetch";

const hoy = () => new Date().toLocaleDateString("en-CA");

const VACIO_ALTA   = { nombreBateria: "", marca: "", fecha: hoy() };
const VACIO_NUEVA  = { bateria: "", maquina: "", observaciones: "" };

export default function Baterias() {
  const [registros, setRegistros]   = useState([]);
  const [catalogo, setCatalogo]     = useState([]);   // baterías dadas de alta
  const [maquinas, setMaquinas]     = useState([]);
  const [cargando, setCargando]     = useState(true);

  // Modal Alta de batería
  const [showAlta, setShowAlta]     = useState(false);
  const [formAlta, setFormAlta]     = useState(VACIO_ALTA);
  const [guardandoAlta, setGuardandoAlta] = useState(false);

  // Modal Nueva batería
  const [showNueva, setShowNueva]   = useState(false);
  const [editando, setEditando]     = useState(null);
  const [formNueva, setFormNueva]   = useState(VACIO_NUEVA);
  const [guardandoNueva, setGuardandoNueva] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const [regs, cats, maqRes] = await Promise.all([
        listarRegistrosBaterias(),
        listarBaterias(),
        authFetch(API.maquinas),
      ]);
      setRegistros(regs);
      setCatalogo(cats);
      setMaquinas(maqRes?.ok ? await maqRes.json() : []);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  // ── Alta de batería ──────────────────────────────────────────────
  const abrirAlta = () => { setFormAlta(VACIO_ALTA); setShowAlta(true); };
  const cerrarAlta = () => { setShowAlta(false); setFormAlta(VACIO_ALTA); };

  const guardarAlta = async () => {
    if (!formAlta.nombreBateria.trim()) return Swal.fire("Atención", "El nombre es obligatorio.", "warning");
    if (!formAlta.marca.trim())         return Swal.fire("Atención", "La marca es obligatoria.", "warning");
    if (!formAlta.fecha)                return Swal.fire("Atención", "La fecha es obligatoria.", "warning");

    setGuardandoAlta(true);
    try {
      const res = await crearBateria(formAlta);
      if (res?.ok) {
        const nueva = await res.json();
        setCatalogo((prev) => [nueva.bateria, ...prev]);
        cerrarAlta();
        Swal.fire({ icon: "success", title: "Batería dada de alta", timer: 1500, showConfirmButton: false });
      } else {
        Swal.fire("Error", "No se pudo dar de alta la batería.", "error");
      }
    } finally {
      setGuardandoAlta(false);
    }
  };

  // ── Nueva batería (registro en tabla) ───────────────────────────
  const abrirNueva = () => { setEditando(null); setFormNueva(VACIO_NUEVA); setShowNueva(true); };

  const abrirEditar = (r) => {
    setEditando(r);
    setFormNueva({
      bateria:       r.bateria?._id || r.bateria || "",
      maquina:       r.maquina?._id || r.maquina || "",
      observaciones: r.observaciones || "",
    });
    setShowNueva(true);
  };

  const cerrarNueva = () => { setShowNueva(false); setEditando(null); setFormNueva(VACIO_NUEVA); };

  const guardarNueva = async () => {
    if (!formNueva.bateria) return Swal.fire("Atención", "Seleccioná una batería.", "warning");
    if (!formNueva.maquina) return Swal.fire("Atención", "Seleccioná una máquina.", "warning");

    setGuardandoNueva(true);
    try {
      const res = editando
        ? await editarRegistroBateria(editando._id, formNueva)
        : await crearRegistroBateria(formNueva);

      if (res?.ok) {
        await cargar();
        cerrarNueva();
        Swal.fire({ icon: "success", title: editando ? "Registro actualizado" : "Batería registrada", timer: 1500, showConfirmButton: false });
      } else {
        Swal.fire("Error", "No se pudo guardar el registro.", "error");
      }
    } finally {
      setGuardandoNueva(false);
    }
  };

  const eliminar = async (id) => {
    const { isConfirmed } = await Swal.fire({
      title: "¿Eliminar registro?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonText: "Cancelar",
      confirmButtonText: "Sí, borrar",
    });
    if (!isConfirmed) return;
    const res = await borrarRegistroBateria(id);
    if (res?.ok) {
      setRegistros((prev) => prev.filter((r) => r._id !== id));
      Swal.fire({ icon: "success", title: "Registro eliminado", timer: 1500, showConfirmButton: false });
    } else {
      Swal.fire("Error", "No se pudo eliminar el registro.", "error");
    }
  };

  if (cargando) return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <div className="w-75 mx-auto my-2">
      <h6 className="text-center mb-3">Baterías</h6>

      <div className="d-flex justify-content-end gap-2 mb-2">
        <Button size="sm" variant="outline-success" onClick={abrirAlta}>+ Alta de batería</Button>
        <Button size="sm" variant="outline-warning" onClick={abrirNueva}>+ Nueva batería</Button>
      </div>

      <div style={{ maxHeight: "65vh", overflowY: "auto" }}>
        <Table striped bordered hover className="text-center align-middle mb-0">
          <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
            <tr>
              <th>#</th>
              <th>Nombre batería</th>
              <th>Máquina</th>
              <th>Observaciones</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {registros.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-muted py-3">Sin baterías registradas</td>
              </tr>
            ) : (
              registros.map((r, i) => (
                <tr key={r._id}>
                  <td>{i + 1}</td>
                  <td>{r.bateria?.nombreBateria || "-"}</td>
                  <td>{r.maquina?.maquina || "-"}</td>
                  <td>{r.observaciones || "-"}</td>
                  <td>
                    <div className="d-flex gap-1 justify-content-center">
                      <Button size="sm" variant="outline-warning" onClick={() => abrirEditar(r)}>Editar</Button>
                      <Button size="sm" variant="outline-danger" onClick={() => eliminar(r._id)}>Borrar</Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* ── Modal Alta de batería ── */}
      <Modal show={showAlta} onHide={cerrarAlta} centered>
        <Modal.Header closeButton>
          <Modal.Title>Alta de batería</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Nombre batería <span className="text-danger">*</span></Form.Label>
              <Form.Control
                name="nombreBateria"
                value={formAlta.nombreBateria}
                onChange={(e) => setFormAlta((p) => ({ ...p, nombreBateria: e.target.value }))}
                placeholder="Ej: Batería 12V 100Ah"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Marca <span className="text-danger">*</span></Form.Label>
              <Form.Control
                name="marca"
                value={formAlta.marca}
                onChange={(e) => setFormAlta((p) => ({ ...p, marca: e.target.value }))}
                placeholder="Ej: Bosch, Remy, Moura..."
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Fecha <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="date"
                name="fecha"
                value={formAlta.fecha}
                onChange={(e) => setFormAlta((p) => ({ ...p, fecha: e.target.value }))}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cerrarAlta}>Cancelar</Button>
          <Button variant="success" onClick={guardarAlta} disabled={guardandoAlta}>
            {guardandoAlta ? <Spinner size="sm" animation="border" /> : "Dar de alta"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Modal Nueva batería ── */}
      <Modal show={showNueva} onHide={cerrarNueva} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editando ? "Editar batería" : "Nueva batería"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Batería <span className="text-danger">*</span></Form.Label>
              <Form.Select
                value={formNueva.bateria}
                onChange={(e) => setFormNueva((p) => ({ ...p, bateria: e.target.value }))}
              >
                <option value="">Seleccionar batería...</option>
                {catalogo.map((b) => (
                  <option key={b._id} value={b._id}>{b.nombreBateria} — {b.marca}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Máquina <span className="text-danger">*</span></Form.Label>
              <Form.Select
                value={formNueva.maquina}
                onChange={(e) => setFormNueva((p) => ({ ...p, maquina: e.target.value }))}
              >
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
                value={formNueva.observaciones}
                onChange={(e) => setFormNueva((p) => ({ ...p, observaciones: e.target.value }))}
                placeholder="Observaciones opcionales..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cerrarNueva}>Cancelar</Button>
          <Button variant="warning" onClick={guardarNueva} disabled={guardandoNueva}>
            {guardandoNueva ? <Spinner size="sm" animation="border" /> : editando ? "Guardar cambios" : "Guardar"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
