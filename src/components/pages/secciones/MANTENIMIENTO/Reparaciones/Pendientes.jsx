import { useState, useEffect } from "react";
import { Container, Button, Table, Spinner } from "react-bootstrap";
import XLSXStyle from "xlsx-js-style";
import { obtenerTodasReparaciones } from "../../../../../helpers/queriesReparaciones";

const COLOR_ESTADO = {
  Pendiente: "#6c757d",
  "En proceso": "#ffc107",
};

const COLOR_ESTADO_REPUESTO = {
  Pedido: "#0dcaf0",
  Pendiente: "#6c757d",
  "En proceso": "#ffc107",
  "En taller": "#fd7e14",
  Colocado: "#198754",
};

function Pendientes({ onVolver }) {
  const [filas, setFilas] = useState([]);
  const [repuestos, setRepuestos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      try {
        const res = await obtenerTodasReparaciones();
        if (res?.ok) {
          const data = await res.json();
          const rows = [];
          const reps = [];
          (Array.isArray(data) ? data : []).forEach((doc) => {
            const maquina = doc.maquina?.maquina || "-";
            (doc.reparaciones || []).forEach((r) => {
              if ((r.estado || "") !== "Terminado") {
                rows.push({
                  fecha: r.fecha || "",
                  reparacion: r.reparacion || "",
                  maquina,
                  tieneRepuestos: (r.repuestos || []).length > 0,
                  maquinaParada: !!r.maquinaParada,
                  estado: r.estado || "",
                });
              }
              (r.repuestos || []).forEach((rep) => {
                if ((rep.estado || "") !== "Colocado") {
                  reps.push({
                    fecha: r.fecha || "",
                    repuesto: rep.repuesto || "",
                    cantidad: Number(rep.cantidad) || 0,
                    maquina,
                    responsable: rep.responsable || "",
                    estado: rep.estado || "",
                  });
                }
              });
            });
          });
          rows.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
          reps.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
          setFilas(rows);
          setRepuestos(reps);
        }
      } catch (error) {
        console.error("Error al cargar pendientes:", error);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  const exportarRepuestosExcel = () => {
    const titulo = "Repuestos pendientes";
    const headers = ["Fecha", "Repuesto", "Cantidad", "Máquina", "Responsable", "Estado"];
    const cols = "ABCDEF";
    const estCentro = { alignment: { horizontal: "center", vertical: "center" } };
    const estIzq = { alignment: { horizontal: "left", vertical: "center" } };
    const estHeader = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "222222" } }, alignment: { horizontal: "center", vertical: "center" } };
    const estTitulo = { font: { bold: true, sz: 13 }, alignment: { horizontal: "left", vertical: "center" } };

    const wb = XLSXStyle.utils.book_new();
    const ws = {};

    const hoy = new Date();
    const fechaSerial = Math.round((Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) - Date.UTC(1899, 11, 30)) / 86400000);

    ws["A1"] = { v: titulo, t: "s", s: estTitulo };
    ws["A2"] = { v: fechaSerial, t: "n", s: { ...estTitulo, numFmt: "DD/MM/YYYY" } };
    ws["A3"] = { v: "", t: "s" };
    headers.forEach((h, i) => { ws[`${cols[i]}4`] = { v: h, t: "s", s: estHeader }; });

    repuestos.forEach((r, rowIdx) => {
      const row = rowIdx + 5;
      ws[`A${row}`] = { v: r.fecha ? r.fecha.split("-").reverse().join("/") : "", t: "s", s: estCentro };
      ws[`B${row}`] = { v: r.repuesto || "", t: "s", s: estIzq };
      ws[`C${row}`] = { v: Number(r.cantidad) || 0, t: "n", s: estCentro };
      ws[`D${row}`] = { v: r.maquina || "", t: "s", s: estCentro };
      ws[`E${row}`] = { v: r.responsable || "", t: "s", s: estCentro };
      ws[`F${row}`] = { v: r.estado || "", t: "s", s: estCentro };
    });

    const lastRow = repuestos.length + 4;
    ws["!ref"] = `A1:F${Math.max(lastRow, 4)}`;
    ws["!cols"] = [{ wch: 14 }, { wch: 32 }, { wch: 12 }, { wch: 18 }, { wch: 20 }, { wch: 14 }];

    XLSXStyle.utils.book_append_sheet(wb, ws, "Repuestos pendientes");
    XLSXStyle.writeFile(wb, "RepuestosPendientes.xlsx");
  };

  return (
    <Container className="py-4">
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}
        className="mb-5"
      >
        <span />
        <h4 className="mb-0 text-center">Reparaciones pendientes</h4>
        <div className="d-flex justify-content-end">
          <Button variant="outline-success" size="sm" onClick={onVolver}>
            Volver
          </Button>
        </div>
      </div>

      {cargando ? (
        <Spinner animation="border" className="d-block mx-auto my-5" />
      ) : (
        <>
          <div className="w-75 mx-auto" style={{ maxHeight: "65vh", overflowY: "auto" }}>
            <Table striped bordered hover size="sm" className="text-center align-middle mb-0">
              <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr>
                  <th style={{ width: 140 }}>Fecha</th>
                  <th>Reparación</th>
                  <th style={{ width: 180 }}>Máquina</th>
                  <th style={{ width: 120 }}>Repuestos</th>
                  <th style={{ width: 120 }}>Máquina parada</th>
                  <th style={{ width: 140 }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-muted py-3">
                      No hay reparaciones pendientes
                    </td>
                  </tr>
                )}
                {filas.map((f, idx) => (
                  <tr key={idx}>
                    <td>{f.fecha ? f.fecha.split("-").reverse().join("/") : "-"}</td>
                    <td className="text-start">{f.reparacion || "-"}</td>
                    <td>{f.maquina}</td>
                    <td style={{ color: f.tieneRepuestos ? "#198754" : "#6c757d", fontWeight: 600 }}>
                      {f.tieneRepuestos ? "Sí" : "No"}
                    </td>
                    <td style={{ color: f.maquinaParada ? "#dc3545" : "#6c757d", fontWeight: 600 }}>
                      {f.maquinaParada ? "Sí" : "No"}
                    </td>
                    <td style={{ color: COLOR_ESTADO[f.estado] || "#dee2e6", fontWeight: 600 }}>
                      {f.estado || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}
            className="mt-5 mb-3"
          >
            <span />
            <h4 className="mb-0 text-center">Repuestos pendientes</h4>
            <div className="d-flex justify-content-end">
              <Button variant="outline-light" size="sm" onClick={exportarRepuestosExcel}>
                Excel
              </Button>
            </div>
          </div>
          <div className="w-75 mx-auto" style={{ maxHeight: "65vh", overflowY: "auto" }}>
            <Table striped bordered hover size="sm" className="text-center align-middle mb-0">
              <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr>
                  <th style={{ width: 140 }}>Fecha</th>
                  <th>Repuesto</th>
                  <th style={{ width: 110 }}>Cantidad</th>
                  <th style={{ width: 180 }}>Máquina</th>
                  <th style={{ width: 180 }}>Responsable</th>
                  <th style={{ width: 140 }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {repuestos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-muted py-3">
                      No hay repuestos pendientes
                    </td>
                  </tr>
                )}
                {repuestos.map((r, idx) => (
                  <tr key={idx}>
                    <td>{r.fecha ? r.fecha.split("-").reverse().join("/") : "-"}</td>
                    <td className="text-start">{r.repuesto || "-"}</td>
                    <td>{r.cantidad}</td>
                    <td>{r.maquina}</td>
                    <td>{r.responsable || "-"}</td>
                    <td style={{ color: COLOR_ESTADO_REPUESTO[r.estado] || "#dee2e6", fontWeight: 600 }}>
                      {r.estado || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </>
      )}
    </Container>
  );
}

export default Pendientes;
