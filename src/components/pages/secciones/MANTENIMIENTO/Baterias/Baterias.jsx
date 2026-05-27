import { useEffect, useState } from "react";
import { Button, Form, Modal, Spinner, Table } from "react-bootstrap";
import Swal from "sweetalert2";
import { listarBaterias, crearBateria, borrarBateria } from "../../../../../helpers/queriesBaterias";
import {
  listarRegistrosBaterias,
  crearRegistroBateria,
  editarRegistroBateria,
  borrarRegistroBateria,
} from "../../../../../helpers/queriesRegistroBaterias";
import { API } from "../../../../../helpers/api";
import authFetch from "../../../../../helpers/authFetch";

const hoy = () => new Date().toLocaleDateString("en-CA");
const VACIO_ALTA  = { nombreBateria: "", marca: "", fecha: hoy() };
const VACIO_NUEVA = { bateria: "", maquina: "", fecha: hoy(), observaciones: "" };

export default function Baterias() {
  const [registros, setRegistros] = useState([]);
  const [catalogo, setCatalogo]   = useState([]);
  const [maquinas, setMaquinas]   = useState([]);
  const [cargando, setCargando]   = useState(true);

  // Modal Alta
  const [showAlta, setShowAlta]           = useState(false);
  const [formAlta, setFormAlta]           = useState(VACIO_ALTA);
  const [guardandoAlta, setGuardandoAlta] = useState(false);

  // Modal Listado
  const [showListado, setShowListado] = useState(false);

  // Modal Ver
  const [showVer, setShowVer]         = useState(false);
  const [registroVer, setRegistroVer] = useState(null);

  // Modal Nueva
  const [showNueva, setShowNueva]           = useState(false);
  const [formNueva, setFormNueva]           = useState(VACIO_NUEVA);
  const [guardandoNueva, setGuardandoNueva] = useState(false);

  // Modal Editar
  const [showEditar, setShowEditar]           = useState(false);
  const [registroEditar, setRegistroEditar]   = useState(null);
  const [formEditar, setFormEditar]           = useState({ maquina: "", fecha: "", observaciones: "" });
  const [guardandoEditar, setGuardandoEditar] = useState(false);

  // Modal Historial
  const [showHistorial, setShowHistorial]       = useState(false);
  const [registroHistorial, setRegistroHistorial] = useState(null);

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
  const abrirAlta  = () => { setFormAlta(VACIO_ALTA); setShowAlta(true); };
  const cerrarAlta = () => { setShowAlta(false); setFormAlta(VACIO_ALTA); };

  const guardarAlta = async () => {
    if (!formAlta.nombreBateria.trim()) return Swal.fire("Atención", "El nombre es obligatorio.", "warning");
    if (!formAlta.marca.trim())         return Swal.fire("Atención", "La marca es obligatoria.", "warning");
    if (!formAlta.fecha)                return Swal.fire("Atención", "La fecha es obligatoria.", "warning");

    const yaExiste = catalogo.some(
      (b) => b.nombreBateria.toLowerCase().trim() === formAlta.nombreBateria.toLowerCase().trim()
    );
    if (yaExiste) return Swal.fire("Atención", "Ya existe una batería con ese nombre.", "warning");

    setGuardandoAlta(true);
    try {
      const res = await crearBateria(formAlta);
      if (res?.ok) {
        const data = await res.json();
        setCatalogo((prev) => [data.bateria, ...prev]);
        cerrarAlta();
        Swal.fire({ icon: "success", title: "Batería dada de alta", timer: 1500, showConfirmButton: false });
      } else {
        const err = await res.json().catch(() => ({}));
        Swal.fire("Error", err.msg || "No se pudo dar de alta la batería.", "error");
      }
    } finally {
      setGuardandoAlta(false);
    }
  };

  // ── Borrar del catálogo ─────────────────────────────────────────
  const eliminarDelCatalogo = async (id) => {
    const { isConfirmed } = await Swal.fire({
      title: "¿Eliminar batería del catálogo?",
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: "swal-btn-danger" },
      confirmButtonText: "Sí, borrar",
    });
    if (!isConfirmed) return;
    const res = await borrarBateria(id);
    if (res?.ok) {
      setCatalogo((prev) => prev.filter((b) => b._id !== id));
      Swal.fire({ icon: "success", title: "Batería eliminada del catálogo", timer: 1500, showConfirmButton: false });
    } else {
      Swal.fire("Error", "No se pudo eliminar la batería.", "error");
    }
  };

  // ── Nueva batería ───────────────────────────────────────────────
  const abrirNueva  = () => { setFormNueva(VACIO_NUEVA); setShowNueva(true); };
  const cerrarNueva = () => { setShowNueva(false); setFormNueva(VACIO_NUEVA); };

  const guardarNueva = async () => {
    if (!formNueva.bateria) return Swal.fire("Atención", "Seleccioná una batería.", "warning");
    if (!formNueva.maquina) return Swal.fire("Atención", "Seleccioná una máquina.", "warning");
    if (!formNueva.fecha)   return Swal.fire("Atención", "La fecha es obligatoria.", "warning");

    setGuardandoNueva(true);
    try {
      const res = await crearRegistroBateria(formNueva);
      if (res?.ok) {
        await cargar();
        cerrarNueva();
        Swal.fire({ icon: "success", title: "Batería registrada", timer: 1500, showConfirmButton: false });
      } else {
        const err = await res.json().catch(() => ({}));
        Swal.fire("Error", err.msg || "No se pudo guardar el registro.", "error");
      }
    } finally {
      setGuardandoNueva(false);
    }
  };

  // ── Editar ───────────────────────────────────────────────────────
  const abrirEditar = (r) => {
    setRegistroEditar(r);
    setFormEditar({
      maquina:       r.maquina?._id || r.maquina || "",
      fecha:         r.fecha || "",
      observaciones: r.observaciones || "",
    });
    setShowEditar(true);
  };

  const cerrarEditar = () => { setShowEditar(false); setRegistroEditar(null); };

  const guardarEditar = async () => {
    if (!formEditar.maquina) return Swal.fire("Atención", "Seleccioná una máquina.", "warning");

    setGuardandoEditar(true);
    try {
      const res = await editarRegistroBateria(registroEditar._id, formEditar);
      if (res?.ok) {
        await cargar();
        cerrarEditar();
        Swal.fire({ icon: "success", title: "Registro actualizado", timer: 1500, showConfirmButton: false });
      } else {
        const err = await res.json().catch(() => ({}));
        Swal.fire("Error", err.msg || "No se pudo actualizar el registro.", "error");
      }
    } finally {
      setGuardandoEditar(false);
    }
  };

  // ── Eliminar registro ───────────────────────────────────────────
  const eliminar = async (id) => {
    const { isConfirmed } = await Swal.fire({
      title: "¿Eliminar registro?",
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: "swal-btn-danger" },
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

      <div className="d-flex justify-content-between mb-2">
        <div className="d-flex gap-2">
          <Button size="sm" variant="outline-success" onClick={abrirAlta}>+ Alta de batería</Button>
          <Button size="sm" variant="outline-secondary" onClick={() => setShowListado(true)}>Listado baterías</Button>
        </div>
        <Button size="sm" variant="outline-primary" onClick={abrirNueva}>+ Nueva batería</Button>
      </div>

      <div style={{ maxHeight: "65vh", overflowY: "auto" }}>
        <Table striped bordered hover className="text-center align-middle mb-0">
          <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
            <tr>
              <th>Nombre batería</th>
              <th>Máquina</th>
              <th>Observaciones</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {registros.length === 0 ? (
              <tr><td colSpan={4} className="text-muted py-3">Sin baterías registradas</td></tr>
            ) : (
              registros.map((r) => (
                <tr key={r._id}>
                  <td>{r.bateria?.nombreBateria || "-"}</td>
                  <td>{r.maquina?.maquina || "-"}</td>
                  <td>{r.observaciones || "-"}</td>
                  <td>
                    <div className="d-flex gap-1 justify-content-center">
                      <Button size="sm" variant="outline-success" onClick={() => { setRegistroVer(r); setShowVer(true); }}>Ver</Button>
                      <Button size="sm" variant="outline-warning" onClick={() => abrirEditar(r)}>Editar</Button>
                      <Button size="sm" variant="outline-info" onClick={() => { setRegistroHistorial(r); setShowHistorial(true); }}>Historial</Button>
                      <Button size="sm" variant="outline-danger" onClick={() => eliminar(r._id)}>Borrar</Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* ── Modal Ver ── */}
      <Modal show={showVer} onHide={() => setShowVer(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Detalle de batería</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p><strong>Nombre batería:</strong> {registroVer?.bateria?.nombreBateria || "-"}</p>
          <p><strong>Marca:</strong> {registroVer?.bateria?.marca || "-"}</p>
          <p><strong>Máquina:</strong> {registroVer?.maquina?.maquina || "-"}</p>
          <p><strong>Observaciones:</strong> {registroVer?.observaciones || "-"}</p>
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={() => setShowVer(false)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>

      {/* ── Modal Alta de batería ── */}
      <Modal show={showAlta} onHide={cerrarAlta} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title>Alta de batería</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3 text-center">
              <Form.Label>Nombre batería <span className="text-danger">*</span></Form.Label>
              <Form.Control
                className="w-50 mx-auto"
                value={formAlta.nombreBateria}
                onChange={(e) => setFormAlta((p) => ({ ...p, nombreBateria: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3 text-center">
              <Form.Label>Marca <span className="text-danger">*</span></Form.Label>
              <Form.Control
                className="w-50 mx-auto"
                value={formAlta.marca}
                onChange={(e) => setFormAlta((p) => ({ ...p, marca: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3 text-center">
              <Form.Label>Fecha <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="date"
                className="w-50 mx-auto"
                value={formAlta.fecha}
                onChange={(e) => setFormAlta((p) => ({ ...p, fecha: e.target.value }))}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={cerrarAlta}>Cancelar</Button>
          <Button variant="outline-success" onClick={guardarAlta} disabled={guardandoAlta}>
            {guardandoAlta ? <Spinner size="sm" animation="border" /> : "Dar de alta"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Modal Listado baterías ── */}
      <Modal show={showListado} onHide={() => setShowListado(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Listado de baterías</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {catalogo.length === 0 ? (
            <p className="text-muted text-center">Sin baterías dadas de alta.</p>
          ) : (
            <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
              <Table striped bordered hover className="text-center align-middle mb-0" size="sm">
                <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                  <tr>
                    <th>Nombre batería</th>
                    <th>Marca</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogo.map((b) => (
                    <tr key={b._id}>
                      <td>{b.nombreBateria}</td>
                      <td>{b.marca}</td>
                      <td>{b.fecha ? new Date(b.fecha + "T12:00:00").toLocaleDateString("es-AR") : "-"}</td>
                      <td>
                        <Button size="sm" variant="outline-danger" onClick={() => eliminarDelCatalogo(b._id)}>Borrar</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={() => setShowListado(false)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>

      {/* ── Modal Nueva batería ── */}
      <Modal show={showNueva} onHide={cerrarNueva} centered>
        <Modal.Header closeButton>
          <Modal.Title>Nueva batería</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3 text-center">
              <Form.Label>Batería <span className="text-danger">*</span></Form.Label>
              <Form.Select
                className="w-50 mx-auto"
                value={formNueva.bateria}
                onChange={(e) => setFormNueva((p) => ({ ...p, bateria: e.target.value }))}
              >
                <option value="">Seleccionar...</option>
                {catalogo.map((b) => (
                  <option key={b._id} value={b._id}>{b.nombreBateria} — {b.marca}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3 text-center">
              <Form.Label>Máquina <span className="text-danger">*</span></Form.Label>
              <Form.Select
                className="w-50 mx-auto"
                value={formNueva.maquina}
                onChange={(e) => setFormNueva((p) => ({ ...p, maquina: e.target.value }))}
              >
                <option value="">Seleccionar...</option>
                {maquinas.map((m) => (
                  <option key={m._id} value={m._id}>{m.maquina}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3 text-center">
              <Form.Label>Fecha <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="date"
                className="w-50 mx-auto"
                value={formNueva.fecha}
                onChange={(e) => setFormNueva((p) => ({ ...p, fecha: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3 text-center">
              <Form.Label>Observaciones</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                className="w-50 mx-auto"
                value={formNueva.observaciones}
                onChange={(e) => setFormNueva((p) => ({ ...p, observaciones: e.target.value }))}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={cerrarNueva}>Cancelar</Button>
          <Button variant="outline-success" onClick={guardarNueva} disabled={guardandoNueva}>
            {guardandoNueva ? <Spinner size="sm" animation="border" /> : "Guardar"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Modal Editar ── */}
      <Modal show={showEditar} onHide={cerrarEditar} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Editar — {registroEditar?.bateria?.nombreBateria || ""}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table bordered size="sm" className="text-center align-middle">
            <thead className="table-dark">
              <tr>
                <th>Nombre batería</th>
                <th>Máquina</th>
                <th>Fecha</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="fw-semibold">{registroEditar?.bateria?.nombreBateria || "-"}</td>
                <td>
                  <Form.Select
                    size="sm"
                    value={formEditar.maquina}
                    onChange={(e) => setFormEditar((p) => ({ ...p, maquina: e.target.value }))}
                  >
                    <option value="">Seleccionar...</option>
                    {maquinas.map((m) => (
                      <option key={m._id} value={m._id}>{m.maquina}</option>
                    ))}
                  </Form.Select>
                </td>
                <td>
                  <Form.Control
                    size="sm"
                    type="date"
                    value={formEditar.fecha}
                    onChange={(e) => setFormEditar((p) => ({ ...p, fecha: e.target.value }))}
                  />
                </td>
                <td>
                  <Form.Control
                    size="sm"
                    type="text"
                    value={formEditar.observaciones}
                    onChange={(e) => setFormEditar((p) => ({ ...p, observaciones: e.target.value }))}
                  />
                </td>
              </tr>
            </tbody>
          </Table>

        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={cerrarEditar}>Cancelar</Button>
          <Button variant="outline-success" onClick={guardarEditar} disabled={guardandoEditar}>
            {guardandoEditar ? <Spinner size="sm" animation="border" /> : "Guardar"}
          </Button>
        </Modal.Footer>
      </Modal>
      {/* ── Modal Historial ── */}
      <Modal show={showHistorial} onHide={() => setShowHistorial(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Historial — {registroHistorial?.bateria?.nombreBateria || ""}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!registroHistorial?.historial?.length ? (
            <p className="text-muted text-center">Sin cambios registrados todavía.</p>
          ) : (
            <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
              <Table striped bordered hover size="sm" className="text-center align-middle mb-0">
                <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                  <tr>
                    <th>Máquina</th>
                    <th>Observaciones</th>
                    <th>Editado el</th>
                  </tr>
                </thead>
                <tbody>
                  {[...registroHistorial.historial].reverse().map((h, i) => (
                    <tr key={i}>
                      <td>{h.maquina?.maquina || "-"}</td>
                      <td>{h.observaciones || "-"}</td>
                      <td>{h.editadoEn ? new Date(h.editadoEn).toLocaleDateString("es-AR") : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={() => setShowHistorial(false)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
