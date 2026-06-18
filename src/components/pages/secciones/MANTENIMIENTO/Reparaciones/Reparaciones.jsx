import { useState, useEffect } from "react";
import { Row, Col, Spinner, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { listarMaquinas } from "../../../../../helpers/queriesMaquinas";

const TarjetaMaquina = ({ maquina }) => {
  const lbl = { color: "#fff", fontSize: "0.72rem" };
  const val = { color: "#6c757d", fontSize: "0.72rem" };
  const fila = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "2px 0",
    borderBottom: "1px solid #f0f0f0",
  };

  return (
    <div style={{ border: "1px solid #ffc107", borderRadius: 6, marginBottom: 8 }}>
      <div
        style={{
          backgroundColor: "#6c757d",
          color: "#fff",
          padding: "6px 10px",
          fontWeight: 700,
          fontSize: "1rem",
          textAlign: "center",
          borderBottom: "2px solid #ffc107",
        }}
      >
        {maquina.maquina}
      </div>
      <div style={{ padding: "6px 10px" }}>
        {maquina.marca && (
          <div style={fila}>
            <span style={lbl}>Marca:</span>
            <span style={val}>{maquina.marca}</span>
          </div>
        )}
        {maquina.modelo && (
          <div style={fila}>
            <span style={lbl}>Modelo:</span>
            <span style={val}>{maquina.modelo}</span>
          </div>
        )}
        {maquina.patente && (
          <div style={fila}>
            <span style={lbl}>Patente:</span>
            <span style={val}>{maquina.patente}</span>
          </div>
        )}
        <div
          style={{
            textAlign: "center",
            padding: "10px 0 4px",
            color: "#6c757d",
            fontSize: "0.72rem",
            fontStyle: "italic",
          }}
        >
          (contenido a definir)
        </div>
      </div>
    </div>
  );
};

const Reparaciones = () => {
  const navigate = useNavigate();
  const [maquinas, setMaquinas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await listarMaquinas();
        if (res?.ok) {
          const data = await res.json();
          setMaquinas(
            [...data].sort((a, b) =>
              (a.maquina || "").localeCompare(b.maquina || "")
            )
          );
        }
      } catch (error) {
        console.error("Error al cargar máquinas:", error);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  if (loading)
    return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <div className="mx-auto my-2" style={{ maxWidth: "85vw" }}>
      <div className="d-flex align-items-center mb-2">
        <div style={{ flex: 1 }} />
        <h6 className="mb-0 text-center" style={{ flex: 1 }}>
          Reparaciones — Equipos
        </h6>
        <div className="d-flex gap-2 justify-content-end" style={{ flex: 1 }}>
          <Button size="sm" variant="outline-success" onClick={() => navigate(-1)}>
            Volver
          </Button>
        </div>
      </div>

      {maquinas.length === 0 ? (
        <p className="text-center text-muted">No hay máquinas registradas</p>
      ) : (
        <Row className="g-2">
          {maquinas.map((m) => (
            <Col
              key={m._id}
              xs={12}
              sm={6}
              md={4}
              lg={2}
              xl={2}
              style={{ flex: "0 0 20%", maxWidth: "20%" }}
            >
              <TarjetaMaquina maquina={m} />
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default Reparaciones;
