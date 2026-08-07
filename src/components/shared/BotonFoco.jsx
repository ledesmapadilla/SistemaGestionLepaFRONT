// Botón flotante (pestaña lateral izquierda) con ícono de foco encendido:
// bombilla negra con rayas alrededor simulando la luz. Abre Tareas Pendientes.
import { usePendientesModal } from "../../context/PendientesModalContext";
import { hoverPestana, TRANSICION_PESTANA } from "./pestanaLateral";

const RAYOS = [-75, -45, -15, 15, 45, 75];

const FONDO = "#f1f3f5";
const FONDO_HOVER = "#dee2e6";
const SOMBRA = "3px 4px 12px rgba(0,0,0,0.2)";
const SOMBRA_HOVER = "5px 6px 16px rgba(0,0,0,0.32)";

export default function BotonFoco() {
  const pendientesModal = usePendientesModal();
  return (
    <button
      type="button"
      title="Tareas pendientes"
      aria-label="Tareas pendientes"
      onClick={() => pendientesModal?.abrir()}
      {...hoverPestana({
        lado: "izquierda",
        fondo: FONDO,
        fondoHover: FONDO_HOVER,
        sombra: SOMBRA,
        sombraHover: SOMBRA_HOVER,
      })}
      style={{
        position: "fixed",
        top: "75%",
        transform: "translateY(-50%)",
        left: 0,
        width: "48px",
        height: "64px",
        borderRadius: "0 16px 16px 0",
        backgroundColor: FONDO,
        border: "1px solid #dee2e6",
        borderLeft: "none",
        boxShadow: SOMBRA,
        transition: TRANSICION_PESTANA,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        zIndex: 1040,
      }}
    >
      <span
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 34,
          height: 34,
        }}
      >
        {/* Rayas de luz alrededor de la parte superior de la bombilla */}
        {RAYOS.map((deg) => (
          <span
            key={deg}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 2,
              height: 6,
              backgroundColor: "#212529",
              borderRadius: 2,
              transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-16px)`,
            }}
          />
        ))}
        <i className="bi bi-lightbulb-fill" style={{ fontSize: "1.4rem", color: "#212529" }} />
      </span>
    </button>
  );
}
