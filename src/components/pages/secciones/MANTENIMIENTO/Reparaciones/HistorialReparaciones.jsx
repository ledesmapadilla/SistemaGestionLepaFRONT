import { useState, useEffect, useMemo } from "react";
import { Container, Button, Table, Form, Spinner } from "react-bootstrap";
import Swal from "sweetalert2";
import XLSXStyle from "xlsx-js-style";
import DetalleReparacion from "./DetalleReparacion";
import DetalleRepuestos from "./DetalleRepuestos";
import AsyncButton from "../../../../shared/AsyncButton";
import {
  obtenerReparacionesPorMaquina,
  guardarReparaciones,
} from "../../../../../helpers/queriesReparaciones";

const PARTES = [
  "Motor",
  "Hidráulico",
  "Eléctrico",
  "Electrónico",
  "Herrería",
  "Tren rodante",
  "Cabina",
  "Chapa",
];
const PRIORIDADES = ["Normal", "Urgente", "Crítico"];
const ESTADOS = ["Pendiente", "En proceso", "Terminado"];
const COLOR_ESTADO = { Pendiente: "#6c757d", "En proceso": "#ffc107", Terminado: "#198754" };

const hoy = () => new Date().toISOString().split("T")[0];
const filaVacia = () => ({
  id: crypto.randomUUID(),
  fecha: hoy(),
  reparacion: "",
  descripcion: "",
  parte: "",
  prioridad: "Normal",
  estado: "Pendiente",
});

