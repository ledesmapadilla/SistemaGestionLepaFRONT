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
        onClick={() => navigate("/obras")}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          height: "220px",
          filter: "drop-shadow(0 12px 40px rgba(0,0,0,1)) drop-shadow(0 4px 12px rgba(0,0,0,0.9)) drop-shadow(0 0 60px rgba(0,0,0,0.7))",
          cursor: "pointer",
          transition: "filter 0.2s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.filter = "drop-shadow(0 16px 50px rgba(0,0,0,1)) drop-shadow(0 6px 16px rgba(0,0,0,0.95)) drop-shadow(0 0 80px rgba(0,0,0,0.8)) brightness(1.1)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.filter = "drop-shadow(0 12px 40px rgba(0,0,0,1)) drop-shadow(0 4px 12px rgba(0,0,0,0.9)) drop-shadow(0 0 60px rgba(0,0,0,0.7))"; }}
      />
    </div>
  );
};

export default Inicio;
