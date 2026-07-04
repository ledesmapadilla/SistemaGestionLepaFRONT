// Botón flotante (pestaña lateral derecha) con ícono de anteojos de sol.
// Abre el resumen de tareas pendientes.
import { usePendientesModal } from "../../context/PendientesModalContext";

export default function BotonAnteojos() {
  const pendientesModal = usePendientesModal();
  return (
    <button
      type="button"
      title="Resumen de pendientes"
      aria-label="Resumen de pendientes"
      onClick={() => pendientesModal?.abrirResumen()}
      style={{
        position: "fixed",
        top: "25%",
        transform: "translateY(-50%)",
        right: 0,
        width: "48px",
        height: "64px",
        borderRadius: "16px 0 0 16px",
        backgroundColor: "#fff",
        border: "1px solid #dee2e6",
        borderRight: "none",
        boxShadow: "-3px 4px 12px rgba(0,0,0,0.2)",
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
