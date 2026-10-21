import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button, Modal, Form, Table, Spinner, Tabs, Tab, Badge } from "react-bootstrap";
import { listarAsistencia, listarDatosAsistencia, listarCompensadasAsistencia } from "../../../../../helpers/queriesAsistencia.js";
import { difMinDia, minsAHHMM, colorDif, esDiaLibre, pagaDiaLibre } from "../../../../../helpers/jornadaUtils.js";
import { ordenarPersonal } from "../../../../../helpers/ordenPersonal.js";
import { semanalVigente } from "../../../../../helpers/semanalUtils.js";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];


const diaKey = (anio, mes, dia) =>
  `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

// Documentos de asistencia a un mapa por fecha, aplicando los defaults de la
// planilla (Zamorano siempre con remito y con hora de salida).
const mapearRegistros = (docs) => {
  const mapa = {};
  docs.forEach((doc) => {
    const [yy, mm, dd] = doc.fecha.split("-").map(Number);
    const esSabadoDoc = new Date(yy, mm - 1, dd).getDay() === 6;
    mapa[doc.fecha] = doc.registros.map((r, i) => ({
      ...r,
      id: r.id || i,
      remito: r.personal?.toLowerCase().includes("zamorano") || !r.obra || r.obra === "Taller" ? true : r.remito,
      sale: r.personal?.toLowerCase().includes("zamorano") && !r.sale ? (esSabadoDoc ? "12:00" : "17:00") : r.sale,
    }));
  });
  return mapa;
};

// Saldo de horas compensadas destacado como píldora (sin negrita): verde si
// queda a favor, rojo si queda en contra, gris si está en cero.
const SaldoBadge = ({ mins }) => (
  <Badge
    pill
    bg={mins > 0 ? "success" : mins < 0 ? "danger" : "secondary"}
    style={{ fontWeight: 400, fontSize: "0.9rem", minWidth: 64, padding: "0.35em 0.8em" }}
  >
    {minsAHHMM(mins)}
  </Badge>
);

const Asistencia = () => {
  const hoy = new Date();
  const location = useLocation();
  // Al volver del día (o con el botón atrás) se abre en el mes que se estaba
  // mirando, no en el actual.
  const [anio, setAnio] = useState(location.state?.anio ?? hoy.getFullYear());
  const [mes, setMes] = useState(location.state?.mes ?? hoy.getMonth());

  const [loadingDatos, setLoadingDatos] = useState(true);
  const [loadingMes, setLoadingMes] = useState(true);
  const [listaPersonal, setListaPersonal] = useState([]);
  const [listaMaquinas, setListaMaquinas] = useState([]);
  const [listaObras, setListaObras] = useState([]);
  const [listaServices, setListaServices] = useState([]);

  const [registros, setRegistros] = useState({});
  const [semanaResumen, setSemanaResumen] = useState(null);
  const [tabResumen, setTabResumen] = useState("resumen");
  // Registros con "Compensar" de toda la historia; null = todavía no se pidieron.
  const [compensadas, setCompensadas] = useState(null);
  const [historialDe, setHistorialDe] = useState(null);

  const navigate = useNavigate();
  const anios = Array.from({ length: 10 }, (_, i) => 2026 + i);
  const loading = loadingDatos || loadingMes;
  // El mes inicial ya viene en la carga de arriba; este ref evita pedirlo de nuevo.
  const primeraCarga = useRef(true);

  // La referencia de signos de "Horas compensadas" va en la fila de las
  // solapas, centrada sobre la columna Saldo de la tabla que se esté viendo.
  const tabsRef = useRef(null);
  const saldoThRef = useRef(null);
  const leyendaRef = useRef(null);
  useLayoutEffect(() => {
    const leyenda = leyendaRef.current;
    const th = saldoThRef.current;
    const cont = tabsRef.current;
    if (!leyenda || !th || !cont) return;
    const ubicar = () => {
      const a = th.getBoundingClientRect();
      const b = cont.getBoundingClientRect();
      if (!a.width) return; // solapa todavía oculta por la animación
      leyenda.style.left = `${a.left - b.left + a.width / 2}px`;
      leyenda.style.visibility = "visible";
    };
    ubicar();
    // Se vuelve a ubicar cuando la tabla termina de aparecer o cambia de ancho.
    const obs = new ResizeObserver(ubicar);
    obs.observe(th);
    obs.observe(cont);
    return () => obs.disconnect();
  }, [tabResumen, compensadas, historialDe, semanaResumen]);

  // Carga inicial: personal, máquinas, obras, services y el mes vienen en una
  // sola llamada. Los datos de referencia se conservan para pasárselos a la
  // página del día sin que ésta vuelva a pedirlos.
  useEffect(() => {
    const cargar = async () => {
      const res = await listarDatosAsistencia(anio, mes);
      if (res?.ok) {
        const datos = await res.json();
        setListaPersonal(datos.personal || []);
        setListaMaquinas(datos.maquinas || []);
        setListaObras(datos.obras || []);
        setListaServices(datos.services || []);
        setRegistros(mapearRegistros(datos.asistencia || []));
      }
      setLoadingDatos(false);
      setLoadingMes(false);
    };
    cargar();
    // Solo al montar: el cambio de mes lo maneja el efecto de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al cambiar de mes solo se pide la asistencia de ese mes; el resto ya está.
  useEffect(() => {
    if (primeraCarga.current) {
      primeraCarga.current = false;
      return;
    }
    const cargarAsistencia = async () => {
      setLoadingMes(true);
      setRegistros({});
      const resA = await listarAsistencia(anio, mes);
      if (resA?.ok) setRegistros(mapearRegistros(await resA.json()));
      setLoadingMes(false);
    };
    cargarAsistencia();
  }, [anio, mes]);

  // Además de cambiar el mes, lo guarda en el historial: así el botón atrás
  // del navegador (por ejemplo al volver de Gastos Semanales) vuelve a este mes.
  const cambiarMes = (nuevoAnio, nuevoMes) => {
    setAnio(nuevoAnio);
    setMes(nuevoMes);
    navigate(location.pathname, { replace: true, state: { anio: nuevoAnio, mes: nuevoMes } });
  };

  // Ordenado acá, que es de donde sale la lista que se le pasa al detalle del día.
  const personalVisible = ordenarPersonal(listaPersonal, (p) => p?.nombre);

  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const primerDiaSemana = (new Date(anio, mes, 1).getDay() + 6) % 7;

  const esHoy = (dia) =>
    dia === hoy.getDate() && mes === hoy.getMonth() && anio === hoy.getFullYear();

  const celdas = [
    ...Array(primerDiaSemana).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ];

  const filtrarPersonalParaDia = (key) =>
    personalVisible.filter((p) => {
      if (p.fechaAlta && p.fechaAlta > key) return false;
      if (p.activo === false) {
        if (!p.fechaDesactivado || p.fechaDesactivado <= key) return false;
      }
      return true;
    });

  const abrirDia = (dia) => {
    const fechaDia = new Date(anio, mes, dia);
    const hoyInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    if (fechaDia > hoyInicio) return;

    // Pasar los datos ya cargados para que la página del día no haga peticiones
    navigate("/personal/asistencia-dia", {
      state: {
        anio, mes, dia,
        personal: personalVisible,
        maquinas: listaMaquinas,
        obras: listaObras,
        services: listaServices,
        registros,
      },
    });
  };

  // Misma normalización que usan Gastos Semanales y el orden de personal: sin
  // acentos ni puntuación, para que "Di Farco, Juan" y "Di Farco Juan" sean uno.
  const normNombre = (s) =>
    (s || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[.,;]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const abrirResumen = (diasSemana) => {
    const nombresEnAlta = new Set(listaPersonal.map((p) => normNombre(p.nombre)));
    // Quien tiene 5 jornales o menos tiene libres sábado y domingo: esos días
    // no suman ni descuentan, salvo las horas que trabaje (todas extra).
    // El criterio es el mismo que aplica Gastos Semanales.
    const ultimoDia = diaKey(anio, mes, diasSemana[diasSemana.length - 1]);
    const cantJornalesMap = {};
    listaPersonal.forEach((p) => {
      const vigente = semanalVigente(p.semanal, ultimoDia);
      cantJornalesMap[normNombre(p.nombre)] = vigente ? Number(vigente.cantJornales || 0) : 0;
    });
    const diaLibre = (nombre, d) => esDiaLibre(cantJornalesMap[normNombre(nombre)] || 0, new Date(anio, mes, d));

    const mapa = {};
    const nuevaFila = (nombre) => ({ nombre, ausentes: 0, sinRemito: 0, observaciones: [], difMins: 0, trabajados: 0 });
    diasSemana.forEach((d) => {
      const key = diaKey(anio, mes, d);
      const diaSemana = new Date(anio, mes, d).getDay();
      const esSabado = diaSemana === 6;
      const esDomingo = diaSemana === 0;
      const regs = registros[key] || [];
      regs.forEach((r) => {
        if (!r.personal) return;
        const keyNombre = normNombre(r.personal);
        if (!mapa[keyNombre]) mapa[keyNombre] = nuevaFila(r.personal);
        if (!r.remito) mapa[keyNombre].sinRemito += 1;
        if (r.observaciones) mapa[keyNombre].observaciones.push(r.observaciones);
        if (diaLibre(r.personal, d)) {
          if (pagaDiaLibre(new Date(anio, mes, d)) && !r.ausente && !r.mediaFalta) {
            const dm = difMinDia(r.entra, r.sale, esSabado, r.personal, true);
            if (dm != null) mapa[keyNombre].difMins += dm;
          }
          return;
        }
        if (r.ausente) mapa[keyNombre].ausentes += esSabado ? 0.5 : 1;
        if (r.mediaFalta) mapa[keyNombre].ausentes += 0.5;
        // La Dif. de los días ausente/media falta no cuenta: eso ya lo refleja
        // la columna Ausentes (y en Gastos Semanales, el ausentismo).
        if (!r.ausente && !r.mediaFalta) {
          const dm = difMinDia(r.entra, r.sale, esSabado, r.personal);
          if (dm != null) mapa[keyNombre].difMins += dm;
        }
      });
      // Agregar personas que deberían estar ese día aunque no tengan registro guardado
      const registroPorNombre = {};
      regs.forEach((r) => { if (r.personal) registroPorNombre[normNombre(r.personal)] = r; });
      filtrarPersonalParaDia(key).forEach((p) => {
        const keyNombre = normNombre(p.nombre);
        if (!mapa[keyNombre]) mapa[keyNombre] = nuevaFila(p.nombre);
        // Días trabajados: solo cuentan los días ya cargados (los futuros o sin
        // planilla no suman) y sin domingos. El sábado vale medio día, igual que
        // en el ausentismo de Gastos Semanales.
        if (esDomingo || regs.length === 0) return;
        if (diaLibre(p.nombre, d)) return;
        const reg = registroPorNombre[keyNombre];
        if (reg?.ausente) return;
        const peso = esSabado ? 0.5 : 1;
        mapa[keyNombre].trabajados += reg?.mediaFalta ? Math.max(peso - 0.5, 0) : peso;
      });
    });
    const filas = ordenarPersonal(
      Object.values(mapa).filter((datos) => nombresEnAlta.has(normNombre(datos.nombre))),
      (f) => f.nombre
    ).map((datos) => ({
      nombre: datos.nombre,
      ausentes: datos.ausentes,
      sinRemito: datos.sinRemito,
      observaciones: datos.observaciones.join(" / "),
      difMins: datos.difMins,
      trabajados: datos.trabajados,
    }));
    const desde = diasSemana[0];
    const hasta = diasSemana[diasSemana.length - 1];
    setSemanaResumen({ filas, label: `${desde} al ${hasta} de ${MESES[mes].toLowerCase()} ${anio}` });
    // Abre directo en "Horas compensadas"; se pide de nuevo cada vez para que
    // refleje lo último cargado en los días.
    setTabResumen("compensadas");
    setHistorialDe(null);
    setCompensadas(null);
    listarCompensadasAsistencia().then(async (res) => {
      setCompensadas(res?.ok ? await res.json() : []);
    });
  };

  const cerrarResumen = () => {
    setSemanaResumen(null);
    setHistorialDe(null);
  };

  // Horas compensadas por persona, de toda la historia. Solo cuentan los días
  // con el círculo "Compensar" activado. Dif. negativa (trabajó de más) = a
  // favor; positiva (trabajó de menos) = en contra. Se lista todo el personal
  // activo, aunque todavía no tenga días compensados.
  const calcularCompensadas = () => {
    if (!compensadas) return [];
    const nombrePorKey = {};
    const semanalPorKey = {};
    const mapa = {};
    listaPersonal.filter((p) => p.activo !== false).forEach((p) => {
      const k = normNombre(p.nombre);
      nombrePorKey[k] = p.nombre;
      semanalPorKey[k] = p.semanal;
      mapa[k] = { nombre: p.nombre, aFavor: 0, enContra: 0, observaciones: [], historial: [] };
    });
    compensadas.forEach((doc) => {
      const [yy, mm, dd] = doc.fecha.split("-").map(Number);
      const fecha = new Date(yy, mm - 1, dd);
      const esSabado = fecha.getDay() === 6;
      (doc.registros || []).forEach((r) => {
        const k = normNombre(r.personal);
        if (!nombrePorKey[k]) return;
        // En su día libre (trabaja 5 días) todo lo trabajado queda a favor.
        const cant = Number(semanalVigente(semanalPorKey[k], doc.fecha)?.cantJornales || 0);
        const libre = esDiaLibre(cant, fecha) && pagaDiaLibre(fecha);
        const dif = difMinDia(r.entra, r.sale, esSabado, r.personal, libre);
        if (dif == null) return;
        const fila = mapa[k];
        if (dif < 0) fila.aFavor += -dif;
        else fila.enContra += dif;
        if (r.observaciones) fila.observaciones.push(r.observaciones);
        fila.historial.push({
          fecha: doc.fecha,
          entra: r.entra,
          sale: r.sale,
          aFavor: dif < 0 ? -dif : 0,
          enContra: dif > 0 ? dif : 0,
          saldo: fila.aFavor - fila.enContra,
          observaciones: r.observaciones || "",
        });
      });
    });
    return ordenarPersonal(Object.values(mapa), (f) => f.nombre).map((f) => ({
      ...f,
      saldo: f.aFavor - f.enContra,
      observaciones: f.observaciones.join(" / "),
    }));
  };

  const filasCompensadas = tabResumen === "compensadas" ? calcularCompensadas() : [];
  const filaHistorial = historialDe ? filasCompensadas.find((f) => f.nombre === historialDe) : null;
  const fmtFecha = (f) => f.split("-").reverse().join("/");

  if (loading) return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <div className="container mt-4">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h2 className="mb-0">Asistencia</h2>
        <div className="d-flex gap-2">
          <Button variant="outline-success" onClick={() => navigate(-1)}>Volver</Button>
        </div>
      </div>

      {/* Selectores */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <Form.Select
          value={anio}
          onChange={(e) => cambiarMes(Number(e.target.value), mes)}
          style={{ width: 100 }}
        >
          {anios.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </Form.Select>
        <Form.Select
          value={mes}
          onChange={(e) => cambiarMes(anio, Number(e.target.value))}
          style={{ width: 140 }}
        >
          {MESES.map((nombre, i) => (
            <option key={i} value={i}>{nombre}</option>
          ))}
        </Form.Select>
      </div>

      {/* Grilla */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr) 0.5fr 0.5fr", gap: 8 }}>
        {[...DIAS_SEMANA, "resumen", "gastos"].map((d, idx) => (
          <div
            key={d}
            className="text-center fw-semibold"
            style={{ fontSize: "0.82rem", paddingBottom: 4, color: "white", ...(idx === 5 && { marginLeft: 12 }) }}
          >
            {idx < 7 ? d : ""}
          </div>
        ))}

        {celdas.map((dia, i) => {
          const items = [];

          const esSabadoCol = i % 7 === 5;
          if (dia === null) {
            items.push(<div key={`vacio-${i}`} style={esSabadoCol ? { marginLeft: 12 } : undefined} />);
          } else {
            const esFuturo = new Date(anio, mes, dia) > new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
            const esDomingo = (primerDiaSemana + dia - 1) % 7 === 6;
            const regsDelDia = registros[diaKey(anio, mes, dia)];
            const aplicaRemito = new Date(anio, mes, dia) >= new Date(2026, 4, 1);
            const algunoSinRemito = aplicaRemito && regsDelDia?.length > 0 && regsDelDia.some((r) => !r.remito);
            const bgBase = esFuturo ? "#3a3a3a" : algunoSinRemito ? "#dc3545" : esHoy(dia) ? "#fff3cd" : esDomingo ? "#666" : "#c0c0c0";
            const bgHover = esFuturo ? "#3a3a3a" : algunoSinRemito ? "#bb2d3b" : esHoy(dia) ? "#ffe69c" : esDomingo ? "#555" : "#a8a8a8";
            items.push(
              <div
                key={dia}
                onClick={() => abrirDia(dia)}
                className="rounded text-center"
                style={{
                  cursor: esFuturo ? "not-allowed" : "pointer",
                  padding: "4px",
                  height: 56,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: bgBase,
                  border: "2px solid #ffc107",
                  transition: "background 0.15s",
                  userSelect: "none",
                  opacity: esFuturo ? 0.4 : 1,
                  ...(esSabadoCol && { marginLeft: 12 }),
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = bgHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = bgBase; }}
              >
                <span style={{ fontSize: "1rem", fontWeight: 600, color: algunoSinRemito ? "#fff" : "#000" }}>
                  {dia}
                </span>
                {registros[diaKey(anio, mes, dia)]?.length > 0 && (
                  <div style={{ fontSize: "0.7rem", color: "#333", marginTop: 2 }}>
                    ✓
                  </div>
                )}
              </div>
            );
          }

          if ((i + 1) % 7 === 0) {
            const diasSemana = celdas.slice(i - 6, i + 1).filter((d) => d !== null);
            const hoyInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
            const semanaFutura = diasSemana.every((d) => new Date(anio, mes, d) > hoyInicio);
            const semanaRoja = !semanaFutura && diasSemana.some((d) => {
              const regs = registros[diaKey(anio, mes, d)];
              const aplica = new Date(anio, mes, d) >= new Date(2026, 4, 1);
              return aplica && regs?.length > 0 && regs.some((r) => !r.remito);
            });
            const bgResumen = semanaFutura ? "#3a3a3a" : semanaRoja ? "#dc3545" : "#fff3cd";
            items.push(
              <div
                key={`resumen-${i}`}
                className="rounded text-center"
                style={{
                  padding: "4px",
                  height: 56,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: bgResumen,
                  border: "2px solid #ffc107",
                  userSelect: "none",
                  cursor: semanaFutura ? "not-allowed" : "pointer",
                  opacity: semanaFutura ? 0.4 : 1,
                }}
                onClick={() => !semanaFutura && abrirResumen(diasSemana)}
              >
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: semanaRoja || semanaFutura ? "#fff" : "#000" }}>
                  Resumen
                </span>
              </div>
            );
            items.push(
              <div
                key={`gastos-${i}`}
                className="rounded text-center"
                style={{
                  padding: "4px",
                  height: 56,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#d1ecf1",
                  border: "2px solid #ffc107",
                  userSelect: "none",
                  cursor: "pointer",
                }}
                onClick={() => navigate(`/personal/gastos-semanales?semana=${diaKey(anio, mes, diasSemana[0])}`)}
              >
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#000" }}>
                  Gastos Semanal
                </span>
              </div>
            );
          }

          return items;
        })}
      </div>

      {/* Modal Resumen semanal */}
      <Modal show={!!semanaResumen} onHide={cerrarResumen} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Resumen {semanaResumen?.label}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div ref={tabsRef} style={{ position: "relative" }}>
          {tabResumen === "compensadas" && compensadas !== null && (
            <div
              ref={leyendaRef}
              style={{
                position: "absolute", top: 4, visibility: "hidden", transform: "translateX(-50%)",
                fontSize: "0.72rem", color: "#adb5bd", whiteSpace: "nowrap", lineHeight: 1.3, textAlign: "center",
              }}
            >
              (+) a favor maquinista<br />(−) a favor Lepa
            </div>
          )}
          <Tabs activeKey={tabResumen} onSelect={(k) => setTabResumen(k)} className="mb-3">
            <Tab eventKey="resumen" title="Resumen">
          <Table striped bordered hover className="text-center align-middle mx-auto" style={{ width: "90%" }}>
            <thead className="table-dark">
              <tr>
                <th>Personal</th>
                <th>Días Trabajados</th>
                <th>Ausentes</th>
                <th>Sin Remito</th>
                <th>Dif.</th>
              </tr>
            </thead>
            <tbody>
              {semanaResumen?.filas.map((f, i) => (
                <tr key={i}>
                  <td>{f.nombre}</td>
                  <td>{f.trabajados}</td>
                  <td>{f.ausentes || "-"}</td>
                  <td>{f.sinRemito || "-"}</td>
                  <td style={f.difMins ? { fontWeight: 700, color: colorDif(f.difMins) } : {}}>
                    {f.difMins ? minsAHHMM(f.difMins) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
            </Tab>
            <Tab eventKey="compensadas" title="Horas compensadas">
              {compensadas === null ? (
                <Spinner animation="border" className="d-block mx-auto my-4" />
              ) : filaHistorial ? (
                <>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <h5 className="mb-0">Historial de {filaHistorial.nombre}</h5>
                    <Button size="sm" variant="outline-success" onClick={() => setHistorialDe(null)}>Volver</Button>
                  </div>
                  <div style={{ maxHeight: "55vh", overflowY: "auto" }}>
                    <Table striped bordered hover className="text-center align-middle">
                      <thead className="table-dark" style={{ position: "sticky", top: 0 }}>
                        <tr>
                          <th>Fecha</th>
                          <th>Entra</th>
                          <th>Sale</th>
                          <th>A favor</th>
                          <th>En contra</th>
                          <th ref={saldoThRef}>Saldo</th>
                          <th>Observaciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...filaHistorial.historial].reverse().map((h, i) => (
                          <tr key={i}>
                            <td>{fmtFecha(h.fecha)}</td>
                            <td>{h.entra}</td>
                            <td>{h.sale}</td>
                            <td style={{ color: "#198754" }}>{h.aFavor ? minsAHHMM(h.aFavor) : "-"}</td>
                            <td style={{ color: "#dc3545" }}>{h.enContra ? minsAHHMM(h.enContra) : "-"}</td>
                            <td><SaldoBadge mins={h.saldo} /></td>
                            <td className="text-start">{h.observaciones || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </>
              ) : filasCompensadas.length === 0 ? (
                <p className="text-center text-muted my-4">No hay personal activo.</p>
              ) : (
                <Table striped bordered hover className="text-center align-middle">
                  <thead className="table-dark">
                    <tr>
                      <th>Personal</th>
                      <th>Hs a favor</th>
                      <th>Hs en contra</th>
                      <th ref={saldoThRef}>Saldo</th>
                      <th>Observaciones</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasCompensadas.map((f) => (
                      <tr key={f.nombre}>
                        <td>{f.nombre}</td>
                        <td style={{ color: "#198754" }}>{f.aFavor ? minsAHHMM(f.aFavor) : "-"}</td>
                        <td style={{ color: "#dc3545" }}>{f.enContra ? minsAHHMM(f.enContra) : "-"}</td>
                        <td><SaldoBadge mins={f.saldo} /></td>
                        <td
                          className="text-start"
                          title={f.observaciones}
                          style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        >
                          {f.observaciones || "-"}
                        </td>
                        <td>
                          <Button size="sm" variant="success" onClick={() => setHistorialDe(f.nombre)}>Ver</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Tab>
          </Tabs>
          </div>
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={cerrarResumen}>Cerrar</Button>
        </Modal.Footer>
      </Modal>

    </div>
  );
};

export default Asistencia;
