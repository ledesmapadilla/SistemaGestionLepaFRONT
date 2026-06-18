import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Table, Form, Spinner, Modal } from "react-bootstrap";
import { listarPersonal } from "../../../../../helpers/queriesPersonal.js";
import { obtenerAsistenciaPorFecha } from "../../../../../helpers/queriesAsistencia.js";
import { obtenerGastoSemanalPorSemana, guardarGastoSemanal } from "../../../../../helpers/queriesGastoSemanal.js";
import { obtenerCuentaCorrienteProveedor } from "../../../../../helpers/queriesCuentaCorrienteProveedor.js";
import { calcularHorometroZamorano, horometroStrAMins } from "../../../../../helpers/horometroUtils.js";
import XLSXStyle from "xlsx-js-style";
import Swal from "sweetalert2";
import "../../../../../styles/clientes.css";

const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatFecha = (date) =>
  `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;

const toKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const netoExtras = (extras) =>
  (extras || []).reduce((s, e) => s + (e.descuentaAumenta === "aumenta" ? 1 : -1) * (Number(e.monto) || 0), 0);

const calcularPagar = (r) =>
  (Number(r.semanal) || 0) - (Number(r.ausentismo) || 0) + netoExtras(r.extras);

const pesos = (n) => {
  const v = Math.round(Number(n)) || 0;
  return v.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
};

const formVacio = () => ({
  fecha: new Date().toLocaleDateString("en-CA"),
  descuentaAumenta: "aumenta",
  monto: 0,
  detalle: "",
});

const CeldaMoneda = ({ value, onChange, textStyle = {}, defaultValue }) => {
  const [editando, setEditando] = useState(false);
  const [editValue, setEditValue] = useState("");

  const iniciarEdicion = () => {
    const raw = Number(value) === 0 && defaultValue !== undefined ? defaultValue : value;
    setEditValue(Number(raw) === 0 ? "" : pesos(raw));
    setEditando(true);
  };

  const confirmar = () => {
    const parsed = Number(editValue.replace(/[^\d]/g, "")) || 0;
    onChange(parsed);
    setEditando(false);
  };

  if (editando) {
    return (
      <Form.Control
        size="sm"
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
        autoFocus
        className="text-center"
        style={{ fontSize: "0.72rem" }}
      />
    );
  }
  return (
    <div
      onClick={iniciarEdicion}
      className="text-center"
      style={{ cursor: "pointer", minHeight: 31, padding: "4px 8px", border: "1px solid #495057", borderRadius: 4, background: "#2b3035", color: "#dee2e6", ...textStyle }}
    >
      {pesos(value || 0)}
    </div>
  );
};

const ExtrasModal = ({ show, onHide, personalNombre, extras: extrasInicial, onGuardar }) => {
  const [extras, setExtras] = useState([]);
  const [editandoIdx, setEditandoIdx] = useState(null);
  const [form, setForm] = useState(formVacio());

  useEffect(() => {
    if (show) {
      setExtras(extrasInicial || []);
      setEditandoIdx(null);
    }
  }, [show]);

  const iniciarAgregar = () => {
    setForm(formVacio());
    setEditandoIdx("nuevo");
  };

  const iniciarEditar = (idx) => {
    const e = extras[idx];
    setForm({ fecha: e.fecha || new Date().toLocaleDateString("en-CA"), descuentaAumenta: e.descuentaAumenta || "aumenta", monto: e.monto ?? 0, detalle: e.detalle || "" });
    setEditandoIdx(idx);
  };

  const cancelar = () => setEditandoIdx(null);

  const confirmar = () => {
    if (!form.monto) return;
    const entrada = { ...form, monto: Number(form.monto) };
    if (editandoIdx === "nuevo") {
      setExtras((prev) => [...prev, entrada]);
    } else {
      setExtras((prev) => prev.map((e, i) => (i === editandoIdx ? entrada : e)));
    }
    setEditandoIdx(null);
  };

  const borrar = (idx) => setExtras((prev) => prev.filter((_, i) => i !== idx));

  const handleGuardar = () => {
    onGuardar(extras);
    onHide();
  };

  const neto = netoExtras(extras);

  const celdasForm = [
    <td key="fecha">
      <Form.Control size="sm" type="date" value={form.fecha} onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))} />
    </td>,
    <td key="efecto">
      <Form.Select size="sm" value={form.descuentaAumenta} onChange={(e) => setForm((f) => ({ ...f, descuentaAumenta: e.target.value }))}>
        <option value="aumenta">Aumenta</option>
        <option value="descuenta">Descuenta</option>
      </Form.Select>
    </td>,
    <td key="monto">
      <CeldaMoneda value={form.monto} onChange={(v) => setForm((f) => ({ ...f, monto: v }))} />
    </td>,
    <td key="detalle">
      <Form.Control size="sm" type="text" value={form.detalle} onChange={(e) => setForm((f) => ({ ...f, detalle: e.target.value }))} />
    </td>,
    <td key="acciones">
      <div className="d-flex gap-1 justify-content-center align-items-center">
        <Button size="sm" variant="outline-success" onClick={confirmar}>✓</Button>
        <Button size="sm" variant="outline-secondary" onClick={cancelar}>✕</Button>
      </div>
    </td>,
  ];

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Extras - {personalNombre}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div style={{ maxHeight: "55vh", overflowY: "auto" }}>
          <Table striped bordered hover size="sm" className="text-center align-middle mb-0">
            <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
              <tr>
                <th>Fecha</th>
                <th>Efecto</th>
                <th>Monto</th>
                <th style={{ minWidth: 220 }}>Detalle</th>
                <th style={{ width: 130 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {extras.map((e, idx) =>
                editandoIdx === idx ? (
                  <tr key={idx}>{celdasForm}</tr>
                ) : (
                  <tr key={idx}>
                    <td>{e.fecha ? e.fecha.split("-").reverse().join("/") : "-"}</td>
                    <td style={{ color: e.descuentaAumenta === "aumenta" ? "#198754" : "#dc3545", fontWeight: 600 }}>
                      {e.descuentaAumenta === "aumenta" ? "Aumenta" : "Descuenta"}
                    </td>
                    <td>{pesos(e.monto)}</td>
                    <td>{e.detalle || "-"}</td>
                    <td>
                      <div className="d-flex gap-1 justify-content-center align-items-center">
                        <Button size="sm" variant="outline-warning" onClick={() => iniciarEditar(idx)} disabled={editandoIdx !== null}>Editar</Button>
                        <Button size="sm" variant="outline-danger" onClick={() => borrar(idx)} disabled={editandoIdx !== null}>Borrar</Button>
                      </div>
                    </td>
                  </tr>
                )
              )}
              {editandoIdx === "nuevo" && <tr>{celdasForm}</tr>}
            </tbody>
          </Table>
        </div>
        <div className="d-flex justify-content-between align-items-center mt-3">
          <Button variant="outline-primary" size="sm" onClick={iniciarAgregar} disabled={editandoIdx !== null}>
            + Agregar
          </Button>
          <span>
            Neto extras:{" "}
            <strong style={{ color: neto >= 0 ? "#198754" : "#dc3545" }}>{pesos(neto)}</strong>
          </span>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide}>Cancelar</Button>
        <Button variant="outline-success" onClick={handleGuardar}>Guardar</Button>
      </Modal.Footer>
    </Modal>
  );
};

const ProveedoresModal = ({ show, onHide, proveedoresGuardados, onGuardar }) => {
  const [filas, setFilas] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [cargando, setCargando] = useState(false);
  const keyRef = useRef(0);

  useEffect(() => {
    if (!show) return;
    let activo = true;
    const cargar = async () => {
      setCargando(true);
      setFiltro("");
      let resumen = [];
      try {
        const data = await obtenerCuentaCorrienteProveedor();
        const movs = Array.isArray(data) ? data : [];
        const provs = [...new Set(movs.map((m) => m.proveedor).filter(Boolean))];
        resumen = provs
          .map((prov) => {
            const ms = movs.filter((m) => m.proveedor === prov);
            const debito = ms.reduce((s, m) => s + (m.debito || 0), 0);
            const credito = ms.reduce((s, m) => s + (m.credito || 0), 0);
            return { proveedor: prov, deuda: debito - credito };
          })
          .filter((r) => r.deuda > 0)
          .sort((a, b) => a.proveedor.localeCompare(b.proveedor));
      } catch (e) {
        console.error("Error cargando deudas de proveedores:", e);
      }
      if (!activo) return;

      const guardadosMap = {};
      (proveedoresGuardados || []).forEach((g) => {
        if (g.proveedor) guardadosMap[g.proveedor.trim().toLowerCase()] = g;
      });
      const filasDeuda = resumen.map((r) => {
        const g = guardadosMap[r.proveedor.trim().toLowerCase()];
        return { _k: keyRef.current++, proveedor: r.proveedor, deuda: r.deuda, pago: g?.pago || 0, observaciones: g?.observaciones || "", libre: false, seleccionado: false, marcado: g?.marcado || 0 };
      });
      const yaEstan = new Set(filasDeuda.map((f) => f.proveedor.trim().toLowerCase()));
      const filasExtra = (proveedoresGuardados || [])
        .filter((g) => g.libre || !g.proveedor || !yaEstan.has(g.proveedor.trim().toLowerCase()))
        .map((g) => ({ _k: keyRef.current++, proveedor: g.proveedor || "", deuda: g.deuda || 0, pago: g.pago || 0, observaciones: g.observaciones || "", libre: true, seleccionado: false, marcado: g.marcado || 0 }));
      setFilas([...filasDeuda, ...filasExtra]);
      setCargando(false);
    };
    cargar();
    return () => { activo = false; };
  }, [show]);

  const actualizar = (idx, campo, valor) =>
    setFilas((prev) => prev.map((f, i) => (i === idx ? { ...f, [campo]: valor } : f)));

  const agregar = () =>
    setFilas((prev) => [...prev, { _k: keyRef.current++, proveedor: "", deuda: 0, pago: 0, observaciones: "", libre: true, seleccionado: false, marcado: 0 }]);

  const toggleMarcado = (idx) => {
    const fila = filas[idx];
    const actual = fila?.marcado || 0;
    if (actual === 2) {
      Swal.fire({
        icon: "warning",
        title: "¿Desea anular el pago del proveedor?",
        showCancelButton: true,
        confirmButtonText: "Sí, anular",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#dc3545",
      }).then((res) => {
        if (res.isConfirmed) {
          setFilas((prev) => prev.map((f, i) => (i === idx ? { ...f, marcado: 0, pago: 0 } : f)));
        }
      });
      return;
    }
    const siguiente = (actual + 1) % 3;
    if (siguiente === 2 && (Number(fila?.pago) || 0) === 0) {
      Swal.fire({
        position: "center",
        icon: "info",
        title: "El pago del proveedor está en cero",
        showConfirmButton: false,
        timer: 1800,
        timerProgressBar: true,
      });
      return;
    }
    setFilas((prev) => prev.map((f, i) => (i === idx ? { ...f, marcado: siguiente } : f)));
    if (siguiente === 2) {
      Swal.fire({
        position: "center",
        icon: "success",
        title: "Pago de proveedor realizado",
        showConfirmButton: false,
        timer: 1800,
        timerProgressBar: true,
      });
    }
  };

  const borrar = (idx) => {
    const fila = filas[idx];
    setFilas((prev) => prev.filter((_, i) => i !== idx));
    Swal.fire({
      position: "center",
      icon: "success",
      title: `Se quitó ${fila?.proveedor || "la fila"} de la planilla`,
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
    });
  };

  const handleGuardar = () => {
    const aGuardar = filas
      .filter((f) => (Number(f.pago) || 0) > 0 || f.observaciones || (f.marcado || 0) > 0 || (f.libre && (f.proveedor || Number(f.deuda) > 0)))
      .map((f) => ({
        proveedor: f.proveedor,
        deuda: Number(f.deuda) || 0,
        pago: Number(f.pago) || 0,
        observaciones: f.observaciones || "",
        libre: !!f.libre,
        marcado: f.marcado || 0,
      }));
    onGuardar(aGuardar);
    onHide();
  };

  const toggleSel = (idx) =>
    setFilas((prev) => prev.map((f, i) => (i === idx ? { ...f, seleccionado: !f.seleccionado } : f)));

  const totalDeuda = filas.reduce((s, f) => s + (Number(f.deuda) || 0), 0);
  const totalPago = filas.reduce((s, f) => s + (Number(f.pago) || 0), 0);
  const totalSaldo = totalDeuda - totalPago;
  const sumaSeleccion = filas.filter((f) => f.seleccionado).reduce((s, f) => s + (Number(f.pago) || 0), 0);

  const filasVisibles = filas
    .map((f, idx) => ({ f, idx }))
    .filter(({ f }) => f.libre || !filtro || f.proveedor.toLowerCase().includes(filtro.toLowerCase()));

  return (
    <Modal show={show} onHide={onHide} centered size="xl">
      <Modal.Header closeButton>
        <div className="d-flex align-items-center w-100" style={{ marginRight: 32 }}>
          <Modal.Title className="flex-shrink-0">Gastos Proveedores</Modal.Title>
          <div className="flex-grow-1 d-flex justify-content-center">
            <Form.Control
              size="sm"
              type="text"
              placeholder="Buscar proveedor..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              style={{ maxWidth: 260 }}
            />
          </div>
        </div>
      </Modal.Header>
      <Modal.Body>
        {cargando ? (
          <Spinner animation="border" className="d-block mx-auto my-5" />
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }} className="mb-2">
              <Button variant="outline-primary" size="sm" onClick={agregar} style={{ justifySelf: "start" }}>+ Agregar fila</Button>
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted" style={{ fontSize: "0.85rem" }}>Total a Pagar</span>
                <div style={{ minWidth: 130, padding: "4px 12px", border: "1px solid #495057", borderRadius: 4, background: "#2b3035", color: "#ffc107", fontWeight: 400, textAlign: "center", fontSize: "0.95rem" }}>
                  {pesos(totalPago)}
                </div>
              </div>
              <div className="d-flex align-items-center gap-2" style={{ justifySelf: "end" }}>
                <span className="text-muted" style={{ fontSize: "0.85rem" }}>Suma</span>
                <div style={{ minWidth: 130, padding: "4px 12px", border: "1px solid #495057", borderRadius: 4, background: "#2b3035", color: "#ffc107", fontWeight: 600, textAlign: "center", fontSize: "0.95rem" }}>
                  {pesos(sumaSeleccion)}
                </div>
              </div>
            </div>
            <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "60vh" }}>
              <Table striped bordered hover size="sm" className="text-center align-middle mb-0">
                <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                  <tr>
                    <th className="fw-normal" style={{ width: 32 }}></th>
                    <th className="fw-normal" style={{ minWidth: 200 }}>Proveedor</th>
                    <th className="fw-normal" style={{ minWidth: 120 }}>Deuda</th>
                    <th className="fw-normal" style={{ minWidth: 120 }}>Pago</th>
                    <th className="fw-normal" style={{ minWidth: 120 }}>Saldo</th>
                    <th className="fw-normal" style={{ minWidth: 200 }}>Observaciones</th>
                    <th className="fw-normal" style={{ width: 50 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filasVisibles.map(({ f, idx }) => {
                    const saldo = (Number(f.deuda) || 0) - (Number(f.pago) || 0);
                    return (
                      <tr key={f._k}>
                        <td className="text-center">
                          <span
                            onClick={() => toggleSel(idx)}
                            style={{ cursor: "pointer", fontSize: 18, color: f.seleccionado ? "#198754" : "#495057", userSelect: "none", lineHeight: 1 }}
                          >●</span>
                        </td>
                        <td className="text-start">
                          {f.libre ? (
                            <Form.Control size="sm" type="text" value={f.proveedor} placeholder="Proveedor..." onChange={(e) => actualizar(idx, "proveedor", e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }} />
                          ) : (
                            <span
                              onClick={() => toggleMarcado(idx)}
                              style={{ cursor: "pointer", userSelect: "none", color: f.marcado === 1 ? "#ffc107" : "#dee2e6", position: "relative", display: "inline-block" }}
                            >
                              {f.proveedor}
                              {f.marcado === 2 && (
                                <span style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 2, background: "#ffc107", pointerEvents: "none" }} />
                              )}
                            </span>
                          )}
                        </td>
                        <td>
                          {f.libre ? (
                            <CeldaMoneda value={f.deuda} onChange={(v) => actualizar(idx, "deuda", v)} />
                          ) : (
                            pesos(f.deuda || 0)
                          )}
                        </td>
                        <td><CeldaMoneda value={f.pago || 0} onChange={(v) => actualizar(idx, "pago", v)} defaultValue={Number(f.deuda) || 0} /></td>
                        <td style={{ color: saldo > 0 ? "#ffc107" : saldo < 0 ? "#dc3545" : "#198754" }}>
                          {pesos(saldo)}
                        </td>
                        <td>
                          <Form.Control size="sm" type="text" value={f.observaciones} onChange={(e) => actualizar(idx, "observaciones", e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }} />
                        </td>
                        <td>
                          <span
                            onClick={() => borrar(idx)}
                            style={{ cursor: "pointer", color: "#dc3545", fontWeight: 900, fontSize: 16, userSelect: "none" }}
                          >✕</span>
                        </td>
                      </tr>
                    );
                  })}
                  {filasVisibles.length === 0 && (
                    <tr><td colSpan={7} className="text-muted py-3">Sin proveedores con deuda.</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="table-dark" style={{ borderTop: "2px solid #ffc107" }}>
                    <td />
                    <td className="text-start">Total</td>
                    <td>{pesos(totalDeuda)}</td>
                    <td>{pesos(totalPago)}</td>
                    <td style={{ color: totalSaldo > 0 ? "#ffc107" : totalSaldo < 0 ? "#dc3545" : "#198754" }}>{pesos(totalSaldo)}</td>
                    <td />
                    <td />
                  </tr>
                </tfoot>
              </Table>
            </div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide}>Cancelar</Button>
        <Button variant="outline-success" onClick={handleGuardar}>Guardar</Button>
      </Modal.Footer>
    </Modal>
  );
};

const GastosSemanales = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [lunes] = useState(() => {
    const semana = searchParams.get("semana");
    if (semana) {
      const [y, m, d] = semana.split("-").map(Number);
      return getMonday(new Date(y, m - 1, d));
    }
    return getMonday(new Date());
  });
  const [loading, setLoading] = useState(true);
  const [registros, setRegistros] = useState([]);
  const [nombresPersonal, setNombresPersonal] = useState(new Set());
  const [asistenciaSemana, setAsistenciaSemana] = useState([]);
  const [verPersonal, setVerPersonal] = useState(null);
  const [verExtras, setVerExtras] = useState(null);
  const [verProveedores, setVerProveedores] = useState(false);
  const [proveedoresGuardados, setProveedoresGuardados] = useState([]);
  const modificado = useRef(false);
  const autoSaveTimer = useRef(null);

  const semanaKey = toKey(lunes);
  const domingo = new Date(lunes);
  domingo.setDate(domingo.getDate() + 6);
  const labelSemana = `${formatFecha(lunes)} al ${formatFecha(domingo)}/${domingo.getFullYear()}`;

  const cargarSemana = useCallback(async (fechaLunes) => {
    setLoading(true);
    const key = toKey(fechaLunes);

    const diasSemana = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(fechaLunes);
      d.setDate(d.getDate() + i);
      return d;
    });

    const [resP, resG, ...asistenciaRaws] = await Promise.all([
      listarPersonal(),
      obtenerGastoSemanalPorSemana(key),
      ...diasSemana.map((d) => obtenerAsistenciaPorFecha(toKey(d))),
    ]);

    const [personal, gastoDoc, ...asistenciaDocs] = await Promise.all([
      resP?.ok ? resP.json() : Promise.resolve([]),
      resG?.ok ? resG.json() : Promise.resolve(null),
      ...asistenciaRaws.map((r) => r?.ok ? r.json() : Promise.resolve(null)),
    ]);

    const sabado = new Date(fechaLunes);
    sabado.setDate(sabado.getDate() + 5);
    const sabadoKey = toKey(sabado);
    const personalVisible = personal.filter((p) =>
      !p.createdAt || p.createdAt.slice(0, 10) <= sabadoKey
    );
    const nombresPersonalDB = new Set(personalVisible.map((p) => p.nombre.trim().toLowerCase()));

    const ausenciasMap = {};
    diasSemana.forEach((d, idx) => {
      const esSabado = d.getDay() === 6;
      const doc = asistenciaDocs[idx];
      if (!doc?.registros) return;
      doc.registros.forEach((r) => {
        if (!r.personal) return;
        const k = r.personal.trim().toLowerCase();
        if (!ausenciasMap[k]) ausenciasMap[k] = 0;
        if (r.ausente) ausenciasMap[k] += esSabado ? 0.5 : 1;
        if (r.mediaFalta) ausenciasMap[k] += 0.5;
      });
    });

    const jornalMap = {};
    const semanalMap = {};
    personalVisible.forEach((p) => {
      const ultimo = p.semanal?.length ? p.semanal[p.semanal.length - 1] : null;
      const semanal = ultimo ? ultimo.valor : 0;
      const cant = ultimo ? Number(ultimo.cantJornales || 0) : 0;
      jornalMap[p.nombre.trim().toLowerCase()] = cant > 0 ? semanal / cant : 0;
      semanalMap[p.nombre.trim().toLowerCase()] = semanal;
    });

    let zamoranoMins = 0;
    diasSemana.forEach((d, idx) => {
      const esSabado = d.getDay() === 6;
      const doc = asistenciaDocs[idx];
      if (!doc?.registros) return;
      const reg = doc.registros.find((r) => r.personal?.toLowerCase().includes("zamorano"));
      if (!reg) return;
      if (reg.ausente) {
        zamoranoMins += esSabado ? 240 : 480;
      } else if (reg.mediaFalta) {
        zamoranoMins += 240;
      } else {
        zamoranoMins += horometroStrAMins(calcularHorometroZamorano(reg.entra, reg.sale));
      }
    });

    const nombresEnAsistencia = new Set();
    asistenciaDocs.forEach((doc) => {
      if (!doc?.registros) return;
      doc.registros.forEach((r) => { if (r.personal) nombresEnAsistencia.add(r.personal.trim()); });
    });
    const soloEnAsistencia = Array.from(nombresEnAsistencia)
      .filter((n) => !nombresPersonalDB.has(n.trim().toLowerCase()));

    setNombresPersonal(nombresPersonalDB);

    const calcAusentismo = (nombre) => {
      const key = nombre.trim().toLowerCase();
      if (nombre.toLowerCase().includes("zamorano")) {
        const semanal = semanalMap[key] || 0;
        const horas = zamoranoMins / 60;
        return Math.round(horas * (semanal / 44));
      }
      const jornal = jornalMap[key] || 0;
      const ausencias = ausenciasMap[key] || 0;
      return Math.round(ausencias * jornal);
    };

    const filaDePersonal = (p) => {
      const semanal = p.semanal?.length ? p.semanal[p.semanal.length - 1].valor : 0;
      return { personal: p.nombre, semanal, ausentismo: calcAusentismo(p.nombre), extras: [], observaciones: "", pagado: 0, marcado: 0, seleccionado: false };
    };
    const filaSoloAsistencia = (nombre) => ({
      personal: nombre, semanal: 0, ausentismo: calcAusentismo(nombre), extras: [], observaciones: "", pagado: 0, marcado: 0, seleccionado: false,
    });

    const semanalActualMap = {};
    personalVisible.forEach((p) => {
      const ultimo = p.semanal?.length ? p.semanal[p.semanal.length - 1] : null;
      semanalActualMap[p.nombre.trim().toLowerCase()] = ultimo ? ultimo.valor : null;
    });

    if (gastoDoc?.registros?.length) {
      const existentes = gastoDoc.registros.map((r) => {
        const semanalActual = semanalActualMap[r.personal?.trim().toLowerCase()];
        return {
          ...r,
          extras: r.extras || [],
          semanal: semanalActual !== null && semanalActual !== undefined ? semanalActual : r.semanal,
          ausentismo: calcAusentismo(r.personal),
        };
      });
      const nombresExistentes = new Set(existentes.map((r) => r.personal.trim().toLowerCase()));
      const nuevosDePersonal = personalVisible
        .filter((p) => !nombresExistentes.has(p.nombre.trim().toLowerCase()))
        .map(filaDePersonal);
      const nuevosDeAsistencia = soloEnAsistencia
        .filter((n) => !nombresExistentes.has(n.trim().toLowerCase()))
        .map(filaSoloAsistencia);
      setRegistros([...existentes, ...nuevosDePersonal, ...nuevosDeAsistencia]);
    } else {
      const filasPersonal = personalVisible.map(filaDePersonal);
      const filasAsistencia = soloEnAsistencia.map(filaSoloAsistencia);
      setRegistros([...filasPersonal, ...filasAsistencia]);
    }
    setAsistenciaSemana(asistenciaDocs);
    setProveedoresGuardados(gastoDoc?.proveedores || []);
    modificado.current = false;
    setLoading(false);
  }, []);

  useEffect(() => {
    cargarSemana(lunes);
  }, [lunes, cargarSemana]);

  const actualizar = (idx, campo, valor) => {
    modificado.current = true;
    setRegistros((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [campo]: valor } : r))
    );
  };

  const actualizarYGuardar = (idx, campo, valor) => {
    const nuevos = registros.map((r, i) => (i === idx ? { ...r, [campo]: valor } : r));
    setRegistros(nuevos);
    guardarGastoSemanal(semanaKey, nuevos);
  };

  useEffect(() => {
    if (!modificado.current || loading) return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      await guardarGastoSemanal(semanaKey, registros);
      modificado.current = false;
    }, 2000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [registros, loading, semanaKey]);

  const totalSemanal = registros.reduce((s, r) => s + (Number(r.semanal) || 0), 0);
  const totalAusentismo = registros.reduce((s, r) => s + (Number(r.ausentismo) || 0), 0);
  const totalExtrasNeto = registros.reduce((s, r) => s + netoExtras(r.extras), 0);
  const totalPagar = registros.reduce((s, r) => s + calcularPagar(r), 0);
  const totalPagado = registros.reduce((s, r) => s + (Number(r.pagado) || 0), 0);
  const totalProveedores = proveedoresGuardados.reduce((s, p) => s + (Number(p.pago) || 0), 0);
  const totalGeneral = totalPagar + totalProveedores;

  const exportarExcel = () => {
    const titulo = `Gastos Semanales - ${labelSemana}`;
    const headers = ["Personal", "Semanal Teórico", "Ausentismo", "Extras", "A Pagar", "Pagado", "Observaciones"];
    const cols = "ABCDEFG";
    const moneda = { numFmt: "#,##0" };
    const estCentro = { alignment: { horizontal: "center", vertical: "center" } };
    const estIzq = { alignment: { horizontal: "left", vertical: "center" } };
    const estHeader = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "222222" } }, alignment: { horizontal: "center", vertical: "center" } };
    const estTitulo = { font: { bold: true, sz: 13 }, alignment: { horizontal: "left", vertical: "center" } };
    const estTotal = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "222222" } }, alignment: { horizontal: "center", vertical: "center" }, numFmt: "#,##0" };

    const wb = XLSXStyle.utils.book_new();
    const ws = {};

    const hoy = new Date();
    const fechaSerial = Math.round((Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) - Date.UTC(1899, 11, 30)) / 86400000);

    ws["A1"] = { v: titulo, t: "s", s: estTitulo };
    ws["A2"] = { v: fechaSerial, t: "n", s: { ...estTitulo, numFmt: "DD/MM/YYYY" } };
    ws["A3"] = { v: "", t: "s" };
    headers.forEach((h, i) => { ws[`${cols[i]}4`] = { v: h, t: "s", s: estHeader }; });

    registros.forEach((r, rowIdx) => {
      const row = rowIdx + 5;
      ws[`A${row}`] = { v: r.personal || "", t: "s", s: estIzq };
      ws[`B${row}`] = { v: Number(r.semanal) || 0, t: "n", s: { ...estCentro, ...moneda } };
      ws[`C${row}`] = { v: Number(r.ausentismo) || 0, t: "n", s: { ...estCentro, ...moneda } };
      ws[`D${row}`] = { v: netoExtras(r.extras), t: "n", s: { ...estCentro, ...moneda } };
      ws[`E${row}`] = { v: calcularPagar(r), t: "n", s: { ...estCentro, ...moneda } };
      ws[`F${row}`] = { v: Number(r.pagado) || 0, t: "n", s: { ...estCentro, ...moneda } };
      ws[`G${row}`] = { v: r.observaciones || "", t: "s", s: estCentro };
    });

    const totalRow = registros.length + 5;
    ws[`A${totalRow}`] = { v: "Total", t: "s", s: estTotal };
    ws[`B${totalRow}`] = { v: totalSemanal, t: "n", s: { ...estTotal, ...moneda } };
    ws[`C${totalRow}`] = { v: totalAusentismo, t: "n", s: { ...estTotal, ...moneda } };
    ws[`D${totalRow}`] = { v: totalExtrasNeto, t: "n", s: { ...estTotal, ...moneda } };
    ws[`E${totalRow}`] = { v: totalPagar, t: "n", s: { ...estTotal, ...moneda } };
    ws[`F${totalRow}`] = { v: totalPagado, t: "n", s: { ...estTotal, ...moneda } };
    ws[`G${totalRow}`] = { v: "", t: "s", s: estTotal };

    ws["!ref"] = `A1:G${Math.max(totalRow, 4)}`;
    ws["!cols"] = [{ wch: 24 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 28 }];

    XLSXStyle.utils.book_append_sheet(wb, ws, "Gastos Semanales");
    XLSXStyle.writeFile(wb, `GastosSemanales_${semanaKey}.xlsx`);
  };

  return (
    <div className="container mt-4 w-75">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Gastos Semanales <small className="text-muted" style={{ fontSize: "1rem", fontWeight: 400 }}>{labelSemana}</small></h2>
        <div className="d-flex gap-2">
          <Button variant="outline-light" onClick={exportarExcel}>Excel</Button>
          <Button variant="outline-primary" onClick={() => navigate("/personal/asistencia")}>Asistencia</Button>
        </div>
      </div>

      {loading ? (
        <Spinner animation="border" className="d-block mx-auto my-5" />
      ) : (
        <>
          <div className="d-flex justify-content-center align-items-center gap-4 mb-3 flex-wrap">
            {[
              { label: "Total Personal", valor: totalPagar, principal: false },
              { label: "Total Proveedores", valor: totalProveedores, principal: false },
              { label: "Total General", valor: totalGeneral, principal: true },
            ].map((t) => (
              <div key={t.label} className="d-flex align-items-center gap-2">
                <span className="text-muted" style={{ fontSize: t.principal ? "0.85rem" : "0.75rem" }}>{t.label}:</span>
                <div style={{ minWidth: t.principal ? 130 : 110, padding: "4px 12px", border: "1px solid #495057", borderRadius: 4, background: "#2b3035", color: t.principal ? "#ffc107" : "#9ca3af", textAlign: "center", fontSize: t.principal ? "0.95rem" : "0.8rem" }}>
                  {pesos(t.valor)}
                </div>
              </div>
            ))}
          </div>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="d-flex gap-2">
              <Button variant="outline-primary" size="sm" onClick={() => {
                modificado.current = true;
                setRegistros((prev) => [...prev, { personal: "", semanal: 0, ausentismo: 0, extras: [], observaciones: "", pagado: 0, marcado: 0, seleccionado: false, nuevo: true }]);
              }}>+ Agregar personal</Button>
              <Button variant="outline-info" size="sm" onClick={() => setVerProveedores(true)}>Gastos Proveedores</Button>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="text-muted" style={{ fontSize: "0.85rem" }}>Suma</span>
              <div style={{ minWidth: 130, padding: "4px 12px", border: "1px solid #495057", borderRadius: 4, background: "#2b3035", color: "#ffc107", fontWeight: 600, textAlign: "center", fontSize: "0.95rem" }}>
                {pesos(registros.filter((r) => r.seleccionado).reduce((s, r) => s + calcularPagar(r), 0))}
              </div>
            </div>
          </div>
          <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "65vh" }}>
            <Table striped bordered hover size="sm" className="text-center align-middle mb-0">
              <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr>
                  <th style={{ width: 32 }}></th>
                  <th style={{ minWidth: 160 }}>Personal</th>
                  <th style={{ minWidth: 110 }}>Semanal Teórico</th>
                  <th style={{ minWidth: 110 }}>Ausentismo</th>
                  <th style={{ minWidth: 140 }}>Extras</th>
                  <th style={{ minWidth: 110 }}>Pagar</th>
                  <th style={{ minWidth: 110 }}>Pagado</th>
                  <th style={{ minWidth: 180 }}>Observaciones</th>
                  <th style={{ width: 90 }}></th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r, idx) => (
                  <tr key={idx}>
                    <td className="text-center">
                      <span
                        onClick={() => actualizarYGuardar(idx, "seleccionado", !r.seleccionado)}
                        style={{ cursor: "pointer", fontSize: 18, color: r.seleccionado ? "#198754" : "#495057", userSelect: "none", lineHeight: 1 }}
                      >●</span>
                    </td>
                    <td className="text-start fw-semibold">
                      {r.nuevo ? (
                        <Form.Control size="sm" type="text" value={r.personal} placeholder="Nombre..." onChange={(e) => actualizar(idx, "personal", e.target.value)} />
                      ) : (
                        <span
                          onClick={() => actualizarYGuardar(idx, "marcado", ((r.marcado || 0) + 1) % 3)}
                          style={{ cursor: "pointer", userSelect: "none", color: r.marcado === 1 ? "#ffc107" : "#dee2e6", position: "relative", display: "inline-block" }}
                        >
                          {r.personal}
                          {r.marcado === 2 && (
                            <span style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 2, background: "#ffc107", pointerEvents: "none" }} />
                          )}
                        </span>
                      )}
                    </td>
                    <td><CeldaMoneda value={r.semanal} onChange={(v) => actualizar(idx, "semanal", v)} textStyle={{ fontSize: "0.7rem", color: "#9ca3af" }} /></td>
                    <td><CeldaMoneda value={r.ausentismo} onChange={(v) => actualizar(idx, "ausentismo", v)} /></td>
                    <td>
                      {r.extras?.length > 0 ? (
                        <span
                          onClick={() => setVerExtras({ idx, nombre: r.personal })}
                          style={{ cursor: "pointer", color: "#ffc107", fontSize: "0.85rem", textDecoration: "underline", textUnderlineOffset: "4px" }}
                        >
                          {pesos(netoExtras(r.extras))}
                        </span>
                      ) : (
                        <div className="d-flex justify-content-center">
                          <Button variant="outline-primary" size="sm" onClick={() => setVerExtras({ idx, nombre: r.personal })}>Agregar</Button>
                        </div>
                      )}
                    </td>
                    <td style={{ color: calcularPagar(r) < 0 ? "#dc3545" : "#198754", fontSize: "1.1rem" }}>
                      {pesos(calcularPagar(r))}
                    </td>
                    <td><CeldaMoneda value={r.pagado || 0} onChange={(v) => actualizar(idx, "pagado", v)} defaultValue={calcularPagar(r)} textStyle={{ fontSize: "0.82rem" }} /></td>
                    <td>
                      <Form.Control
                        size="sm"
                        type="text"
                        value={r.observaciones}
                        onChange={(e) => actualizar(idx, "observaciones", e.target.value)}
                      />
                    </td>
                    <td>
                      <div className="d-flex gap-1 justify-content-center align-items-center">
                        {r.personal && (
                          <Button variant="outline-success" size="sm" onClick={() => setVerPersonal(r.personal)}>Ver</Button>
                        )}
                        {!nombresPersonal.has((r.personal || "").trim().toLowerCase()) && (
                          <span
                            onClick={() => {
                              modificado.current = true;
                              setRegistros((prev) => prev.filter((_, i) => i !== idx));
                            }}
                            style={{ cursor: "pointer", color: "#dc3545", fontWeight: 900, fontSize: 16, userSelect: "none" }}
                          >✕</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="table-dark" style={{ borderTop: "2px solid #ffc107" }}>
                  <td />
                  <td className="text-start">Total</td>
                  <td className="text-center">{pesos(totalSemanal)}</td>
                  <td className="text-center">{pesos(totalAusentismo)}</td>
                  <td className="text-center" style={{ color: totalExtrasNeto >= 0 ? "#198754" : "#dc3545" }}>{pesos(totalExtrasNeto)}</td>
                  <td style={{ color: totalPagar < 0 ? "#dc3545" : "#ffc107" }}>{pesos(totalPagar)}</td>
                  <td className="text-center">{pesos(totalPagado)}</td>
                  <td />
                  <td />
                </tr>
              </tfoot>
            </Table>
          </div>
        </>
      )}

      <ExtrasModal
        show={!!verExtras}
        onHide={() => setVerExtras(null)}
        personalNombre={verExtras?.nombre}
        extras={verExtras !== null ? (registros[verExtras.idx]?.extras || []) : []}
        onGuardar={(nuevosExtras) => actualizar(verExtras.idx, "extras", nuevosExtras)}
      />

      <ProveedoresModal
        show={verProveedores}
        onHide={() => setVerProveedores(false)}
        proveedoresGuardados={proveedoresGuardados}
        onGuardar={(nuevos) => {
          setProveedoresGuardados(nuevos);
          guardarGastoSemanal(semanaKey, undefined, nuevos);
        }}
      />

      <Modal show={!!verPersonal} onHide={() => setVerPersonal(null)} centered size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Asistencia - {verPersonal} - {labelSemana}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {(() => {
            const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
            const diasModal = Array.from({ length: 6 }, (_, i) => {
              const d = new Date(lunes);
              d.setDate(d.getDate() + i);
              return d;
            });
            const esZamoranoPerson = verPersonal?.toLowerCase().includes("zamorano");
            const regsModal = diasModal.map((_, idx) =>
              asistenciaSemana[idx]?.registros?.find(
                (r) => r.personal?.trim().toLowerCase() === verPersonal?.trim().toLowerCase()
              )
            );
            let totalHorometroStr = null;
            if (esZamoranoPerson) {
              const totalMins = regsModal.reduce((s, reg) => {
                if (!reg) return s;
                return s + horometroStrAMins(calcularHorometroZamorano(reg.entra, reg.sale));
              }, 0);
              const neg = totalMins < 0;
              const abs = Math.abs(totalMins);
              const h = Math.floor(abs / 60);
              const m = abs % 60;
              const str = m === 0 ? `${h}` : `${h}:${String(m).padStart(2, "0")}`;
              totalHorometroStr = neg ? `-${str}` : `+${str}`;
            } else {
              const regsConHorometro = regsModal.filter((r) => r && r.horometro !== "" && r.horometro != null);
              if (regsConHorometro.length > 0) {
                const total = regsConHorometro.reduce((s, r) => s + Number(r.horometro || 0), 0);
                totalHorometroStr = total.toLocaleString("es-AR");
              }
            }
            return (
              <Table striped bordered hover size="sm" className="text-center align-middle mb-0">
                <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                  <tr>
                    <th>Día</th>
                    <th>Estado</th>
                    <th>Entra</th>
                    <th>Sale</th>
                    <th>Máquina</th>
                    <th>Horómetro</th>
                    <th>Obra</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {diasModal.map((d, idx) => {
                    const label = `${DIAS[d.getDay()]} ${formatFecha(d)}`;
                    const reg = regsModal[idx];
                    if (!reg) return (
                      <tr key={idx}>
                        <td>{label}</td>
                        <td colSpan={7} className="text-muted">Sin registro</td>
                      </tr>
                    );
                    const esZamorano = reg.personal?.toLowerCase().includes("zamorano");
                    const estado = reg.ausente ? "Ausente" : reg.mediaFalta ? "Media falta" : "Presente";
                    const colorEstado = reg.ausente ? "#dc3545" : reg.mediaFalta ? "#ffc107" : "#198754";
                    return (
                      <tr key={idx}>
                        <td>{label}</td>
                        <td style={{ color: colorEstado, fontWeight: 600 }}>{estado}</td>
                        <td>{reg.entra || "-"}</td>
                        <td>{reg.sale || "-"}</td>
                        <td>{reg.maquina || "-"}</td>
                        <td>{esZamorano ? calcularHorometroZamorano(reg.entra, reg.sale) : (reg.horometro || "-")}</td>
                        <td>{reg.obra || "-"}</td>
                        <td>{reg.observaciones || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
                {totalHorometroStr !== null && (
                  <tfoot>
                    <tr className="table-dark fw-bold">
                      <td colSpan={5} className="text-end">Total horómetro</td>
                      <td style={{ color: esZamoranoPerson && totalHorometroStr.startsWith("-") ? "#198754" : esZamoranoPerson ? "#dc3545" : undefined }}>
                        {totalHorometroStr}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </Table>
            );
          })()}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setVerPersonal(null)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>

    </div>
  );
};

export default GastosSemanales;
