// Botón flotante redondo (blanco) con ícono de anteojos de sol.
// La funcionalidad se define más adelante.
export default function BotonAnteojos() {
  return (
    <button
      type="button"
      title="Anteojos"
      aria-label="Anteojos"
      onClick={() => {}}
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        width: "56px",
        height: "56px",
        borderRadius: "50%",
        backgroundColor: "#fff",
        border: "1px solid #dee2e6",
        boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
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
