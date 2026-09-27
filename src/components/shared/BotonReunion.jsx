// Botón flotante (pestaña lateral izquierda) con ícono de reunión: varias
// personas. Por ahora abre un modal vacío; el contenido se define después.
import { useState } from "react";
import { Modal } from "react-bootstrap";
import { hoverPestana, TRANSICION_PESTANA } from "./pestanaLateral";

const FONDO = "#f1f3f5";
const FONDO_HOVER = "#dee2e6";
const SOMBRA = "3px 4px 12px rgba(0,0,0,0.2)";
const SOMBRA_HOVER = "5px 6px 16px rgba(0,0,0,0.32)";

export default function BotonReunion() {
  const [show, setShow] = useState(false);
  return (
    <>
      <button
        type="button"
        title="Reunión"
        aria-label="Reunión"
        onClick={() => setShow(true)}
        {...hoverPestana({
          lado: "izquierda",
          fondo: FONDO,
          fondoHover: FONDO_HOVER,
          sombra: SOMBRA,
          sombraHover: SOMBRA_HOVER,
        })}
        style={{
          position: "fixed",
          top: "25%",
          transform: "translateY(-50%)",
          left: 0,
          width: "48px",
          height: "64px",
          borderRadius: "0 16px 16px 0",
          backgroundColor: FONDO,
          border: "1px solid #dee2e6",
          borderLeft: "none",
          boxShadow: SOMBRA,
          transition: TRANSICION_PESTANA,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 1040,
        }}
      >
        <i className="bi bi-people-fill" style={{ fontSize: "1.6rem", color: "#212529" }} />
      </button>

      <Modal show={show} onHide={() => setShow(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-people-fill me-2" />
            Reunión
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted mb-0">Próximamente.</p>
        </Modal.Body>
      </Modal>
    </>
  );
}
