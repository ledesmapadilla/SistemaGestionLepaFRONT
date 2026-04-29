import React from "react";
import { Table, Dropdown } from "react-bootstrap";

const hoy = new Date().toLocaleDateString("en-CA");

const USOS = ["En cartera", "Pago proveedores", "Depósito en banco", "Cambio", "Otros"];

const formatoMoneda = (valor) =>
  Number(valor).toLocaleString("es-AR", { style: "currency", currency: "ARS" });

const formatearFecha = (fecha) => {
  if (!fecha) return "-";
  const p = fecha.split("-");
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : fecha;
};

const esVencido = (fecha) => !!fecha && fecha <= hoy;

const ChequesTabla = ({ cheques, onUtilizar }) => {
  return (
    <div className="w-75 mx-auto my-2">
      <h6 className="text-center mb-3">Cheques de Terceros</h6>

      <Table striped bordered hover className="text-center align-middle">
        <thead className="table-dark">
          <tr>
            <th>Cliente</th>
            <th>N° de Cheque</th>
            <th>Valor</th>
            <th>Fecha Vencimiento</th>
            <th>Estado</th>
            <th>Observaciones</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {cheques.length === 0 ? (
            <tr>
              <td colSpan="7">No hay cheques registrados</td>
            </tr>
          ) : (
            cheques.map((c) => (
              <tr key={c._id}>
                <td>{c.cliente}</td>
                <td>{c.numeroCheque}</td>
                <td className={esVencido(c.fechaVencimiento) ? "text-danger fw-bold" : ""}>
                  {formatoMoneda(c.valor)}
                </td>
                <td>{formatearFecha(c.fechaVencimiento)}</td>
                <td>{c.estado}</td>
                <td>{c.observaciones || "-"}</td>
                <td>
                  <Dropdown onSelect={(uso) => onUtilizar(c, uso)}>
                    <Dropdown.Toggle size="sm" variant="outline-primary">
                      Utilizar
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      {USOS.map((uso) => (
                        <Dropdown.Item key={uso} eventKey={uso}>
                          {uso}
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Menu>
                  </Dropdown>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
};

export default ChequesTabla;
