// Botón flotante (pestaña lateral izquierda) con ícono de reunión: varias
// personas. Abre un modal con accesos directos a lo que se repasa en la reunión.
import { useState } from "react";
import { Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { hoverPestana, TRANSICION_PESTANA } from "./pestanaLateral";

const FONDO = "#f1f3f5";
const FONDO_HOVER = "#dee2e6";
const SOMBRA = "3px 4px 12px rgba(0,0,0,0.2)";
const SOMBRA_HOVER = "5px 6px 16px rgba(0,0,0,0.32)";

// `ruta` navega a una página; `responsable` abre su tarjeta en Tareas para la
// semana (/pendientes/semana con el modal de ese responsable ya abierto);
// `enPreparacion` muestra la tarjeta deshabilitada; `color` cambia el fondo.
const ACCESOS = [
  { titulo: "Remitos sin facturar", icono: "bi-receipt", ruta: "/remitos-sinfacturar-informe" },
  { titulo: "Mantenimiento", icono: "bi-tools", ruta: "/tablero-control" },
  { titulo: "Cheques de terceros", icono: "bi-cash-stack", ruta: "/cheques" },
  { titulo: "Cheques propios", icono: "bi-wallet2", ruta: "/cheques-propios" },
  { titulo: "Cuenta corriente clientes", icono: "bi-people", ruta: "/cuenta-corriente" },
  { titulo: "Cuenta corriente proveedores", icono: "bi-truck", ruta: "/cuenta-corriente-proveedores" },
  { titulo: "Tareas Zamorano", icono: "bi-person-gear", responsable: "Zamorano" },
  { titulo: "Tareas Nelson", icono: "bi-person-check", responsable: "Nelson" },
  { titulo: "Pendientes", icono: "bi-list-check", ruta: "/reunion/pendientes", color: "#2e7d4f" },
  { titulo: "Impuestos", icono: "bi-bank", enPreparacion: true },
];

const ESTILO_TARJETA = {
  backgroundColor: "#3a5a78",
  color: "#fff",
  borderRadius: "10px",
  padding: "0.8rem",
  boxShadow: "3px 3px 8px rgba(0,0,0,0.25)",
  userSelect: "none",
  transition: "transform 0.15s ease, box-shadow 0.15s ease",
  height: "110px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  gap: "6px",
};

export default function BotonReunion() {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  const ir = (a) => {
    if (a.enPreparacion) return;
    setShow(false);
    if (a.responsable) navigate("/pendientes/semana", { state: { responsable: a.responsable } });
    else navigate(a.ruta);
  };

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

      <Modal show={show} onHide={() => setShow(false)} centered size="lg" contentClassName="border border-white">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-people-fill me-2" />
            Reunión
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
              gap: "1rem",
            }}
          >
            {ACCESOS.map((a) => (
              <div
                key={a.titulo}
                role="button"
                tabIndex={a.enPreparacion ? -1 : 0}
                aria-disabled={a.enPreparacion || undefined}
                onClick={() => ir(a)}
                onKeyDown={(e) => { if (e.key === "Enter") ir(a); }}
                style={{
                  ...ESTILO_TARJETA,
                  ...(a.color ? { backgroundColor: a.color } : {}),
                  cursor: a.enPreparacion ? "not-allowed" : "pointer",
                  opacity: a.enPreparacion ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (a.enPreparacion) return;
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.boxShadow = "5px 5px 14px rgba(0,0,0,0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = ESTILO_TARJETA.boxShadow;
                }}
              >
                <i className={`bi ${a.icono}`} style={{ fontSize: "1.6rem" }} />
                <div style={{ fontWeight: 600, lineHeight: 1.15 }}>{a.titulo}</div>
                {a.enPreparacion && (
                  <small style={{ fontSize: "0.75rem", opacity: 0.9 }}>En preparación</small>
                )}
              </div>
            ))}
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
}
