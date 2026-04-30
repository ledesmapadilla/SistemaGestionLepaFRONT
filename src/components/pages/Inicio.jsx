import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logosimple from "../../assets/logosimpletr.png";

const Inicio = () => {
  const navigate = useNavigate();
  useEffect(() => {
    document.body.style.backgroundImage = "url('/img/textura%20piedra%20gris.jpg')";
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundAttachment = "fixed";
    return () => {
      document.body.style.backgroundImage = "";
      document.body.style.backgroundSize = "";
      document.body.style.backgroundPosition = "";
      document.body.style.backgroundAttachment = "";
    };
  }, []);

  return (
    <div style={{ flex: 1, position: "relative" }}>
      <img
        src={logosimple}
        alt="LEPA"
        style={{ position: "absolute", top: "1.5rem", left: "1.5rem", height: "140px", filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.6))" }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) scaleX(0.85)",
          textAlign: "center",
          color: "#000",
          textShadow: "2px 2px 8px rgba(0,0,0,0.5)",
          letterSpacing: "0.01em",
          fontWeight: 900,
          fontSize: "7rem",
          whiteSpace: "nowrap",
          cursor: "pointer",
          transition: "color 0.3s",
        }}
        onClick={() => navigate("/obras")}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--lepa-orange)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "#000"; }}
      >
        SISTEMA DE GESTIÓN
      </div>
    </div>
  );
};

export default Inicio;
