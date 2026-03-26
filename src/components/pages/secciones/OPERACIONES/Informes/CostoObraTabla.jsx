import { Table, Button } from "react-bootstrap";
import "../../../../../styles/verRemitos.css";

const CostoObraTabla = ({ obra, costos, onVolver, onVerGastos }) => {
  const formatoMiles = (valor) => {
    if (valor === undefined || valor === null || isNaN(valor)) return "-";
    return new Intl.NumberFormat("es-AR").format(valor);
  };

  const totalCostos =
    (costos?.gasoil || 0) + (costos?.manoObra || 0) + (costos?.otros || 0);
  const saldoFinal = (costos?.facturacion || 0) - totalCostos;

  return (
    <div className="container my-3">
      {/* TITULO */}
      <div className="">
        <h4 className="text-center">
          <span className="border-bottom border-gray border-2 pb-1">
            ANÁLISIS DE COSTOS
          </span>
        </h4>
      </div>

      {/* CABECERA: DATOS DE LA OBRA Y BOTÓN VOLVER */}
      <div className="d-flex justify-content-between align-items-center mb-4 mt-4">
        <div>
          <h4>
            Razón social:{" "}
            <span className="nombreTitulos">{obra?.razonsocial || "-"}</span>
          </h4>
          <h4>
            Obra:{" "}
            <span className="nombreTitulos">{obra?.nombreobra || "-"}</span>
          </h4>
        </div>

        <div>
          <Button variant="outline-success" onClick={onVolver}>
            Volver
          </Button>
        </div>
      </div>

      {/* TABLA */}
      <div className="table-responsive mb-4">
        <Table striped bordered hover className="align-middle text-center">
          <thead className="table-dark">
            <tr>
              <th>Gasoil</th>
              <th>Mano de Obra</th>
              <th>Otros Costos</th>
              <th>Total Costos</th>
              <th>Facturación</th>
              <th>Saldo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr className="fs-5">
              <td className="">${formatoMiles(costos?.gasoil)}</td>
              <td className="">${formatoMiles(costos?.manoObra)}</td>
              <td className="">${formatoMiles(costos?.otros)}</td>
              <td className=" text-primary">${formatoMiles(totalCostos)}</td>
              <td className="text-primary ">
                ${formatoMiles(costos?.facturacion)}
              </td>
              <td
                className={
                  saldoFinal >= 0
                    ? "text-success fw-bold"
                    : "text-danger fw-bold"
                }
              >
                ${formatoMiles(saldoFinal)}
              </td>
              <td>
                <Button variant="outline-success" onClick={onVerGastos}>
                  Ver
                </Button>
              </td>
            </tr>
          </tbody>
        </Table>
      </div>

      
      

      <div className="d-flex justify-content-center border-top mt-5">
        <h4 className="mt-4 border border-3 rounded p-4 shadow-sm">
          Saldo Final:{" "}
          <span
            className={
              saldoFinal >= 0 ? "text-success fs-2" : "text-danger fs-2 "
            }
          >
            ${formatoMiles(saldoFinal)}
          </span>
        </h4>
      </div>
    </div>
  );
};

export default CostoObraTabla;
