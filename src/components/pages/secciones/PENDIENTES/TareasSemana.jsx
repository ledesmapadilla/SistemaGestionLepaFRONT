import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Container, Form, Modal, Spinner, Table } from "react-bootstrap";
import Swal from "sweetalert2";
import XLSXStyle from "xlsx-js-style";
import { obtenerTareasSemana, guardarTareasSemana } from "../../../../helpers/queriesTareasSemana";
import { obtenerTodosPendientes, guardarPendientes } from "../../../../helpers/queriesPendientes";
import { obtenerTodasReparaciones, guardarReparaciones } from "../../../../helpers/queriesReparaciones";
import {
  RESPONSABLES, ESTADOS, ESTADOS_REPUESTO, COLOR_ESTADO, hoy, fechaAR, diasPendiente,
  derivarFilasReparaciones, aplicarEdicionDerivada, aplicarTareaAReparaciones,
  aplicarReparacionATareas, docDeMaquina,
} from "./pendientesUtils";

// Estados que cuentan como cerrados: no suman al contador de la tarjeta.
const CERRADOS = ["Terminado", "Colocado"];

// Tarjeta igual a las de Mantenimiento > Reparaciones, en el azul de su tarjeta "Pendientes".
const ESTILO_TARJETA = {
  backgroundColor: "#3a5a78",
  color: "#fff",
  borderRadius: "10px",
  padding: "0.8rem",
  cursor: "pointer",
  boxShadow: "3px 3px 8px rgba(0,0,0,0.25)",
  userSelect: "none",
  transition: "transform 0.15s ease, box-shadow 0.15s ease",
  width: "160px",
  height: "100px",
  textAlign: "center",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  position: "relative",
};

// Excel con una hoja por semana. Formato estándar del proyecto: título en A1,
// fecha de emisión en A2, encabezados en la fila 3 y datos desde la 4.
const exportarExcel = (nombre, semanas) => {
  const headers = ["Fecha", "Máquina", "Tarea", "Días pendiente", "Estado", "Observaciones"];
  const cols = ["A", "B", "C", "D", "E", "F"];
  const centro = { horizontal: "center", vertical: "center" };
  const izquierda = { horizontal: "left", vertical: "center" };
  const libro = XLSXStyle.utils.book_new();

  semanas.forEach((s) => {
    const ws = {};
    ws.A1 = {
      v: `TAREAS PARA LA SEMANA DEL ${fechaAR(s.desde)} HASTA ${fechaAR(s.hasta)} - ${nombre.toUpperCase()}`,
      t: "s",
      s: { font: { bold: true, sz: 14 }, alignment: izquierda },
    };
    ws.A2 = { v: `Fecha: ${new Date().toLocaleDateString("es-AR")}`, t: "s", s: { alignment: izquierda } };
    headers.forEach((h, i) => {
      ws[`${cols[i]}3`] = { v: h, t: "s", s: { font: { bold: true }, alignment: centro } };
    });
    s.tareas.forEach((t, idx) => {
      const vals = [
        fechaAR(t.fecha),
        t.maquina || "-",
        t.tarea || "-",
        diasPendiente(t.fecha, t.fechaTerminado),
        t.estado || "-",
        t.observaciones || "-",
      ];
      vals.forEach((v, i) => {
        ws[`${cols[i]}${idx + 4}`] = { v, t: typeof v === "number" ? "n" : "s", s: { alignment: centro } };
      });
    });
    ws["!ref"] = `A1:F${s.tareas.length + 3}`;
    ws["!cols"] = [{ wch: 12 }, { wch: 16 }, { wch: 34 }, { wch: 14 }, { wch: 14 }, { wch: 30 }];
    // Nombre de hoja: sin "/" (no se permite) y dentro del límite de 31 caracteres.
    const hoja = `${s.desde.split("-").reverse().join("-")} al ${s.hasta.split("-").reverse().join("-")}`;
    XLSXStyle.utils.book_append_sheet(libro, ws, hoja);
  });

  XLSXStyle.writeFile(libro, `Tareas_semana_${nombre}.xlsx`);
};

