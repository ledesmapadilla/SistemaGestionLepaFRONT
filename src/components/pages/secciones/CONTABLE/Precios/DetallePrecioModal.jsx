import React from "react";
import { Modal, Button, Table } from "react-bootstrap";

const formatNum = (n) =>
  Number(n).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatARS = (n) =>
  Number(n).toLocaleString("es-AR", { style: "currency", currency: "ARS" });

const DetallePrecioModal = ({ show, onHide, detalle }) => {
  if (!detalle) return null;

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton className="justify-content-center">
        <Modal.Title className="w-100 text-center">Detalle cálculo precio - {detalle.maquina}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {detalle.tipo === "sullair" && (
          <>
            <Table bordered size="sm" className="text-start align-middle mb-2">
              <thead className="table-dark">
                <tr>
                  <th colSpan="2">Componente 1 - Repuestos (Sullair)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Valor Sullair (USD)</td>
                  <td className="text-end">USD {formatNum(detalle.sullair)}</td>
                </tr>
                <tr>
                  <td>Dólar oficial venta</td>
                  <td className="text-end">$ {formatNum(detalle.dolar)}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Subtotal</strong>{" "}
                    <small className="text-muted">
                      ({formatNum(detalle.sullair)} x {formatNum(detalle.dolar)} / 200)
                    </small>
                  </td>
                  <td className="text-end">
                    <strong>{formatARS(detalle.comp1)}</strong>
                  </td>
                </tr>
              </tbody>
            </Table>

            <Table bordered size="sm" className="text-start align-middle mb-2">
              <thead className="table-dark">
                <tr>
                  <th colSpan="2">Componente 2 - Gasoil</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Consumo (lts/hora)</td>
                  <td className="text-end">{formatNum(detalle.consumo)}</td>
                </tr>
                <tr>
                  <td>Precio gasoil</td>
                  <td className="text-end">$ {formatNum(detalle.precioGasoil)}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Subtotal</strong>{" "}
                    <small className="text-muted">
                      ({formatNum(detalle.consumo)} x {formatNum(detalle.precioGasoil)} / 8)
                    </small>
                  </td>
                  <td className="text-end">
                    <strong>{formatARS(detalle.comp2)}</strong>
                  </td>
                </tr>
              </tbody>
            </Table>

            <Table bordered size="sm" className="text-start align-middle mb-2">
              <thead className="table-dark">
                <tr>
                  <th colSpan="2">Componente 3 - Mano de obra</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Promedio salarial/hora</td>
                  <td className="text-end">$ {formatNum(detalle.promedioHora)}</td>
                </tr>
                <tr>
                  <td>% Costos indirectos</td>
                  <td className="text-end">{detalle.porcIndirectos}%</td>
                </tr>
                <tr>
                  <td>
                    <strong>Subtotal</strong>
                  </td>
                  <td className="text-end">
                    <strong>{formatARS(detalle.comp3)}</strong>
                  </td>
                </tr>
              </tbody>
            </Table>

            <div className="d-flex justify-content-between align-items-center bg-success bg-opacity-25 rounded p-2 mt-3">
              <span className="fw-bold fs-6">PRECIO COMPLETO</span>
              <span className="fw-bold fs-5">{formatARS(detalle.total)}</span>
            </div>
          </>
        )}

        {detalle.tipo === "porcentaje" && (
          <>
            <Table bordered size="sm" className="text-start align-middle mb-2">
              <thead className="table-dark">
                <tr>
                  <th colSpan="2">Cálculo por porcentaje sobre PC200</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Precio completo PC200</td>
                  <td className="text-end">{formatARS(detalle.precioPC200)}</td>
                </tr>
                <tr>
                  <td>Porcentaje aplicado</td>
                  <td className="text-end">{detalle.porcentaje}%</td>
                </tr>
              </tbody>
            </Table>

            <div className="d-flex justify-content-between align-items-center bg-success bg-opacity-25 rounded p-2 mt-3">
              <span className="fw-bold fs-6">PRECIO COMPLETO</span>
              <span className="fw-bold fs-5">{formatARS(detalle.total)}</span>
            </div>
          </>
        )}

        {detalle.tipo === "km" && (
          <>
            <Table bordered size="sm" className="text-start align-middle mb-2">
              <thead className="table-dark">
                <tr>
                  <th colSpan="2">Cálculo por kilómetro</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Consumo gasoil/km (lts)</td>
                  <td className="text-end">{formatNum(detalle.consumoKm)}</td>
                </tr>
                <tr>
                  <td>Precio gasoil</td>
                  <td className="text-end">$ {formatNum(detalle.precioGasoil)}</td>
                </tr>
                <tr>
                  <td>Distancia base</td>
                  <td className="text-end">{detalle.kmBase} km</td>
                </tr>
              </tbody>
            </Table>

            <div className="d-flex justify-content-between align-items-center bg-success bg-opacity-25 rounded p-2 mt-3">
              <span className="fw-bold fs-6">PRECIO COMPLETO</span>
              <span className="fw-bold fs-5">{formatARS(detalle.total)}</span>
            </div>
          </>
        )}
      </Modal.Body>

      <Modal.Footer className="justify-content-center">
        <Button variant="outline-secondary" onClick={onHide}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DetallePrecioModal;