function HistorialReparaciones({ maquina, onVolver }) {
  const [filas, setFilas] = useState([]);
  const [detalleSel, setDetalleSel] = useState(null);
  const [repuestosSel, setRepuestosSel] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [editandoId, setEditandoId] = useState(null);
  const [filtroReparacion, setFiltroReparacion] = useState("");
  const [filtroParte, setFiltroParte] = useState("");

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      try {
        const res = await obtenerReparacionesPorMaquina(maquina?._id);
        if (res?.ok) {
          const data = await res.json();
          const items = (data?.reparaciones || []).map((r) => ({
            ...r,
            id: r.id || crypto.randomUUID(),
          }));
          setFilas(items);
        }
      } catch (error) {
        console.error("Error al cargar reparaciones:", error);
      } finally {
        setCargando(false);
      }
    };
    if (maquina?._id) cargar();
    else setCargando(false);
  }, [maquina?._id]);

  const agregar = () => {
    const nueva = filaVacia();
    setFilas((p) => [...p, nueva]);
    setEditandoId(nueva.id);
  };
  const editar = (id, campo, valor) =>
    setFilas((p) => p.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)));
  const borrar = (id) => {
    setFilas((p) => p.filter((f) => f.id !== id));
    setEditandoId((prev) => (prev === id ? null : prev));
  };

  const finalizarEdicion = () => {
    setEditandoId(null);
    Swal.fire({
      position: "center",
      icon: "success",
      title: "Reparación actualizada",
      showConfirmButton: false,
      timer: 1500,
      timerProgressBar: true,
    });
  };

  const guardar = async () => {
    const res = await guardarReparaciones(maquina?._id, filas);
    if (res?.ok) {
      Swal.fire({
        position: "center",
        icon: "success",
        title: "Reparaciones guardadas",
        showConfirmButton: false,
        timer: 1800,
        timerProgressBar: true,
      });
    } else {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudieron guardar las reparaciones",
      });
    }
  };

  const guardarRepuestos = async (filaId, repuestos) => {
    const nuevasFilas = filas.map((f) =>
      f.id === filaId ? { ...f, repuestos } : f
    );
    setFilas(nuevasFilas);
    return await guardarReparaciones(maquina?._id, nuevasFilas);
  };

  const reparacionesUnicas = useMemo(
    () => [...new Set(filas.map((f) => f.reparacion).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [filas]
  );
  const partesUnicas = useMemo(
    () => [...new Set(filas.map((f) => f.parte).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [filas]
  );
  const filasFiltradas = useMemo(
    () =>
      filas.filter(
        (f) =>
          (!filtroReparacion || f.reparacion === filtroReparacion) &&
          (!filtroParte || f.parte === filtroParte)
      ),
    [filas, filtroReparacion, filtroParte]
  );

  const exportarExcel = () => {
    const titulo = `Historial de reparaciones - ${maquina?.maquina || ""}`;
    const headers = ["Fecha", "Reparación", "Parte", "Prioridad", "Estado"];
    const cols = "ABCDE";
    const estCentro = { alignment: { horizontal: "center", vertical: "center" } };
    const estIzq = { alignment: { horizontal: "left", vertical: "center" } };
    const estHeader = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "222222" } }, alignment: { horizontal: "center", vertical: "center" } };
    const estTitulo = { font: { bold: true, sz: 13 }, alignment: { horizontal: "left", vertical: "center" } };

    const wb = XLSXStyle.utils.book_new();
    const ws = {};

    const hoy = new Date();
    const fechaSerial = Math.round((Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) - Date.UTC(1899, 11, 30)) / 86400000);

    ws["A1"] = { v: titulo, t: "s", s: estTitulo };
    ws["A2"] = { v: fechaSerial, t: "n", s: { ...estTitulo, numFmt: "DD/MM/YYYY" } };
    ws["A3"] = { v: "", t: "s" };
    headers.forEach((h, i) => { ws[`${cols[i]}4`] = { v: h, t: "s", s: estHeader }; });

    filasFiltradas.forEach((r, rowIdx) => {
      const row = rowIdx + 5;
      ws[`A${row}`] = { v: r.fecha ? r.fecha.split("-").reverse().join("/") : "", t: "s", s: estCentro };
      ws[`B${row}`] = { v: r.reparacion || "", t: "s", s: estIzq };
      ws[`C${row}`] = { v: r.parte || "", t: "s", s: estCentro };
      ws[`D${row}`] = { v: r.prioridad || "", t: "s", s: estCentro };
      ws[`E${row}`] = { v: r.estado || "", t: "s", s: estCentro };
    });

    const lastRow = filasFiltradas.length + 4;
    ws["!ref"] = `A1:E${Math.max(lastRow, 4)}`;
    ws["!cols"] = [{ wch: 14 }, { wch: 36 }, { wch: 16 }, { wch: 14 }, { wch: 14 }];

    XLSXStyle.utils.book_append_sheet(wb, ws, "Reparaciones");
    XLSXStyle.writeFile(wb, `HistorialReparaciones_${maquina?.maquina || ""}.xlsx`);
  };

  if (detalleSel)
    return (
      <DetalleReparacion
        maquina={maquina}
        reparacion={detalleSel}
        onVolver={() => setDetalleSel(null)}
      />
    );

  if (repuestosSel) {
    const fila = filas.find((f) => f.id === repuestosSel);
    return (
      <DetalleRepuestos
        maquina={maquina}
        reparacion={fila}
        onVolver={() => setRepuestosSel(null)}
        onGuardar={(reps) => guardarRepuestos(repuestosSel, reps)}
      />
    );
  }

  return (
    <Container className="py-4">
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}
        className="mb-5"
      >
        <div className="d-flex justify-content-start">
          <Button variant="outline-success" size="sm" onClick={onVolver}>
            Volver
          </Button>
        </div>
        <h4 className="mb-0 text-center">
          Historial de reparaciones - {maquina?.maquina}
        </h4>
        <div className="d-flex gap-2 justify-content-end">
          <Button variant="outline-light" size="sm" onClick={exportarExcel}>
            Excel
          </Button>
          <Button variant="outline-primary" size="sm" onClick={agregar}>
            + Agregar
          </Button>
          <AsyncButton variant="outline-success" size="sm" onClick={guardar}>
            Guardar
          </AsyncButton>
        </div>
      </div>

      {cargando ? (
        <Spinner animation="border" className="d-block mx-auto my-5" />
      ) : (
      <>
      <div className="d-flex gap-2 mb-3">
        <div className="position-relative flex-fill">
          <Form.Select
            size="sm"
            value={filtroReparacion}
            onChange={(e) => setFiltroReparacion(e.target.value)}
            style={filtroReparacion ? { backgroundImage: "none" } : {}}
          >
            <option value="">Reparación (todas)</option>
            {reparacionesUnicas.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Form.Select>
          {filtroReparacion && (
            <button
              type="button"
              className="btn btn-sm text-warning position-absolute top-50 translate-middle-y end-0 me-1 p-0 border-0 fw-bold"
              aria-label="Limpiar"
              onClick={() => setFiltroReparacion("")}
            >
              ✕
            </button>
          )}
        </div>
        <div className="position-relative flex-fill">
          <Form.Select
            size="sm"
            value={filtroParte}
            onChange={(e) => setFiltroParte(e.target.value)}
            style={filtroParte ? { backgroundImage: "none" } : {}}
          >
            <option value="">Parte (todas)</option>
            {partesUnicas.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </Form.Select>
          {filtroParte && (
            <button
              type="button"
              className="btn btn-sm text-warning position-absolute top-50 translate-middle-y end-0 me-1 p-0 border-0 fw-bold"
              aria-label="Limpiar"
              onClick={() => setFiltroParte("")}
            >
              ✕
            </button>
          )}
        </div>
      </div>
      <div style={{ maxHeight: "65vh", overflowY: "auto" }}>
      <Table striped bordered hover size="sm" className="text-center align-middle mb-0">
        <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
          <tr>
            <th style={{ width: 140 }}>Fecha</th>
            <th>Reparación</th>
            <th style={{ width: 80 }}>Detalle</th>
            <th style={{ width: 150 }}>Parte</th>
            <th style={{ width: 130 }}>Prioridad</th>
            <th style={{ width: 140 }}>Estado</th>
            <th style={{ width: 90 }}>Repuestos</th>
            <th style={{ width: 160 }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filasFiltradas.length === 0 && (
            <tr>
              <td colSpan={8} className="text-muted py-3">
                Sin reparaciones cargadas
              </td>
            </tr>
          )}
          {filasFiltradas.map((f) => {
            const editando = editandoId === f.id;
            return (
            <tr key={f.id}>
              <td>
                {editando ? (
                  <Form.Control
                    type="date"
                    size="sm"
                    value={f.fecha}
                    onChange={(e) => editar(f.id, "fecha", e.target.value)}
                  />
                ) : (
                  f.fecha ? f.fecha.split("-").reverse().join("/") : "-"
                )}
              </td>
              <td className={editando ? "" : "text-start"}>
                {editando ? (
                  <Form.Control
                    size="sm"
                    value={f.reparacion}
                    onChange={(e) => editar(f.id, "reparacion", e.target.value)}
                  />
                ) : (
                  f.reparacion || "-"
                )}
              </td>
              <td>
                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={() => setDetalleSel(f)}
                >
                  +
                </Button>
              </td>
              <td>
                {editando ? (
                  <Form.Select
                    size="sm"
                    value={f.parte}
                    onChange={(e) => editar(f.id, "parte", e.target.value)}
                  >
                    <option value="">—</option>
                    {PARTES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Form.Select>
                ) : (
                  f.parte || "-"
                )}
              </td>
              <td>
                {editando ? (
                  <Form.Select
                    size="sm"
                    value={f.prioridad}
                    onChange={(e) => editar(f.id, "prioridad", e.target.value)}
                  >
                    {PRIORIDADES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Form.Select>
                ) : (
                  f.prioridad || "-"
                )}
              </td>
              <td>
                {editando ? (
                  <Form.Select
                    size="sm"
                    value={f.estado}
                    onChange={(e) => editar(f.id, "estado", e.target.value)}
                  >
                    {ESTADOS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Form.Select>
                ) : (
                  <span style={{ color: COLOR_ESTADO[f.estado] || "#dee2e6", fontWeight: 600 }}>
                    {f.estado || "-"}
                  </span>
                )}
              </td>
              <td>
                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={() => setRepuestosSel(f.id)}
                >
                  +
                </Button>
              </td>
              <td>
                <div className="d-flex gap-1 justify-content-center align-items-center">
                  {editando ? (
                    <Button size="sm" variant="outline-success" onClick={finalizarEdicion}>
                      Listo
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline-warning" onClick={() => setEditandoId(f.id)}>
                      Editar
                    </Button>
                  )}
                  <Button size="sm" variant="outline-danger" onClick={() => borrar(f.id)}>
                    Borrar
                  </Button>
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </Table>
      </div>
      </>
      )}
    </Container>
  );
}

export default HistorialReparaciones;
