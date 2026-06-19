import { useState } from "react";
import { Container, Button, Table, Form } from "react-bootstrap";
import DetalleReparacion from "./DetalleReparacion";

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
const ESTADOS = ["En proceso", "Terminado"];

const hoy = () => new Date().toISOString().split("T")[0];
const filaVacia = () => ({
  id: crypto.randomUUID(),
  fecha: hoy(),
  reparacion: "",
  descripcion: "",
  parte: "",
  prioridad: "Normal",
  estado: "En proceso",
});

function HistorialReparaciones({ maquina, onVolver }) {
  const [filas, setFilas] = useState([]);
  const [detalleSel, setDetalleSel] = useState(null);

  const agregar = () => setFilas((p) => [...p, filaVacia()]);
  const editar = (id, campo, valor) =>
    setFilas((p) => p.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)));
  const borrar = (id) => setFilas((p) => p.filter((f) => f.id !== id));

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
        <Button variant="outline-success" size="sm" onClick={onVolver}>
          Volver
        </Button>
        <h4 className="fw-bold mb-0 text-center">
          Historial de reparaciones - {maquina?.maquina}
        </h4>
        <Button variant="outline-primary" size="sm" onClick={agregar}>
          + Agregar
        </Button>
      </div>

      <Table striped bordered hover responsive className="text-center align-middle">
        <thead className="table-dark">
          <tr>
            <th style={{ width: 140 }}>Fecha</th>
            <th>Reparación</th>
            <th style={{ width: 80 }}>Detalle</th>
            <th style={{ width: 150 }}>Parte</th>
            <th style={{ width: 130 }}>Prioridad</th>
            <th style={{ width: 140 }}>Estado</th>
            <th style={{ width: 50 }}></th>
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
          {filas.map((f) => (
            <tr key={f.id}>
              <td>
                <Form.Control
                  type="date"
                  size="sm"
                  value={f.fecha}
                  onChange={(e) => editar(f.id, "fecha", e.target.value)}
                />
              </td>
              <td>
                <Form.Control
                  size="sm"
                  value={f.reparacion}
                  onChange={(e) => editar(f.id, "reparacion", e.target.value)}
                />
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
              </td>
              <td>
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
              </td>
              <td>
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
              </td>
              <td>
                <Button size="sm" variant="outline-danger" onClick={() => borrar(f.id)}>
                  ✕
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}

export default HistorialReparaciones;
