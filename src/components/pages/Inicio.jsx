import { useNavigate } from "react-router-dom";
import logosimple from "../../assets/logosimpletr.png";

const Inicio = () => {
  const navigate = useNavigate();

  return (
    <div style={{ flex: 1, position: "relative" }}>
      <div style={{
        position: "fixed",
        inset: 0,
        backgroundImage: "url('/img/textura%20piedra%20gris.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        filter: "blur(4px)",
        transform: "scale(1.05)",
        zIndex: 0,
      }} />
      <img
        src={logosimple}
        alt="LEPA"
        onClick={() => navigate("/obras")}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          height: "220px",
          filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.55)) drop-shadow(0 2px 6px rgba(0,0,0,0.35))",
          cursor: "pointer",
          transition: "filter 0.2s",
          zIndex: 1,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.filter = "drop-shadow(0 8px 24px rgba(0,0,0,0.65)) drop-shadow(0 3px 8px rgba(0,0,0,0.45)) brightness(1.1)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.filter = "drop-shadow(0 6px 18px rgba(0,0,0,0.55)) drop-shadow(0 2px 6px rgba(0,0,0,0.35))"; }}
      />
    </div>
  );
};

export default Inicio;