// Agrupa las tareas por semana (desde/hasta), de la más reciente a la más vieja.
const agruparPorSemana = (tareas) => {
  const grupos = new Map();
  tareas.forEach((t) => {
    const clave = `${t.desde}|${t.hasta}`;
    if (!grupos.has(clave)) grupos.set(clave, { desde: t.desde, hasta: t.hasta, tareas: [] });
    grupos.get(clave).tareas.push(t);
  });
  return [...grupos.values()]
    .sort((a, b) => b.desde.localeCompare(a.desde) || b.hasta.localeCompare(a.hasta))
    .map((g) => ({ ...g, tareas: g.tareas.sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "")) }));
};

const avisoGuardado = (titulo) =>
  Swal.fire({ position: "center", icon: "success", title: titulo, showConfirmButton: false, timer: 1200, timerProgressBar: true });
const avisoError = () =>
  Swal.fire({ icon: "error", title: "Error", text: "No se pudieron guardar los cambios" });

// Las tareas de la semana están sincronizadas con Pendientes: cada una guarda el
// id de su fila de origen (`origenId`) y se muestra con los datos actuales de esa
// fila (tarea manual, reparación o repuesto). Editar acá guarda en el origen, así
// que el cambio se ve también en Pendientes y en Reparaciones. Lo guardado en la
// colección de la semana solo se usa si la tarea de origen ya no existe.
export default function TareasSemana() {
  const navigate = useNavigate();
  const [semanaPorResp, setSemanaPorResp] = useState({});
  const [tareasPorResp, setTareasPorResp] = useState({}); // tareas manuales de Pendientes
  const [docsReparaciones, setDocsReparaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalResp, setModalResp] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [borrador, setBorrador] = useState({});

  useEffect(() => {
    const cargar = async () => {
      try {
        const [resSem, resPend, resReps] = await Promise.all([
          obtenerTareasSemana(),
          obtenerTodosPendientes(),
          obtenerTodasReparaciones(),
        ]);
        if (resSem?.ok) {
          const data = await resSem.json();
          const mapa = {};
          (Array.isArray(data) ? data : []).forEach((doc) => { mapa[doc.responsable] = doc.tareas || []; });
          setSemanaPorResp(mapa);
        }
        if (resPend?.ok) {
          const data = await resPend.json();
          const mapa = {};
          (Array.isArray(data) ? data : []).forEach((doc) => { mapa[doc.responsable] = doc.tareas || []; });
          setTareasPorResp(mapa);
        }
        if (resReps?.ok) {
          const docs = await resReps.json();
          setDocsReparaciones(Array.isArray(docs) ? docs : []);
        }
      } catch (error) {
        console.error("Error al cargar tareas de la semana:", error);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  // Todas las filas de Pendientes por id (manuales + reparaciones + repuestos).
  const origenes = useMemo(() => {
    const mapa = new Map();
    Object.entries(tareasPorResp).forEach(([resp, ts]) =>
      (ts || []).forEach((t) => mapa.set(t.id, { ...t, tipo: "", responsable: resp }))
    );
    derivarFilasReparaciones(docsReparaciones).forEach((d) => mapa.set(d.id, d));
    return mapa;
  }, [tareasPorResp, docsReparaciones]);

  // Tarea de la semana con los datos actuales de su origen.
  const enVivo = (item) => {
    const o = origenes.get(item.origenId);
    if (!o) return { ...item, origen: null };
    return {
      ...item,
      fecha: o.fecha,
      maquina: o.maquina,
      tarea: o.tarea,
      estado: o.estado,
      observaciones: o.observaciones || "",
      fechaTerminado: o.fechaTerminado || "",
      origen: o,
    };
  };

  const items = modalResp ? semanaPorResp[modalResp.nombre] || [] : [];
  const semanas = agruparPorSemana(items.map(enVivo));

  const abrir = (r) => { setModalResp(r); setEditandoId(null); };
  const cerrar = () => { setModalResp(null); setEditandoId(null); };

  const editar = (t) => {
    setEditandoId(t.id);
    setBorrador({ estado: t.estado, observaciones: t.observaciones || "" });
  };

  // Tarea manual: guarda en Pendientes y, si está vinculada a una reparación, también ahí.
  const guardarEnTareaManual = async (o) => {
    const actualizada = {
      ...tareasPorResp[o.responsable].find((x) => x.id === o.id),
      estado: borrador.estado,
      observaciones: borrador.observaciones,
    };
    // Mismo criterio que Pendientes: "Terminado" congela los días; reabrirla los vuelve a sumar.
    actualizada.fechaTerminado = borrador.estado === "Terminado" ? actualizada.fechaTerminado || hoy() : "";
    const nuevas = tareasPorResp[o.responsable].map((x) => (x.id === o.id ? actualizada : x));
    setTareasPorResp((prev) => ({ ...prev, [o.responsable]: nuevas }));

    const { docs, maquinas } = aplicarTareaAReparaciones(docsReparaciones, actualizada);
    if (maquinas.length) setDocsReparaciones(docs);
    const [res] = await Promise.all([
      guardarPendientes(o.responsable, nuevas),
      ...maquinas.map((mid) => guardarReparaciones(mid, docDeMaquina(docs, mid)?.reparaciones || [])),
    ]);
    return res;
  };

  // Reparación o repuesto: guarda en Reparaciones y, si es una reparación vinculada
  // a una tarea manual, también en Pendientes.
  const guardarEnReparacion = async (o) => {
    const docs = aplicarEdicionDerivada(docsReparaciones, o, {
      fecha: o.fecha,
      tarea: o.tarea,
      estado: borrador.estado,
      observaciones: borrador.observaciones,
    });
    setDocsReparaciones(docs);
    const reparaciones = docDeMaquina(docs, o.maquinaId)?.reparaciones || [];

    let sincronizacion = Promise.resolve();
    if (o.tipo === "reparacion") {
      const { mapa, responsables } = aplicarReparacionATareas(tareasPorResp, reparaciones[o.reparacionIndex], o.maquina);
      if (responsables.length) {
        setTareasPorResp(mapa);
        sincronizacion = Promise.all(responsables.map((resp) => guardarPendientes(resp, mapa[resp])));
      }
    }
    const [res] = await Promise.all([guardarReparaciones(o.maquinaId, reparaciones), sincronizacion]);
    return res;
  };

  // La tarea de origen ya no existe: se edita lo guardado en la semana.
  const guardarEnSemana = async (t) => {
    const nuevas = items.map((x) => {
      if (x.id !== t.id) return x;
      const cerrada = CERRADOS.includes(borrador.estado);
      return {
        ...x,
        estado: borrador.estado,
        observaciones: borrador.observaciones,
        fechaTerminado: cerrada ? x.fechaTerminado || hoy() : "",
      };
    });
    setSemanaPorResp((prev) => ({ ...prev, [modalResp.nombre]: nuevas }));
    return guardarTareasSemana(modalResp.nombre, nuevas);
  };

  const guardar = async (t) => {
    setEditandoId(null);
    let res;
    if (!t.origen) res = await guardarEnSemana(t);
    else if (t.origen.tipo) res = await guardarEnReparacion(t.origen);
    else res = await guardarEnTareaManual(t.origen);
    if (res?.ok) avisoGuardado("Guardado");
    else avisoError();
  };

  // Solo la quita de la semana; la tarea sigue en Pendientes.
  const borrar = async (t) => {
    const { isConfirmed } = await Swal.fire({
      title: "¿Quitar la tarea de la semana?",
      text: "La tarea sigue en Pendientes.",
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: "swal-btn-danger" },
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    });
    if (!isConfirmed) return;
    setEditandoId((prev) => (prev === t.id ? null : prev));
    const previas = items;
    const nuevas = items.filter((x) => x.id !== t.id);
    setSemanaPorResp((prev) => ({ ...prev, [modalResp.nombre]: nuevas }));
    const res = await guardarTareasSemana(modalResp.nombre, nuevas);
    if (res?.ok) {
      avisoGuardado("Tarea quitada");
    } else {
      setSemanaPorResp((prev) => ({ ...prev, [modalResp.nombre]: previas }));
      avisoError();
    }
  };

  const verObservacion = (texto) =>
    Swal.fire({ title: "Observaciones", text: texto, confirmButtonText: "Cerrar", confirmButtonColor: "#6c757d" });

  return (
    <Container className="py-4">
      <div className="d-flex align-items-center justify-content-center position-relative mb-4">
        <Button
          variant="outline-light"
          size="sm"
          className="position-absolute start-0"
          onClick={() => navigate("/pendientes")}
        >
          ← Pendientes
        </Button>
        <h2 className="fw-bold text-center mb-0">Tareas para la semana</h2>
      </div>

      {cargando ? (
        <Spinner animation="border" className="d-block mx-auto my-4" />
      ) : (
        // Mismo estilo de tarjeta que Mantenimiento > Reparaciones, centradas en la página.
        <div
          className="d-flex flex-wrap justify-content-center align-content-center"
          style={{ gap: "1.2rem", minHeight: "60vh" }}
        >
          {RESPONSABLES.map((r) => {
            const activas = (semanaPorResp[r.nombre] || [])
              .map(enVivo)
              .filter((t) => !CERRADOS.includes(t.estado)).length;
            return (
              <div
                key={r.nombre}
                onClick={() => abrir(r)}
                style={ESTILO_TARJETA}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.06)";
                  e.currentTarget.style.boxShadow = "5px 5px 14px rgba(0,0,0,0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = ESTILO_TARJETA.boxShadow;
                }}
              >
                {activas > 0 && (
                  <span
                    className="badge rounded-pill bg-light text-dark"
                    title="Tareas de la semana sin terminar"
                    style={{ position: "absolute", top: 6, right: 8, fontSize: "0.75rem" }}
                  >
                    {activas}
                  </span>
                )}
                <div style={{ fontSize: "1.2rem", lineHeight: 1.1 }}>{r.nombre}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal con las semanas del responsable ── */}
      <Modal show={!!modalResp} onHide={cerrar} centered size="xl" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Tareas para la semana - {modalResp?.nombre}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: "70vh" }}>
          <div className="d-flex justify-content-end mb-3">
            <Button
              size="sm"
              variant="outline-light"
              disabled={semanas.length === 0}
              onClick={() => exportarExcel(modalResp.nombre, semanas)}
            >
              Excel
            </Button>
          </div>
          {semanas.length === 0 && (
            <p className="text-muted text-center py-3 mb-0">
              Sin tareas. Se agregan desde Pendientes con el botón "A semanal".
            </p>
          )}
          {semanas.map((s) => (
            <div key={`${s.desde}|${s.hasta}`} className="mb-4">
              <h5 className="fw-normal mb-2">
                Tareas para la semana del {fechaAR(s.desde)} hasta {fechaAR(s.hasta)}
              </h5>
              <Table striped bordered hover size="sm" className="text-center align-middle mb-0">
                <thead className="table-dark">
                  <tr>
                    <th style={{ width: 95 }}>Fecha</th>
                    <th style={{ width: 110 }}>Máquina</th>
                    <th>Tarea</th>
                    <th style={{ width: 85 }}>Días pendiente</th>
                    <th style={{ width: 120 }}>Estado</th>
                    <th style={{ width: 160 }}>Obs.</th>
                    <th style={{ width: 150 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {s.tareas.map((t) => {
                    const enEdicion = editandoId === t.id;
                    return (
                      <tr key={t.id}>
                        <td>{fechaAR(t.fecha)}</td>
                        <td>{t.maquina || "-"}</td>
                        <td className="text-start">
                          {t.tarea || "-"}
                          {!t.origen && (
                            <div className="small fst-italic" style={{ color: "#adb5bd" }}>
                              Ya no está en Pendientes
                            </div>
                          )}
                        </td>
                        <td>{diasPendiente(t.fecha, t.fechaTerminado)}</td>
                        <td>
                          {enEdicion ? (
                            <Form.Select size="sm" value={borrador.estado} onChange={(e) => setBorrador((p) => ({ ...p, estado: e.target.value }))}>
                              {(t.tipo === "repuesto" ? ESTADOS_REPUESTO : ESTADOS).map((e) => (
                                <option key={e} value={e}>{e}</option>
                              ))}
                            </Form.Select>
                          ) : (
                            <span style={{ color: COLOR_ESTADO[t.estado] || "#dee2e6", fontWeight: 600 }}>{t.estado || "-"}</span>
                          )}
                        </td>
                        <td>
                          {enEdicion ? (
                            <Form.Control size="sm" value={borrador.observaciones} onChange={(e) => setBorrador((p) => ({ ...p, observaciones: e.target.value }))} />
                          ) : t.observaciones ? (
                            <Button size="sm" variant="outline-secondary" className="py-0 px-2" onClick={() => verObservacion(t.observaciones)}>Ver</Button>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          <div className="d-flex gap-1 justify-content-center">
                            {enEdicion ? (
                              <Button size="sm" variant="outline-success" onClick={() => guardar(t)}>Listo</Button>
                            ) : (
                              <Button size="sm" variant="outline-warning" onClick={() => editar(t)}>Editar</Button>
                            )}
                            <Button size="sm" variant="outline-danger" onClick={() => borrar(t)}>Borrar</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          ))}
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={cerrar}>Cerrar</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
