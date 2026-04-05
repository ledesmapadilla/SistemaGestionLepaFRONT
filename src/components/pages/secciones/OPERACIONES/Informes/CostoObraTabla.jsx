import { Table, Button } from "react-bootstrap";
import XLSXStyle from "xlsx-js-style";
import "../../../../../styles/verRemitos.css";

const CostoObraTabla = ({ obra, costos, onVolver, onVerGastos }) => {
  const formatoMiles = (valor) => {
    if (valor === undefined || valor === null || isNaN(valor)) return "-";
    return new Intl.NumberFormat("es-AR").format(valor);
  };

  const totalCostos =
    (costos?.gasoil || 0) + (costos?.manoObra || 0) + (costos?.otros || 0);
  const saldoFinal = (costos?.facturacion || 0) - totalCostos;

  const exportarExcel = () => {
    const headers = ["Gasoil", "Mano de Obra", "Otros Costos", "Total Costos", "Facturación", "Saldo"];
    const cols = ["A", "B", "C", "D", "E", "F"];
    const currencyFmt = '"$"#,##0.00';
    const centerAlign = { horizontal: "center", vertical: "center" };
    const leftAlign = { horizontal: "left", vertical: "center" };

    const ws = {};
    ws["A1"] = { v: "ANÁLISIS DE COSTOS", t: "s", s: { font: { bold: true, sz: 14 }, alignment: leftAlign } };
    ws["A2"] = { v: `Razón Social: ${obra?.razonsocial || "-"}`, t: "s", s: { font: { bold: true }, alignment: leftAlign } };
    ws["A3"] = { v: `Obra: ${obra?.nombreobra || "-"}`, t: "s", s: { font: { bold: true }, alignment: leftAlign } };

    headers.forEach((h, i) => {
      ws[`${cols[i]}5`] = { v: h, t: "s", s: { font: { bold: true }, alignment: centerAlign } };
    });

    const valores = [
      costos?.gasoil || 0,
      costos?.manoObra || 0,
      costos?.otros || 0,
      totalCostos,
      costos?.facturacion || 0,
      saldoFinal,
    ];
    valores.forEach((val, colIdx) => {
      ws[`${cols[colIdx]}6`] = {
        v: val,
        t: "n",
        z: currencyFmt,
        s: { alignment: centerAlign, numFmt: currencyFmt },
      };
    });

    ws["!ref"] = "A1:F6";
    ws["!cols"] = [{ wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];

    const libro = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(libro, ws, "Análisis");
    XLSXStyle.writeFile(libro, `Analisis_${obra?.nombreobra || "obra"}.xlsx`);
  };

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

        <div className="d-flex gap-2">
          <Button variant="outline-light" onClick={exportarExcel}>Excel</Button>
          <Button variant="outline-success" onClick={onVolver}>Volver</Button>
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
