import { useState } from "react";
import { Container, Button, Table, Form } from "react-bootstrap";
import Swal from "sweetalert2";
import AsyncButton from "../../../../shared/AsyncButton";

const ESTADOS = ["Pedido", "Pendiente", "En proceso", "Colocado"];
const COLOR_ESTADO = {
  Pedido: "#0dcaf0",
  Pendiente: "#6c757d",
  "En proceso": "#ffc107",
  Colocado: "#198754",
};

const filaVacia = () => ({
  id: crypto.randomUUID(),
  repuesto: "",
  cantidad: 1,
  precio: 0,
  proveedor: "",
  responsable: "",
  estado: "Pedido",
});

const pesos = (n) =>
  (Number(n) || 0).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

function DetalleRepuestos({ maquina, reparacion, onVolver, onGuardar }) {
  const [filas, setFilas] = useState(
    (reparacion?.repuestos || []).map((r) => ({ ...r, id: r.id || crypto.randomUUID() }))
  );
  const [editandoId, setEditandoId] = useState(null);

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
      title: "Repuesto actualizado",
      showConfirmButton: false,
      timer: 1500,
      timerProgressBar: true,
    });
  };

  const total = filas.reduce(
    (s, f) => s + (Number(f.cantidad) || 0) * (Number(f.precio) || 0),
    0
  );

  const guardar = async () => {
    const res = await onGuardar(filas);
    if (res?.ok) {
      Swal.fire({
        position: "center",
        icon: "success",
        title: "Repuestos guardados",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
      });
      onVolver();
    } else {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudieron guardar los repuestos",
      });
    }
  };

  return (
    <Container className="py-4">
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}
        className="mb-5"
      >
        <span />
        <h4 className="mb-0 text-center">
          Repuestos - {reparacion?.reparacion || "reparación"}
          <small className="text-muted ms-2" style={{ fontSize: "1rem", fontWeight: 400 }}>
            {maquina?.maquina}
          </small>
        </h4>
        <div className="d-flex gap-2 justify-content-end">
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

      <div style={{ maxHeight: "65vh", overflowY: "auto" }}>
      <Table striped bordered hover size="sm" className="text-center align-middle mb-0">
        <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
          <tr>
            <th style={{ width: 40 }}>#</th>
            <th>Repuesto</th>
            <th style={{ width: 110 }}>Cantidad</th>
            <th style={{ width: 150 }}>Precio</th>
            <th style={{ width: 200 }}>Proveedor</th>
            <th style={{ width: 180 }}>Responsable</th>
            <th style={{ width: 140 }}>Estado</th>
            <th style={{ width: 160 }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && (
            <tr>
              <td colSpan={8} className="text-muted py-3">
                Sin repuestos cargados
              </td>
            </tr>
          )}
          {filas.map((f, idx) => {
            const editando = editandoId === f.id;
            return (
            <tr key={f.id}>
              <td className="text-muted">{idx + 1}</td>
              <td className="text-start">
                {editando ? (
                  <Form.Control
                    size="sm"
                    value={f.repuesto}
                    onChange={(e) => editar(f.id, "repuesto", e.target.value)}
                  />
                ) : (
                  f.repuesto || "-"
                )}
              </td>
              <td>
                {editando ? (
                  <Form.Control
                    type="number"
                    size="sm"
                    value={f.cantidad}
                    onChange={(e) => editar(f.id, "cantidad", e.target.value)}
                  />
                ) : (
                  Number(f.cantidad) || 0
                )}
              </td>
              <td>
                {editando ? (
                  <Form.Control
                    type="number"
                    size="sm"
                    value={f.precio}
                    onChange={(e) => editar(f.id, "precio", e.target.value)}
                  />
                ) : (
                  pesos(f.precio)
                )}
              </td>
              <td>
                {editando ? (
                  <Form.Control
                    size="sm"
                    value={f.proveedor}
                    onChange={(e) => editar(f.id, "proveedor", e.target.value)}
                  />
                ) : (
                  f.proveedor || "-"
                )}
              </td>
              <td>
                {editando ? (
                  <Form.Control
                    size="sm"
                    value={f.responsable}
                    onChange={(e) => editar(f.id, "responsable", e.target.value)}
                  />
                ) : (
                  f.responsable || "-"
                )}
              </td>
              <td>
                {editando ? (
                  <Form.Select
                    size="sm"
                    value={f.estado || "Pedido"}
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
        {filas.length > 0 && (
          <tfoot>
            <tr className="table-dark">
              <td className="text-end" colSpan={3}>
                Total
              </td>
              <td>{pesos(total)}</td>
              <td colSpan={4} />
            </tr>
          </tfoot>
        )}
      </Table>
      </div>
    </Container>
  );
}

export default DetalleRepuestos;
