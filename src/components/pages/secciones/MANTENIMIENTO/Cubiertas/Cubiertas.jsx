import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Form, Modal, Spinner, Table } from "react-bootstrap";
import Swal from "sweetalert2";
import { listarCubiertas, crearCubierta, borrarCubierta } from "../../../../../helpers/queriesCubiertas";
import {
  listarRegistrosCubiertas,
  crearRegistroCubierta,
  editarRegistroCubierta,
  borrarRegistroCubierta,
  obtenerHistorialCubierta,
} from "../../../../../helpers/queriesRegistroCubiertas";
import { API } from "../../../../../helpers/api";
import authFetch from "../../../../../helpers/authFetch";
import XLSXStyle from "xlsx-js-style";

const hoy = () => new Date().toLocaleDateString("en-CA");
const VACIO_ALTA  = { nombreCubierta: "", fecha: hoy() };
const VACIO_NUEVA = { cubierta: "", maquina: "", fecha: hoy(), observaciones: "" };

export default function Cubiertas({ categoria = "camiones", titulo = "Cubiertas camiones" }) {
  const navigate = useNavigate();
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

  // Modal Resumen
  const [showResumen, setShowResumen] = useState(false);
  const [detalleResumen, setDetalleResumen] = useState(null);

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
  const [historialData, setHistorialData]         = useState([]);
  const [loadingHistorial, setLoadingHistorial]   = useState(false);

  // Filtros
  const [filtroCubierta, setFiltroCubierta] = useState("");
  const [filtroMaquina, setFiltroMaquina]   = useState("");
  const [mostrarDesechadas, setMostrarDesechadas] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const [regs, cats, maqRes] = await Promise.all([
        listarRegistrosCubiertas(categoria),
        listarCubiertas(categoria),
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
  const abrirAlta = () => {
    const numeros = catalogo.map((c) => parseInt(c.nombreCubierta, 10)).filter((n) => !isNaN(n));
    const siguiente = numeros.length > 0 ? String(Math.max(...numeros) + 1) : "1";
    setFormAlta({ ...VACIO_ALTA, nombreCubierta: siguiente });
    setShowAlta(true);
  };
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
      const res = await crearCubierta({ ...formAlta, categoria });
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
    const ESPECIALES = ["Desechada", "Auxilio - Galpón", "Perdida"];
    const esEspecial = ESPECIALES.includes(formNueva.maquina);
    const payload = {
      cubierta:     formNueva.cubierta,
      categoria,
      maquina:      esEspecial ? null : formNueva.maquina,
      maquinaLabel: esEspecial ? formNueva.maquina : "",
      fecha:        formNueva.fecha,
      observaciones: formNueva.observaciones,
    };
    try {
      const res = await crearRegistroCubierta(payload);
      if (res?.ok) {
        const data = await res.json();
        const nuevos = [data.registro, ...registros];
        setRegistros(nuevos);
        cerrarNueva();
        const advertencia = alertaCantidadMaquina(nuevos, data.registro?.maquina?.maquina);
        if (advertencia) {
          Swal.fire({ icon: "warning", title: "Cubierta registrada", html: `Registro guardado.<br><span style="color:#dc3545;font-weight:600;">⚠️ ${advertencia}</span>` });
        } else {
          Swal.fire({ icon: "success", title: "Cubierta registrada", timer: 1500, showConfirmButton: false });
        }
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
    const ESPECIALES_EDIT = ["Desechada", "Auxilio - Galpón", "Perdida"];
    const esEspecialEdit = ESPECIALES_EDIT.includes(formEditar.maquina);
    const payloadEdit = {
      maquina:      esEspecialEdit ? null : formEditar.maquina,
      maquinaLabel: esEspecialEdit ? formEditar.maquina : "",
      fecha:        formEditar.fecha,
      observaciones: formEditar.observaciones,
    };
    try {
      const res = await editarRegistroCubierta(registroEditar._id, payloadEdit);
      if (res?.ok) {
        const data = await res.json();
        const nuevos = registros.map((r) => r._id === registroEditar._id ? data.registro : r);
        setRegistros(nuevos);
        cerrarEditar();
        // Chequear la máquina destino y, si cambió, también la de origen (le sacamos una cubierta).
        const advertencias = [];
        const destino = data.registro?.maquina?.maquina;
        const advDestino = alertaCantidadMaquina(nuevos, destino);
        if (advDestino) advertencias.push(advDestino);
        const origen = registroEditar.maquina?.maquina;
        if (origen && origen.toLowerCase().trim() !== (destino || "").toLowerCase().trim()) {
          const advOrigen = alertaCantidadMaquina(nuevos, origen);
          if (advOrigen) advertencias.push(advOrigen);
        }
        if (advertencias.length > 0) {
          Swal.fire({ icon: "warning", title: "Registro actualizado", html: `Cambio guardado.<br><span style="color:#dc3545;font-weight:600;">⚠️ ${advertencias.join("<br>⚠️ ")}</span>` });
        } else {
          Swal.fire({ icon: "success", title: "Registro actualizado", timer: 1500, showConfirmButton: false });
        }
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

  const abrirHistorial = async (r) => {
    setRegistroHistorial(r);
    setHistorialData([]);
    setShowHistorial(true);
    setLoadingHistorial(true);
    try {
      const data = await obtenerHistorialCubierta(r._id);
      setHistorialData(data.historial || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const registrosFiltrados = useMemo(() =>
    registros.filter((r) => {
      const nc = (r.cubierta?.nombreCubierta || "").toLowerCase();
      const nm = (r.maquinaLabel || r.maquina?.maquina || "").toLowerCase();
      if (!mostrarDesechadas && (r.maquinaLabel === "Desechada" || r.maquinaLabel === "Perdida")) return false;
      return nc.includes(filtroCubierta.toLowerCase()) && nm.includes(filtroMaquina.toLowerCase());
    }),
    [registros, filtroCubierta, filtroMaquina, mostrarDesechadas]
  );

  // Máquinas reales que aplican a cada categoría (nombres normalizados, en orden).
  // Si la categoría no está acá, se usa el comportamiento por defecto (camiones).
  const MAQUINAS_CATEGORIA = {
    palas: ["wa200", "xcmg"],
    retropalas: ["jd1", "jd2"],
    motoniveladora: ["motoniveladora"],
  };
  const ESPECIALES_OPCIONES = ["Auxilio - Galpón", "Perdida", "Desechada"];
  // Cantidad de cubiertas esperada por máquina, según categoría (para el resumen).
  // Los nombres se comparan en minúsculas; se incluyen variantes con/sin acento.
  const CUBIERTAS_ESPERADAS = {
    palas: { wa200: 4, xcmg: 4 },
    retropalas: { jd1: 4, jd2: 4 },
    motoniveladora: { motoniveladora: 6 },
    camiones: {
      "batea 1": 8, "batea 2": 8,
      "bateas 1": 8, "bateas 2": 8,
      "carreton chico": 8, "carretón chico": 8,
      eiq: 6, etx: 6,
    },
  };
  const esperadasCat = CUBIERTAS_ESPERADAS[categoria] || {};

  // Devuelve un texto de advertencia si `maquinaNombre` no tiene la cantidad de
  // cubiertas esperada (según la categoría), calculado sobre `registrosArr`.
  // "" si la máquina no tiene cantidad esperada definida o si está OK.
  const alertaCantidadMaquina = (registrosArr, maquinaNombre) => {
    const norm = (maquinaNombre || "").toLowerCase().trim();
    if (!norm) return "";
    const esperada = esperadasCat[norm];
    if (esperada === undefined) return "";
    const cantidad = registrosArr.filter((r) => {
      const label = (r.maquinaLabel || r.maquina?.maquina || "").toLowerCase().trim();
      return label === norm;
    }).length;
    const diff = cantidad - esperada;
    if (diff === 0) return "";
    const detalle = `(tiene ${cantidad}, debería tener ${esperada})`;
    if (diff < 0) {
      const n = Math.abs(diff);
      return `A ${maquinaNombre} le ${n === 1 ? "falta 1 cubierta" : `faltan ${n} cubiertas`} ${detalle}.`;
    }
    return `A ${maquinaNombre} le ${diff === 1 ? "sobra 1 cubierta" : `sobran ${diff} cubiertas`} ${detalle}.`;
  };

  const EXCLUIR_MAQUINAS = ["pc1","pc2","pc3","pc4","pc5","wa200","xcmg","nisan","nissan","ranger","fiat","jd1","jd2","motoniveladora","carretón grande","carreton grande"];

  const opcionesMaquina = useMemo(() => {
    const permitidas = MAQUINAS_CATEGORIA[categoria];
    if (permitidas) {
      const reales = permitidas
        .map((nombre) => maquinas.find((m) => (m.maquina || "").toLowerCase().trim() === nombre))
        .filter(Boolean)
        .map((m) => ({ value: m._id, label: m.maquina }));
      return [...reales, ...ESPECIALES_OPCIONES.map((e) => ({ value: e, label: e }))];
    }
    // camiones (por defecto): opciones especiales primero, luego el resto de máquinas
    const reales = maquinas
      .filter((m) => !EXCLUIR_MAQUINAS.includes((m.maquina || "").toLowerCase().trim()))
      .map((m) => ({ value: m._id, label: m.maquina }));
    return [
      { value: "Desechada", label: "Desechada" },
      { value: "Auxilio - Galpón", label: "Auxilio - Galpón" },
      { value: "Perdida", label: "Perdida" },
      ...reales,
    ];
  }, [maquinas, categoria]);

  // Resumen por máquina: cantidad de cubiertas asignadas actualmente, última
  // fecha y alerta si una máquina no tiene la cantidad esperada de cubiertas.
  const hayResumen = Object.keys(esperadasCat).length > 0;
  const resumen = useMemo(() => {
    const grupos = new Map();
    const agregar = (label) => {
      if (!grupos.has(label)) grupos.set(label, { maquina: label, cantidad: 0, fecha: "", items: [] });
      return grupos.get(label);
    };

    registros.forEach((r) => {
      const label = r.maquinaLabel || r.maquina?.maquina || "Sin asignar";
      const g = agregar(label);
      g.cantidad += 1;
      if (r.fecha && r.fecha > g.fecha) g.fecha = r.fecha; // última (YYYY-MM-DD compara bien)
      g.items.push({
        nombreCubierta: r.cubierta?.nombreCubierta || "-",
        fecha:          r.fecha || "",
        observaciones:  r.observaciones || "",
      });
    });

    // Asegurar filas para las máquinas esperadas aunque tengan 0 cubiertas.
    Object.keys(esperadasCat).forEach((nombre) => {
      const m = maquinas.find((mq) => (mq.maquina || "").toLowerCase().trim() === nombre);
      if (m) agregar(m.maquina);
    });

    return [...grupos.values()].map((g) => {
      const norm = g.maquina.toLowerCase().trim();
      const esperada = esperadasCat[norm];
      let alerta = "";
      if (esperada !== undefined) {
        const diff = g.cantidad - esperada;
        if (diff < 0) {
          const n = Math.abs(diff);
          alerta = n === 1 ? "Falta una cubierta" : `Faltan ${n} cubiertas`;
        } else if (diff > 0) {
          alerta = diff === 1 ? "Sobra una cubierta" : `Sobran ${diff} cubiertas`;
        }
      }
      return { ...g, alerta };
    }).sort((a, b) => {
      // Máquinas con cantidad esperada primero
      const pa = esperadasCat[a.maquina.toLowerCase().trim()] !== undefined ? 0 : 1;
      const pb = esperadasCat[b.maquina.toLowerCase().trim()] !== undefined ? 0 : 1;
      return pa - pb || a.maquina.localeCompare(b.maquina);
    });
  }, [registros, maquinas, categoria]);

  const exportarExcel = () => {
    const headers = ["Nombre cubierta", "Máquina", "Observaciones"];
    const cols = "ABC";
    const estCentro = { alignment: { horizontal: "center", vertical: "center" } };
    const estHeader = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "222222" } }, alignment: { horizontal: "center", vertical: "center" } };
    const estTitulo = { font: { bold: true, sz: 13 }, alignment: { horizontal: "left", vertical: "center" } };

    const wb = XLSXStyle.utils.book_new();
    const ws = {};

    const hoy = new Date();
    const fechaSerial = Math.round((Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) - Date.UTC(1899, 11, 30)) / 86400000);

    ws["A1"] = { v: titulo, t: "s", s: estTitulo };
    ws["A2"] = { v: fechaSerial, t: "n", s: { ...estTitulo, numFmt: "DD/MM/YYYY" } };
    ws["A3"] = { v: "", t: "s" };
    headers.forEach((h, i) => { ws[`${cols[i]}4`] = { v: h, t: "s", s: estHeader }; });

    registrosFiltrados.forEach((r, idx) => {
      const row = idx + 5;
      ws[`A${row}`] = { v: r.cubierta?.nombreCubierta || "-", t: "s", s: estCentro };
      ws[`B${row}`] = { v: r.maquinaLabel || r.maquina?.maquina || "-", t: "s", s: estCentro };
      ws[`C${row}`] = { v: r.observaciones || "-", t: "s", s: estCentro };
    });

    const lastRow = Math.max(registrosFiltrados.length + 4, 4);
    ws["!ref"] = `A1:C${lastRow}`;
    ws["!cols"] = [{ wch: 22 }, { wch: 22 }, { wch: 28 }];

    XLSXStyle.utils.book_append_sheet(wb, ws, titulo.substring(0, 31));
    XLSXStyle.writeFile(wb, `${titulo}.xlsx`);
  };

  if (cargando) return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <div className="w-75 mx-auto my-2">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">{titulo}</h6>
        <Button size="sm" variant="outline-success" onClick={() => navigate(-1)}>Volver</Button>
      </div>

      <div className="d-flex justify-content-between mb-2">
        <div className="d-flex gap-2">
          <Button size="sm" variant="outline-success" onClick={abrirAlta}>+ Alta de cubierta</Button>
          <Button size="sm" variant="outline-secondary" onClick={() => setShowListado(true)}>Listado cubiertas</Button>
          {hayResumen && (
            <Button size="sm" variant="outline-info" onClick={() => setShowResumen(true)}>Resumen</Button>
          )}
        </div>
        <div className="d-flex gap-2">
          <Button size="sm" variant="outline-light" onClick={exportarExcel}>Excel</Button>
          <Button size="sm" variant="outline-primary" onClick={abrirNueva}>+ Nueva cubierta</Button>
        </div>
      </div>

      <div className="d-flex gap-2 mb-2">
        <Form.Control
          size="sm"
          type="search"
          placeholder="Nombre cubierta..."
          value={filtroCubierta}
          onChange={(e) => setFiltroCubierta(e.target.value)}
          style={{ width: "220px" }}
        />
        <Form.Control
          size="sm"
          type="search"
          placeholder="Máquina..."
          value={filtroMaquina}
          onChange={(e) => setFiltroMaquina(e.target.value)}
          style={{ width: "220px" }}
        />
        <Form.Check
          type="switch"
          id="switch-desechadas"
          label="Ver desechadas"
          checked={mostrarDesechadas}
          onChange={(e) => setMostrarDesechadas(e.target.checked)}
          className="ms-2 align-self-center"
        />
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
            {registrosFiltrados.length === 0 ? (
              <tr><td colSpan={4} className="text-muted py-3">Sin cubiertas registradas</td></tr>
            ) : (
              registrosFiltrados.map((r) => (
                <tr key={r._id}>
                  <td style={r.maquinaLabel === "Desechada" ? { textDecoration: "line-through", textDecorationColor: "red", textDecorationThickness: "1px", color: "white" } : r.maquinaLabel === "Perdida" ? { textDecoration: "line-through", textDecorationColor: "#ffc107", textDecorationThickness: "2px", color: "white" } : {}}>{r.cubierta?.nombreCubierta || "-"}</td>
                  <td style={r.maquinaLabel === "Desechada" ? { textDecoration: "line-through", textDecorationColor: "red", textDecorationThickness: "1px", color: "white" } : r.maquinaLabel === "Perdida" ? { textDecoration: "line-through", textDecorationColor: "#ffc107", textDecorationThickness: "2px", color: "white" } : {}}>{r.maquinaLabel || r.maquina?.maquina || "-"}</td>
                  <td>{r.observaciones || "-"}</td>
                  <td>
                    <div className="d-flex gap-1 justify-content-center">
                      <Button size="sm" variant="outline-success" onClick={() => { setRegistroVer(r); setShowVer(true); }}>Ver</Button>
                      <Button size="sm" variant="outline-warning" onClick={() => abrirEditar(r)}>Editar</Button>
                      <Button size="sm" variant="outline-info" onClick={() => abrirHistorial(r)}>Historial</Button>
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
                className="w-50 mx-auto text-center"
                value={formAlta.nombreCubierta}
                onChange={(e) => setFormAlta((p) => ({ ...p, nombreCubierta: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3 text-center">
              <Form.Label>Fecha <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="date"
                className="w-50 mx-auto text-center"
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

      {/* ── Modal Resumen ── */}
      <Modal show={showResumen} onHide={() => setShowResumen(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Resumen - {titulo}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {resumen.length === 0 ? (
            <p className="text-muted text-center">Sin cubiertas registradas.</p>
          ) : (
            <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
              <Table striped bordered hover className="text-center align-middle mb-0" size="sm">
                <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                  <tr>
                    <th>Máquina</th>
                    <th>Cantidad de cubiertas</th>
                    <th>Fecha</th>
                    <th>Observaciones</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.map((g) => (
                    <tr key={g.maquina}>
                      <td>{g.maquina}</td>
                      <td>{g.cantidad}</td>
                      <td>{g.fecha ? new Date(g.fecha + "T12:00:00").toLocaleDateString("es-AR") : "-"}</td>
                      <td className={g.alerta ? "text-danger fw-semibold" : ""}>{g.alerta || "-"}</td>
                      <td>
                        <Button size="sm" variant="outline-success" onClick={() => setDetalleResumen(g)} disabled={g.cantidad === 0}>Ver</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={() => setShowResumen(false)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>

      {/* ── Modal Detalle del resumen (cubiertas de una máquina) ── */}
      <Modal show={!!detalleResumen} onHide={() => setDetalleResumen(null)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Cubiertas de {detalleResumen?.maquina || ""}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!detalleResumen || detalleResumen.items.length === 0 ? (
            <p className="text-muted text-center">Sin cubiertas asignadas.</p>
          ) : (
            <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
              <Table striped bordered hover className="text-center align-middle mb-0" size="sm">
                <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                  <tr>
                    <th>Nombre cubierta</th>
                    <th>Fecha</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {detalleResumen.items.map((it, i) => (
                    <tr key={i}>
                      <td>{it.nombreCubierta}</td>
                      <td>{it.fecha ? new Date(it.fecha + "T12:00:00").toLocaleDateString("es-AR") : "-"}</td>
                      <td>{it.observaciones || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={() => setDetalleResumen(null)}>Cerrar</Button>
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
                {opcionesMaquina.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
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
                    className="text-center"
                    value={formEditar.maquina}
                    onChange={(e) => setFormEditar((p) => ({ ...p, maquina: e.target.value }))}
                  >
                    <option value="">Seleccionar...</option>
                    {opcionesMaquina.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Form.Select>
                </td>
                <td>
                  <Form.Control
                    size="sm"
                    type="date"
                    className="text-center"
                    value={formEditar.fecha}
                    onChange={(e) => setFormEditar((p) => ({ ...p, fecha: e.target.value }))}
                  />
                </td>
                <td>
                  <Form.Control
                    size="sm"
                    type="text"
                    className="text-center"
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
          {loadingHistorial ? (
            <div className="text-center py-3"><Spinner animation="border" size="sm" /></div>
          ) : historialData.length === 0 ? (
            <p className="text-muted text-center">Sin cambios registrados todavía.</p>
          ) : (
            <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
              <Table striped bordered hover size="sm" className="text-center align-middle mb-0">
                <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                  <tr>
                    <th>Máquina</th>
                    <th>Fecha</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {[...historialData].reverse().map((h, i) => (
                    <tr key={i}>
                      <td>{h.maquinaLabel || h.maquina?.maquina || "-"}</td>
                      <td>{
                        h.esActual
                          ? (h.editadoEn ? new Date(h.editadoEn).toLocaleDateString("es-AR") : "-")
                          : (h.fecha ? new Date(h.fecha + "T12:00:00").toLocaleDateString("es-AR") : "-")
                      }</td>
                      <td>{h.observaciones || "-"}</td>
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
