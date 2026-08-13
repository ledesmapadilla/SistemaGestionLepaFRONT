import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Modal, Form, Table, Spinner } from "react-bootstrap";
import { listarAsistencia, listarDatosAsistencia } from "../../../../../helpers/queriesAsistencia.js";
import { difMinDia, minsAHHMM, colorDif } from "../../../../../helpers/jornadaUtils.js";
import { ordenarPersonal } from "../../../../../helpers/ordenPersonal.js";

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

const Asistencia = () => {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth());

  const [loadingDatos, setLoadingDatos] = useState(true);
  const [loadingMes, setLoadingMes] = useState(true);
  const [listaPersonal, setListaPersonal] = useState([]);
  const [listaMaquinas, setListaMaquinas] = useState([]);
  const [listaObras, setListaObras] = useState([]);
  const [listaServices, setListaServices] = useState([]);

  const [registros, setRegistros] = useState({});
  const [semanaResumen, setSemanaResumen] = useState(null);

  const navigate = useNavigate();
  const anios = Array.from({ length: 10 }, (_, i) => 2026 + i);
  const loading = loadingDatos || loadingMes;
  // El mes inicial ya viene en la carga de arriba; este ref evita pedirlo de nuevo.
  const primeraCarga = useRef(true);

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

  const normNombre = (s) =>
    (s || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  const abrirResumen = (diasSemana) => {
    const nombresEnAlta = new Set(listaPersonal.map((p) => normNombre(p.nombre)));
    const mapa = {};
    diasSemana.forEach((d) => {
      const key = diaKey(anio, mes, d);
      const esSabado = new Date(anio, mes, d).getDay() === 6;
      const regs = registros[key] || [];
      regs.forEach((r) => {
        if (!r.personal) return;
        const keyNombre = normNombre(r.personal);
        if (!mapa[keyNombre]) mapa[keyNombre] = { nombre: r.personal, ausentes: 0, sinRemito: 0, observaciones: [], difMins: 0 };
        if (r.ausente) mapa[keyNombre].ausentes += esSabado ? 0.5 : 1;
        if (r.mediaFalta) mapa[keyNombre].ausentes += 0.5;
        if (!r.remito) mapa[keyNombre].sinRemito += 1;
        if (r.observaciones) mapa[keyNombre].observaciones.push(r.observaciones);
        // La Dif. de los días ausente/media falta no cuenta: eso ya lo refleja
        // la columna Ausentes (y en Gastos Semanales, el ausentismo).
        if (!r.ausente && !r.mediaFalta) {
          const dm = difMinDia(r.entra, r.sale, esSabado, r.personal);
          if (dm != null) mapa[keyNombre].difMins += dm;
        }
      });
      // Agregar personas que deberían estar ese día aunque no tengan registro guardado
      filtrarPersonalParaDia(key).forEach((p) => {
        const keyNombre = normNombre(p.nombre);
        if (!mapa[keyNombre]) mapa[keyNombre] = { nombre: p.nombre, ausentes: 0, sinRemito: 0, observaciones: [], difMins: 0 };
      });
    });
    const filas = Object.values(mapa)
      .filter((datos) => nombresEnAlta.has(normNombre(datos.nombre)))
      .map((datos) => ({
        nombre: datos.nombre,
        ausentes: datos.ausentes,
        sinRemito: datos.sinRemito,
        observaciones: datos.observaciones.join(" / "),
        difMins: datos.difMins,
      }));
    const desde = diasSemana[0];
    const hasta = diasSemana[diasSemana.length - 1];
    setSemanaResumen({ filas, label: `${desde} al ${hasta} de ${MESES[mes].toLowerCase()} ${anio}` });
  };

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
          onChange={(e) => setAnio(Number(e.target.value))}
          style={{ width: 100 }}
        >
          {anios.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </Form.Select>
        <Form.Select
          value={mes}
          onChange={(e) => setMes(Number(e.target.value))}
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
      <Modal show={!!semanaResumen} onHide={() => setSemanaResumen(null)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Resumen {semanaResumen?.label}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table striped bordered hover className="text-center align-middle mx-auto" style={{ width: "80%" }}>
            <thead className="table-dark">
              <tr>
                <th>Personal</th>
                <th>Ausentes</th>
                <th>Sin Remito</th>
                <th>Dif.</th>
              </tr>
            </thead>
            <tbody>
              {semanaResumen?.filas.map((f, i) => (
                <tr key={i}>
                  <td>{f.nombre}</td>
                  <td>{f.ausentes || "-"}</td>
                  <td>{f.sinRemito || "-"}</td>
                  <td style={f.difMins ? { fontWeight: 700, color: colorDif(f.difMins) } : {}}>
                    {f.difMins ? minsAHHMM(f.difMins) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={() => setSemanaResumen(null)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>

    </div>
  );
};

export default Asistencia;
