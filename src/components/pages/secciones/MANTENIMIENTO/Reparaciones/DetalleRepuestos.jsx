import { useState } from "react";
import { Container, Button, Table, Form } from "react-bootstrap";
import Swal from "sweetalert2";
import AsyncButton from "../../../../shared/AsyncButton";

const filaVacia = () => ({
  id: crypto.randomUUID(),
  repuesto: "",
  cantidad: 1,
  precio: 0,
  proveedor: "",
  responsable: "",
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
      <div className="d-flex justify-content-between align-items-center mb-5">
        <h4 className="fw-bold mb-0">
          Repuestos - {reparacion?.reparacion || "reparación"}
          <small className="text-muted ms-2" style={{ fontSize: "1rem", fontWeight: 400 }}>
            {maquina?.maquina}
          </small>
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

      <Table striped bordered hover responsive className="text-center align-middle">
        <thead className="table-dark">
          <tr>
            <th>Repuesto</th>
            <th style={{ width: 110 }}>Cantidad</th>
            <th style={{ width: 150 }}>Precio</th>
            <th style={{ width: 200 }}>Proveedor</th>
            <th style={{ width: 180 }}>Responsable</th>
            <th style={{ width: 160 }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && (
            <tr>
              <td colSpan={6} className="text-muted py-3">
                Sin repuestos cargados
              </td>
            </tr>
          )}
          {filas.map((f) => {
            const editando = editandoId === f.id;
            return (
            <tr key={f.id}>
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
              <td className="text-end" colSpan={2}>
                Total
              </td>
              <td>{pesos(total)}</td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        )}
      </Table>
    </Container>
  );
}

export default DetalleRepuestos;
