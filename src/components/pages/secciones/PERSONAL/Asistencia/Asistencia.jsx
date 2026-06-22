import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Modal, Form, Table, Spinner } from "react-bootstrap";
import { listarPersonal } from "../../../../../helpers/queriesPersonal.js";
import { listarMaquinas } from "../../../../../helpers/queriesMaquinas.js";
import { listarObras } from "../../../../../helpers/queriesObras.js";
import Swal from "sweetalert2";
import XLSXStyle from "xlsx-js-style";
import { listarAsistencia, guardarAsistencia as guardarAsistenciaAPI } from "../../../../../helpers/queriesAsistencia.js";
import { listarServices } from "../../../../../helpers/queriesServiceMaquinas.js";
import { calcularHorometroZamorano, horometroStrAMins } from "../../../../../helpers/horometroUtils.js";
import AsyncButton from "../../../../shared/AsyncButton.jsx";

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
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

  const [loadingDatos, setLoadingDatos] = useState(true);
  const [loadingMes, setLoadingMes] = useState(true);
  const [listaPersonal, setListaPersonal] = useState([]);
  const [listaMaquinas, setListaMaquinas] = useState([]);
  const [listaObras, setListaObras] = useState([]);

  const [registros, setRegistros] = useState({});
  const [borrador, setBorrador] = useState([]);
  const [listaServices, setListaServices] = useState([]);
  const [semanaResumen, setSemanaResumen] = useState(null);
  const [busquedaPersona, setBusquedaPersona] = useState("");

  const navigate = useNavigate();
  const anios = Array.from({ length: 10 }, (_, i) => 2026 + i);
  const loading = loadingDatos || loadingMes;

  // Carga referencia (personal, máquinas, obras, services) — solo al montar
  useEffect(() => {
    const cargar = async () => {
      const [resP, resM, resO, resSvc] = await Promise.all([
        listarPersonal(),
        listarMaquinas(),
        listarObras(),
        listarServices(),
      ]);
      if (resP?.ok) setListaPersonal(await resP.json());
      if (resM?.ok) setListaMaquinas(await resM.json());
      if (resO?.ok) setListaObras(await resO.json());
      if (resSvc?.ok) setListaServices(await resSvc.json());
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

  const keyDia = diaKey(anio, mes, diaSeleccionado);
  const hoyKey = diaKey(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const editandoHoy = keyDia === hoyKey;
  const esSabadoModal = diaSeleccionado ? new Date(anio, mes, diaSeleccionado).getDay() === 6 : false;

  const filtrarPersonalParaDia = (key) =>
    personalVisible.filter((p) => {
      if (p.fechaAlta && p.fechaAlta > key) return false;
      if (p.activo === false) {
        if (!p.fechaDesactivado || p.fechaDesactivado <= key) return false;
      }
      return true;
    });

  const personalDelDia = diaSeleccionado ? filtrarPersonalParaDia(keyDia) : [];

  const abrirDia = (dia) => {
    const fechaDia = new Date(anio, mes, dia);
    const hoyInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    if (fechaDia > hoyInicio) return;

    const key = diaKey(anio, mes, dia);

    const personalDelDia = filtrarPersonalParaDia(key);
    const esSabadoDia = fechaDia.getDay() === 6;
    const filaDePersonal = (p) => ({
      id: p._id, personal: p.nombre, maquina: "", obra: "", mediaFalta: false,
      ausente: false, remito: true, horometro: "", entra: "8:00",
      sale: esSabadoDia ? "12:00" : "17:00", observaciones: "",
    });

    // Usar datos del caché (cargados al abrir el mes); no hacer request adicional
    const cachedRows = registros[key];
    let filas = cachedRows?.length
      ? cachedRows
      : personalDelDia.map(filaDePersonal);

    const nombresPermitidos = new Set(personalVisible.map((p) => p.nombre.trim().toLowerCase()));
    filas = filas.filter((f) => !f.personal || f.personalLibre || nombresPermitidos.has(f.personal.trim().toLowerCase()));

    const vistos = new Set();
    const filasDedup = filas.filter((f) => {
      const nombre = f.personal?.trim().toLowerCase();
      if (!nombre || vistos.has(nombre)) return false;
      vistos.add(nombre);
      return true;
    });

    // Agregar personal del día que no estaba en los registros guardados
    const faltantes = personalDelDia
      .filter((p) => !vistos.has(p.nombre.trim().toLowerCase()))
      .map(filaDePersonal);

    setBorrador([...filasDedup, ...faltantes].map((f) => ({ ...f })));
    setDiaSeleccionado(dia);
  };

  const cerrarModal = () => {
    setBorrador([]);
    setDiaSeleccionado(null);
    setBusquedaPersona("");
  };

  const maxPorMaquina = useMemo(() => {
    const mapa = {};
    Object.entries(registros).forEach(([fecha, filas]) => {
      if (fecha === keyDia) return;
      filas.forEach((fila) => {
        if (fila.maquina && fila.horometro !== "" && fila.horometro != null) {
          const val = Number(fila.horometro);
          if (!isNaN(val) && val > 0) {
            const k = fila.maquina.toLowerCase().trim();
            if (mapa[k] == null || val > mapa[k]) mapa[k] = val;
          }
        }
      });
    });
    listaServices.forEach((s) => {
      if (s.maquina?.maquina && s.horometro != null) {
        const val = Number(s.horometro);
        if (!isNaN(val) && val > 0) {
          const k = s.maquina.maquina.toLowerCase().trim();
          if (mapa[k] == null || val > mapa[k]) mapa[k] = val;
        }
      }
    });
    return mapa;
  }, [registros, listaServices, keyDia]);

  const guardarModal = async () => {
    if (editandoHoy) {
      const invalidos = borrador.filter((fila) => {
        if (!fila.maquina || fila.horometro === "" || fila.horometro == null) return false;
        const max = maxPorMaquina[fila.maquina.toLowerCase().trim()];
        return max != null && Number(fila.horometro) < max;
      });

      if (invalidos.length > 0) {
        const detalle = invalidos
          .map((f) => `${f.maquina}: mín ${Number(maxPorMaquina[f.maquina.toLowerCase().trim()]).toLocaleString("es-AR")} hs`)
          .join("\n");
        Swal.fire({
          icon: "warning",
          title: "Horómetro inválido",
          text: `El valor ingresado es menor al registrado:\n${detalle}`,
        });
        return;
      }
    }

    const vistosGuardar = new Set();
    const borradorDedup = borrador.filter((f) => {
      const nombre = f.personal?.trim().toLowerCase();
      if (!nombre || vistosGuardar.has(nombre)) return false;
      vistosGuardar.add(nombre);
      return true;
    });
    const respuesta = await guardarAsistenciaAPI(keyDia, borradorDedup);
    if (!respuesta?.ok) {
      Swal.fire({ icon: "error", title: "Error", text: "No se pudo guardar la asistencia" });
      return;
    }
    setRegistros((prev) => ({ ...prev, [keyDia]: borradorDedup }));
    await Swal.fire({ icon: "success", title: "Guardado", text: "Asistencia guardada correctamente", timer: 1500, showConfirmButton: false });
    setBorrador([]);
    setDiaSeleccionado(null);
  };

  const actualizarCelda = (id, campo, valor) => {
    setBorrador((prev) => prev.map((r) => (r.id === id ? { ...r, [campo]: valor } : r)));
  };

  const exportarExcel = () => {
    const titulo = `Asistencia - ${diaSeleccionado} de ${MESES[mes]} ${anio}`;
    const headers = ["Personal", "Ausente", "Remito", "Entra", "Sale", "Máquina", "Horómetro", "Obra", "Observaciones"];
    const estCentro = { alignment: { horizontal: "center", vertical: "center" } };
    const estHeader = { font: { bold: true }, alignment: { horizontal: "center", vertical: "center" } };
    const estTitulo = { font: { bold: true, sz: 14 }, alignment: { horizontal: "left", vertical: "center" } };

    const wb = XLSXStyle.utils.book_new();
    const ws = {};

    ws["A1"] = { v: titulo, t: "s", s: estTitulo };
    ws["A2"] = { v: "", t: "s" };

    const cols = "ABCDEFGHI";
    headers.forEach((h, i) => {
      ws[`${cols[i]}3`] = { v: h, t: "s", s: estHeader };
    });

    borrador.forEach((fila, rowIdx) => {
      const row = rowIdx + 4;
      const vals = [
        fila.personal,
        fila.ausente ? "Ausente" : "Presente",
        fila.remito ? "Sí" : "No",
        fila.entra,
        fila.sale,
        fila.maquina,
        fila.personal?.toLowerCase().includes("zamorano")
          ? calcularHorometroZamorano(fila.entra, fila.sale)
          : fila.horometro,
        fila.obra,
        fila.observaciones,
      ];
      vals.forEach((v, i) => {
        ws[`${cols[i]}${row}`] = { v: v ?? "", t: "s", s: estCentro };
      });
    });

    const lastRow = borrador.length + 3;
    ws["!ref"] = `A1:I${lastRow}`;
    ws["!cols"] = [{ wch: 22 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 18 }, { wch: 12 }, { wch: 22 }, { wch: 24 }];

    XLSXStyle.utils.book_append_sheet(wb, ws, "Asistencia");
    XLSXStyle.writeFile(wb, `Asistencia_${diaSeleccionado}_${MESES[mes]}_${anio}.xlsx`);
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

  // Parsea "hh:mm" a minutos; null si no es válido
  const parseHoraMin = (str) => {
    if (!str) return null;
    const [h, m] = String(str).split(":").map(Number);
    if (isNaN(h)) return null;
    return h * 60 + (isNaN(m) ? 0 : m);
  };

  // Dif. = jornada esperada - (sale - entra), en formato hh:mm (puede ser
  // negativo). La jornada es 9h de lun a vie y 4h el sábado (8:00 a 12:00).
  const calcularDif = (entra, sale, esSabado = false) => {
    const e = parseHoraMin(entra);
    const s = parseHoraMin(sale);
    if (e == null || s == null) return "";
    const dif = (esSabado ? 4 : 9) * 60 - (s - e);
    const neg = dif < 0;
    const abs = Math.abs(dif);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${neg ? "-" : ""}${h}:${String(m).padStart(2, "0")}`;
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

      {/* Modal */}
      <Modal show={!!diaSeleccionado} onHide={cerrarModal} centered size="xl">
        <Modal.Header closeButton>
          <div className="d-flex align-items-center w-100" style={{ marginRight: 32 }}>
            <Modal.Title className="flex-shrink-0">
              {diaSeleccionado} de {MESES[mes]} {anio}
            </Modal.Title>
            <div className="flex-grow-1 d-flex justify-content-center">
              <Form.Select
                size="sm"
                value={busquedaPersona}
                onChange={(e) => setBusquedaPersona(e.target.value)}
                style={{ maxWidth: 220 }}
              >
                <option value="">Todos</option>
                {personalDelDia.map((p) => (
                  <option key={p._id} value={p.nombre}>{p.nombre}</option>
                ))}
              </Form.Select>
            </div>
            <Button variant="outline-light" size="sm" onClick={exportarExcel}>
              Excel
            </Button>
          </div>
        </Modal.Header>
        <Modal.Body>
          <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "60vh" }}>
            <Table striped bordered hover className="text-center align-middle mb-3">
              <thead className="table-dark">
                <tr>
                  <th style={{ width: 200 }}>Personal</th>
                  <th style={{ width: 80 }}>Media Falta</th>
                  <th style={{ width: 60 }}>Ausente</th>
                  <th style={{ width: 60 }}>Remito</th>
                  <th style={{ width: 100 }}>Entra</th>
                  <th style={{ width: 100 }}>Sale</th>
                  <th style={{ width: 80 }}>Dif.</th>
                  <th>Máquina</th>
                  <th style={{ width: 120 }}>Horómetro</th>
                  <th>Obra</th>
                  <th style={{ width: 140 }}>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {borrador.filter((fila) =>
                  !busquedaPersona || (fila.personal || "").toLowerCase().includes(busquedaPersona.toLowerCase())
                ).map((fila) => (
                  <tr key={fila.id}>
                    <td>
                      {fila.personalLibre ? (
                        <Form.Control
                          size="sm"
                          type="text"
                          value={fila.personal}
                          onChange={(e) => actualizarCelda(fila.id, "personal", e.target.value)}
                          placeholder="Nombre..."
                          autoFocus
                        />
                      ) : (
                        <Form.Select
                          size="sm"
                          value={fila.personal}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBorrador((prev) => prev.map((r) =>
                              r.id === fila.id
                                ? { ...r, personal: val, remito: val.toLowerCase().includes("zamorano") ? true : r.remito }
                                : r
                            ));
                          }}
                        >
                          {fila.personal && !personalDelDia.some((p) => p.nombre === fila.personal) && (
                            <option value={fila.personal}>{fila.personal}</option>
                          )}
                          {personalDelDia.map((p) => (
                            <option key={p._id} value={p.nombre}>{p.nombre}</option>
                          ))}
                        </Form.Select>
                      )}
                    </td>
                    <td>
                      <div className="d-flex justify-content-center">
                        <input
                          type="radio"
                          checked={!!fila.mediaFalta}
                          onChange={() => {}}
                          onClick={() => {
                            if (esSabadoModal) return;
                            const nuevoValor = !fila.mediaFalta;
                            setBorrador((prev) => prev.map((r) =>
                              r.id === fila.id
                                ? { ...r, mediaFalta: nuevoValor, ausente: nuevoValor ? false : r.ausente }
                                : r
                            ));
                          }}
                          disabled={esSabadoModal}
                          style={{ cursor: esSabadoModal ? "not-allowed" : "pointer", accentColor: "#ffc107", width: 16, height: 16 }}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="d-flex justify-content-center">
                        <input
                          type="radio"
                          checked={fila.ausente}
                          onChange={() => {}}
                          onClick={() => {
                            const nuevoValor = !fila.ausente;
                            setBorrador((prev) => prev.map((r) =>
                              r.id === fila.id
                                ? { ...r, ausente: nuevoValor, mediaFalta: nuevoValor ? false : r.mediaFalta }
                                : r
                            ));
                          }}
                          style={{ cursor: "pointer", accentColor: "#ff0000", width: 20, height: 20 }}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="d-flex justify-content-center">
                        <input
                          type="radio"
                          checked={fila.remito}
                          onChange={() => {}}
                          onClick={() => actualizarCelda(fila.id, "remito", !fila.remito)}
                          style={{ cursor: "pointer", accentColor: "#198754", width: 16, height: 16 }}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-1">
                        <Form.Control
                          size="sm"
                          type="text"
                          placeholder="hh:mm"
                          value={fila.entra}
                          onChange={(e) => actualizarCelda(fila.id, "entra", e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                          style={{ width: 80 }}
                        />
                        {fila.entra && (
                          <span
                            onClick={() => actualizarCelda(fila.id, "entra", "")}
                            style={{ cursor: "pointer", color: "#fff", fontSize: 14, fontWeight: 900, userSelect: "none" }}
                          >✕</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-1">
                        <Form.Control
                          size="sm"
                          type="text"
                          placeholder="hh:mm"
                          value={fila.sale}
                          onChange={(e) => actualizarCelda(fila.id, "sale", e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                          style={{ width: 80 }}
                        />
                        {fila.sale && (
                          <span
                            onClick={() => actualizarCelda(fila.id, "sale", "")}
                            style={{ cursor: "pointer", color: "#fff", fontSize: 14, fontWeight: 900, userSelect: "none" }}
                          >✕</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {(() => {
                        if (fila.personal?.toLowerCase().includes("zamorano")) return "-";
                        const dif = calcularDif(fila.entra, fila.sale, esSabadoModal);
                        if (!dif) return "-";
                        return (
                          <span style={{ fontWeight: 600, color: dif.startsWith("-") ? "#dc3545" : "#198754" }}>
                            {dif}
                          </span>
                        );
                      })()}
                    </td>
                    <td>
                      <Form.Select
                        size="sm"
                        value={fila.maquina}
                        onChange={(e) => actualizarCelda(fila.id, "maquina", e.target.value)}
                      >
                        <option value="">-</option>
                        {listaMaquinas.map((m) => (
                          <option key={m._id} value={m.maquina}>{m.maquina}</option>
                        ))}
                      </Form.Select>
                    </td>
                    <td>
                      {fila.personal?.toLowerCase().includes("zamorano") ? (
                        <span style={{ color: "#dc3545", fontSize: "1.2rem", fontWeight: 700 }}>
                          {calcularHorometroZamorano(fila.entra, fila.sale)}
                        </span>
                      ) : (
                        <Form.Control
                          size="sm"
                          type="number"
                          value={fila.horometro}
                          onChange={(e) => actualizarCelda(fila.id, "horometro", e.target.value)}
                        />
                      )}
                    </td>
                    <td>
                      <Form.Select
                        size="sm"
                        value={fila.obra}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBorrador((prev) => prev.map((r) =>
                            r.id === fila.id
                              ? { ...r, obra: val, remito: val === "Taller" || val === "" }
                              : r
                          ));
                        }}
                      >
                        <option value="">-</option>
                        <option value="Otras">Otras</option>
                        <option value="Taller">Taller</option>
                        {listaObras.filter((o) => o.estado === "En curso").map((o) => (
                          <option key={o._id} value={o.nombreobra}>{o.nombreobra}</option>
                        ))}
                      </Form.Select>
                    </td>
                    <td>
                      <Form.Control
                        size="sm"
                        type="text"
                        value={fila.observaciones}
                        onChange={(e) => actualizarCelda(fila.id, "observaciones", e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Modal.Body>
        <Modal.Footer className="justify-content-end">
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" onClick={cerrarModal}>Cerrar</Button>
            <AsyncButton variant="outline-success" onClick={guardarModal}>Guardar</AsyncButton>
          </div>
        </Modal.Footer>
      </Modal>

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
