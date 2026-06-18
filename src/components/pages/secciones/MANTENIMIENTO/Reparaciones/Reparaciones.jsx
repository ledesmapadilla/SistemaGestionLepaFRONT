import { useState, useEffect } from "react";
import { Container, Spinner } from "react-bootstrap";
import { listarMaquinas } from "../../../../../helpers/queriesMaquinas";

function Reparaciones() {
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
    <Container className="py-4">
      <div className="text-center" style={{ marginTop: "2rem", marginBottom: "3rem" }}>
        <h2 className="mb-0 fw-bold">Reparaciones</h2>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1.2rem",
          justifyContent: "center",
          marginBottom: "2rem",
        }}
      >
        {maquinas.length === 0 && (
          <p className="text-muted">Sin máquinas registradas.</p>
        )}
        {maquinas.map((m) => (
          <div
            key={m._id}
            style={{
              backgroundColor: "#4a6fa5",
              color: "#fff",
              borderRadius: "10px",
              padding: "1.2rem 1.6rem",
              cursor: "pointer",
              boxShadow: "3px 3px 8px rgba(0,0,0,0.25)",
              userSelect: "none",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
              width: "160px",
              height: "100px",
              textAlign: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.06)";
              e.currentTarget.style.boxShadow = "5px 5px 14px rgba(0,0,0,0.35)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "3px 3px 8px rgba(0,0,0,0.25)";
            }}
          >
            <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>{m.maquina}</div>
            {(m.marca || m.modelo) && (
              <div style={{ fontSize: "0.85rem", opacity: 0.85, marginTop: "4px" }}>
                {m.marca || m.modelo}
              </div>
            )}
          </div>
        ))}
      </div>
    </Container>
  );
}

export default Reparaciones;
