import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Table, Form, Spinner, Modal } from "react-bootstrap";
import { listarPersonal } from "../../../../../helpers/queriesPersonal.js";
import { obtenerAsistenciaPorFecha } from "../../../../../helpers/queriesAsistencia.js";
import { obtenerGastoSemanalPorSemana, guardarGastoSemanal } from "../../../../../helpers/queriesGastoSemanal.js";
import { calcularHorometroZamorano, horometroStrAMins } from "../../../../../helpers/horometroUtils.js";
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

const calcularPagar = (r) =>
  (Number(r.semanal) || 0) - (Number(r.ausentismo) || 0);

const pesos = (n) =>
  Number(n).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });


const CeldaMoneda = ({ value, onChange, textStyle = {} }) => {
  const [editando, setEditando] = useState(false);
  if (editando) {
    return (
      <Form.Control
        size="sm"
        type="number"
        value={Number(value) === 0 ? "" : value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditando(false)}
        onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
        autoFocus
        className="text-center"
      />
    );
  }
  return (
    <div
      onClick={() => setEditando(true)}
      className="text-center"
      style={{ cursor: "pointer", minHeight: 31, padding: "4px 8px", border: "1px solid #495057", borderRadius: 4, background: "#2b3035", color: "#dee2e6", ...textStyle }}
    >
      {pesos(value || 0)}
    </div>
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
  const modificado = useRef(false);
  const autoSaveTimer = useRef(null);

  const semanaKey = toKey(lunes);
  const domingo = new Date(lunes);
  domingo.setDate(domingo.getDate() + 6);
  const labelSemana = `${formatFecha(lunes)} al ${formatFecha(domingo)}/${domingo.getFullYear()}`;

  const cargarSemana = useCallback(async (fechaLunes) => {
    setLoading(true);
    const key = toKey(fechaLunes);

    // Días Lun–Sáb de la semana
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

    // Contar ausencias por persona: ausente hábil=1, ausente sáb=0.5, mediaFalta=0.5
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
    personalVisible.forEach((p) => {
      const ultimo = p.semanal?.length ? p.semanal[p.semanal.length - 1] : null;
      const semanal = ultimo ? ultimo.valor : 0;
      const cant = ultimo ? Number(ultimo.cantJornales || 0) : 0;
      jornalMap[p.nombre.trim().toLowerCase()] = cant > 0 ? semanal / cant : 0;
    });

    // Zamorano: sumar desvíos de horometro de la semana
    let zamoranoMins = 0;
    diasSemana.forEach((d, idx) => {
      const doc = asistenciaDocs[idx];
      if (!doc?.registros) return;
      const reg = doc.registros.find((r) => r.personal?.toLowerCase().includes("zamorano"));
      if (reg) zamoranoMins += horometroStrAMins(calcularHorometroZamorano(reg.entra, reg.sale));
    });

    // Nombres únicos de asistencia que no están en personal DB
    const nombresEnAsistencia = new Set();
    asistenciaDocs.forEach((doc) => {
      if (!doc?.registros) return;
      doc.registros.forEach((r) => { if (r.personal) nombresEnAsistencia.add(r.personal.trim()); });
    });
    const soloEnAsistencia = Array.from(nombresEnAsistencia)
      .filter((n) => !nombresPersonalDB.has(n.trim().toLowerCase()));

    setNombresPersonal(new Set([
      ...nombresPersonalDB,
      ...soloEnAsistencia.map((n) => n.trim().toLowerCase()),
    ]));

    const calcAusentismo = (nombre) => {
      const jornal = jornalMap[nombre.trim().toLowerCase()] || 0;
      if (nombre.toLowerCase().includes("zamorano")) {
        const horas = zamoranoMins / 60;
        return Math.round(Math.max(0, horas) * (jornal / 8));
      }
      const ausencias = ausenciasMap[nombre.trim().toLowerCase()] || 0;
      return Math.round(ausencias * jornal);
    };

    const filaDePersonal = (p) => {
      const semanal = p.semanal?.length ? p.semanal[p.semanal.length - 1].valor : 0;
      return { personal: p.nombre, semanal, ausentismo: calcAusentismo(p.nombre), observaciones: "" };
    };
    const filaSoloAsistencia = (nombre) => ({
      personal: nombre, semanal: 0, ausentismo: calcAusentismo(nombre), observaciones: "",
    });

    // Mapa de semanal actual por nombre (desde Personal DB)
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
  const totalPagar = registros.reduce((s, r) => s + calcularPagar(r), 0);

  return (
    <div className="container mt-4 w-75">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Gastos Semanales <small className="text-muted" style={{ fontSize: "1rem", fontWeight: 400 }}>{labelSemana}</small></h2>
        <Button variant="outline-primary" onClick={() => navigate("/personal/asistencia")}>Asistencia</Button>
      </div>

      {loading ? (
        <Spinner animation="border" className="d-block mx-auto my-5" />
      ) : (
        <>
          <div className="d-flex justify-content-end mb-2">
            <Button variant="outline-secondary" size="sm" onClick={() => {
              modificado.current = true;
              setRegistros((prev) => [...prev, { personal: "", semanal: 0, ausentismo: 0, observaciones: "", nuevo: true }]);
            }}>+ Agregar personal</Button>
          </div>
          <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "65vh" }}>
            <Table striped bordered hover className="text-center align-middle">
              <thead className="table-dark">
                <tr>
                  <th style={{ minWidth: 160 }}>Personal</th>
                  <th style={{ minWidth: 110 }}>Semanal Teórico</th>
                  <th style={{ minWidth: 110 }}>Ausentismo</th>
                  <th style={{ minWidth: 110 }}>Pagar</th>
                  <th style={{ minWidth: 180 }}>Observaciones</th>
                  <th style={{ width: 60 }}></th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r, idx) => (
                  <tr key={idx}>
                    <td className="text-start fw-semibold">
                      {r.nuevo ? (
                        <Form.Control size="sm" type="text" value={r.personal} placeholder="Nombre..." onChange={(e) => actualizar(idx, "personal", e.target.value)} />
                      ) : r.personal}
                    </td>
                    <td><CeldaMoneda value={r.semanal} onChange={(v) => actualizar(idx, "semanal", v)} textStyle={{ fontSize: "0.7rem", color: "#9ca3af" }} /></td>
                    <td><CeldaMoneda value={r.ausentismo} onChange={(v) => actualizar(idx, "ausentismo", v)} /></td>
                    <td style={{ color: calcularPagar(r) < 0 ? "#dc3545" : "#198754", fontSize: "1.1rem" }}>
                      {pesos(calcularPagar(r))}
                    </td>
                    <td>
                      <Form.Control
                        size="sm"
                        type="text"
                        value={r.observaciones}
                        onChange={(e) => actualizar(idx, "observaciones", e.target.value)}
                      />
                    </td>
                    <td className="text-center">
                      {r.personal && (
                        <Button variant="outline-success" size="sm" onClick={() => setVerPersonal(r.personal)}>Ver</Button>
                      )}
                    </td>
                    <td className="text-center">
                      {!nombresPersonal.has(r.personal.trim().toLowerCase()) && r.personal && (
                        <span
                          onClick={() => {
                            modificado.current = true;
                            setRegistros((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          style={{ cursor: "pointer", color: "#dc3545", fontWeight: 900, fontSize: 16, userSelect: "none" }}
                        >✕</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="table-dark fw-bold">
                  <td className="text-start">Total</td>
                  <td className="text-center">{pesos(totalSemanal)}</td>
                  <td className="text-center">{pesos(totalAusentismo)}</td>
                  <td style={{ color: totalPagar < 0 ? "#dc3545" : "#ffc107" }}>{pesos(totalPagar)}</td>
                  <td />
                  <td />
                  <td />
                </tr>
              </tfoot>
            </Table>
          </div>

        </>
      )}
      <Modal show={!!verPersonal} onHide={() => setVerPersonal(null)} centered size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Asistencia — {verPersonal} — {labelSemana}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {(() => {
            const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
            const diasModal = Array.from({ length: 6 }, (_, i) => {
              const d = new Date(lunes);
              d.setDate(d.getDate() + i);
              return d;
            });
            return (
              <Table striped bordered hover className="text-center align-middle">
                <thead className="table-dark">
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
                    const reg = asistenciaSemana[idx]?.registros?.find(
                      (r) => r.personal?.trim().toLowerCase() === verPersonal?.trim().toLowerCase()
                    );
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
              </Table>
            );
          })()}
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={() => setVerPersonal(null)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>

    </div>
  );
};

export default GastosSemanales;
