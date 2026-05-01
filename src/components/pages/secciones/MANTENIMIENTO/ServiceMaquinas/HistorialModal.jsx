import { Modal, Table } from "react-bootstrap";

const fmt = (val) =>
  val != null && val !== "" ? Number(val).toLocaleString("es-AR") : "-";

const fmtFecha = (f) =>
  f ? new Date(f + "T12:00:00").toLocaleDateString("es-AR") : "-";

const HistorialModal = ({ show, onHide, maquinaNombre, historialHoras, historialService }) => {
  const filas = Math.max(historialHoras.length, historialService.length);

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Historial — {maquinaNombre}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {filas === 0 ? (
          <p className="text-center text-muted">Sin registros</p>
        ) : (
          <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
            <Table striped bordered hover className="text-center align-middle mb-0" size="sm">
              <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr>
                  <th>Fecha</th>
                  <th>Horómetro</th>
                  <th>Fecha Últ. Service</th>
                  <th>Horómetro Últ. Service</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: filas }).map((_, i) => {
                  const h = historialHoras[i];
                  const s = historialService[i];
                  return (
                    <tr key={i}>
                      <td>{fmtFecha(h?.fecha)}</td>
                      <td>{fmt(h?.horometro)}</td>
                      <td className="text-primary">{fmtFecha(s?.fecha)}</td>
                      <td className="text-primary">{fmt(s?.horometro)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default HistorialModal;
