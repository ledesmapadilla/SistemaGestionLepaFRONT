import { useState, useEffect } from "react";
import { Row, Col, Spinner } from "react-bootstrap";
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

  return (
    <div style={{
      border: "1px solid #dee2e6",
      borderRadius: 6,
      overflow: "hidden",
      marginBottom: 16,
      fontSize: "0.85rem",
    }}>
      <div style={{
        backgroundColor: "#212529",
        color: "#fff",
        padding: "8px 12px",
        fontWeight: 700,
        fontSize: "0.95rem",
        letterSpacing: 0.3,
      }}>
        {nombre}
      </div>
      <div style={{ padding: "10px 14px", backgroundColor: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={{ color: "#6c757d", paddingBottom: 4, width: "50%" }}>Horómetro</td>
              <td style={{ fontWeight: 600, paddingBottom: 4, textAlign: "right" }}>
                {fmtHorometro(horometroActual)}
                {fechaUltimoRegistro && (
                  <span style={{ color: "#6c757d", fontWeight: 400, fontSize: "0.78rem", marginLeft: 4 }}>
                    ({fmtFecha(fechaUltimoRegistro)})
                  </span>
                )}
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={{ color: "#6c757d", paddingTop: 4, paddingBottom: 4 }}>Últ. Service</td>
              <td style={{ paddingTop: 4, paddingBottom: 4, textAlign: "right" }}>
                {fechaUltimoService ? (
                  <>
                    <span style={{ color: "#0d6efd" }}>{fmtFecha(fechaUltimoService)}</span>
                    {horometroUltimoService != null && (
                      <span style={{ color: "#6c757d", fontSize: "0.78rem", marginLeft: 4 }}>
                        | {fmtHorometro(horometroUltimoService)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-muted">-</span>
                )}
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={{ color: "#6c757d", paddingTop: 4, paddingBottom: 4 }}>Próximo Service</td>
              <td style={{ fontWeight: 600, paddingTop: 4, paddingBottom: 4, textAlign: "right" }}>
                {fmtHorometro(proximoService)}
              </td>
            </tr>
            <tr>
              <td style={{ color: "#6c757d", paddingTop: 4 }}>Estado</td>
              <td style={{ paddingTop: 4, textAlign: "right", fontSize: "0.9rem" }}>
                {estadoEl()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

const TableroControl = () => {
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

  if (loading) return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <div className="w-75 mx-auto my-4">
      <h6 className="text-center mb-4">Tablero de Control — Equipos</h6>
      {tablero.length === 0 ? (
        <p className="text-center text-muted">No hay máquinas registradas</p>
      ) : (
        <Row>
          {tablero.map((m) => (
            <Col key={m._id} xs={12} md={4}>
              <TarjetaMaquina datos={m} />
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default TableroControl;
