import { useState, useEffect } from "react";
import { Row, Col, Spinner, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import * as XLSXStyle from "xlsx-js-style";
import { obtenerTablero } from "../../../../../helpers/queriesTablero.js";

const fmtHorometro = (val) =>
  val != null ? Number(val).toLocaleString("es-AR") + " hs" : "-";

const fmtFecha = (f) =>
  f ? new Date(f + "T12:00:00").toLocaleDateString("es-AR") : "-";

const TarjetaMaquina = ({ datos }) => {
  const { nombre, horometroActual, fechaUltimoRegistro, fechaUltimoService, horometroUltimoService, proximoService, estado } = datos;

  const estadoEl = () => {
    if (!estado) return <span className="text-muted">SIN DATOS</span>;
    if (estado === "OK") return <span style={{ color: "#198754", fontWeight: 700 }}>OK</span>;
    return <span style={{ color: "#dc3545", fontWeight: 700 }}>ATRASADO</span>;
  };

  const fila = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 0" };
  const lbl = { color: "#fff", fontSize: "0.72rem" };
  const val = { color: "#6c757d", fontSize: "0.72rem" };
  const sep = { borderBottom: "1px solid #f0f0f0" };

  return (
    <div style={{ border: "1px solid #ffc107", borderRadius: 6, marginBottom: 8 }}>
      <div style={{
        backgroundColor: "#6c757d",
        color: "#fff",
        padding: "6px 10px",
        fontWeight: 700,
        fontSize: "1rem",
        textAlign: "center",
        borderBottom: "2px solid #ffc107",
      }}>
        {nombre}
      </div>
      <div style={{ padding: "6px 10px" }}>
        <div style={{ ...fila, ...sep }}>
          <span style={lbl}>Horómetro:</span>
          <span style={val}>{fmtHorometro(horometroActual)}</span>
          {fechaUltimoRegistro && <span style={val}>{fmtFecha(fechaUltimoRegistro)}</span>}
        </div>
        <div style={{ ...fila, ...sep }}>
          <span style={lbl}>Últ. Service:</span>
          {fechaUltimoService ? (
            <>
              {horometroUltimoService != null && <span style={val}>{fmtHorometro(horometroUltimoService)}</span>}
              <span style={val}>{fmtFecha(fechaUltimoService)}</span>
            </>
          ) : (
            <span style={val}>-</span>
          )}
        </div>
        <div style={{ ...fila, ...sep }}>
          <span style={lbl}>Próximo Service:</span>
          <span style={{ ...val, flex: 1, textAlign: "center", color: "#fff" }}>{fmtHorometro(proximoService)}</span>
          <span />
        </div>
        <div style={{ textAlign: "center", paddingTop: 4, fontSize: "1rem" }}>
          {estadoEl()}
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
    const CARD_ROWS = 5;
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

    const mkNombre = (ri, ci) => ({ fill: { fgColor: { rgb: "6C757D" } }, font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10 }, alignment: alinC, border: mkBord(ri, ci) });
    const mkLbl    = (ri, ci) => ({ font: { color: negro, sz: 9 }, alignment: alinL, border: mkBord(ri, ci) });
    const mkVal    = (ri, ci) => ({ font: { color: negro, sz: 9 }, alignment: alinC, border: mkBord(ri, ci) });
    const mkEstOK  = (ri, ci) => ({ font: { color: { rgb: "198754" }, bold: true, sz: 10 }, alignment: alinC, border: mkBord(ri, ci) });
    const mkEstAtr = (ri, ci) => ({ font: { color: { rgb: "DC3545" }, bold: true, sz: 10 }, alignment: alinC, border: mkBord(ri, ci) });
    const mkEstSin = (ri, ci) => ({ font: { color: negro, sz: 10 }, alignment: alinC, border: mkBord(ri, ci) });

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
    const titColFin = colLetter(Math.floor(lastCol / 2) + 2);
    ws[`${titCol}1`] = { v: "Tablero de Control — Equipos", t: "s", s: { font: { bold: true, sz: 13 }, alignment: { horizontal: "center", vertical: "center" } } };
    merges.push({ s: { r: 0, c: Math.floor(lastCol / 2) - 2 }, e: { r: 0, c: Math.floor(lastCol / 2) + 2 } });

    tablero.forEach((m, cardIdx) => {
      const cardCol = cardIdx % CARDS_PER_ROW;
      const cardRow = Math.floor(cardIdx / CARDS_PER_ROW);
      const sc = cardCol * (CARD_COLS + GAP_COL);
      const sr = cardRow * (CARD_ROWS + GAP_ROW) + HEADER_ROWS;
      const [c0, c1, c2] = [colLetter(sc), colLetter(sc + 1), colLetter(sc + 2)];
      const [r0, r1, r2, r3, r4] = [sr + 1, sr + 2, sr + 3, sr + 4, sr + 5];

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
      ws[`${c2}${r3}`] = { v: "", t: "s", s: mkVal(3, 2) };
      merges.push({ s: { r: sr + 3, c: sc + 1 }, e: { r: sr + 3, c: sc + 2 } });

      // Estado (ri=4)
      const valEst = m.estado ?? "SIN DATOS";
      const mkE = m.estado === "OK" ? mkEstOK : m.estado === "ATRASADO" ? mkEstAtr : mkEstSin;
      ws[`${c0}${r4}`] = { v: valEst, t: "s", s: mkE(4, 0) };
      ws[`${c1}${r4}`] = { v: "", t: "s", s: mkE(4, 1) };
      ws[`${c2}${r4}`] = { v: "", t: "s", s: mkE(4, 2) };
      merges.push({ s: { r: sr + 4, c: sc }, e: { r: sr + 4, c: sc + 2 } });
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

  return (
    <div className="mx-auto my-2" style={{ maxWidth: "85vw" }}>
      <div className="d-flex align-items-center mb-2">
        <div style={{ flex: 1 }}>
          <small className="text-muted">Fecha: {new Date().toLocaleDateString("es-AR")}</small>
        </div>
        <h6 className="mb-0 text-center" style={{ flex: 1 }}>Tablero de Control — Equipos</h6>
        <div className="d-flex gap-2 justify-content-end" style={{ flex: 1 }}>
          <Button size="sm" variant="outline-light" onClick={exportarExcel}>Excel</Button>
          <Button size="sm" variant="outline-success" onClick={() => navigate(-1)}>Volver</Button>
        </div>
      </div>
      {tablero.length === 0 ? (
        <p className="text-center text-muted">No hay máquinas registradas</p>
      ) : (
        <Row className="g-2">
          {tablero.map((m) => (
            <Col key={m._id} xs={12} sm={6} md={4} lg={2} xl={2} style={{ flex: "0 0 20%", maxWidth: "20%" }}>
              <TarjetaMaquina datos={m} />
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default TableroControl;
