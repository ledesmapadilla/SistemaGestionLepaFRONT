import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Modal, Form, Table, Spinner } from "react-bootstrap";
import { listarPersonal } from "../../../../../helpers/queriesPersonal.js";
import { listarAsistencia } from "../../../../../helpers/queriesAsistencia.js";
import { calcularHorometroZamorano, horometroStrAMins } from "../../../../../helpers/horometroUtils.js";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];


const diaKey = (anio, mes, dia) =>
  `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

const Asistencia = () => {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth());

  const [loadingDatos, setLoadingDatos] = useState(true);
  const [loadingMes, setLoadingMes] = useState(true);
  const [listaPersonal, setListaPersonal] = useState([]);

  const [registros, setRegistros] = useState({});
  const [semanaResumen, setSemanaResumen] = useState(null);

  const navigate = useNavigate();
  const anios = Array.from({ length: 10 }, (_, i) => 2026 + i);
  const loading = loadingDatos || loadingMes;

  // Carga referencia (personal) — solo al montar
  useEffect(() => {
    const cargar = async () => {
      const resP = await listarPersonal();
      if (resP?.ok) setListaPersonal(await resP.json());
      setLoadingDatos(false);
    };
    cargar();
  }, []);

  // Carga asistencia solo del mes/año seleccionado — se recarga al cambiar mes
  useEffect(() => {
    const cargarAsistencia = async () => {
      setLoadingMes(true);
      setRegistros({});
      const resA = await listarAsistencia(anio, mes);
      if (resA?.ok) {
        const docs = await resA.json();
        const mapa = {};
        docs.forEach((doc) => {
          mapa[doc.fecha] = doc.registros.map((r, i) => ({
            ...r,
            id: r.id || i,
            remito: r.personal?.toLowerCase().includes("zamorano") || !r.obra || r.obra === "Taller" ? true : r.remito,
            sale: r.personal?.toLowerCase().includes("zamorano") && !r.sale ? "17:00" : r.sale,
          }));
        });
        setRegistros(mapa);
      }
      setLoadingMes(false);
    };
    cargarAsistencia();
  }, [anio, mes]);

  const personalVisible = listaPersonal;

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

    navigate("/personal/asistencia-dia", { state: { anio, mes, dia } });
  };

  const normNombre = (s) =>
    (s || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  const minsAHoras = (mins) => {
    const neg = mins < 0;
    const abs = Math.abs(mins);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    const str = m === 0 ? `${h} hs` : `${h}:${String(m).padStart(2, "0")} hs`;
    return neg ? `-${str}` : str;
  };

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
        if (!mapa[keyNombre]) mapa[keyNombre] = { nombre: r.personal, ausentes: 0, sinRemito: 0, observaciones: [], horometroMins: 0 };
        if (r.ausente) mapa[keyNombre].ausentes += esSabado ? 0.5 : 1;
        if (r.mediaFalta) mapa[keyNombre].ausentes += 0.5;
        if (!r.remito) mapa[keyNombre].sinRemito += 1;
        if (r.observaciones) mapa[keyNombre].observaciones.push(r.observaciones);
        if (r.personal.toLowerCase().includes("zamorano"))
          mapa[keyNombre].horometroMins += horometroStrAMins(calcularHorometroZamorano(r.entra, r.sale));
      });
      // Agregar personas que deberían estar ese día aunque no tengan registro guardado
      filtrarPersonalParaDia(key).forEach((p) => {
        const keyNombre = normNombre(p.nombre);
        if (!mapa[keyNombre]) mapa[keyNombre] = { nombre: p.nombre, ausentes: 0, sinRemito: 0, observaciones: [], horometroMins: 0 };
      });
    });
    const filas = Object.values(mapa)
      .filter((datos) => nombresEnAlta.has(normNombre(datos.nombre)))
      .map((datos) => {
        const esZamorano = datos.nombre.toLowerCase().includes("zamorano");
        return {
          nombre: datos.nombre,
          ausentes: esZamorano ? 0 : datos.ausentes,
          sinRemito: datos.sinRemito,
          observaciones: datos.observaciones.join(" / "),
          totalHs: esZamorano ? minsAHoras(datos.horometroMins) : null,
        };
      });
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
          <Button variant="outline-info" onClick={() => navigate("/personal/resumen-mes", { state: { anio, mes } })}>Resumen Mes</Button>
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
                <th>Total hs</th>
              </tr>
            </thead>
            <tbody>
              {semanaResumen?.filas.map((f, i) => (
                <tr key={i}>
                  <td>{f.nombre}</td>
                  <td>{f.ausentes || "-"}</td>
                  <td>{f.sinRemito || "-"}</td>
                  <td style={f.totalHs ? { fontWeight: 700, color: f.totalHs.startsWith("-") ? "#dc3545" : "#198754" } : {}}>
                    {f.totalHs ?? "-"}
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
