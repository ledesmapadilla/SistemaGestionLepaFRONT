import { useEffect, useState } from "react";
import { Table, Button, Container } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import { listarRemitosPorObra } from "../../../../../helpers/queriesRemitos";
import XLSXStyle from "xlsx-js-style";
import "../../../../../styles/verRemitos.css";

const RemitosXClientesFinal = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { obraId, obraNombre, razonsocial } = location.state || {};

  const [remitos, setRemitos] = useState([]);
  const [loading, setLoading] = useState(true);
  // NUEVO ESTADO: Para guardar el total global de la obra
  const [totalObra, setTotalObra] = useState(0);

  const cargarRemitos = async () => {
    if (!obraId) return;
    try {
      const data = await listarRemitosPorObra(obraId);

      // 1. CALCULAMOS EL TOTAL OBRA (Con todos los remitos, facturados o no)
      const totalGlobal = data.reduce((total, remito) => {
        const subtotalRemito = remito.items.reduce((sum, item) => {
          return sum + item.cantidad * item.precioUnitario;
        }, 0);
        return total + subtotalRemito;
      }, 0);
      setTotalObra(totalGlobal);

      // 2. FILTRAMOS (Para mostrar en tabla solo los "Sin facturar")
      const soloPendientes = data.filter((r) => r.estado === "Sin facturar");
      setRemitos(soloPendientes);

    } catch (error) {
      console.error("ERROR AL CARGAR REMITOS:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarRemitos();
  }, [obraId]);

  const formatoMiles = (valor) => {
    if (valor === undefined || valor === null) return "-";
    return new Intl.NumberFormat("es-AR").format(valor);
  };

  const mostrarFechaDMY = (fecha) => {
    if (!fecha) return "-";
    const [y, m, d] = fecha.split("-");
    return `${d}-${m}-${y}`;
  };

  // Cálculo del total solo de lo que se ve en esta tabla (Sin facturar)
  const totalNoFacturado = remitos.reduce((total, remito) => {
    const subtotalRemito = remito.items.reduce((sum, item) => {
      return sum + item.cantidad * item.precioUnitario;
    }, 0);
    return total + subtotalRemito;
  }, 0);

  const exportarExcel = () => {
    const headers = ["N° Remito", "Fecha", "Maquinista", "Máquina", "Servicio", "Cantidad", "Unidad", "$ Unitario", "$ Total", "Gasoil (lts)"];
    const cols = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
    const currencyFmt = '"$"#,##0.00';
    const centerAlign = { horizontal: "center", vertical: "center" };
    const leftAlign = { horizontal: "left", vertical: "center" };

    const filas = remitos.flatMap((remito) =>
      remito.items.map((item) => [
        remito.remito,
        mostrarFechaDMY(item.fecha || remito.fecha),
        item.personal || "-",
        item.maquina || "-",
        item.servicio || "-",
        item.cantidad,
        item.unidad,
        item.precioUnitario,
        item.cantidad * item.precioUnitario,
        item.gasoil || "-",
      ])
    );

    const ws = {};
    ws["A1"] = { v: "REMITOS SIN FACTURAR", t: "s", s: { font: { bold: true, sz: 14 }, alignment: leftAlign } };
    ws["A2"] = { v: `Razón Social: ${razonsocial}`, t: "s", s: { font: { bold: true }, alignment: leftAlign } };
    ws["A3"] = { v: `Obra: ${obraNombre}`, t: "s", s: { font: { bold: true }, alignment: leftAlign } };

    headers.forEach((h, i) => {
      ws[`${cols[i]}5`] = { v: h, t: "s", s: { font: { bold: true }, alignment: centerAlign } };
    });

    const currencyCols = new Set([7, 8]); // $ Unitario y $ Total
    filas.forEach((fila, rowIdx) => {
      fila.forEach((val, colIdx) => {
        const isCurrency = currencyCols.has(colIdx) && typeof val === "number";
        ws[`${cols[colIdx]}${rowIdx + 6}`] = {
          v: val ?? "-",
          t: isCurrency ? "n" : typeof val === "number" ? "n" : "s",
          s: { alignment: centerAlign, ...(isCurrency ? { numFmt: currencyFmt } : {}) },
          ...(isCurrency ? { z: currencyFmt } : {}),
        };
      });
    });

    ws["!ref"] = `A1:J${filas.length + 5}`;
    ws["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];

    const libro = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(libro, ws, "Sin facturar");
    XLSXStyle.writeFile(libro, `SinFacturar_${obraNombre}.xlsx`);
  };

  if (!obraId)
    return <Container className="mt-5">Obra no seleccionada.</Container>;

  return (
    <Container className="my-3">
      <div className="row align-items-center ">
        <div className="">
          <h3 className=" text-center">Remitos sin facturar</h3>
        </div>
        <div className="col-md-8 my-0 ">
          <h4 className="mb-0">
            <strong>Razón social: </strong>
            <span className="titulosLetras">{razonsocial}</span>
          </h4>
          <h4>
            <strong>Obra:</strong>{" "}
            <span className="titulosLetras">{obraNombre}</span>
          </h4>
        </div>
        <div className="col-md-4 text-end d-flex gap-2 justify-content-end">
          <Button variant="outline-light" onClick={exportarExcel}>Excel</Button>
          <Button variant="outline-success" onClick={() => navigate(-1)}>Volver</Button>
        </div>
      </div>

      {/* SECCIÓN DE TOTALES */}
      <div className="text-center pb-3">
        {/* NUEVO: Total Obra */}
        <h4 className="mb-2">
          Total Obra:{" "}
          <span className="text-gray ">${formatoMiles(totalObra)} + iva</span>
        </h4>

        {/* EXISTENTE: Total sin facturar */}
        <h5 className="mb-1">
          Total sin facturar: ${formatoMiles(totalNoFacturado)} + iva
        </h5>
      </div>

      <div className="table-responsive shadow-sm">
        <Table striped bordered hover className="align-middle text-center">
          <thead className="table-dark">
            <tr>
              <th>N° Remito</th>
              <th>Fecha</th>
              <th>Maquinista</th>
              <th>Máquina</th>
              <th>Servicio</th>
              <th>Cant.</th>
              <th>Unidad</th>
              <th>$ Un.</th>
              <th>$ Total</th>
              <th>Gasoil(lts)</th>
            </tr>
          </thead>
          <tbody>
            {remitos.length > 0 ? (
              remitos.map((remito) =>
                remito.items.map((item, index) => (
                  <tr key={`${remito._id}-${item._id}`}>
                    <td>{remito.remito}</td>
                    <td>{mostrarFechaDMY(item.fecha || remito.fecha)}</td>
                    <td>{item.personal || "-"}</td>
                    <td>{item.maquina || "-"}</td>
                    <td>{item.servicio || "-"}</td>
                    <td>{item.cantidad}</td>
                    <td>{item.unidad}</td>
                    <td>${formatoMiles(item.precioUnitario)}</td>
                    <td className="">
                      ${formatoMiles(item.cantidad * item.precioUnitario)}
                    </td>
                    <td>{item.gasoil || "-"}</td>
                  </tr>
                ))
              )
            ) : (
              <tr>
                <td colSpan="10" className="py-4 text-muted">
                  No hay remitos pendientes de facturación para esta obra.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </Container>
  );
};

export default RemitosXClientesFinal;