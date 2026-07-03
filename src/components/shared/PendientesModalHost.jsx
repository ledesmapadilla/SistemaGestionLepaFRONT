import { lazy, Suspense } from "react";
import { Modal, Spinner } from "react-bootstrap";
import { usePendientesModal } from "../../context/PendientesModalContext";

const Pendientes = lazy(() => import("../pages/secciones/PENDIENTES/Pendientes.jsx"));

// Muestra Tareas Pendientes como modal (a pantalla completa) en lugar de página.
export default function PendientesModalHost() {
  const ctx = usePendientesModal();
  if (!ctx) return null;
  return (
    <Modal show={ctx.abierto} onHide={ctx.cerrar} size="xl" centered scrollable>
      <Modal.Header closeButton className="py-2" />
      <Modal.Body>
        <Suspense fallback={<div className="text-center py-5"><Spinner animation="border" /></div>}>
          {ctx.abierto && <Pendientes />}
        </Suspense>
      </Modal.Body>
    </Modal>
  );
}
