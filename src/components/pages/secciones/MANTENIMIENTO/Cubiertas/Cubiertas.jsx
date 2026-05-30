import { useEffect, useState } from "react";
import { Button, Form, Modal, Spinner, Table } from "react-bootstrap";
import Swal from "sweetalert2";
import { listarCubiertas, crearCubierta, borrarCubierta } from "../../../../../helpers/queriesCubiertas";
import {
  listarRegistrosCubiertas,
  crearRegistroCubierta,
  editarRegistroCubierta,
  borrarRegistroCubierta,
} from "../../../../../helpers/queriesRegistroCubiertas";
import { API } from "../../../../../helpers/api";
import authFetch from "../../../../../helpers/authFetch";

const hoy = () => new Date().toLocaleDateString("en-CA");
const VACIO_ALTA  = { nombreCubierta: "", fecha: hoy() };
const VACIO_NUEVA = { cubierta: "", maquina: "", fecha: hoy(), observaciones: "" };

export default function Cubiertas() {
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
  const [showHistorial, setShowHistorial]         = useState(false);
  const [registroHistorial, setRegistroHistorial] = useState(null);

  // Filtros
  const [filtroCubierta, setFiltroCubierta] = useState("");
  const [filtroMaquina, setFiltroMaquina]   = useState("");

  const cargar = async () => {
    setCargando(true);
    try {
      const [regs, cats, maqRes] = await Promise.all([
        listarRegistrosCubiertas(),
        listarCubiertas(),
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

  // ── Alta de cubierta ─────────────────────────────────────────────
  const abrirAlta  = () => { setFormAlta(VACIO_ALTA); setShowAlta(true); };
  const cerrarAlta = () => { setShowAlta(false); setFormAlta(VACIO_ALTA); };

  const guardarAlta = async () => {
    if (!formAlta.nombreCubierta.trim()) return Swal.fire("Atención", "El nombre es obligatorio.", "warning");
    if (!formAlta.fecha)                 return Swal.fire("Atención", "La fecha es obligatoria.", "warning");

    const yaExiste = catalogo.some(
      (c) => c.nombreCubierta.toLowerCase().trim() === formAlta.nombreCubierta.toLowerCase().trim()
    );
    if (yaExiste) return Swal.fire("Atención", "Ya existe una cubierta con ese nombre.", "warning");

    setGuardandoAlta(true);
    try {
      const res = await crearCubierta(formAlta);
      if (res?.ok) {
        const data = await res.json();
        setCatalogo((prev) => [data.cubierta, ...prev]);
        cerrarAlta();
        Swal.fire({ icon: "success", title: "Cubierta dada de alta", timer: 1500, showConfirmButton: false });
      } else {
        const err = await res.json().catch(() => ({}));
        Swal.fire("Error", err.msg || "No se pudo dar de alta la cubierta.", "error");
      }
    } finally {
      setGuardandoAlta(false);
    }
  };

  // ── Borrar del catálogo ─────────────────────────────────────────
  const eliminarDelCatalogo = async (id) => {
    const { isConfirmed } = await Swal.fire({
      title: "¿Eliminar cubierta del catálogo?",
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: "swal-btn-danger" },
      confirmButtonText: "Sí, borrar",
    });
    if (!isConfirmed) return;
    const res = await borrarCubierta(id);
    if (res?.ok) {
      setCatalogo((prev) => prev.filter((c) => c._id !== id));
      Swal.fire({ icon: "success", title: "Cubierta eliminada del catálogo", timer: 1500, showConfirmButton: false });
    } else {
      Swal.fire("Error", "No se pudo eliminar la cubierta.", "error");
    }
  };

  // ── Nueva cubierta ──────────────────────────────────────────────
  const abrirNueva  = () => { setFormNueva(VACIO_NUEVA); setShowNueva(true); };
  const cerrarNueva = () => { setShowNueva(false); setFormNueva(VACIO_NUEVA); };

  const guardarNueva = async () => {
    if (!formNueva.cubierta) return Swal.fire("Atención", "Seleccioná una cubierta.", "warning");
    if (!formNueva.maquina)  return Swal.fire("Atención", "Seleccioná una máquina.", "warning");
    if (!formNueva.fecha)    return Swal.fire("Atención", "La fecha es obligatoria.", "warning");

    const yaRegistrada = registros.some(
      (r) => String(r.cubierta?._id || r.cubierta) === String(formNueva.cubierta)
    );
    if (yaRegistrada) return Swal.fire("Atención", "Esta cubierta ya está registrada.", "warning");

    setGuardandoNueva(true);
    const esEspecial = formNueva.maquina === "vendida" || formNueva.maquina === "en galpon";
    const payload = {
      cubierta:     formNueva.cubierta,
      maquina:      esEspecial ? null : formNueva.maquina,
      maquinaLabel: esEspecial ? formNueva.maquina : "",
      fecha:        formNueva.fecha,
      observaciones: formNueva.observaciones,
    };
    try {
      const res = await crearRegistroCubierta(payload);
      if (res?.ok) {
        const data = await res.json();
        setRegistros((prev) => [data.registro, ...prev]);
        cerrarNueva();
        Swal.fire({ icon: "success", title: "Cubierta registrada", timer: 1500, showConfirmButton: false });
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
      maquina:       r.maquinaLabel || r.maquina?._id || r.maquina || "",
      fecha:         r.fecha || "",
      observaciones: r.observaciones || "",
    });
    setShowEditar(true);
  };

  const cerrarEditar = () => { setShowEditar(false); setRegistroEditar(null); };

  const guardarEditar = async () => {
    if (!formEditar.maquina) return Swal.fire("Atención", "Seleccioná una máquina.", "warning");

    setGuardandoEditar(true);
    const esEspecialEdit = formEditar.maquina === "vendida" || formEditar.maquina === "en galpon";
    const payloadEdit = {
      maquina:      esEspecialEdit ? null : formEditar.maquina,
      maquinaLabel: esEspecialEdit ? formEditar.maquina : "",
      fecha:        formEditar.fecha,
      observaciones: formEditar.observaciones,
    };
    try {
      const res = await editarRegistroCubierta(registroEditar._id, payloadEdit);
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
    const res = await borrarRegistroCubierta(id);
    if (res?.ok) {
      setRegistros((prev) => prev.filter((r) => r._id !== id));
      Swal.fire({ icon: "success", title: "Registro eliminado", timer: 1500, showConfirmButton: false });
    } else {
      Swal.fire("Error", "No se pudo eliminar el registro.", "error");
    }
  };

  const estiloX = {
    position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
    cursor: "pointer", color: "#fff", fontSize: "14px", fontWeight: "900", zIndex: 5, userSelect: "none",
  };
  const selectActivo = { backgroundImage: "none" };

  if (cargando) return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <div className="w-75 mx-auto my-2">
      <h6 className="text-center mb-3">Cubiertas</h6>

      <div className="d-flex justify-content-between mb-2">
        <div className="d-flex gap-2">
          <Button size="sm" variant="outline-success" onClick={abrirAlta}>+ Alta de cubierta</Button>
          <Button size="sm" variant="outline-secondary" onClick={() => setShowListado(true)}>Listado cubiertas</Button>
        </div>
        <Button size="sm" variant="outline-primary" onClick={abrirNueva}>+ Nueva cubierta</Button>
      </div>

      <div className="d-flex gap-2 mb-2">
        <div style={{ position: "relative", width: "220px" }}>
          <Form.Select size="sm" value={filtroCubierta} onChange={(e) => setFiltroCubierta(e.target.value)} style={filtroCubierta ? selectActivo : {}}>
            <option value="">Nombre cubierta</option>
            {[...new Set(registros.map(r => r.cubierta?.nombreCubierta).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(nombre => (
              <option key={nombre} value={nombre}>{nombre}</option>
            ))}
          </Form.Select>
          {filtroCubierta && <span onClick={() => setFiltroCubierta("")} style={estiloX}>✕</span>}
        </div>
        <div style={{ position: "relative", width: "220px" }}>
          <Form.Select size="sm" value={filtroMaquina} onChange={(e) => setFiltroMaquina(e.target.value)} style={filtroMaquina ? selectActivo : {}}>
            <option value="">Máquina</option>
            {[...new Set(registros.map(r => r.maquinaLabel || r.maquina?.maquina).filter(Boolean))].sort().map(nombre => (
              <option key={nombre} value={nombre}>{nombre}</option>
            ))}
          </Form.Select>
          {filtroMaquina && <span onClick={() => setFiltroMaquina("")} style={estiloX}>✕</span>}
        </div>
      </div>

      <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
        <Table striped bordered hover className="text-center align-middle mb-0">
          <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
            <tr>
              <th>Nombre cubierta</th>
              <th>Máquina</th>
              <th>Observaciones</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {registros.length === 0 ? (
              <tr><td colSpan={4} className="text-muted py-3">Sin cubiertas registradas</td></tr>
            ) : (
              registros.filter(r => {
                const nc = r.cubierta?.nombreCubierta || "";
                const nm = r.maquinaLabel || r.maquina?.maquina || "";
                return (!filtroCubierta || nc === filtroCubierta) && (!filtroMaquina || nm === filtroMaquina);
              }).map((r) => (
                <tr key={r._id}>
                  <td style={r.maquinaLabel === "vendida" ? { textDecoration: "line-through", textDecorationColor: "red", textDecorationThickness: "2px", color: "white" } : {}}>{r.cubierta?.nombreCubierta || "-"}</td>
                  <td style={r.maquinaLabel === "vendida" ? { textDecoration: "line-through", textDecorationColor: "red", textDecorationThickness: "2px", color: "white" } : {}}>{r.maquinaLabel || r.maquina?.maquina || "-"}</td>
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
          <Modal.Title>Detalle de cubierta</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p><strong>Nombre cubierta:</strong> {registroVer?.cubierta?.nombreCubierta || "-"}</p>
          <p><strong>Máquina:</strong> {registroVer?.maquinaLabel || registroVer?.maquina?.maquina || "-"}</p>
          <p><strong>Observaciones:</strong> {registroVer?.observaciones || "-"}</p>
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={() => setShowVer(false)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>

      {/* ── Modal Alta de cubierta ── */}
      <Modal show={showAlta} onHide={cerrarAlta} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title>Alta de cubierta</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3 text-center">
              <Form.Label>Nombre cubierta <span className="text-danger">*</span></Form.Label>
              <Form.Control
                className="w-50 mx-auto"
                value={formAlta.nombreCubierta}
                onChange={(e) => setFormAlta((p) => ({ ...p, nombreCubierta: e.target.value }))}
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

      {/* ── Modal Listado cubiertas ── */}
      <Modal show={showListado} onHide={() => setShowListado(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Listado de cubiertas</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {catalogo.length === 0 ? (
            <p className="text-muted text-center">Sin cubiertas dadas de alta.</p>
          ) : (
            <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
              <Table striped bordered hover className="text-center align-middle mb-0" size="sm">
                <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                  <tr>
                    <th>Nombre cubierta</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogo.map((c) => (
                    <tr key={c._id}>
                      <td>{c.nombreCubierta}</td>
                      <td>{c.fecha ? new Date(c.fecha + "T12:00:00").toLocaleDateString("es-AR") : "-"}</td>
                      <td>
                        <Button size="sm" variant="outline-danger" onClick={() => eliminarDelCatalogo(c._id)}>Borrar</Button>
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

      {/* ── Modal Nueva cubierta ── */}
      <Modal show={showNueva} onHide={cerrarNueva} centered>
        <Modal.Header closeButton>
          <Modal.Title>Nueva cubierta</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3 text-center">
              <Form.Label>Cubierta <span className="text-danger">*</span></Form.Label>
              <Form.Select
                className="w-50 mx-auto"
                value={formNueva.cubierta}
                onChange={(e) => setFormNueva((p) => ({ ...p, cubierta: e.target.value }))}
              >
                <option value="">Seleccionar...</option>
                {catalogo.map((c) => (
                  <option key={c._id} value={c._id}>{c.nombreCubierta}</option>
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
                <option value="vendida">Vendida</option>
                <option value="en galpon">En Galpón</option>
                {maquinas.filter(m => !["Batea 1", "Batea 2", "Carretón grande", "Carretón chico"].includes(m.maquina)).map((m) => (
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
          <Modal.Title>Editar - {registroEditar?.cubierta?.nombreCubierta || ""}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table bordered size="sm" className="text-center align-middle">
            <thead className="table-dark">
              <tr>
                <th>Nombre cubierta</th>
                <th>Máquina</th>
                <th>Fecha</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="fw-semibold">{registroEditar?.cubierta?.nombreCubierta || "-"}</td>
                <td>
                  <Form.Select
                    size="sm"
                    value={formEditar.maquina}
                    onChange={(e) => setFormEditar((p) => ({ ...p, maquina: e.target.value }))}
                  >
                    <option value="">Seleccionar...</option>
                    <option value="vendida">Vendida</option>
                    <option value="en galpon">En Galpón</option>
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
          <Modal.Title>Historial - Cubierta {registroHistorial?.cubierta?.nombreCubierta || ""}</Modal.Title>
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
                      <td>{h.maquinaLabel || h.maquina?.maquina || "-"}</td>
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
