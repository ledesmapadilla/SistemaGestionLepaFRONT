import { useState, useEffect } from "react";
import { Container, Spinner } from "react-bootstrap";
import { listarMaquinas } from "../../../../../helpers/queriesMaquinas";
import HistorialReparaciones from "./HistorialReparaciones";

// Subtítulo (texto chico abajo del código) por máquina. Las no listadas usan su marca.
const SUBTITULO = {
  PC1: "Komatsu PC200",
  PC2: "Komatsu PC200",
  PC3: "Komatsu PC200",
  PC4: "Komatsu PC200",
  PC5: "Komatsu PC200",
  WA200: "Pala cargadora Komatsu",
  XCMG: "Pala cargadora XCMG",
  JD1: "Retropala John Deere",
  JD2: "Retropala John Deere",
  Fiat: "Camioneta Fiat",
  Nissan: "Camioneta Nissan",
  Ranger: "Camioneta Ranger",
  "Carretón grande": "",
};

// Subtítulo a mostrar: si la máquina está en el mapa usa ese valor (puede ser
// vacío para no mostrar nada); si no, cae a la marca/modelo.
const subDe = (m) =>
  m.maquina in SUBTITULO ? SUBTITULO[m.maquina] : m.marca || m.modelo || "";

// Tamaño de fuente del código según el largo, para que no se salga de la tarjeta.
const fontCodigo = (n) => {
  const len = (n || "").length;
  if (len <= 6) return "1.4rem";
  if (len <= 10) return "1.1rem";
  return "0.92rem";
};

// Orden por categoría: PC → palas cargadoras → retroexcavadoras → camiones →
// motoniveladora → bateas → carretones → camionetas (resto)
const categoriaOrden = (m) => {
  const n = (m.maquina || "").toLowerCase().trim();
  if (/^pc\d/.test(n)) return 0;                 // PC1..PC5
  if (n === "wa200" || n === "xcmg") return 1;   // palas cargadoras
  if (/^jd\d/.test(n)) return 2;                 // retroexcavadoras (JD)
  if (n === "eiq" || n === "etx") return 3;      // camiones
  if (n.includes("motoniveladora")) return 4;    // motoniveladora
  if (n.includes("batea")) return 5;             // bateas
  if (n.includes("carret")) return 6;            // carretones
  return 7;                                       // camionetas / resto
};

function Reparaciones() {
  const [maquinas, setMaquinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [maquinaSel, setMaquinaSel] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await listarMaquinas();
        if (res?.ok) {
          const data = await res.json();
          setMaquinas(
            [...data].sort((a, b) => {
              const ca = categoriaOrden(a);
              const cb = categoriaOrden(b);
              if (ca !== cb) return ca - cb;
              return (a.maquina || "").localeCompare(b.maquina || "", "es", {
                numeric: true,
              });
            })
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

  if (maquinaSel)
    return (
      <HistorialReparaciones
        maquina={maquinaSel}
        onVolver={() => setMaquinaSel(null)}
      />
    );

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
        <div
          style={{
            backgroundColor: "#3a5a78",
            color: "#fff",
            borderRadius: "10px",
            padding: "0.8rem",
            cursor: "pointer",
            boxShadow: "3px 3px 8px rgba(0,0,0,0.25)",
            userSelect: "none",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
            width: "332px",
            height: "100px",
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
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
          <div style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "1px" }}>
            PENDIENTES
          </div>
        </div>
        {maquinas.length === 0 && (
          <p className="text-muted">Sin máquinas registradas.</p>
        )}
        {maquinas.map((m) => (
          <div
            key={m._id}
            onClick={() => setMaquinaSel(m)}
            style={{
              backgroundColor: "#8b4a4a",
              color: "#fff",
              borderRadius: "10px",
              padding: "0.8rem",
              cursor: "pointer",
              boxShadow: "3px 3px 8px rgba(0,0,0,0.25)",
              userSelect: "none",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
              width: "160px",
              height: "100px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
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
            <div style={{ fontSize: fontCodigo(m.maquina), fontWeight: 700, lineHeight: 1.1, wordBreak: "break-word" }}>
              {m.maquina}
            </div>
            {subDe(m) && (
              <div style={{ fontSize: "0.8rem", opacity: 0.85, marginTop: "4px", lineHeight: 1.1 }}>
                {subDe(m)}
              </div>
            )}
          </div>
        ))}
      </div>
    </Container>
  );
}

export default Reparaciones;
