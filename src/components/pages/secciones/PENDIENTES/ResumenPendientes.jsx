import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Table, Container, Spinner, Form } from "react-bootstrap";
import XLSXStyle from "xlsx-js-style";
import Swal from "sweetalert2";
import { obtenerTodosPendientes } from "../../../../helpers/queriesPendientes";
import { obtenerTodasReparaciones } from "../../../../helpers/queriesReparaciones";

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

const formatearFecha = (f) => (f ? f.split("-").reverse().join("/") : "-");

export default function ResumenPendientes() {
  const navigate = useNavigate();
  const [docsPendientes, setDocsPendientes] = useState([]);
  const [docsReparaciones, setDocsReparaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroResp, setFiltroResp] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("activas");
  const [filtroMaquina, setFiltroMaquina] = useState("");

  useEffect(() => {
    const cargar = async () => {
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
        console.error("Error al cargar resumen de pendientes:", error);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  // Todas las tareas (manuales + reparaciones + repuestos) de todos los responsables.
  const filas = useMemo(() => {
    const rows = [];
    // Tareas manuales
    (Array.isArray(docsPendientes) ? docsPendientes : []).forEach((doc) => {
      (doc.tareas || []).forEach((t) => {
        rows.push({
          responsable: doc.responsable,
          tipo: "Tarea",
          fecha: t.fecha,
          maquina: t.maquina || "",
          tarea: t.tarea,
          estado: t.estado,
          observaciones: t.observaciones || "",
          fechaTerminado: t.fechaTerminado || "",
        });
      });
    });
    // Reparaciones (Zamorano) y repuestos (por responsable)
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
          observaciones: r.observaciones || "",
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
              observaciones: rep.observaciones || "",
            });
          }
        });
      });
    });
    return rows;
  }, [docsPendientes, docsReparaciones]);

  const maquinasUnicas = [...new Set(filas.map((f) => f.maquina).filter(Boolean))].sort();

  const coincide = (f) =>
    (filtroResp === "" || f.responsable === filtroResp) &&
    (filtroEstado === "" ||
      (filtroEstado === "activas"
        ? f.estado !== "Terminado" && f.estado !== "Colocado"
        : f.estado === filtroEstado)) &&
    (filtroMaquina === "" || f.maquina === filtroMaquina);

  const filasFiltradas = filas
    .filter(coincide)
    .sort((a, b) => {
      const dr = ordenResp(a.responsable) - ordenResp(b.responsable);
      if (dr !== 0) return dr;
      return (b.fecha || "").localeCompare(a.fecha || "");
    });

  const verObservacion = (texto) =>
    Swal.fire({ title: "Observaciones", text: texto, confirmButtonText: "Cerrar", confirmButtonColor: "#6c757d" });

  const exportarExcel = () => {
    const headers = ["Responsable", "Tipo", "Fecha", "Máquina", "Tarea", "Días pend.", "Estado", "Observaciones"];
    const cols = ["A", "B", "C", "D", "E", "F", "G", "H"];
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
      const dias = diasPendiente(f.fecha, f.fechaTerminado);
      const vals = [f.responsable, f.tipo, formatearFecha(f.fecha), f.maquina || "-", f.tarea || "-", dias, f.estado || "-", f.observaciones || "-"];
      vals.forEach((v, i) => {
        ws[`${cols[i]}${row}`] = { v: v ?? "-", t: typeof v === "number" ? "n" : "s", s: { alignment: i === 4 || i === 7 ? leftAlign : centerAlign } };
      });
    });

    ws["!ref"] = `A1:H${filasFiltradas.length + 3}`;
    ws["!cols"] = [{ wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 34 }, { wch: 10 }, { wch: 14 }, { wch: 30 }];

    const libro = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(libro, ws, "Resumen pendientes");
    XLSXStyle.writeFile(libro, "Resumen_Tareas_Pendientes.xlsx");
  };

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0 fw-bold">Resumen de tareas pendientes</h4>
        <div className="d-flex gap-2">
          <Button variant="outline-light" onClick={exportarExcel}>Excel</Button>
          <Button variant="outline-success" onClick={() => navigate("/pendientes")}>Volver</Button>
        </div>
      </div>

      <div className="d-flex gap-2 mb-3 flex-wrap">
        <Form.Select size="sm" style={{ width: 180 }} value={filtroResp} onChange={(e) => setFiltroResp(e.target.value)}>
          <option value="">Responsable (todos)</option>
          {RESPONSABLES.map((r) => (<option key={r.nombre} value={r.nombre}>{r.nombre}</option>))}
        </Form.Select>
        <Form.Select size="sm" style={{ width: 200 }} value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="activas">Activas (sin terminar)</option>
          <option value="Pedido">Pedido</option>
          <option value="Pendiente">Pendiente</option>
          <option value="En proceso">En proceso</option>
          <option value="En taller">En taller</option>
          <option value="Colocado">Colocado</option>
          <option value="Terminado">Terminado</option>
          <option value="">Todos</option>
        </Form.Select>
        <Form.Select size="sm" style={{ width: 200 }} value={filtroMaquina} onChange={(e) => setFiltroMaquina(e.target.value)}>
          <option value="">Máquina (todas)</option>
          {maquinasUnicas.map((m) => (<option key={m} value={m}>{m}</option>))}
        </Form.Select>
      </div>

      {cargando ? (
        <Spinner animation="border" className="d-block mx-auto my-5" />
      ) : (
        <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
          <Table striped bordered hover size="sm" className="text-center align-middle mb-0">
            <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
              <tr>
                <th style={{ width: 130 }}>Responsable</th>
                <th style={{ width: 100 }}>Tipo</th>
                <th style={{ width: 95 }}>Fecha</th>
                <th style={{ width: 110 }}>Máquina</th>
                <th>Tarea</th>
                <th style={{ width: 85 }}>Días pendiente</th>
                <th style={{ width: 110 }}>Estado</th>
                <th style={{ width: 80 }}>Obs.</th>
              </tr>
            </thead>
            <tbody>
              {filasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-muted py-3">Sin tareas</td>
                </tr>
              ) : (
                filasFiltradas.map((f, idx) => {
                  const color = RESPONSABLES.find((r) => r.nombre === f.responsable)?.color || "#6c757d";
                  return (
                    <tr key={idx}>
                      <td style={{ color, fontWeight: 600 }}>{f.responsable}</td>
                      <td className="text-muted">{f.tipo}</td>
                      <td>{formatearFecha(f.fecha)}</td>
                      <td>{f.maquina || "-"}</td>
                      <td className="text-start">{f.tarea || "-"}</td>
                      <td>{diasPendiente(f.fecha, f.fechaTerminado)}</td>
                      <td>
                        <span style={{ color: COLOR_ESTADO[f.estado] || "#dee2e6", fontWeight: 600 }}>{f.estado || "-"}</span>
                      </td>
                      <td>
                        {f.observaciones ? (
                          <Button size="sm" variant="outline-secondary" className="py-0 px-2" onClick={() => verObservacion(f.observaciones)}>Ver</Button>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>
      )}
    </Container>
  );
}
