import { useState, useEffect } from "react";
import { Spinner, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import * as XLSXStyle from "xlsx-js-style";
import { obtenerTablero } from "../../../../../helpers/queriesTablero.js";
import "../../../../../styles/tableroControl.css";

const fmtHorometro = (val) =>
  val != null ? Number(val).toLocaleString("es-AR") + " hs" : "-";

const fmtFecha = (f) =>
  f ? new Date(f + "T12:00:00").toLocaleDateString("es-AR") : "-";

const TarjetaMaquina = ({ datos }) => {
  const { nombre, horometroActual, fechaUltimoRegistro, fechaUltimoService, horometroUltimoService, proximoService, estado } = datos;

  // Calculate hours left or exceeded
  let horasRestantes = null;
  if (proximoService != null && horometroActual != null) {
    horasRestantes = proximoService - horometroActual;
  }

  // Calculate usage percentage since last service
  let porcentaje = 0;
  let labelPorcentaje = "0%";
  if (proximoService != null && horometroUltimoService != null && horometroActual != null) {
    const totalInterval = proximoService - horometroUltimoService;
    if (totalInterval > 0) {
      const transcurrido = horometroActual - horometroUltimoService;
      porcentaje = Math.min(Math.max((transcurrido / totalInterval) * 100, 0), 100);
      labelPorcentaje = `${Math.round((transcurrido / totalInterval) * 100)}%`;
    }
  } else if (proximoService != null && horometroActual != null && proximoService > 0) {
    porcentaje = Math.min(Math.max((horometroActual / proximoService) * 100, 0), 100);
    labelPorcentaje = `${Math.round((horometroActual / proximoService) * 100)}%`;
  }

  // Determine progress bar and status classes
  let progressClass = "progress-ok";
  if (estado === "ATRASADO" || porcentaje >= 100) {
    progressClass = "progress-danger";
  } else if (porcentaje >= 80) {
    progressClass = "progress-warning";
  }

  // Hours remaining badge class
  let hoursLeftClass = "normal";
  if (horasRestantes != null) {
    if (horasRestantes <= 0) {
      hoursLeftClass = "danger";
    } else if (horasRestantes <= 50) {
      hoursLeftClass = "warning";
    }
  }

  const renderBadge = () => {
    if (!estado) return <span className="status-badge badge-sindatos">Sin Datos</span>;
    if (estado === "OK") return <span className="status-badge badge-ok">Operativo</span>;
    return <span className="status-badge badge-atrasado">Atrasado</span>;
  };

  return (
    <div className={`maquina-card ${estado === "ATRASADO" ? "atrasado" : ""}`}>
      <div className="maquina-card-header">
        <h6 className="maquina-name" title={nombre}>{nombre}</h6>
      </div>
      <div className="maquina-card-body">
        {/* Metric hero for current hours */}
        <div className="maquina-hours-hero">
          <span className="maquina-hours-value">{fmtHorometro(horometroActual)}</span>
          <span className="maquina-hours-label">Horómetro Actual</span>
          {fechaUltimoRegistro && (
            <span className="maquina-hours-date">Reg: {fmtFecha(fechaUltimoRegistro)}</span>
          )}
        </div>

        {/* Details Grid */}
        <div className="maquina-info-grid">
          <div className="maquina-info-row">
            <span className="info-lbl">Últ. Service</span>
            <span className="info-val">
              {horometroUltimoService != null ? fmtHorometro(horometroUltimoService) : "-"}
            </span>
          </div>
          {fechaUltimoService && (
            <div className="maquina-info-row" style={{ marginTop: "-2px", borderTop: "none" }}>
              <span className="info-lbl">Fecha Últ. Serv.</span>
              <span className="info-val" style={{ fontSize: "0.68rem", color: "#9ca3af" }}>
                {fmtFecha(fechaUltimoService)}
              </span>
            </div>
          )}
          <div className="maquina-info-row">
            <span className="info-lbl">Próx. Service</span>
            <span className="info-val">{fmtHorometro(proximoService)}</span>
          </div>
        </div>

        {/* Service Progress Bar */}
        {(proximoService != null) && (
          <div className="maquina-progress-wrapper">
            <div className="maquina-progress-header">
              <span>Progreso de uso</span>
              <span>{labelPorcentaje}</span>
            </div>
            <div className="maquina-progress-container">
              <div
                className={`maquina-progress-bar ${progressClass}`}
                style={{ width: `${porcentaje}%` }}
              />
            </div>
          </div>
        )}

        {/* Card Footer */}
        <div className="maquina-card-footer">
          {renderBadge()}
          {horasRestantes != null && (
            <span className={`hours-left-indicator ${hoursLeftClass}`} title="Horas para el próximo service">
              {horasRestantes <= 0 ? (
                `Atrasado ${Math.abs(horasRestantes)} hs`
              ) : (
                `Faltan ${horasRestantes} hs`
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const TableroControl = () => {
  const navigate = useNavigate();
  const [tablero, setTablero] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await obtenerTablero();
        if (res?.ok) setTablero(await res.json());
      } catch (error) {
        console.error("Error al cargar tablero:", error);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const exportarExcel = () => {
    const CARDS_PER_ROW = 5;
    const CARD_COLS = 3;
    const GAP_COL = 1;
    const CARD_ROWS = 6;
    const GAP_ROW = 1;
    const HEADER_ROWS = 2;

    const colLetter = (idx) => {
      if (idx < 26) return String.fromCharCode(65 + idx);
      return String.fromCharCode(64 + Math.floor(idx / 26)) + String.fromCharCode(65 + (idx % 26));
    };

    const negro = { rgb: "000000" };
    const alinC = { horizontal: "center", vertical: "center" };
    const alinL = { horizontal: "left", vertical: "center" };

    // borde externo grueso, interno fino según posición dentro de la tarjeta
    const mkBord = (ri, ci) => ({
      top:    { style: ri === 0 ? "medium" : "thin", color: { rgb: "000000" } },
      bottom: { style: ri === CARD_ROWS - 1 ? "medium" : "thin", color: { rgb: "000000" } },
      left:   { style: ci === 0 ? "medium" : "thin", color: { rgb: "000000" } },
      right:  { style: ci === CARD_COLS - 1 ? "medium" : "thin", color: { rgb: "000000" } },
    });

    const getStyleOK = (ri, ci) => ({
      fill: { fgColor: { rgb: "D1E7DD" } },
      font: { color: { rgb: "0F5132" }, bold: true, sz: 10 },
      alignment: alinC,
      border: mkBord(ri, ci)
    });
    const getStyleAtr = (ri, ci) => ({
      fill: { fgColor: { rgb: "F8D7DA" } },
      font: { color: { rgb: "842029" }, bold: true, sz: 10 },
      alignment: alinC,
      border: mkBord(ri, ci)
    });
    const getStyleSin = (ri, ci) => ({
      fill: { fgColor: { rgb: "E2E3E5" } },
      font: { color: { rgb: "41464B" }, bold: true, sz: 10 },
      alignment: alinC,
      border: mkBord(ri, ci)
    });

    const mkNombre = (ri, ci) => ({ fill: { fgColor: { rgb: "D97706" } }, font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10 }, alignment: alinC, border: mkBord(ri, ci) });
    const mkLbl    = (ri, ci) => ({ font: { color: negro, sz: 9 }, alignment: alinL, border: mkBord(ri, ci) });
    const mkVal    = (ri, ci) => ({ font: { color: negro, sz: 9 }, alignment: alinC, border: mkBord(ri, ci) });

    const fmtD = (f) => f ? new Date(f + "T12:00:00").toLocaleDateString("es-AR") : "";
    const fmtH = (v) => v != null ? Number(v).toLocaleString("es-AR") + " hs" : "";

    const wb = XLSXStyle.utils.book_new();
    const ws = {};
    const merges = [];

    // Fila de cabecera
    const lastCol = CARDS_PER_ROW * (CARD_COLS + GAP_COL) - 1;
    const today = new Date().toLocaleDateString("es-AR");
    ws["A1"] = { v: `Fecha: ${today}`, t: "s", s: { font: { sz: 11 }, alignment: { horizontal: "left", vertical: "center" } } };
    const titCol = colLetter(Math.floor(lastCol / 2) - 2);
    ws[`${titCol}1`] = { v: "Tablero de Control — Equipos", t: "s", s: { font: { bold: true, sz: 13 }, alignment: { horizontal: "center", vertical: "center" } } };
    merges.push({ s: { r: 0, c: Math.floor(lastCol / 2) - 2 }, e: { r: 0, c: Math.floor(lastCol / 2) + 2 } });

    tablero.forEach((m, cardIdx) => {
      const cardCol = cardIdx % CARDS_PER_ROW;
      const cardRow = Math.floor(cardIdx / CARDS_PER_ROW);
      const sc = cardCol * (CARD_COLS + GAP_COL);
      const sr = cardRow * (CARD_ROWS + GAP_ROW) + HEADER_ROWS;
      const [c0, c1, c2] = [colLetter(sc), colLetter(sc + 1), colLetter(sc + 2)];
      const [r0, r1, r2, r3, r4, r5] = [sr + 1, sr + 2, sr + 3, sr + 4, sr + 5, sr + 6];

      // Calculate hours remaining / progress
      let horasRestantes = null;
      if (m.proximoService != null && m.horometroActual != null) {
        horasRestantes = m.proximoService - m.horometroActual;
      }
      
      let labelPorcentaje = "";
      if (m.proximoService != null && m.horometroUltimoService != null && m.horometroActual != null) {
        const totalInterval = m.proximoService - m.horometroUltimoService;
        if (totalInterval > 0) {
          const transcurrido = m.horometroActual - m.horometroUltimoService;
          labelPorcentaje = `${Math.round((transcurrido / totalInterval) * 100)}%`;
        }
      } else if (m.proximoService != null && m.horometroActual != null && m.proximoService > 0) {
        labelPorcentaje = `${Math.round((m.horometroActual / m.proximoService) * 100)}%`;
      }

      // Título (ri=0)
      ws[`${c0}${r0}`] = { v: m.nombre ?? "", t: "s", s: mkNombre(0, 0) };
      ws[`${c1}${r0}`] = { v: "", t: "s", s: mkNombre(0, 1) };
      ws[`${c2}${r0}`] = { v: "", t: "s", s: mkNombre(0, 2) };
      merges.push({ s: { r: sr, c: sc }, e: { r: sr, c: sc + 2 } });

      // Horómetro (ri=1)
      ws[`${c0}${r1}`] = { v: "Horómetro:", t: "s", s: mkLbl(1, 0) };
      ws[`${c1}${r1}`] = { v: fmtH(m.horometroActual), t: "s", s: mkVal(1, 1) };
      ws[`${c2}${r1}`] = { v: fmtD(m.fechaUltimoRegistro), t: "s", s: mkVal(1, 2) };

      // Últ. Service (ri=2)
      ws[`${c0}${r2}`] = { v: "Últ. Service:", t: "s", s: mkLbl(2, 0) };
      ws[`${c1}${r2}`] = { v: fmtH(m.horometroUltimoService), t: "s", s: mkVal(2, 1) };
      ws[`${c2}${r2}`] = { v: fmtD(m.fechaUltimoService), t: "s", s: mkVal(2, 2) };

      // Próximo Service (ri=3)
      ws[`${c0}${r3}`] = { v: "Prox. Service:", t: "s", s: mkLbl(3, 0) };
      ws[`${c1}${r3}`] = { v: fmtH(m.proximoService), t: "s", s: mkVal(3, 1) };
      ws[`${c2}${r3}`] = { v: labelPorcentaje ? `Uso: ${labelPorcentaje}` : "", t: "s", s: mkVal(3, 2) };

      // Restante (ri=4)
      let valRestante = "-";
      let styleRestante = mkVal(4, 1);
      if (horasRestantes != null) {
        if (horasRestantes <= 0) {
          valRestante = `Atrasado ${Math.abs(horasRestantes)} hs`;
          styleRestante = {
            font: { color: { rgb: "842029" }, bold: true, sz: 9 },
            alignment: alinC,
            border: mkBord(4, 1)
          };
        } else {
          valRestante = `Faltan ${horasRestantes} hs`;
          const isWarning = horasRestantes <= 50;
          styleRestante = {
            font: { color: isWarning ? { rgb: "664D03" } : { rgb: "0F5132" }, bold: true, sz: 9 },
            alignment: alinC,
            border: mkBord(4, 1)
          };
        }
      }
      ws[`${c0}${r4}`] = { v: "Restante:", t: "s", s: mkLbl(4, 0) };
      ws[`${c1}${r4}`] = { v: valRestante, t: "s", s: styleRestante };
      ws[`${c2}${r4}`] = { v: "", t: "s", s: styleRestante };
      merges.push({ s: { r: sr + 4, c: sc + 1 }, e: { r: sr + 4, c: sc + 2 } });

      // Estado (ri=5)
      const valEst = m.estado === "OK" ? "OPERATIVO" : m.estado === "ATRASADO" ? "ATRASADO" : "SIN DATOS";
      const getStyleE = m.estado === "OK" ? getStyleOK : m.estado === "ATRASADO" ? getStyleAtr : getStyleSin;
      ws[`${c0}${r5}`] = { v: valEst, t: "s", s: getStyleE(5, 0) };
      ws[`${c1}${r5}`] = { v: "", t: "s", s: getStyleE(5, 1) };
      ws[`${c2}${r5}`] = { v: "", t: "s", s: getStyleE(5, 2) };
      merges.push({ s: { r: sr + 5, c: sc }, e: { r: sr + 5, c: sc + 2 } });
    });

    const totalCardRows = Math.ceil(tablero.length / CARDS_PER_ROW);
    const lastRow = totalCardRows * (CARD_ROWS + GAP_ROW) + HEADER_ROWS;
    ws["!ref"] = `A1:${colLetter(lastCol)}${lastRow}`;
    ws["!merges"] = merges;
    ws["!cols"] = Array.from({ length: CARDS_PER_ROW * (CARD_COLS + GAP_COL) }, (_, i) => {
      const pos = i % (CARD_COLS + GAP_COL);
      return pos === 0 ? { wch: 10 } : pos === 3 ? { wch: 1 } : { wch: 8 };
    });

    ws["!pageSetup"] = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 1, paperSize: 9 };

    XLSXStyle.utils.book_append_sheet(wb, ws, "Tablero");
    XLSXStyle.writeFile(wb, "Tablero_Control.xlsx");
  };

  if (loading) return <Spinner animation="border" className="d-block mx-auto my-5" />;

  // Calculate summary metrics
  const totalEquipos = tablero.length;
  const equiposOk = tablero.filter(m => m.estado === "OK").length;
  const equiposAtrasados = tablero.filter(m => m.estado === "ATRASADO").length;
  const equiposSinDatos = tablero.filter(m => !m.estado || m.estado === "SIN DATOS").length;

  return (
    <div className="tablero-container">
      {/* Header section */}
      <div className="tablero-header">
        <div className="tablero-title-section">
          <h1 className="tablero-title">Tablero de Control — Equipos</h1>
          <span className="tablero-date">Actualizado al: {new Date().toLocaleDateString("es-AR")}</span>
        </div>
        <div className="d-flex gap-2 justify-content-end align-items-center">
          <Button size="sm" variant="outline-light" style={{ borderRadius: "8px", fontWeight: "600", padding: "0.4rem 1rem" }} onClick={exportarExcel}>
            <i className="bi bi-file-earmark-excel me-1"></i> Excel
          </Button>
          <Button size="sm" variant="outline-success" style={{ borderRadius: "8px", fontWeight: "600", padding: "0.4rem 1rem" }} onClick={() => navigate(-1)}>
            Volver
          </Button>
        </div>
      </div>

      {/* Summary statistics row */}
      <div className="tablero-summary-row">
        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-total">
            <i className="bi bi-gear-fill"></i>
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalEquipos}</span>
            <span className="stat-label">Total Equipos</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-ok">
            <i className="bi bi-check-circle-fill"></i>
          </div>
          <div className="stat-info">
            <span className="stat-value">{equiposOk}</span>
            <span className="stat-label">Operativos</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-atrasado">
            <i className="bi bi-exclamation-triangle-fill"></i>
          </div>
          <div className="stat-info">
            <span className="stat-value">{equiposAtrasados}</span>
            <span className="stat-label">Atrasados</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-sindatos">
            <i className="bi bi-dash-circle-fill"></i>
          </div>
          <div className="stat-info">
            <span className="stat-value">{equiposSinDatos}</span>
            <span className="stat-label">Sin Datos</span>
          </div>
        </div>
      </div>

      {/* Main cards grid */}
      {tablero.length === 0 ? (
        <div className="text-center p-5" style={{ borderRadius: "14px", border: "1px dashed rgba(255,255,255,0.1)", background: "rgba(30,41,59,0.3)" }}>
          <i className="bi bi-inbox text-muted" style={{ fontSize: "2.5rem" }}></i>
          <p className="text-muted mt-2">No hay máquinas registradas en el sistema.</p>
        </div>
      ) : (
        <div className="tablero-grid">
          {tablero.map((m) => (
            <TarjetaMaquina key={m._id} datos={m} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TableroControl;
