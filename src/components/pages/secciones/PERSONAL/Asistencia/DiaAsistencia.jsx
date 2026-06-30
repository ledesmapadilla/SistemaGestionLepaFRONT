import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button, Form, Table, Spinner } from "react-bootstrap";
import { listarPersonal } from "../../../../../helpers/queriesPersonal.js";
import { listarMaquinas } from "../../../../../helpers/queriesMaquinas.js";
import { listarObras } from "../../../../../helpers/queriesObras.js";
import Swal from "sweetalert2";
import XLSXStyle from "xlsx-js-style";
import { listarAsistencia, guardarAsistencia as guardarAsistenciaAPI } from "../../../../../helpers/queriesAsistencia.js";
import { listarServices } from "../../../../../helpers/queriesServiceMaquinas.js";
import { calcularHorometroZamorano } from "../../../../../helpers/horometroUtils.js";
import AsyncButton from "../../../../shared/AsyncButton.jsx";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const diaKey = (anio, mes, dia) =>
  `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

const DiaAsistencia = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hoy = new Date();

  const anio = location.state?.anio ?? hoy.getFullYear();
  const mes = location.state?.mes ?? hoy.getMonth();
  const dia = location.state?.dia ?? hoy.getDate();

  const [loadingDatos, setLoadingDatos] = useState(true);
  const [loadingMes, setLoadingMes] = useState(true);
  const [listaPersonal, setListaPersonal] = useState([]);
  const [listaMaquinas, setListaMaquinas] = useState([]);
  const [listaObras, setListaObras] = useState([]);
  const [listaServices, setListaServices] = useState([]);

  const [registros, setRegistros] = useState({});
  const [edits, setEdits] = useState(null);
  const [busquedaPersona, setBusquedaPersona] = useState("");

  const loading = loadingDatos || loadingMes;

  const keyDia = diaKey(anio, mes, dia);
  const hoyKey = diaKey(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const editandoHoy = keyDia === hoyKey;
  const esSabado = new Date(anio, mes, dia).getDay() === 6;

  // Si no hay state (acceso directo a la URL), volver a la grilla
  useEffect(() => {
    if (!location.state) navigate("/personal/asistencia", { replace: true });
  }, [location.state, navigate]);

  const filtrarPersonalParaDia = (key, lista) =>
    lista.filter((p) => {
      if (p.fechaAlta && p.fechaAlta > key) return false;
      if (p.activo === false) {
        if (!p.fechaDesactivado || p.fechaDesactivado <= key) return false;
      }
      return true;
    });

  // Carga referencia (personal, máquinas, obras, services)
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

  // Carga asistencia del mes (para el día y para el cálculo de horómetro máximo)
  useEffect(() => {
    const cargarAsistencia = async () => {
      setLoadingMes(true);
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

  const personalDelDia = useMemo(
    () => filtrarPersonalParaDia(keyDia, listaPersonal),
    [keyDia, listaPersonal]
  );

  // Borrador inicial derivado de los datos cargados (sin efectos). Las ediciones
  // del usuario se guardan en `edits`; mientras no edite, se ve el inicial.
  const borradorInicial = useMemo(() => {
    if (loading) return [];

    const filaDePersonal = (p) => ({
      id: p._id, personal: p.nombre, maquina: "", obra: "", mediaFalta: false,
      ausente: false, remito: true, horometro: "",
      entra: p.nombre?.toLowerCase().includes("zamorano") ? "8:30" : "8:00",
      sale: esSabado ? "12:00" : "17:00", observaciones: "",
    });

    const cachedRows = registros[keyDia];
    let filas = cachedRows?.length
      ? cachedRows
      : personalDelDia.map(filaDePersonal);

    const nombresPermitidos = new Set(listaPersonal.map((p) => p.nombre.trim().toLowerCase()));
    filas = filas.filter((f) => !f.personal || f.personalLibre || nombresPermitidos.has(f.personal.trim().toLowerCase()));

    const vistos = new Set();
    const filasDedup = filas.filter((f) => {
      const nombre = f.personal?.trim().toLowerCase();
      if (!nombre || vistos.has(nombre)) return false;
      vistos.add(nombre);
      return true;
    });

    const faltantes = personalDelDia
      .filter((p) => !vistos.has(p.nombre.trim().toLowerCase()))
      .map(filaDePersonal);

    return [...filasDedup, ...faltantes].map((f) => ({ ...f }));
  }, [loading, registros, personalDelDia, listaPersonal, keyDia, esSabado]);

  const borrador = edits ?? borradorInicial;

  // Aplica una actualización funcional al borrador, partiendo del inicial si el
  // usuario aún no editó nada.
  const setBorrador = (updater) =>
    setEdits((prev) =>
      typeof updater === "function" ? updater(prev ?? borradorInicial) : updater
    );

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

  const volver = () => navigate("/personal/asistencia", { state: { anio, mes } });

  const guardar = async () => {
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
    await Swal.fire({ icon: "success", title: "Guardado", text: "Asistencia guardada correctamente", timer: 1500, showConfirmButton: false });
    volver();
  };

  const actualizarCelda = (id, campo, valor) => {
    setBorrador((prev) => prev.map((r) => (r.id === id ? { ...r, [campo]: valor } : r)));
  };

  const exportarExcel = () => {
    const titulo = `Asistencia - ${dia} de ${MESES[mes]} ${anio}`;
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
    XLSXStyle.writeFile(wb, `Asistencia_${dia}_${MESES[mes]}_${anio}.xlsx`);
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
  const calcularDif = (entra, sale, esSab = false) => {
    const e = parseHoraMin(entra);
    const s = parseHoraMin(sale);
    if (e == null || s == null) return "";
    const dif = (esSab ? 4 : 9) * 60 - (s - e);
    const neg = dif < 0;
    const abs = Math.abs(dif);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${neg ? "-" : ""}${h}:${String(m).padStart(2, "0")}`;
  };

  if (loading) return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <div className="container mt-4">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h2 className="mb-0">{dia} de {MESES[mes]} {anio}</h2>
        <div className="d-flex align-items-center gap-2">
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
          <Button variant="outline-info" onClick={exportarExcel}>Excel</Button>
          <Button variant="outline-success" onClick={volver}>Volver</Button>
        </div>
      </div>

      <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "65vh" }}>
        <Table striped bordered hover className="text-center align-middle mb-3">
          <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
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
                        if (esSabado) return;
                        const nuevoValor = !fila.mediaFalta;
                        setBorrador((prev) => prev.map((r) =>
                          r.id === fila.id
                            ? { ...r, mediaFalta: nuevoValor, ausente: nuevoValor ? false : r.ausente }
                            : r
                        ));
                      }}
                      disabled={esSabado}
                      style={{ cursor: esSabado ? "not-allowed" : "pointer", accentColor: "#ffc107", width: 16, height: 16 }}
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
                    const dif = calcularDif(fila.entra, fila.sale, esSabado);
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

        <div className="d-flex justify-content-end gap-2 mb-2">
          <Button variant="outline-secondary" onClick={volver}>Cerrar</Button>
          <AsyncButton variant="outline-success" onClick={guardar}>Guardar</AsyncButton>
        </div>
      </div>
    </div>
  );
};

export default DiaAsistencia;
