import { useState, useEffect, useMemo } from "react";
import { Modal, Button, Table, Form, Spinner } from "react-bootstrap";
import XLSXStyle from "xlsx-js-style";
import { usePendientesModal } from "../../context/PendientesModalContext";
import { obtenerTodosPendientes } from "../../helpers/queriesPendientes";
import { obtenerTodasReparaciones } from "../../helpers/queriesReparaciones";

const RESPONSABLES = [
  { nombre: "Zamorano", color: "#0d6efd" },
  { nombre: "Mauricio", color: "#198754" },
  { nombre: "Nelson", color: "#dc3545" },
  { nombre: "Juan José", color: "#6f42c1" },
  { nombre: "Nacho", color: "#fd7e14" },
  { nombre: "Agustín", color: "#0dcaf0" },
];

const COLOR_ESTADO = {
  Pendiente: "#6c757d",
  "En proceso": "#ffc107",
  Terminado: "#198754",
  Pedido: "#0dcaf0",
  "En taller": "#fd7e14",
  Colocado: "#198754",
};

const ordenResp = (nombre) => {
  const i = RESPONSABLES.findIndex((r) => r.nombre === nombre);
  return i === -1 ? 99 : i;
};

const parseFechaLocal = (f) => {
  const [y, m, d] = f.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const diasPendiente = (fecha, fechaTerminado) => {
  if (!fecha) return "-";
  const inicio = parseFechaLocal(fecha);
  let fin;
  if (fechaTerminado) {
    fin = parseFechaLocal(fechaTerminado);
  } else {
    const a = new Date();
    fin = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  }
  const diff = Math.floor((fin - inicio) / 86400000);
  return diff < 0 ? 0 : diff;
};

export default function ResumenModal() {
  const ctx = usePendientesModal();
  const [docsPendientes, setDocsPendientes] = useState([]);
  const [docsReparaciones, setDocsReparaciones] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [filtroResp, setFiltroResp] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("activas");
  const [filtroMaquina, setFiltroMaquina] = useState("");

  const abierto = !!ctx?.resumenAbierto;

  useEffect(() => {
    if (!abierto) return;
    // Reinicia filtros y recarga datos cada vez que se abre.
    setFiltroResp("");
    setFiltroEstado("activas");
    setFiltroMaquina("");
    const cargar = async () => {
      setCargando(true);
      try {
        const [resPend, resReps] = await Promise.all([
          obtenerTodosPendientes(),
          obtenerTodasReparaciones(),
        ]);
        if (resPend?.ok) setDocsPendientes(await resPend.json());
        if (resReps?.ok) {
          const docs = await resReps.json();
          setDocsReparaciones(Array.isArray(docs) ? docs : []);
        }
      } catch (error) {
        console.error("Error al cargar resumen:", error);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [abierto]);

  const filas = useMemo(() => {
    const rows = [];
    (Array.isArray(docsPendientes) ? docsPendientes : []).forEach((doc) => {
      (doc.tareas || []).forEach((t) =>
        rows.push({
          responsable: doc.responsable,
          tipo: "Tarea",
          fecha: t.fecha,
          maquina: t.maquina || "",
          tarea: t.tarea,
          estado: t.estado,
          fechaTerminado: t.fechaTerminado || "",
        })
      );
    });
    docsReparaciones.forEach((doc) => {
      const maq = doc.maquina?.maquina || "Máquina";
      (doc.reparaciones || []).forEach((r) => {
        rows.push({
          responsable: "Zamorano",
          tipo: "Reparación",
          fecha: r.fecha,
          maquina: maq,
          tarea: r.reparacion,
          estado: r.estado,
        });
        (r.repuestos || []).forEach((rep) => {
          if (rep.responsable) {
            rows.push({
              responsable: rep.responsable,
              tipo: "Repuesto",
              fecha: r.fecha,
              maquina: maq,
              tarea: rep.repuesto,
              estado: rep.estado,
            });
          }
        });
      });
    });
    return rows;
  }, [docsPendientes, docsReparaciones]);

  const maquinasUnicas = [...new Set(filas.map((f) => f.maquina).filter(Boolean))].sort();

  const filasFiltradas = filas
    .filter(
      (f) =>
        (filtroResp === "" || f.responsable === filtroResp) &&
        (filtroEstado === "" ||
          (filtroEstado === "activas"
            ? ["Pedido", "Pendiente", "En proceso"].includes(f.estado)
            : f.estado === filtroEstado)) &&
        (filtroMaquina === "" || f.maquina === filtroMaquina)
    )
    .sort((a, b) => {
      const dr = ordenResp(a.responsable) - ordenResp(b.responsable);
      if (dr !== 0) return dr;
      return (b.fecha || "").localeCompare(a.fecha || "");
    });

  // "Ver" cierra el resumen y abre la planilla del responsable de la fila.
  const irAPlanilla = (f) => {
    ctx.cerrarResumen();
    ctx.abrirResponsable(f.responsable);
  };

  const btnLimpiar = (onClick) => (
    <button
      type="button"
      className="btn btn-sm text-warning position-absolute top-50 translate-middle-y end-0 me-1 p-0 border-0 fw-bold"
      aria-label="Limpiar"
      onClick={onClick}
    >
      ✕
    </button>
  );

  // Formato estándar de Excel del proyecto: fila 1 título mergeado, fila 2 fecha
  // bajo el título, fila 3 encabezados en negrita, fila 4+ datos.
  const exportarExcel = () => {
    const headers = ["Responsable", "Tipo", "Fecha", "Máquina", "Tarea", "Días pendiente", "Estado"];
    const cols = ["A", "B", "C", "D", "E", "F", "G"];
    const centerAlign = { horizontal: "center", vertical: "center" };
    const leftAlign = { horizontal: "left", vertical: "center" };

    const ws = {};
    ws["A1"] = { v: "RESUMEN DE TAREAS PENDIENTES", t: "s", s: { font: { bold: true, sz: 14 }, alignment: leftAlign } };
    ws["A2"] = { v: `Fecha: ${new Date().toLocaleDateString("es-AR")}`, t: "s", s: { alignment: leftAlign } };
    headers.forEach((h, i) => {
      ws[`${cols[i]}3`] = { v: h, t: "s", s: { font: { bold: true }, alignment: centerAlign } };
    });
    filasFiltradas.forEach((f, idx) => {
      const row = idx + 4;
      const vals = [
        f.responsable,
        f.tipo,
        f.fecha ? f.fecha.split("-").reverse().join("/") : "-",
        f.maquina || "-",
        f.tarea || "-",
        diasPendiente(f.fecha, f.fechaTerminado),
        f.estado || "-",
      ];
      vals.forEach((v, i) => {
        ws[`${cols[i]}${row}`] = { v: v ?? "-", t: typeof v === "number" ? "n" : "s", s: { alignment: i === 4 ? leftAlign : centerAlign } };
      });
    });

    ws["!ref"] = `A1:G${filasFiltradas.length + 3}`;
    ws["!cols"] = [{ wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 34 }, { wch: 14 }, { wch: 14 }];

    const libro = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(libro, ws, "Resumen pendientes");
    XLSXStyle.writeFile(libro, "Resumen_Tareas_Pendientes.xlsx");
  };

  return (
    <Modal show={abierto} onHide={() => ctx?.cerrarResumen()} size="xl" centered scrollable>
      <Modal.Header closeButton>
        <div className="d-flex align-items-center gap-3 w-100" style={{ marginRight: 24 }}>
          <Modal.Title>Resumen de tareas pendientes</Modal.Title>
          <Button variant="outline-light" size="sm" className="ms-auto" onClick={exportarExcel}>Excel</Button>
        </div>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex gap-2 mb-3 flex-wrap">
          <div className="position-relative" style={{ width: 180 }}>
            <Form.Select size="sm" value={filtroResp} onChange={(e) => setFiltroResp(e.target.value)} style={{ minWidth: 0, ...(filtroResp !== "" ? { backgroundImage: "none" } : {}) }}>
              <option value="">Responsable (todos)</option>
              {RESPONSABLES.map((r) => (<option key={r.nombre} value={r.nombre}>{r.nombre}</option>))}
            </Form.Select>
            {filtroResp !== "" && btnLimpiar(() => setFiltroResp(""))}
          </div>
          <div className="position-relative" style={{ width: 270 }}>
            <Form.Select size="sm" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={{ minWidth: 0, ...(filtroEstado !== "" ? { backgroundImage: "none" } : {}) }}>
              <option value="activas">Pedido / Pendiente / En proceso</option>
              <option value="Pedido">Pedido</option>
              <option value="Pendiente">Pendiente</option>
              <option value="En proceso">En proceso</option>
              <option value="En taller">En taller</option>
              <option value="Colocado">Colocado</option>
              <option value="Terminado">Terminado</option>
              <option value="">Todos</option>
            </Form.Select>
            {filtroEstado !== "" && btnLimpiar(() => setFiltroEstado(""))}
          </div>
          <div className="position-relative" style={{ width: 200 }}>
            <Form.Select size="sm" value={filtroMaquina} onChange={(e) => setFiltroMaquina(e.target.value)} style={{ minWidth: 0, ...(filtroMaquina !== "" ? { backgroundImage: "none" } : {}) }}>
              <option value="">Máquina (todas)</option>
              {maquinasUnicas.map((m) => (<option key={m} value={m}>{m}</option>))}
            </Form.Select>
            {filtroMaquina !== "" && btnLimpiar(() => setFiltroMaquina(""))}
          </div>
        </div>

        {cargando ? (
          <Spinner animation="border" className="d-block mx-auto my-5" />
        ) : (
          <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
            <Table striped bordered hover size="sm" className="text-center align-middle mb-0">
              <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr>
                  <th style={{ width: 130 }}>Responsable</th>
                  <th style={{ width: 100 }}>Tipo</th>
                  <th style={{ width: 120 }}>Máquina</th>
                  <th>Tarea</th>
                  <th style={{ width: 85 }}>Días pendiente</th>
                  <th style={{ width: 70 }}>Ver</th>
                </tr>
              </thead>
              <tbody>
                {filasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-muted py-3">Sin tareas</td>
                  </tr>
                ) : (
                  filasFiltradas.map((f, idx) => {
                    const color = RESPONSABLES.find((r) => r.nombre === f.responsable)?.color || "#6c757d";
                    return (
                      <tr key={idx}>
                        <td style={{ color, fontWeight: 600 }}>{f.responsable}</td>
                        <td className="text-muted">{f.tipo}</td>
                        <td>{f.maquina || "-"}</td>
                        <td className="text-start">{f.tarea || "-"}</td>
                        <td>{diasPendiente(f.fecha, f.fechaTerminado)}</td>
                        <td>
                          <Button size="sm" variant="outline-success" className="py-0 px-2" onClick={() => irAPlanilla(f)}>Ver</Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer className="justify-content-center">
        <Button variant="outline-secondary" onClick={() => ctx?.cerrarResumen()}>Cerrar</Button>
      </Modal.Footer>
    </Modal>
  );
}
