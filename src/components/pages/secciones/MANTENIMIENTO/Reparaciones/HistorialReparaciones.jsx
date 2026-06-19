import { useState, useEffect } from "react";
import { Container, Button, Table, Form, Spinner } from "react-bootstrap";
import Swal from "sweetalert2";
import DetalleReparacion from "./DetalleReparacion";
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
  const [cargando, setCargando] = useState(true);
  const [editandoId, setEditandoId] = useState(null);

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

  if (detalleSel)
    return (
      <DetalleReparacion
        maquina={maquina}
        reparacion={detalleSel}
        onVolver={() => setDetalleSel(null)}
      />
    );

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-5">
        <h4 className="fw-bold mb-0">
          Historial de reparaciones - {maquina?.maquina}
        </h4>
        <div className="d-flex gap-2">
          <Button variant="outline-primary" size="sm" onClick={agregar}>
            + Agregar
          </Button>
          <AsyncButton variant="outline-success" size="sm" onClick={guardar}>
            Guardar
          </AsyncButton>
          <Button variant="outline-success" size="sm" onClick={onVolver}>
            Volver
          </Button>
        </div>
      </div>

      {cargando ? (
        <Spinner animation="border" className="d-block mx-auto my-5" />
      ) : (
      <Table striped bordered hover responsive className="text-center align-middle">
        <thead className="table-dark">
          <tr>
            <th style={{ width: 140 }}>Fecha</th>
            <th>Reparación</th>
            <th style={{ width: 80 }}>Detalle</th>
            <th style={{ width: 150 }}>Parte</th>
            <th style={{ width: 130 }}>Prioridad</th>
            <th style={{ width: 140 }}>Estado</th>
            <th style={{ width: 160 }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && (
            <tr>
              <td colSpan={7} className="text-muted py-3">
                Sin reparaciones cargadas
              </td>
            </tr>
          )}
          {filas.map((f) => {
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
      )}
    </Container>
  );
}

export default HistorialReparaciones;
