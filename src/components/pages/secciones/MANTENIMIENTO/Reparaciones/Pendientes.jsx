import { useState, useEffect } from "react";
import { Container, Button, Table, Spinner } from "react-bootstrap";
import { obtenerTodasReparaciones } from "../../../../../helpers/queriesReparaciones";

const COLOR_ESTADO = {
  Pendiente: "#6c757d",
  "En proceso": "#ffc107",
};

const COLOR_ESTADO_REPUESTO = {
  Pedido: "#0dcaf0",
  Pendiente: "#6c757d",
  "En proceso": "#ffc107",
  "En taller": "#fd7e14",
  Colocado: "#198754",
};

function Pendientes({ onVolver }) {
  const [filas, setFilas] = useState([]);
  const [repuestos, setRepuestos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      try {
        const res = await obtenerTodasReparaciones();
        if (res?.ok) {
          const data = await res.json();
          const rows = [];
          const reps = [];
          (Array.isArray(data) ? data : []).forEach((doc) => {
            const maquina = doc.maquina?.maquina || "-";
            (doc.reparaciones || []).forEach((r) => {
              if ((r.estado || "") !== "Terminado") {
                rows.push({
                  fecha: r.fecha || "",
                  reparacion: r.reparacion || "",
                  maquina,
                  tieneRepuestos: (r.repuestos || []).length > 0,
                  maquinaParada: !!r.maquinaParada,
                  estado: r.estado || "",
                });
              }
              (r.repuestos || []).forEach((rep) => {
                if ((rep.estado || "") !== "Colocado") {
                  reps.push({
                    fecha: r.fecha || "",
                    repuesto: rep.repuesto || "",
                    cantidad: Number(rep.cantidad) || 0,
                    maquina,
                    responsable: rep.responsable || "",
                    estado: rep.estado || "",
                  });
                }
              });
            });
          });
          rows.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
          reps.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
          setFilas(rows);
          setRepuestos(reps);
        }
      } catch (error) {
        console.error("Error al cargar pendientes:", error);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  return (
    <Container className="py-4">
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}
        className="mb-5"
      >
        <span />
        <h4 className="mb-0 text-center">Reparaciones pendientes</h4>
        <div className="d-flex justify-content-end">
          <Button variant="outline-success" size="sm" onClick={onVolver}>
            Volver
          </Button>
        </div>
      </div>

      {cargando ? (
        <Spinner animation="border" className="d-block mx-auto my-5" />
      ) : (
        <>
          <div className="w-75 mx-auto" style={{ maxHeight: "65vh", overflowY: "auto" }}>
            <Table striped bordered hover size="sm" className="text-center align-middle mb-0">
              <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr>
                  <th style={{ width: 140 }}>Fecha</th>
                  <th>Reparación</th>
                  <th style={{ width: 180 }}>Máquina</th>
                  <th style={{ width: 120 }}>Repuestos</th>
                  <th style={{ width: 120 }}>Máquina parada</th>
                  <th style={{ width: 140 }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-muted py-3">
                      No hay reparaciones pendientes
                    </td>
                  </tr>
                )}
                {filas.map((f, idx) => (
                  <tr key={idx}>
                    <td>{f.fecha ? f.fecha.split("-").reverse().join("/") : "-"}</td>
                    <td className="text-start">{f.reparacion || "-"}</td>
                    <td>{f.maquina}</td>
                    <td style={{ color: f.tieneRepuestos ? "#198754" : "#6c757d", fontWeight: 600 }}>
                      {f.tieneRepuestos ? "Sí" : "No"}
                    </td>
                    <td style={{ color: f.maquinaParada ? "#dc3545" : "#6c757d", fontWeight: 600 }}>
                      {f.maquinaParada ? "Sí" : "No"}
                    </td>
                    <td style={{ color: COLOR_ESTADO[f.estado] || "#dee2e6", fontWeight: 600 }}>
                      {f.estado || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          <h4 className="mb-3 text-center mt-5">Repuestos pendientes</h4>
          <div className="w-75 mx-auto" style={{ maxHeight: "65vh", overflowY: "auto" }}>
            <Table striped bordered hover size="sm" className="text-center align-middle mb-0">
              <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr>
                  <th style={{ width: 140 }}>Fecha</th>
                  <th>Repuesto</th>
                  <th style={{ width: 110 }}>Cantidad</th>
                  <th style={{ width: 180 }}>Máquina</th>
                  <th style={{ width: 180 }}>Responsable</th>
                  <th style={{ width: 140 }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {repuestos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-muted py-3">
                      No hay repuestos pendientes
                    </td>
                  </tr>
                )}
                {repuestos.map((r, idx) => (
                  <tr key={idx}>
                    <td>{r.fecha ? r.fecha.split("-").reverse().join("/") : "-"}</td>
                    <td className="text-start">{r.repuesto || "-"}</td>
                    <td>{r.cantidad}</td>
                    <td>{r.maquina}</td>
                    <td>{r.responsable || "-"}</td>
                    <td style={{ color: COLOR_ESTADO_REPUESTO[r.estado] || "#dee2e6", fontWeight: 600 }}>
                      {r.estado || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </>
      )}
    </Container>
  );
}

export default Pendientes;
