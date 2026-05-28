import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button, Form, Modal, Table, Spinner } from "react-bootstrap";
import { listarAsistencia } from "../../../../../helpers/queriesAsistencia.js";
import XLSXStyle from "xlsx-js-style";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const diaKey = (anio, mes, dia) =>
  `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

const ResumenMes = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hoy = new Date();

  const [anio, setAnio] = useState(location.state?.anio ?? hoy.getFullYear());
  const [mes, setMes] = useState(location.state?.mes ?? hoy.getMonth());
  const [registros, setRegistros] = useState({});
  const [cargando, setCargando] = useState(true);

  const [filtroPersonal, setFiltroPersonal] = useState("");
  const [filtroObra, setFiltroObra] = useState("");
  const [filtroMaquina, setFiltroMaquina] = useState("");

  const [diaModal, setDiaModal] = useState(null);

  const anios = Array.from({ length: 10 }, (_, i) => 2026 + i);

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      setRegistros({});
      setFiltroPersonal("");
      setFiltroObra("");
      setFiltroMaquina("");
      const res = await listarAsistencia(anio, mes);
      if (res?.ok) {
        const docs = await res.json();
        const mapa = {};
        docs.forEach((doc) => { mapa[doc.fecha] = doc.registros; });
        setRegistros(mapa);
      }
      setCargando(false);
    };
    cargar();
  }, [anio, mes]);

  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const primerDiaSemana = (new Date(anio, mes, 1).getDay() + 6) % 7;
  const celdas = [
    ...Array(primerDiaSemana).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ];

  const personalOptions = useMemo(() => {
    const set = new Set();
    Object.values(registros).forEach((regs) =>
      regs.forEach((r) => { if (r.personal) set.add(r.personal); })
    );
    return [...set].sort();
  }, [registros]);

  const obraOptions = useMemo(() => {
    const set = new Set();
    Object.values(registros).forEach((regs) =>
      regs.forEach((r) => { if (r.obra) set.add(r.obra); })
    );
    return [...set].sort();
  }, [registros]);

  const maquinaOptions = useMemo(() => {
    const set = new Set();
    Object.values(registros).forEach((regs) =>
      regs.forEach((r) => { if (r.maquina) set.add(r.maquina); })
    );
    return [...set].sort();
  }, [registros]);

  // Handlers mutuamente excluyentes
  const handlePersonal = (val) => {
    setFiltroPersonal(val);
    if (val) { setFiltroObra(""); setFiltroMaquina(""); }
  };
  const handleObra = (val) => {
    setFiltroObra(val);
    if (val) { setFiltroPersonal(""); setFiltroMaquina(""); }
  };
  const handleMaquina = (val) => {
    setFiltroMaquina(val);
    if (val) { setFiltroPersonal(""); setFiltroObra(""); }
  };

  const filtrarRegs = (regs = []) =>
    regs.filter((r) => {
      if (filtroPersonal && r.personal !== filtroPersonal) return false;
      if (filtroObra && r.obra !== filtroObra) return false;
      if (filtroMaquina && r.maquina !== filtroMaquina) return false;
      return true;
    });

  // Qué campo activo hay y qué dos mostrar en la tarjeta
  const filtroActivo = filtroPersonal ? "personal" : filtroObra ? "obra" : filtroMaquina ? "maquina" : null;

  const camposEnTarjeta = (r) => {
    if (filtroActivo === "personal") return [{ label: "Obra", val: r.obra || "-" }, { label: "Máquina", val: r.maquina || "-" }];
    if (filtroActivo === "obra")     return [{ label: "Personal", val: r.personal || "-" }, { label: "Máquina", val: r.maquina || "-" }];
    if (filtroActivo === "maquina")  return [{ label: "Personal", val: r.personal || "-" }, { label: "Obra", val: r.obra || "-" }];
    return null;
  };

  const exportarExcel = () => {
    const filtroLabel = filtroPersonal
      ? `Personal: ${filtroPersonal}`
      : filtroObra
      ? `Obra: ${filtroObra}`
      : filtroMaquina
      ? `Máquina: ${filtroMaquina}`
      : "Todos";

    const titulo = `Resumen ${MESES[mes]} ${anio} — ${filtroLabel}`;
    const headers = ["Fecha", "Personal", "Ausente", "Media Falta", "Remito", "Entra", "Sale", "Máquina", "Horómetro", "Obra", "Observaciones"];
    const cols = "ABCDEFGHIJK";

    const estCentro = { alignment: { horizontal: "center", vertical: "center" } };
    const estHeader = { font: { bold: true }, alignment: { horizontal: "center", vertical: "center" }, fill: { fgColor: { rgb: "222222" } }, font: { bold: true, color: { rgb: "FFFFFF" } } };
    const estTitulo = { font: { bold: true, sz: 13 }, alignment: { horizontal: "left", vertical: "center" } };

    const wb = XLSXStyle.utils.book_new();
    const ws = {};

    const fechaHoySerial = Math.floor((new Date() - new Date(1899, 11, 30)) / 86400000);
    ws["A1"] = { v: titulo, t: "s", s: estTitulo };
    ws["A2"] = { v: fechaHoySerial, t: "n", s: { ...estTitulo, numFmt: "DD/MM/YYYY" } };
    ws["A3"] = { v: "", t: "s" };
    headers.forEach((h, i) => {
      ws[`${cols[i]}4`] = { v: h, t: "s", s: estHeader };
    });

    let row = 5;
    Array.from({ length: diasEnMes }, (_, i) => i + 1).forEach((dia) => {
      const key = diaKey(anio, mes, dia);
      const regs = filtrarRegs(registros[key] || []);
      regs.forEach((r) => {
        const fechaSerial = Math.floor((new Date(anio, mes, dia) - new Date(1899, 11, 30)) / 86400000);
        ws[`A${row}`] = { v: fechaSerial, t: "n", s: { ...estCentro, numFmt: "DD/MM/YYYY" } };
        const vals = [r.personal, r.ausente ? "Sí" : "No", r.mediaFalta ? "Sí" : "No", r.remito ? "Sí" : "No", r.entra, r.sale, r.maquina, r.horometro, r.obra, r.observaciones];
        vals.forEach((v, i) => {
          ws[`${cols[i + 1]}${row}`] = { v: v ?? "", t: "s", s: estCentro };
        });
        row++;
      });
    });

    ws["!ref"] = `A1:K${Math.max(row - 1, 4)}`;
    ws["!cols"] = [{ wch: 12 }, { wch: 22 }, { wch: 9 }, { wch: 12 }, { wch: 9 }, { wch: 8 }, { wch: 8 }, { wch: 18 }, { wch: 12 }, { wch: 22 }, { wch: 24 }];
    XLSXStyle.utils.book_append_sheet(wb, ws, "Resumen");
    XLSXStyle.writeFile(wb, `Resumen_${MESES[mes]}_${anio}.xlsx`);
  };

  const estiloX = {
    position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
    cursor: "pointer", color: "#fff", fontSize: "14px", fontWeight: "900", zIndex: 5, userSelect: "none",
  };
  const selectActivo = { backgroundImage: "none" };

  const regsDiaModal = diaModal
    ? filtrarRegs(registros[diaKey(anio, mes, diaModal)] || [])
    : [];

  if (cargando) return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <div className="container mt-4">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h2 className="mb-0">Resumen — {MESES[mes]} {anio}</h2>
        <div className="d-flex gap-2">
          <Button variant="outline-light" onClick={exportarExcel}>Excel</Button>
          <Button variant="outline-success" onClick={() => navigate(-1)}>Volver</Button>
        </div>
      </div>

      {/* Selectores año/mes */}
      <div className="d-flex align-items-center gap-3 mb-3">
        <Form.Select value={anio} onChange={(e) => setAnio(Number(e.target.value))} style={{ width: 100 }}>
          {anios.map((a) => <option key={a} value={a}>{a}</option>)}
        </Form.Select>
        <Form.Select value={mes} onChange={(e) => setMes(Number(e.target.value))} style={{ width: 140 }}>
          {MESES.map((nombre, i) => <option key={i} value={i}>{nombre}</option>)}
        </Form.Select>
      </div>

      {/* Filtros mutuamente excluyentes */}
      <div className="d-flex gap-2 mb-4">
        <div style={{ position: "relative", width: 200 }}>
          <Form.Select size="sm" value={filtroPersonal} onChange={(e) => handlePersonal(e.target.value)} style={filtroPersonal ? selectActivo : {}}>
            <option value="">Personal</option>
            {personalOptions.map((p) => <option key={p} value={p}>{p}</option>)}
          </Form.Select>
          {filtroPersonal && <span onClick={() => setFiltroPersonal("")} style={estiloX}>✕</span>}
        </div>
        <div style={{ position: "relative", width: 200 }}>
          <Form.Select size="sm" value={filtroObra} onChange={(e) => handleObra(e.target.value)} style={filtroObra ? selectActivo : {}}>
            <option value="">Obras</option>
            {obraOptions.map((o) => <option key={o} value={o}>{o}</option>)}
          </Form.Select>
          {filtroObra && <span onClick={() => setFiltroObra("")} style={estiloX}>✕</span>}
        </div>
        <div style={{ position: "relative", width: 200 }}>
          <Form.Select size="sm" value={filtroMaquina} onChange={(e) => handleMaquina(e.target.value)} style={filtroMaquina ? selectActivo : {}}>
            <option value="">Máquina</option>
            {maquinaOptions.map((m) => <option key={m} value={m}>{m}</option>)}
          </Form.Select>
          {filtroMaquina && <span onClick={() => setFiltroMaquina("")} style={estiloX}>✕</span>}
        </div>
      </div>

      {/* Grilla calendario */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="text-center fw-semibold" style={{ fontSize: "0.82rem", paddingBottom: 4, color: "white" }}>
            {d}
          </div>
        ))}

        {celdas.map((dia, i) => {
          if (dia === null) return <div key={`vacio-${i}`} />;

          const key = diaKey(anio, mes, dia);
          const regsFiltradas = filtrarRegs(registros[key] || []);
          const esDomingo = (primerDiaSemana + dia - 1) % 7 === 6;
          const esFuturo = new Date(anio, mes, dia) > new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
          const esHoyDia = dia === hoy.getDate() && mes === hoy.getMonth() && anio === hoy.getFullYear();
          const tieneRegistros = regsFiltradas.length > 0;

          const bgBase = esFuturo ? "#3a3a3a" : esHoyDia ? "#fff3cd" : esDomingo ? "#666" : "#c0c0c0";
          const bgHover = esFuturo ? "#3a3a3a" : esHoyDia ? "#ffe69c" : esDomingo ? "#555" : "#a8a8a8";

          return (
            <div
              key={dia}
              onClick={() => tieneRegistros && !esFuturo && setDiaModal(dia)}
              className="rounded"
              style={{
                cursor: tieneRegistros && !esFuturo ? "pointer" : esFuturo ? "not-allowed" : "default",
                padding: "6px 4px",
                height: "100%",
                overflowY: "hidden",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                background: bgBase,
                border: "2px solid #ffc107",
                transition: "background 0.15s",
                userSelect: "none",
                opacity: esFuturo ? 0.4 : 1,
              }}
              onMouseEnter={(e) => { if (!esFuturo) e.currentTarget.style.background = bgHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = bgBase; }}
            >
              <span style={{ fontSize: "1rem", fontWeight: 600, color: "#000" }}>{dia}</span>

              {/* Con filtro: mostrar los 2 campos no filtrados por registro */}
              {filtroActivo && regsFiltradas.map((r, idx) => {
                const campos = camposEnTarjeta(r);
                return (
                  <div key={idx} style={{ fontSize: "0.6rem", color: "#111", marginTop: idx === 0 ? 3 : 2, textAlign: "left", lineHeight: 1.3, width: "100%", padding: "0 2px" }}>
                    {campos.map(({ label, val }) => (
                      <div key={label} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        <b>{label}:</b> {val}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Modal detalle del día */}
      <Modal show={!!diaModal} onHide={() => setDiaModal(null)} centered size="xl">
        <Modal.Header closeButton>
          <Modal.Title>{diaModal} de {MESES[mes]} {anio}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ overflowX: "auto" }}>
            <Table striped bordered hover size="sm" className="text-center align-middle mb-0">
              <thead className="table-dark">
                <tr>
                  <th>Personal</th>
                  <th>Ausente</th>
                  <th>Media Falta</th>
                  <th>Remito</th>
                  <th>Entra</th>
                  <th>Sale</th>
                  <th>Máquina</th>
                  <th>Horómetro</th>
                  <th>Obra</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {regsDiaModal.map((r, i) => (
                  <tr key={i}>
                    <td>{r.personal || "-"}</td>
                    <td>{r.ausente ? "Sí" : "-"}</td>
                    <td>{r.mediaFalta ? "Sí" : "-"}</td>
                    <td>{r.remito ? "Sí" : "No"}</td>
                    <td>{r.entra || "-"}</td>
                    <td>{r.sale || "-"}</td>
                    <td>{r.maquina || "-"}</td>
                    <td>{r.horometro || "-"}</td>
                    <td>{r.obra || "-"}</td>
                    <td>{r.observaciones || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={() => setDiaModal(null)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ResumenMes;
