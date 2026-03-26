import React from "react";
import { Table, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

const getMasReciente = (v) => {
  if (Array.isArray(v.historial) && v.historial.length) {
    const ordenado = [...v.historial].sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));
    return ordenado[ordenado.length - 1];
  }
  return null;
};

const ultimoValor = (v) => {
  const reciente = getMasReciente(v);
  if (reciente) return reciente.valor;
  if (v.valor !== undefined) return v.valor;
  return 0;
};

const ultimaFecha = (v) => {
  const reciente = getMasReciente(v);
  if (reciente) {
    const fecha = reciente.fecha;
    if (!fecha || fecha === "-") return "-";
    const p = fecha.split("-");
    return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : fecha;
  }
  if (v.fecha) {
    const d = new Date(v.fecha);
    return d.toLocaleDateString("es-AR");
  }
  return "-";
};

const ultimaObs = (v) => {
  const reciente = getMasReciente(v);
  if (reciente) return reciente.observaciones || "-";
  if (v.observaciones) return v.observaciones;
  return "-";
};

const VariablesTabla = ({
  variables,
  abrirCrear,
  abrirEditar,
  abrirVer,
  borrarVariable,
}) => {
  const navigate = useNavigate();

  return (
    <>
      <div className="d-flex justify-content-end gap-2 mt-2">
        <Button variant="outline-success" onClick={() => navigate(-1)}>
          Volver
        </Button>
        <Button
          variant="outline-primary"
          onClick={abrirCrear}
          className="btn-sin-hover"
        >
          Crear Variable
        </Button>
      </div>

      <h2 className="text-center mb-2">Variables</h2>

      <div className="table-responsive w-75 mx-auto">
        <Table striped bordered hover className="text-center align-middle">
          <thead className="table-dark">
            <tr>
              <th>Variable</th>
              <th>Valor</th>
              <th>Observaciones</th>
              <th>Fecha últ. edición</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {variables.length === 0 ? (
              <tr>
                <td colSpan="5">No hay variables cargadas</td>
              </tr>
            ) : (
              variables.map((v) => (
                <tr key={v._id}>
                  <td className="fw-bold">{v.variable}</td>
                  <td>
                    {Number(ultimoValor(v)).toLocaleString("es-AR", {
                      style: "currency",
                      currency: "ARS",
                    })}
                  </td>
                  <td>{ultimaObs(v)}</td>
                  <td>{ultimaFecha(v)}</td>
                  <td className="d-flex gap-1 justify-content-center">
                    <Button
                      size="sm"
                      variant="outline-success"
                      onClick={() => abrirVer(v)}
                    >
                      Ver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-warning"
                      onClick={() => abrirEditar(v)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => borrarVariable(v._id)}
                    >
                      Borrar
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
    </>
  );
};

export default VariablesTabla;
