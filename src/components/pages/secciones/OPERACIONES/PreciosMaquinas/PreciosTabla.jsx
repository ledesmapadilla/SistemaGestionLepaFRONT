import React, { useMemo, useState } from "react";
import { Table, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import HistorialPreciosModal from "./HistorialPreciosModal.jsx";
import XLSXStyle from "xlsx-js-style";

const ORDEN_MAQUINAS = [
  "PC200", "Retropala", "Pala cargadora", "Motoniveladora",
  "Camión batea", "Carretón grande", "Carretón chico", "Viaje batea",
];

const formatARS = (n) =>
  Number(n).toLocaleString("es-AR", { style: "currency", currency: "ARS" });

const PreciosTabla = ({
  precios,
  borrarPrecio,
  onCrearLista,
  onVerDetalle,
  onAbrirConsumos,
  completoPC200,
  sinGasoilPC200,
  completoRetropala,
  sinGasoilRetropala,
  completoPala,
  sinGasoilPala,
  completoMotoniveladora,
  sinGasoilMotoniveladora,
  completoCamionBatea,
  completoCarretonChico,
  completoCarretonGrande,
  completoViajeBatea,
  onCotizarCarreton,
  onCotizarBatea,
  onBorrarLista,
}) => {
  const navigate = useNavigate();
  const [showHistorial, setShowHistorial] = useState(false);

  const listasGuardadas = useMemo(() => {
    const grupos = {};
    precios.forEach((p) => {
      const key = p.nombre || p.fecha;
      if (!grupos[key]) grupos[key] = { nombre: p.nombre, fecha: p.fecha, items: [] };
      grupos[key].items.push(p);
    });
    return Object.values(grupos)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .map((g) => ({
        ...g,
        items: [...g.items].sort(
          (a, b) => ORDEN_MAQUINAS.indexOf(a.maquina) - ORDEN_MAQUINAS.indexOf(b.maquina)
        ),
      }));
  }, [precios]);

  const nombrePrincipal = listasGuardadas.length > 0
    ? listasGuardadas[0].nombre
    : new Date()
        .toLocaleDateString("es-AR", { month: "long", year: "numeric" })
        .replace(" de ", "-");

  const fechaPrincipal = listasGuardadas.length > 0
    ? new Date(listasGuardadas[0].fecha).toLocaleDateString("es-AR")
    : null;

  const listasHistoricas = listasGuardadas.slice(1);

  const exportarExcel = () => {
    const headers = ["% Teórico", "Máquina", "Completo", "Sin Gasoil", "% Real"];
    const colLetters = ["A", "B", "C", "D", "E"];

    const filas = [
      ["100%", "PC200", completoPC200 || null, sinGasoilPC200 || null, completoPC200 ? "100%" : "-"],
      ["45%", "Retropala", completoRetropala || null, sinGasoilRetropala || null, completoPC200 && completoRetropala ? `${((completoRetropala / completoPC200) * 100).toFixed(0)}%` : "-"],
      ["70%", "Pala cargadora", completoPala || null, sinGasoilPala || null, completoPC200 && completoPala ? `${((completoPala / completoPC200) * 100).toFixed(0)}%` : "-"],
      ["75%", "Motoniveladora", completoMotoniveladora || null, sinGasoilMotoniveladora || null, completoPC200 && completoMotoniveladora ? `${((completoMotoniveladora / completoPC200) * 100).toFixed(0)}%` : "-"],
      ["60%", "Camión batea (hora)", completoCamionBatea || null, null, completoPC200 && completoCamionBatea ? `${((completoCamionBatea / completoPC200) * 100).toFixed(0)}%` : "-"],
      ["385%", "Carretón grande (hasta 50 km)", completoCarretonGrande || null, null, completoPC200 && completoCarretonGrande ? `${((completoCarretonGrande / completoPC200) * 100).toFixed(0)}%` : "-"],
      ["300%", "Carretón chico - mínimo (hasta 50 km)", completoCarretonChico || null, null, completoPC200 && completoCarretonChico ? `${((completoCarretonChico / completoPC200) * 100).toFixed(0)}%` : "-"],
      ["5%", "Viaje batea x Km (mínimo 50km)", completoViajeBatea || null, null, completoPC200 && completoViajeBatea ? `${((completoViajeBatea / completoPC200) * 100).toFixed(0)}%` : "-"],
    ];

    const ws = {};

    const centerAlign = { horizontal: "center", vertical: "center" };
    const leftAlign = { horizontal: "left", vertical: "center" };
    const titulo = `Precios - ${nombrePrincipal}${fechaPrincipal ? ` (${fechaPrincipal})` : ""}`;

    // Fila 1: título
    ws["A1"] = {
      v: titulo,
      t: "s",
      s: { font: { bold: true, sz: 14 }, alignment: leftAlign },
    };

    // Fila 3: headers con negrita y centrado (fila 2 vacía como espacio)
    headers.forEach((h, i) => {
      const cell = `${colLetters[i]}3`;
      ws[cell] = { v: h, t: "s", s: { font: { bold: true }, alignment: centerAlign } };
    });

    // Filas desde la 4: formato moneda en columnas C y D, todas centradas
    const currencyFmt = '"$"#,##0.00';
    filas.forEach((fila, rowIdx) => {
      fila.forEach((val, colIdx) => {
        const cell = `${colLetters[colIdx]}${rowIdx + 4}`;
        const isCurrency = (colIdx === 2 || colIdx === 3) && val !== null;
        ws[cell] = {
          v: val ?? "-",
          t: isCurrency ? "n" : "s",
          s: { alignment: centerAlign, ...(isCurrency ? { numFmt: currencyFmt } : {}) },
          ...(isCurrency ? { z: currencyFmt } : {}),
        };
      });
    });

    ws["!ref"] = `A1:E${filas.length + 3}`;
    ws["!cols"] = [{ wch: 10 }, { wch: 38 }, { wch: 16 }, { wch: 16 }, { wch: 10 }];

    const libro = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(libro, ws, "Precios");
    XLSXStyle.writeFile(libro, `Precios_${nombrePrincipal}.xlsx`);
  };

  return (
    <>
      <div className="w-75 mx-auto my-2">
      <div className="position-relative d-flex align-items-center mb-2">
        <h6 className="mb-0 w-100 text-center">
          Precios - {nombrePrincipal}{fechaPrincipal ? <span className="fw-normal"> ({fechaPrincipal})</span> : ""}
        </h6>
        <div className="position-absolute end-0 d-flex gap-2">
          <Button size="sm" variant="outline-primary" onClick={onCrearLista}>
            Crear lista precios
          </Button>
          <Button size="sm" variant="outline-secondary" onClick={() => setShowHistorial(true)}>
            Historial
          </Button>
        </div>
      </div>

      <div className="d-flex justify-content-end gap-2 mb-3">
        <Button size="sm" variant="outline-warning" onClick={onAbrirConsumos}>
          Consumos gasoil
        </Button>
        <Button size="sm" variant="outline-light" onClick={exportarExcel}>
          Excel
        </Button>
        <Button size="sm" variant="outline-success" onClick={() => navigate(-1)}>
          Volver
        </Button>
      </div>

      <div>
        <Table striped bordered hover className="text-center align-middle">
          <thead className="table-dark">
            <tr>
              <th>% Teórico</th>
              <th>Máquina</th>
              <th>Completo</th>
              <th>Sin Gasoil</th>
              <th>% Real</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>100%</td>
              <td>PC200</td>
              <td>
                {completoPC200
                  ? Number(completoPC200).toLocaleString("es-AR", {
                      style: "currency",
                      currency: "ARS",
                    })
                  : "-"}
              </td>
              <td>
                {sinGasoilPC200
                  ? Number(sinGasoilPC200).toLocaleString("es-AR", {
                      style: "currency",
                      currency: "ARS",
                    })
                  : "-"}
              </td>
              <td>
                {completoPC200
                  ? `${((completoPC200 / completoPC200) * 100).toFixed(0)}%`
                  : "-"}
              </td>
              <td>
                <Button size="sm" variant="outline-success" onClick={() => onVerDetalle("PC200")}>
                  Ver
                </Button>
              </td>
            </tr>
            <tr>
              <td>45%</td>
              <td>Retropala</td>
              <td>
                {completoRetropala
                  ? Number(completoRetropala).toLocaleString("es-AR", {
                      style: "currency",
                      currency: "ARS",
                    })
                  : "-"}
              </td>
              <td>
                {sinGasoilRetropala
                  ? Number(sinGasoilRetropala).toLocaleString("es-AR", {
                      style: "currency",
                      currency: "ARS",
                    })
                  : "-"}
              </td>
              <td>
                {completoPC200 && completoRetropala
                  ? `${((completoRetropala / completoPC200) * 100).toFixed(0)}%`
                  : "-"}
              </td>
              <td>
                <Button size="sm" variant="outline-success" onClick={() => onVerDetalle("Retropala")}>
                  Ver
                </Button>
              </td>
            </tr>
            <tr>
              <td>70%</td>
              <td>Pala cargadora</td>
              <td>
                {completoPala
                  ? Number(completoPala).toLocaleString("es-AR", {
                      style: "currency",
                      currency: "ARS",
                    })
                  : "-"}
              </td>
              <td>
                {sinGasoilPala
                  ? Number(sinGasoilPala).toLocaleString("es-AR", {
                      style: "currency",
                      currency: "ARS",
                    })
                  : "-"}
              </td>
              <td>
                {completoPC200 && completoPala
                  ? `${((completoPala / completoPC200) * 100).toFixed(0)}%`
                  : "-"}
              </td>
              <td>
                <Button size="sm" variant="outline-success" onClick={() => onVerDetalle("Pala cargadora")}>
                  Ver
                </Button>
              </td>
            </tr>
            <tr>
              <td>75%</td>
              <td>Motoniveladora</td>
              <td>
                {completoMotoniveladora
                  ? Number(completoMotoniveladora).toLocaleString("es-AR", {
                      style: "currency",
                      currency: "ARS",
                    })
                  : "-"}
              </td>
              <td>
                {sinGasoilMotoniveladora
                  ? Number(sinGasoilMotoniveladora).toLocaleString("es-AR", {
                      style: "currency",
                      currency: "ARS",
                    })
                  : "-"}
              </td>
              <td>
                {completoPC200 && completoMotoniveladora
                  ? `${((completoMotoniveladora / completoPC200) * 100).toFixed(0)}%`
                  : "-"}
              </td>
              <td>
                <Button size="sm" variant="outline-success" onClick={() => onVerDetalle("Motoniveladora")}>
                  Ver
                </Button>
              </td>
            </tr>
            <tr>
              <td>60%</td>
              <td>Camión batea (hora)</td>
              <td>
                {completoCamionBatea
                  ? Number(completoCamionBatea).toLocaleString("es-AR", {
                      style: "currency",
                      currency: "ARS",
                    })
                  : "-"}
              </td>
              <td>-</td>
              <td>
                {completoPC200 && completoCamionBatea
                  ? `${((completoCamionBatea / completoPC200) * 100).toFixed(0)}%`
                  : "-"}
              </td>
              <td>
                <Button size="sm" variant="outline-success" onClick={() => onVerDetalle("Camión batea")}>
                  Ver
                </Button>
              </td>
            </tr>
            <tr>
              <td>385%</td>
              <td>Carretón grande (hasta 50 km)</td>
              <td>
                {completoCarretonGrande
                  ? Number(completoCarretonGrande).toLocaleString("es-AR", {
                      style: "currency",
                      currency: "ARS",
                    })
                  : "-"}
              </td>
              <td>-</td>
              <td>
                {completoPC200 && completoCarretonGrande
                  ? `${((completoCarretonGrande / completoPC200) * 100).toFixed(0)}%`
                  : "-"}
              </td>
              <td>
                <Button size="sm" variant="outline-success" onClick={() => onVerDetalle("Carretón grande")}>
                  Ver
                </Button>
              </td>
            </tr>
            <tr>
              <td>300%</td>
              <td>Carretón chico - mínimo (hasta 50 km)</td>
              <td>
                {completoCarretonChico
                  ? Number(completoCarretonChico).toLocaleString("es-AR", {
                      style: "currency",
                      currency: "ARS",
                    })
                  : "-"}
              </td>
              <td>-</td>
              <td>
                {completoPC200 && completoCarretonChico
                  ? `${((completoCarretonChico / completoPC200) * 100).toFixed(0)}%`
                  : "-"}
              </td>
              <td>
                <div className="d-flex gap-1 justify-content-center">
                  <Button size="sm" variant="outline-success" onClick={() => onVerDetalle("Carretón chico")}>
                    Ver
                  </Button>
                  <Button size="sm" variant="outline-primary" onClick={onCotizarCarreton}>
                    Cotizar
                  </Button>
                </div>
              </td>
            </tr>
            <tr>
              <td>5%</td>
              <td>Viaje batea x Km (mínimo 50km)</td>
              <td>
                {completoViajeBatea
                  ? Number(completoViajeBatea).toLocaleString("es-AR", {
                      style: "currency",
                      currency: "ARS",
                    })
                  : "-"}
              </td>
              <td>-</td>
              <td>
                {completoPC200 && completoViajeBatea
                  ? `${((completoViajeBatea / completoPC200) * 100).toFixed(0)}%`
                  : "-"}
              </td>
              <td>
                <div className="d-flex gap-1 justify-content-center">
                  <Button size="sm" variant="outline-success" onClick={() => onVerDetalle("Viaje batea")}>
                    Ver
                  </Button>
                  <Button size="sm" variant="outline-primary" onClick={onCotizarBatea}>
                    Cotizar
                  </Button>
                </div>
              </td>
            </tr>
          </tbody>
        </Table>
      </div>
      </div>

      <HistorialPreciosModal
        show={showHistorial}
        onHide={() => setShowHistorial(false)}
        listas={listasHistoricas}
        onBorrarLista={onBorrarLista}
      />
    </>
  );
};

export default PreciosTabla;
