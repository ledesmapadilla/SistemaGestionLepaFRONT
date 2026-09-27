// Informe de remitos sin facturar: en una sola tabla junta el resumen por
// cliente (RemitosXClientes) y el de obras de cada cliente (RemitoXClientesObras).
// Usa el mismo criterio que esas dos páginas para decidir qué remito cuenta.
import { useEffect, useMemo, useState } from "react";
import { Table, Spinner, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import XLSXStyle from "xlsx-js-style";
import { listarRemitosSinFacturar, recalcularEstadosRemitos } from "../../../../../helpers/queriesRemitos";

const totalDe = (remito) =>
  (remito.items || []).reduce(
    (sum, i) => sum + (Number(i.cantidad) || 0) * (Number(i.precioUnitario) || 0),
    0
  );

// Fecha real del remito: vive en los items (remito.fecha es opcional).
const fechaDe = (remito) =>
  (remito.items || [])
    .map((i) => (i.fecha || "").toString().slice(0, 10))
    .filter(Boolean)
    .sort()
    .at(-1) || (remito.fecha || "").toString().slice(0, 10);

const porFechaDesc = (a, b) => (b.ultimaFecha || "").localeCompare(a.ultimaFecha || "");

const formatoMiles = (n) => new Intl.NumberFormat("es-AR").format(n);

const RemitosSinFacturarInforme = () => {
  const navigate = useNavigate();
  const [remitos, setRemitos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        // Igual que en "Remitos sin facturar": corrige los estados antes de listar.
        try { await recalcularEstadosRemitos(); } catch { /* no bloquear la carga */ }
        setRemitos(await listarRemitosSinFacturar());
      } catch (error) {
        console.error("Error al cargar informe de remitos sin facturar:", error);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  // [{ razonSocial, monto, cantidadRemitos, ultimaFecha, obras: [{ nombreObra, monto, cantidadRemitos, ultimaFecha }] }]
  const clientes = useMemo(() => {
    const porCliente = {};

    remitos.forEach((remito) => {
      const razonSocial = remito.obra?.razonsocial;
      if (!razonSocial) return;

      const estado = (remito.estado || "").toString().toLowerCase().trim();
      if (estado !== "sin facturar") return;

      const total = totalDe(remito);
      const saldo = total - (remito.montoFacturado || 0);
      // Remito automático de precio cerrado/global sin precio definido
      // (total 0): se cuenta igual hasta que se facture.
      const esGlobalSinPrecio =
        total < 1 &&
        (remito.montoFacturado || 0) < 1 &&
        (remito.items || []).some((i) => i.servicio === "Precio de la obra");
      if (saldo < 1 && !esGlobalSinPrecio) return;

      const nombreObra = remito.obra?.nombreobra || "Obra sin nombre";
      const fecha = fechaDe(remito);

      const cliente = (porCliente[razonSocial] ||= {
        razonSocial,
        monto: 0,
        cantidadRemitos: 0,
        ultimaFecha: "",
        obras: {},
      });
      const obra = (cliente.obras[nombreObra] ||= {
        nombreObra,
        monto: 0,
        cantidadRemitos: 0,
        ultimaFecha: "",
      });

      for (const g of [cliente, obra]) {
        g.monto += saldo;
        g.cantidadRemitos += 1;
        if (fecha > g.ultimaFecha) g.ultimaFecha = fecha;
      }
    });

    return Object.values(porCliente)
      .map((c) => ({ ...c, obras: Object.values(c.obras).sort(porFechaDesc) }))
      .sort(porFechaDesc);
  }, [remitos]);

  const totalGeneral = useMemo(
    () => ({
      monto: clientes.reduce((s, c) => s + c.monto, 0),
      cantidadRemitos: clientes.reduce((s, c) => s + c.cantidadRemitos, 0),
    }),
    [clientes]
  );

  const exportarExcel = () => {
    const headers = ["Razón Social", "Obra", "Cant. Remitos", "Monto No Facturado"];
    const cols = ["A", "B", "C", "D"];
    const currencyFmt = '"$"#,##0.00';
    const centerAlign = { horizontal: "center", vertical: "center" };
    const leftAlign = { horizontal: "left", vertical: "center" };

    const ws = {};
    ws["A1"] = { v: "REMITOS SIN FACTURAR - INFORME", t: "s", s: { font: { bold: true, sz: 14 }, alignment: leftAlign } };
    ws["A2"] = { v: `Fecha: ${new Date().toLocaleDateString("es-AR")}`, t: "s", s: { alignment: leftAlign } };

    headers.forEach((h, i) => {
      ws[`${cols[i]}3`] = { v: h, t: "s", s: { font: { bold: true }, alignment: centerAlign } };
    });

    let fila = 4;
    const escribir = (razonSocial, obra, cant, monto, bold = false) => {
      const font = bold ? { bold: true } : undefined;
      ws[`A${fila}`] = { v: razonSocial, t: "s", s: { font, alignment: leftAlign } };
      ws[`B${fila}`] = { v: obra, t: "s", s: { font, alignment: leftAlign } };
      ws[`C${fila}`] = { v: cant, t: "n", s: { font, alignment: centerAlign } };
      ws[`D${fila}`] = { v: monto, t: "n", z: currencyFmt, s: { font, alignment: centerAlign, numFmt: currencyFmt } };
      fila++;
    };

    clientes.forEach((c) => {
      c.obras.forEach((o, i) =>
        escribir(i === 0 ? c.razonSocial : "", o.nombreObra, o.cantidadRemitos, o.monto)
      );
      escribir("", `Total ${c.razonSocial}`, c.cantidadRemitos, c.monto, true);
    });
    escribir("TOTAL GENERAL", "", totalGeneral.cantidadRemitos, totalGeneral.monto, true);

    ws["!ref"] = `A1:D${fila - 1}`;
    ws["!cols"] = [{ wch: 35 }, { wch: 40 }, { wch: 14 }, { wch: 20 }];

    const libro = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(libro, ws, "Informe");
    XLSXStyle.writeFile(libro, "Remitos_SinFacturar_Informe.xlsx");
  };

  if (loading)
    return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <div className="w-75 mx-auto my-2">
      <h6 className="text-center mb-3">
        Remitos sin facturar - Informe <small className="text-muted">(sin iva)</small>
      </h6>
      <div className="d-flex justify-content-end gap-2 mb-3">
        <Button size="sm" variant="outline-light" onClick={exportarExcel}>Excel</Button>
        <Button size="sm" variant="outline-success" onClick={() => navigate(-1)}>Volver</Button>
      </div>

      <div className="table-responsive shadow-sm">
        <Table striped bordered hover className="text-center align-middle" size="sm">
          <thead className="table-dark">
            <tr>
              <th>Razón Social</th>
              <th>Obras</th>
              <th>Cant. remitos</th>
              <th>Monto No Facturado</th>
            </tr>
          </thead>
          <tbody>
            {clientes.length === 0 ? (
              <tr>
                <td colSpan="4" className="py-4 text-muted">
                  No hay remitos pendientes de facturación
                </td>
              </tr>
            ) : (
              clientes.map((c) => [
                ...c.obras.map((o, i) => (
                  <tr key={`${c.razonSocial}-${o.nombreObra}`}>
                    {i === 0 && (
                      <td rowSpan={c.obras.length + 1} className="fw-semibold">
                        {c.razonSocial}
                      </td>
                    )}
                    <td className="text-start">{o.nombreObra}</td>
                    <td>{o.cantidadRemitos}</td>
                    <td className={o.monto > 0 ? "" : "text-success"}>${formatoMiles(o.monto)}</td>
                  </tr>
                )),
                <tr key={`${c.razonSocial}-total`} className="fw-bold">
                  <td className="text-end">Total cliente</td>
                  <td>{c.cantidadRemitos}</td>
                  <td>${formatoMiles(c.monto)}</td>
                </tr>,
              ])
            )}
          </tbody>
          {clientes.length > 0 && (
            <tfoot>
              <tr className="fw-bold table-dark">
                <td colSpan="2" className="text-end">TOTAL GENERAL</td>
                <td>{totalGeneral.cantidadRemitos}</td>
                <td>${formatoMiles(totalGeneral.monto)}</td>
              </tr>
            </tfoot>
          )}
        </Table>
      </div>
    </div>
  );
};

export default RemitosSinFacturarInforme;
