import { Card } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

// Página pensada para usar desde el celular: una sola tarjeta grande, sin tabla
// ni filtros. El listado y la edición siguen estando en /gasoil.
// Va sin login (ruta fuera de RutaProtegida) para poder instalarla como acceso
// directo en el teléfono, así que pega contra los endpoints /api/publico/gasoil.
const CargaGasoil = () => {
  const navigate = useNavigate();

  return (
    <div
      className="d-flex align-items-center justify-content-center px-3"
      style={{ minHeight: "100dvh" }}
    >
      <Card
        role="button"
        onClick={() => navigate("/gasoil/carga/nueva")}
        className="text-center border-success w-100"
        style={{ cursor: "pointer", maxWidth: "320px" }}
      >
        <Card.Body className="py-5">
          <div style={{ fontSize: "2.5rem", lineHeight: 1 }}>⛽</div>
          <Card.Title className="mt-3 mb-0" style={{ fontSize: "1.4rem" }}>
            Nueva carga
          </Card.Title>
        </Card.Body>
      </Card>
    </div>
  );
};

export default CargaGasoil;
