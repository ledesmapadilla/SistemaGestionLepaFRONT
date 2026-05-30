import { useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";

export default function Impuestos() {
  const navigate = useNavigate();

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">💀 Impuestos</h2>
        <Button variant="outline-success" size="sm" onClick={() => navigate(-1)}>Volver</Button>
      </div>
      <p className="text-muted">Módulo en construcción.</p>
    </div>
  );
}
