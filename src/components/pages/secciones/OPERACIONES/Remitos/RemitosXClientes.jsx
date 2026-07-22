import { useEffect, useState } from "react";
import { Table, Spinner, Button } from "react-bootstrap";
import { listarRemitos, recalcularEstadosRemitos } from "../../../../../helpers/queriesRemitos";
import { useNavigate } from "react-router-dom";
import XLSXStyle from "xlsx-js-style";
import "../../../../../styles/remitosxCliente.css";

const RemitosXClientes = () => {
  const navigate = useNavigate();
  const [datosAgrupados, setDatosAgrupados] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargarDatos = async () => {
    try {
      // Corrige automáticamente los remitos que quedaron "Sin facturar" con saldo
      // < $1 (diferencias de centavos) antes de armar la lista. Silencioso: si
      // falla no bloquea la carga.
      try { await recalcularEstadosRemitos(); } catch { /* no bloquear la carga */ }

      const remitos = await listarRemitos();

      const agrupado = remitos.reduce((acc, remito) => {
        // 1. Validaciones básicas
        if (!remito.obra || !remito.obra.razonsocial) return acc;

        const razonSocial = remito.obra.razonsocial;

        // 2. NORMALIZACIÓN DEL ESTADO (Clave para que no falle el conteo)
        const estado = remito.estado
          ? remito.estado.toString().toLowerCase().trim()
          : "";

        // 3. COMPARAMOS CONTRA "sin facturar" (en minúsculas)
        if (estado === "sin facturar") {
          const totalRemito =
            remito.items?.reduce((sum, item) => {
              return sum + Number(item.cantidad) * Number(item.precioUnitario);
            }, 0) || 0;

          const saldoRemito = totalRemito - (remito.montoFacturado || 0);

          // Remito automático de precio cerrado/global sin precio definido
          // (total 0): se cuenta igual hasta que se facture.
          const esGlobalSinPrecio =
            totalRemito < 1 &&
            (remito.montoFacturado || 0) < 1 &&
            (remito.items || []).some((i) => i.servicio === "Precio de la obra");

          // Ignorar remitos cuyo saldo real es menor a $1 (ya facturados con centavos de diferencia)
          if (saldoRemito < 1 && !esGlobalSinPrecio) return acc;

          if (!acc[razonSocial]) {
            acc[razonSocial] = {
              razonSocial,
              monto: 0,
              cantidadRemitos: 0,
              ultimaFecha: "",
            };
          }

          acc[razonSocial].monto += saldoRemito;
          acc[razonSocial].cantidadRemitos += 1;
          // Guardamos la fecha de remito más reciente del cliente.
          // La fecha real vive en los items (remito.fecha es opcional).
          const fechaRemito = (remito.items || [])
            .map((i) => (i.fecha || "").toString().slice(0, 10))
            .filter(Boolean)
            .sort()
            .at(-1) || (remito.fecha || "").toString().slice(0, 10);
          if (fechaRemito > acc[razonSocial].ultimaFecha) {
            acc[razonSocial].ultimaFecha = fechaRemito;
          }
        }

        return acc;
      }, {});

      // 4. Convertimos a array. Se incluyen los clientes con al menos un remito
      // pendiente contado (monto > 0 o remito global sin precio con monto 0).
      // Ordenados por fecha de remito más reciente, del más nuevo al más antiguo.
      const resultadoFinal = Object.values(agrupado)
        .filter((c) => c.cantidadRemitos > 0)
        .sort((a, b) => (b.ultimaFecha || "").localeCompare(a.ultimaFecha || ""));

      setDatosAgrupados(resultadoFinal);
    } catch (error) {
      console.error("Error al cargar listado por clientes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const formatoMiles = (n) => new Intl.NumberFormat("es-AR").format(n);

  const exportarExcel = () => {
    const headers = ["Razón Social", "Monto No Facturado", "Cant. Remitos"];
    const cols = ["A", "B", "C"];
    const currencyFmt = '"$"#,##0.00';
    const centerAlign = { horizontal: "center", vertical: "center" };
    const leftAlign = { horizontal: "left", vertical: "center" };

    const ws = {};
    ws["A1"] = { v: "REMITOS SIN FACTURAR", t: "s", s: { font: { bold: true, sz: 14 }, alignment: leftAlign } };
    ws["A2"] = { v: `Fecha: ${new Date().toLocaleDateString("es-AR")}`, t: "s", s: { alignment: leftAlign } };

    headers.forEach((h, i) => {
      ws[`${cols[i]}3`] = { v: h, t: "s", s: { font: { bold: true }, alignment: centerAlign } };
    });

    datosAgrupados.forEach((item, rowIdx) => {
      ws[`A${rowIdx + 4}`] = { v: item.razonSocial, t: "s", s: { alignment: centerAlign } };
      ws[`B${rowIdx + 4}`] = { v: item.monto, t: "n", z: currencyFmt, s: { alignment: centerAlign, numFmt: currencyFmt } };
      ws[`C${rowIdx + 4}`] = { v: item.cantidadRemitos, t: "n", s: { alignment: centerAlign } };
    });

    ws["!ref"] = `A1:C${datosAgrupados.length + 3}`;
    ws["!cols"] = [{ wch: 35 }, { wch: 20 }, { wch: 14 }];

    const libro = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(libro, ws, "Sin facturar");
    XLSXStyle.writeFile(libro, "Remitos_SinFacturar.xlsx");
  };

  if (loading)
    return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <div className="w-75 mx-auto my-2">
      <h6 className="text-center mb-3">Remitos sin facturar</h6>
      <div className="d-flex justify-content-end gap-2 mb-3">
        <Button size="sm" variant="outline-light" onClick={exportarExcel}>Excel</Button>
        <Button size="sm" variant="outline-success" onClick={() => navigate(-1)}>Volver</Button>
      </div>

      <div className="table-responsive shadow-sm">
        <Table striped bordered hover className="text-center align-middle" size="sm">
          <thead className="table-dark">
            <tr>
              <th>Razón Social</th>
              <th>Monto No Facturado</th>
              <th>Cant. remitos</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {datosAgrupados.length > 0 ? (
              datosAgrupados.map((item, index) => (
                <tr key={index}>
                  <td>{item.razonSocial}</td>
                  <td className={item.monto > 0 ? "" : "text-success"}>
                    ${formatoMiles(item.monto)}
                  </td>
                  <td>{item.cantidadRemitos}</td>
                  <td>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() =>
                        navigate("/remitos-cliente-obras", {
                          state: { razonSocial: item.razonSocial },
                        })
                      }
                    >
                      Ver detalle
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="py-4 text-muted">
                  No hay remitos pendientes de facturación
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
};

export default RemitosXClientes;
