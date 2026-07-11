import { useState, useEffect, useMemo } from "react";
import { Container, Table, Button, Spinner, Form } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import { listarPersonal } from "../../../../../helpers/queriesPersonal.js";
import { obtenerEntregasEPP } from "../../../../../helpers/queriesEntregaEPP.js";
import Swal from "sweetalert2";
import XLSXStyle from "xlsx-js-style";

const ResumenEPP = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Fechas iniciales de búsqueda
  const hoy = new Date().toLocaleDateString("en-CA");
  const primerDiaAnio = new Date(new Date().getFullYear(), 0, 1).toLocaleDateString("en-CA");

  const [desde, setDesde] = useState(location.state?.desde || primerDiaAnio);
  const [hasta, setHasta] = useState(location.state?.hasta || hoy);

  const [personal, setPersonal] = useState([]);
  const [entregas, setEntregas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const [resPersonal, resEntregas] = await Promise.all([
          listarPersonal(),
          obtenerEntregasEPP()
        ]);

        if (resPersonal && resPersonal.ok) {
          const dataP = await resPersonal.json();
          setPersonal(dataP.sort((a, b) => a.nombre.localeCompare(b.nombre)));
        }
        if (resEntregas && resEntregas.ok) {
          const dataE = await resEntregas.json();
          setEntregas(dataE || []);
        }
      } catch (error) {
        console.error("Error al cargar datos del resumen:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudieron cargar los datos de entregas.",
        });
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  // Entregas filtradas por fecha
  const entregasFiltradas = useMemo(() => {
    return entregas.filter((e) => {
      const f = e.fecha;
      return f >= desde && f <= hasta;
    });
  }, [entregas, desde, hasta]);

  // Mapa de entregas: { "nombre de personal": { camisa: true, pantalon: true, ... } }
  const mapaEntregados = useMemo(() => {
    const mapa = {};
    entregasFiltradas.forEach((ent) => {
      const nombreNorm = (ent.personal || "").trim().toLowerCase();
      if (!mapa[nombreNorm]) {
        mapa[nombreNorm] = { camisa: false, pantalon: false, botines: false, otros: false };
      }
      if (ent.epp) {
        mapa[nombreNorm][ent.epp.toLowerCase()] = true;
      }
    });
    return mapa;
  }, [entregasFiltradas]);

  const volver = () => {
    navigate("/personal/entrega-epp", { state: { desde, hasta } });
  };

  // Exportar resumen a Excel
  const exportarResumenExcel = () => {
    if (personal.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Atención",
        text: "No hay registros para exportar.",
      });
      return;
    }

    const titulo = `Resumen de Entregas EPP`;
    const rangoFechas = `Periodo: ${desde.split("-").reverse().join("/")} al ${hasta.split("-").reverse().join("/")}`;
    const fechaReporte = `Fecha de Reporte: ${new Date().toLocaleDateString("es-AR")}`;
    const headers = ["Personal", "Camisa", "Pantalón", "Botines", "Otros"];

    const estCentro = { alignment: { horizontal: "center", vertical: "center" } };
    const estIzquierda = { alignment: { horizontal: "left", vertical: "center" } };
    const estHeader = { font: { bold: true }, alignment: { horizontal: "center", vertical: "center" } };
    const estTitulo = { font: { bold: true, sz: 14 }, alignment: { horizontal: "left", vertical: "center" } };
    const estSubt = { alignment: { horizontal: "left", vertical: "center" } };

    const wb = XLSXStyle.utils.book_new();
    const ws = {};

    // Títulos
    ws["A1"] = { v: titulo, t: "s", s: estTitulo };
    ws["A2"] = { v: rangoFechas, t: "s", s: estSubt };
    ws["A3"] = { v: fechaReporte, t: "s", s: estSubt };

    // Headers (fila 5)
    const cols = "ABCDE";
    headers.forEach((h, i) => {
      ws[`${cols[i]}5`] = { v: h, t: "s", s: estHeader };
    });

    // Filas (a partir de la 6)
    personal.forEach((p, rowIdx) => {
      const excelRow = rowIdx + 6;
      const nombreNorm = (p.nombre || "").trim().toLowerCase();
      const epps = mapaEntregados[nombreNorm] || { camisa: false, pantalon: false, botines: false, otros: false };

      const vals = [
        p.nombre,
        epps.camisa ? "✓" : "-",
        epps.pantalon ? "✓" : "-",
        epps.botines ? "✓" : "-",
        epps.otros ? "✓" : "-"
      ];

      vals.forEach((v, i) => {
        const est = (i === 0) ? estIzquierda : estCentro;
        ws[`${cols[i]}${excelRow}`] = { v: v ?? "", t: "s", s: est };
      });
    });

    const lastRow = personal.length + 5;
    ws["!ref"] = `A1:E${lastRow}`;
    ws["!cols"] = [{ wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];

    XLSXStyle.utils.book_append_sheet(wb, ws, "Resumen EPP");

    const nombreArchivo = `Resumen_EPP_${desde}_al_${hasta}.xlsx`;
    XLSXStyle.writeFile(wb, nombreArchivo);
  };

  return (
    <Container className="mt-4 w-60">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Resumen de Entregas EPP</h2>
        <div className="d-flex align-items-center gap-2">
          <Button
            variant="outline-light"
            size="sm"
            onClick={exportarResumenExcel}
            disabled={personal.length === 0 || loading}
          >
            Excel
          </Button>
          <Button variant="outline-success" size="sm" onClick={volver}>
            Volver
          </Button>
        </div>
      </div>

      <div className="d-flex align-items-end gap-3 mb-4 p-3 bg-dark rounded" style={{ border: "1px solid #495057" }}>
        <Form.Group controlId="desde" style={{ width: "160px" }}>
          <Form.Label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Fecha Desde</Form.Label>
          <Form.Control
            size="sm"
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
        </Form.Group>

        <Form.Group controlId="hasta" style={{ width: "160px" }}>
          <Form.Label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Fecha Hasta</Form.Label>
          <Form.Control
            size="sm"
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />
        </Form.Group>

        <div className="text-muted ms-auto" style={{ fontSize: "0.9rem" }}>
          Total Personal: {personal.length}
        </div>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center my-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "65vh" }}>
          <Table striped bordered hover size="sm" className="text-center align-middle mb-0">
            <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
              <tr>
                <th style={{ minWidth: "220px" }}>Personal</th>
                <th style={{ width: "120px" }}>Camisa</th>
                <th style={{ width: "120px" }}>Pantalón</th>
                <th style={{ width: "120px" }}>Botines</th>
                <th style={{ width: "120px" }}>Otros</th>
              </tr>
            </thead>
            <tbody>
              {personal.map((p) => {
                const nombreNorm = (p.nombre || "").trim().toLowerCase();
                const epps = mapaEntregados[nombreNorm] || { camisa: false, pantalon: false, botines: false, otros: false };

                const renderCheck = (entregado) => {
                  return entregado ? (
                    <span style={{ color: "#198754", fontSize: "1.2rem", fontWeight: "bold" }}>✓</span>
                  ) : (
                    <span className="text-muted">-</span>
                  );
                };

                return (
                  <tr key={p._id}>
                    <td className="text-start ps-3">{p.nombre}</td>
                    <td>{renderCheck(epps.camisa)}</td>
                    <td>{renderCheck(epps.pantalon)}</td>
                    <td>{renderCheck(epps.botines)}</td>
                    <td>{renderCheck(epps.otros)}</td>
                  </tr>
                );
              })}
              {personal.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-muted py-3">
                    No se encontraron registros de personal.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      )}
    </Container>
  );
};

export default ResumenEPP;
