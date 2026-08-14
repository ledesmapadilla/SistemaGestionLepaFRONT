import { Card } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import useAltoVista from "../../../../../helpers/useAltoVista.js";
import "../../../../../styles/gasoilMobile.css";

// Página pensada para usar desde el celular: una sola tarjeta grande, sin tabla
// ni filtros. El listado y la edición siguen estando en /gasoil.
// Va sin login (ruta fuera de RutaProtegida) para poder instalarla como acceso
// directo en el teléfono, así que pega contra los endpoints /api/publico/gasoil.
const CargaGasoil = () => {
  const navigate = useNavigate();
  useAltoVista();

  return (
    <div className="gasoil-centrado d-flex align-items-center justify-content-center px-3">
      <Card
        role="button"
        onClick={() => navigate("/gasoil/carga/nueva")}
        className="text-center border-success rounded-4 w-100"
        style={{
          cursor: "pointer",
          maxWidth: "240px",
          backgroundColor: "rgba(25, 135, 84, 0.15)",
        }}
      >
        <Card.Body className="py-4">
          <div style={{ fontSize: "2rem", lineHeight: 1 }}>⛽</div>
          <Card.Title className="mt-2 mb-0" style={{ fontSize: "1.15rem" }}>
            Nueva carga
          </Card.Title>
        </Card.Body>
      </Card>
    </div>
  );
};

export default CargaGasoil;
