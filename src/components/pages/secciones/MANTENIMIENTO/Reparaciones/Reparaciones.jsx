import { Container } from "react-bootstrap";

// Estático (solo front, sin backend ni funcionalidad)
const MAQUINAS = [
  { tipo: "Retroexcavadora", codigo: "PC1" },
  { tipo: "Retroexcavadora", codigo: "PC2" },
  { tipo: "Retroexcavadora", codigo: "PC3" },
  { tipo: "Retroexcavadora", codigo: "PC4" },
  { tipo: "Retroexcavadora", codigo: "PC5" },
  { tipo: "Retropala", codigo: "JD1" },
  { tipo: "Retropala", codigo: "JD2" },
  { tipo: "Pala cargadora", codigo: "WA200" },
  { tipo: "Motoniveladora", codigo: "Motoniveladora" },
  { tipo: "Camión", codigo: "ETX" },
  { tipo: "Camión", codigo: "EIQ" },
];

function Reparaciones() {
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
        {MAQUINAS.map((m) => (
          <div
            key={m.codigo}
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
            <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>{m.codigo}</div>
            <div style={{ fontSize: "0.85rem", opacity: 0.85, marginTop: "4px" }}>
              {m.tipo}
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}

export default Reparaciones;
