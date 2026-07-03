// Botón flotante (pestaña lateral izquierda) con ícono de foco encendido.
// La funcionalidad se define más adelante.
export default function BotonFoco() {
  return (
    <button
      type="button"
      title="Foco"
      aria-label="Foco"
      onClick={() => {}}
      style={{
        position: "fixed",
        top: "50%",
        transform: "translateY(-50%)",
        left: 0,
        width: "48px",
        height: "64px",
        borderRadius: "0 16px 16px 0",
        backgroundColor: "#fff",
        border: "1px solid #dee2e6",
        borderLeft: "none",
        boxShadow: "3px 4px 12px rgba(0,0,0,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        zIndex: 1040,
      }}
    >
      <i className="bi bi-lightbulb-fill" style={{ fontSize: "1.6rem", color: "#ffc107" }} />
    </button>
  );
}
