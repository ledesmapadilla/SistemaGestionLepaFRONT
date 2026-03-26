import React from "react";
import { Modal, Button, Form, Table } from "react-bootstrap";
import Swal from "sweetalert2";

const FILAS_APARTE = ["Carretón chico x km", "Viaje de batea x km"];

const ConsumosGasoilModal = ({
  show,
  onHide,
  consumos,
  setConsumos,
  porcentajeIndirectos,
  setPorcentajeIndirectos,
  onGuardar,
}) => {
  const consumosTabla = consumos.filter((c) => !FILAS_APARTE.includes(c.maquina));
  const consumosAparte = consumos.filter((c) => FILAS_APARTE.includes(c.maquina));

  const actualizarConsumo = (index, valor) => {
    const nuevo = [...consumos];
    nuevo[index] = { ...nuevo[index], consumo: valor };
    setConsumos(nuevo);
  };

  const handleGuardar = () => {
    onGuardar(consumos, porcentajeIndirectos);
    onHide();
    Swal.fire({
      icon: "success",
      title: "Consumos cargados",
      timer: 2000,
      showConfirmButton: false,
    });
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Consumos Gasoil</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Table bordered hover size="sm" className="text-center align-middle">
          <thead className="table-dark">
            <tr>
              <th>Máquina</th>
              <th>Consumo promedio por día (lts)</th>
            </tr>
          </thead>
          <tbody>
            {consumosTabla.length === 0 ? (
              <tr>
                <td colSpan="2" className="text-muted py-2">
                  No hay máquinas cargadas
                </td>
              </tr>
            ) : (
              consumosTabla.map((item) => {
                const realIndex = consumos.findIndex((c) => c.maquinaId === item.maquinaId);
                return (
                  <tr key={item.maquinaId}>
                    <td>{item.maquina}</td>
                    <td>
                      <Form.Control
                        type="number"
                        step="any"
                        min="0"
                        className="text-center w-25 mx-auto"
                        placeholder="0"
                        value={item.consumo}
                        onChange={(e) => actualizarConsumo(realIndex, e.target.value)}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
        <div className="d-flex align-items-center gap-2 mt-3">
          <Form.Label className="mb-0 fw-bold">Porcentaje indirectos</Form.Label>
          <Form.Control
            type="number"
            step="any"
            min="0"
            max="100"
            className="text-center"
            style={{ width: "80px" }}
            placeholder="0"
            value={porcentajeIndirectos}
            onChange={(e) => setPorcentajeIndirectos(e.target.value)}
          />
          <span className="fw-bold">%</span>
        </div>
        {consumosAparte.map((item) => {
          const realIndex = consumos.findIndex((c) => c.maquinaId === item.maquinaId);
          return (
            <div key={item.maquinaId} className="d-flex align-items-center gap-2 mt-3">
              <Form.Label className="mb-0 fw-bold">{item.maquina}</Form.Label>
              <Form.Control
                type="number"
                step="any"
                min="0"
                className="text-center"
                style={{ width: "80px" }}
                placeholder="0"
                value={item.consumo}
                onChange={(e) => actualizarConsumo(realIndex, e.target.value)}
              />
              <span className="fw-bold">lts</span>
            </div>
          );
        })}
      </Modal.Body>

      <Modal.Footer className="justify-content-center">
        <Button variant="outline-secondary" onClick={onHide}>
          Cancelar
        </Button>
        <Button variant="outline-success" onClick={handleGuardar}>
          Guardar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ConsumosGasoilModal;
