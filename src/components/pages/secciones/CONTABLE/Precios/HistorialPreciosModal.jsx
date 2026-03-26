import React, { useState } from "react";
import { Modal, Button, Table } from "react-bootstrap";

const formatARS = (n) =>
  Number(n).toLocaleString("es-AR", { style: "currency", currency: "ARS" });

const HistorialPreciosModal = ({ show, onHide, listas, onBorrarLista }) => {
  const [listaSeleccionada, setListaSeleccionada] = useState(null);

  const handleClose = () => {
    setListaSeleccionada(null);
    onHide();
  };

  if (listaSeleccionada) {
    const pc200 = listaSeleccionada.items.find((i) => i.maquina === "PC200");
    const baseCompleto = pc200?.completo || 0;

    return (
      <Modal show={show} onHide={handleClose} centered size="lg">
        <Modal.Header closeButton className="justify-content-center">
          <Modal.Title className="w-100 text-center">
            Precios - {listaSeleccionada.nombre}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table striped bordered hover className="text-center align-middle">
            <thead className="table-dark">
              <tr>
                <th>% Teórico</th>
                <th>Máquina</th>
                <th>Completo</th>
                <th>Sin Gasoil</th>
                <th>% Real</th>
              </tr>
            </thead>
            <tbody>
              {listaSeleccionada.items.map((item) => (
                <tr key={item._id}>
                  <td>{item.porcentajeTeorico}%</td>
                  <td>{item.maquina}</td>
                  <td>{item.completo ? formatARS(item.completo) : "-"}</td>
                  <td>{item.sinGasoil ? formatARS(item.sinGasoil) : "-"}</td>
                  <td>
                    {baseCompleto && item.completo
                      ? `${((item.completo / baseCompleto) * 100).toFixed(0)}%`
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-primary" onClick={() => setListaSeleccionada(null)}>
            Volver
          </Button>
          <Button variant="outline-secondary" onClick={handleClose}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton className="justify-content-center">
        <Modal.Title className="w-100 text-center">Historial de precios</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {listas.length === 0 ? (
          <p className="text-center text-muted">No hay listas guardadas</p>
        ) : (
          <Table bordered hover className="text-center align-middle">
            <thead className="table-dark">
              <tr>
                <th>Nombre</th>
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {listas.map((lista) => (
                <tr key={lista.nombre}>
                  <td>{lista.nombre}</td>
                  <td>
                    {new Date(lista.fecha).toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </td>
                  <td className="d-flex gap-1 justify-content-center">
                    <Button
                      size="sm"
                      variant="outline-success"
                      onClick={() => setListaSeleccionada(lista)}
                    >
                      Ver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => onBorrarLista(lista.nombre, lista.items.map((i) => i._id))}
                    >
                      Borrar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Modal.Body>
      <Modal.Footer className="justify-content-center">
        <Button variant="outline-secondary" onClick={handleClose}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default HistorialPreciosModal;
