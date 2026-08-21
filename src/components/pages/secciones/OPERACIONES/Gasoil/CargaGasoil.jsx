import { Button, Card } from "react-bootstrap";
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
      {/* El ancho lo fija esta columna y no la tarjeta, así "Ver" queda alineado
          con el borde derecho de la tarjeta. */}
      <div className="w-100" style={{ maxWidth: "240px" }}>
        <div className="d-flex justify-content-end mb-4">
          <Button
            size="sm"
            variant="success"
            className="border-success rounded-4"
            style={{ backgroundColor: "rgba(25, 135, 84, 0.15)" }}
            onClick={() => navigate("/gasoil/carga/mes")}
          >
            Ver
          </Button>
        </div>

        <Card
          role="button"
          onClick={() => navigate("/gasoil/carga/nueva")}
          className="text-center border-success rounded-4 w-100"
          style={{
            cursor: "pointer",
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
    </div>
  );
};

export default CargaGasoil;
