import React from "react";
import { Modal, Button, Table } from "react-bootstrap";

const formatoMoneda = (valor) => {
  if (valor === "" || valor === null || valor === undefined) return "";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(valor));
};

const ListaPreciosModal = ({ show, onClose, precios, nombreObra }) => {
  
  return (
    <Modal show={show} onHide={onClose} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          Lista de precios:
          {nombreObra && (
            <span className=" text-warning"> {nombreObra}</span>
          )}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="table-responsive">
          <Table striped bordered hover className="align-middle text-center">
            <thead className="table-dark">
              <tr>
                <th>Clasificación</th>
                <th>Trabajo o máquina</th>
                <th>Precio (sin IVA)</th>
                <th>Unidad</th>
                <th>Observaciones</th>
                <th>Fecha</th>
              </tr>
            </thead>

            <tbody>
              {precios?.length === 0 ? (
                <tr>
                  <td colSpan="6">No hay precios cargados</td>
                </tr>
              ) : (
                precios.map((item, index) => (
                  <tr key={index}>
                    <td>{item.clasificacion}</td>
                    <td>{item.trabajo}</td>
                    <td>{formatoMoneda(item.precio)}</td>
                    <td>{item.unidad}</td>
                    <td>{item.observaciones}</td>
                    <td>{item.fecha ? new Date(item.fecha).toLocaleDateString("es-AR") : "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </Modal.Body>

      <Modal.Footer className="justify-content-center">
        <Button variant="outline-secondary" onClick={onClose}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ListaPreciosModal;
