import React from "react";
import { Table } from "react-bootstrap";

const ListaPrecios = ({ precios }) => {
  if (!precios || precios.length === 0) return <p>No hay precios cargados.</p>;

  return (
    <div className="table-responsive">
      <Table striped bordered hover className="text-center align-middle">
        <thead className="table-dark">
          <tr>
            <th>Trabajo</th>
            <th>Clasificación</th>
            <th>Precio (sin IVA)</th>
            <th>Unidad</th>
            <th>Observaciones</th>
          </tr>
        </thead>
        <tbody>
          {precios.map((p, i) => (
            <tr key={i}>
              <td>{p.trabajo}</td>
              <td>{p.clasificacion}</td>
              <td>{p.precio}</td>
              <td>{p.unidad}</td>
              <td>{p.observaciones}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default ListaPrecios;
