// Botón flotante (pestaña lateral derecha) con ícono de anteojos de sol.
// Abre el resumen de tareas pendientes.
import { usePendientesModal } from "../../context/PendientesModalContext";
import { hoverPestana, TRANSICION_PESTANA } from "./pestanaLateral";

const FONDO = "#f1f3f5";
const FONDO_HOVER = "#dee2e6";
const SOMBRA = "-3px 4px 12px rgba(0,0,0,0.2)";
const SOMBRA_HOVER = "-5px 6px 16px rgba(0,0,0,0.32)";

export default function BotonAnteojos() {
  const pendientesModal = usePendientesModal();
  return (
    <button
      type="button"
      title="Resumen de pendientes"
      aria-label="Resumen de pendientes"
      onClick={() => pendientesModal?.abrirResumen()}
      {...hoverPestana({
        lado: "derecha",
        fondo: FONDO,
        fondoHover: FONDO_HOVER,
        sombra: SOMBRA,
        sombraHover: SOMBRA_HOVER,
      })}
      style={{
        position: "fixed",
        top: "25%",
        transform: "translateY(-50%)",
        right: 0,
        width: "48px",
        height: "64px",
        borderRadius: "16px 0 0 16px",
        backgroundColor: FONDO,
        border: "1px solid #dee2e6",
        borderRight: "none",
        boxShadow: SOMBRA,
        transition: TRANSICION_PESTANA,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        zIndex: 1040,
      }}
    >
      <i className="bi bi-sunglasses" style={{ fontSize: "1.6rem", color: "#212529" }} />
    </button>
  );
}
