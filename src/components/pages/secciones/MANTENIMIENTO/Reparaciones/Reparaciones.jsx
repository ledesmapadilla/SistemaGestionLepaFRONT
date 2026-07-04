import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Container, Spinner } from "react-bootstrap";
import { listarMaquinas } from "../../../../../helpers/queriesMaquinas";
import { obtenerTodasReparaciones } from "../../../../../helpers/queriesReparaciones";
import { obtenerTodosPendientes } from "../../../../../helpers/queriesPendientes";
import HistorialReparaciones from "./HistorialReparaciones";
import Pendientes from "./Pendientes";

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
  const location = useLocation();
  const navState = location.state;
  const [maquinas, setMaquinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [maquinaSel, setMaquinaSel] = useState(null);
  const [repuestosInicial, setRepuestosInicial] = useState(navState?.repuestosDe || null);
  const [verPendientes, setVerPendientes] = useState(false);
  const [alertaMaquinas, setAlertaMaquinas] = useState(() => new Set());

  useEffect(() => {
    const cargar = async () => {
      try {
        const [resMaq, resRep, resPend] = await Promise.all([
          listarMaquinas(),
          obtenerTodasReparaciones(),
          obtenerTodosPendientes(),
        ]);

        const idPorNombre = {};
        if (resMaq?.ok) {
          const data = await resMaq.json();
          const ordenadas = [...data].sort((a, b) => {
            const ca = categoriaOrden(a);
            const cb = categoriaOrden(b);
            if (ca !== cb) return ca - cb;
            return (a.maquina || "").localeCompare(b.maquina || "", "es", {
              numeric: true,
            });
          });
          setMaquinas(ordenadas);
          ordenadas.forEach((m) => { idPorNombre[(m.maquina || "").trim().toLowerCase()] = String(m._id); });
          // Si venimos desde Pendientes, abrimos directamente la máquina indicada.
          if (navState?.maquinaId) {
            const destino = ordenadas.find((m) => String(m._id) === String(navState.maquinaId));
            if (destino) setMaquinaSel(destino);
          }
        }

        // Alertas (triángulo amarillo): máquinas con reparaciones activas o con
        // tareas de Pendientes (Pendiente / En proceso).
        const ids = new Set();
        if (resRep?.ok) {
          const dataRep = await resRep.json();
          (Array.isArray(dataRep) ? dataRep : []).forEach((doc) => {
            const tiene = (doc.reparaciones || []).some(
              (r) => r.estado === "Pendiente" || r.estado === "En proceso"
            );
            if (tiene) ids.add(String(doc.maquina?._id || doc.maquina));
          });
        }
        if (resPend?.ok) {
          const docsPend = await resPend.json();
          (Array.isArray(docsPend) ? docsPend : []).forEach((doc) => {
            (doc.tareas || []).forEach((t) => {
              if (t.estado === "Pendiente" || t.estado === "En proceso") {
                const id = idPorNombre[(t.maquina || "").trim().toLowerCase()];
                if (id) ids.add(id);
              }
            });
          });
        }
        setAlertaMaquinas(ids);
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
        abrirRepuestosDe={repuestosInicial}
        onVolver={() => { setMaquinaSel(null); setRepuestosInicial(null); }}
        onCambio={(tieneActivas) =>
          setAlertaMaquinas((prev) => {
            const n = new Set(prev);
            const id = String(maquinaSel._id);
            if (tieneActivas) n.add(id);
            else n.delete(id);
            return n;
          })
        }
      />
    );

  if (verPendientes) return <Pendientes onVolver={() => setVerPendientes(false)} />;

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
              position: "relative",
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
            {alertaMaquinas.has(String(m._id)) && (
              <span
                title="Tiene reparaciones pendientes o en proceso"
                style={{ position: "absolute", top: 6, right: 8, width: "1.7rem", height: "1.7rem", lineHeight: 1 }}
              >
                <i
                  className="bi bi-triangle-fill"
                  style={{ position: "absolute", inset: 0, color: "#ffc107", fontSize: "1.7rem" }}
                />
                <i
                  className="bi bi-exclamation"
                  style={{ position: "absolute", left: "50%", top: "60%", transform: "translate(-50%, -50%)", color: "#000", fontSize: "1.1rem" }}
                />
              </span>
            )}
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

        <div
          onClick={() => setVerPendientes(true)}
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
      </div>
    </Container>
  );
}

export default Reparaciones;
