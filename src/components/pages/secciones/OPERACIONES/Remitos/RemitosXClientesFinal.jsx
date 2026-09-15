import { useEffect, useRef, useState, useMemo } from "react";
import { Table, Button, Modal, Form, Dropdown } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import { listarRemitosPorObra, editarRemito } from "../../../../../helpers/queriesRemitos";
import { obtenerObra } from "../../../../../helpers/queriesObras";
import XLSXStyle from "xlsx-js-style";
import Swal from "sweetalert2";
import "../../../../../styles/verRemitos.css";

// Fecha efectiva del remito: la fecha de item más reciente (los items
// siempre tienen fecha; remito.fecha es opcional y suele venir vacío).
const fechaRemito = (r) => {
  const fechasItems = (r.items || [])
    .map((i) => (i.fecha || "").toString().slice(0, 10))
    .filter(Boolean);
  if (fechasItems.length) return fechasItems.sort().at(-1);
  return (r.fecha || "").toString().slice(0, 10);
};

// Fecha de cada fila (item) de la tabla, con la del remito como respaldo.
const fechaItemDe = (item, remito) =>
  (item.fecha || remito.fecha || "").toString().slice(0, 10);

const estiloX = {
  position: "absolute",
  right: "34px",
  top: "50%",
  transform: "translateY(-50%)",
  cursor: "pointer",
  color: "#fff",
  fontSize: "14px",
  fontWeight: "900",
  zIndex: 5,
  userSelect: "none",
};

const RemitosXClientesFinal = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { obraId, obraNombre, razonsocial } = location.state || {};

  const [remitos, setRemitos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroRemito, setFiltroRemito] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const headerRef = useRef(null);

  useEffect(() => {
    const main = document.querySelector("main");
    const footer = document.querySelector("footer");
    if (main) {
      const mainTop = main.getBoundingClientRect().top;
      const footerH = footer ? footer.offsetHeight + parseInt(window.getComputedStyle(footer).marginTop || "0") : 0;
      main.style.overflow = "hidden";
      main.style.display = "flex";
      main.style.flexDirection = "column";
      main.style.height = `calc(100vh - ${mainTop}px - ${footerH}px)`;
    }
    return () => {
      if (main) {
        main.style.overflow = "";
        main.style.display = "";
        main.style.flexDirection = "";
        main.style.height = "";
      }
    };
  }, []);
  const [totalObra, setTotalObra] = useState(0);
  const [todosLosRemitos, setTodosLosRemitos] = useState([]);
  const [modalidadState, setModalidadState] = useState("");
  const [precios, setPrecios] = useState([]);

  // Estados para Modal de O.C.
  const [showModalOC, setShowModalOC] = useState(false);
  const [ocInput, setOcInput] = useState("");
  const [selectedRemitoIds, setSelectedRemitoIds] = useState([]);

  const cargarRemitos = async () => {
    if (!obraId) return;
    try {
      const [data, obraRes] = await Promise.all([
        listarRemitosPorObra(obraId),
        obtenerObra(obraId)
      ]);

      setTodosLosRemitos(data || []);
      if (obraRes) {
        if (obraRes.modalidad) setModalidadState(obraRes.modalidad);
        if (obraRes.precio) setPrecios(obraRes.precio);
      }

      // 1. CALCULAMOS EL TOTAL OBRA (Con todos los remitos, facturados o no, excluyendo "Precio de la obra")
      const totalGlobal = (data || []).reduce((total, remito) => {
        const subtotalRemito = remito.items.reduce((sum, item) => {
          if (item.servicio === "Precio de la obra") return sum;
          return sum + item.cantidad * item.precioUnitario;
        }, 0);
        return total + subtotalRemito;
      }, 0);
      setTotalObra(totalGlobal);

      // 2. FILTRAMOS (Para mostrar en tabla solo los "Sin facturar")
      // Ordenados por fecha, del más nuevo al más antiguo.
      // La fecha real vive en los items (remito.fecha es opcional). Como un
      // remito puede tener muchos items con distintas fechas, ordenamos:
      //   a) los items dentro de cada remito (fecha desc)
      //   b) los remitos entre sí por su item más reciente (fecha desc)
      const fechaItem = (it) => (it?.fecha || "").toString().slice(0, 10);
      const soloPendientes = (data || [])
        .filter((r) => r.estado === "Sin facturar")
        .map((r) => ({
          ...r,
          items: [...(r.items || [])].sort((a, b) =>
            fechaItem(b).localeCompare(fechaItem(a))
          ),
        }))
        .sort((a, b) => fechaRemito(b).localeCompare(fechaRemito(a)));
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
  const totalNoFacturado = modalidadState === "Precio cerrado"
    ? (() => {
        const preciosArray = precios || [];
        const precioCerradoObj = preciosArray.find((p) => p.clasificacion === "Precio cerrado");
        const precioCerrado = precioCerradoObj ? Number(precioCerradoObj.precio || 0) : 0;
        const totalFacturado = todosLosRemitos.reduce((sum, r) => sum + (r.montoFacturado || 0), 0);
        return Math.max(0, precioCerrado - totalFacturado);
      })()
    : remitos.reduce((total, remito) => {
        const subtotalRemito = remito.items.reduce((sum, item) => {
          return sum + item.cantidad * item.precioUnitario;
        }, 0);
        return total + subtotalRemito;
      }, 0);

  // El filtro de N° es por coincidencia parcial, igual que en Remitos:
  // tipeando "90" aparecen el 90, el 900 y el 1902.
  // El rango de fechas filtra por la fecha de cada item (cada fila de la tabla);
  // un remito sin items dentro del rango no se muestra.
  const remitosFiltrados = useMemo(() => {
    const nro = filtroRemito.trim();
    const enRango = (f) =>
      (!fechaDesde || (f && f >= fechaDesde)) && (!fechaHasta || (f && f <= fechaHasta));
    return remitos
      .filter((r) => !nro || String(r.remito).includes(nro))
      .map((r) =>
        fechaDesde || fechaHasta
          ? { ...r, items: (r.items || []).filter((i) => enRango(fechaItemDe(i, r))) }
          : r,
      )
      .filter((r) => (r.items || []).length > 0);
  }, [remitos, filtroRemito, fechaDesde, fechaHasta]);

  const hayFiltros = !!(filtroRemito.trim() || fechaDesde || fechaHasta);

  // Totales de lo que está a la vista: $ total y cantidad agrupada por unidad
  const totalesFiltro = useMemo(() => {
    let importe = 0;
    const porUnidad = {};
    remitosFiltrados.forEach((r) => {
      (r.items || []).forEach((i) => {
        const cant = Number(i.cantidad || 0);
        importe += cant * Number(i.precioUnitario || 0);
        const unidad = i.unidad || "-";
        porUnidad[unidad] = (porUnidad[unidad] || 0) + cant;
      });
    });
    const unidades = Object.entries(porUnidad).filter(([, cant]) => cant);
    return { importe, unidades };
  }, [remitosFiltrados]);

  // En el modal de O.C. solo se ofrecen los remitos que todavía no tienen
  // una O.C. asignada (los ya asignados no se vuelven a listar).
  const remitosSinOC = remitos.filter((r) => !String(r.oc || "").trim());

  const handleSaveOC = async () => {
    if (!ocInput.trim() || selectedRemitoIds.length === 0) return;
    try {
      setLoading(true);
      await Promise.all(
        selectedRemitoIds.map((id) => editarRemito(id, { oc: ocInput.trim() }))
      );
      setShowModalOC(false);
      await Swal.fire({
        icon: "success",
        title: "O.C. Asignada",
        text: `Se asignó la O.C. ${ocInput} a los remitos seleccionados.`,
        timer: 2000,
        showConfirmButton: false,
      });
      cargarRemitos();
    } catch (error) {
      console.error("Error al guardar O.C.:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo asignar la O.C. a los remitos.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOC = async () => {
    if (selectedRemitoIds.length === 0) return;
    const confirm = await Swal.fire({
      title: "¿Borrar O.C.?",
      text: `Se eliminará la O.C. de los ${selectedRemitoIds.length} remito(s) seleccionado(s).`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
      customClass: { confirmButton: 'swal-btn-danger' }
    });

    if (!confirm.isConfirmed) return;

    try {
      setLoading(true);
      await Promise.all(
        selectedRemitoIds.map((id) => editarRemito(id, { oc: "" }))
      );
      setShowModalOC(false);
      await Swal.fire({
        icon: "success",
        title: "O.C. Eliminada",
        text: "Se eliminó la O.C. de los remitos seleccionados.",
        timer: 2000,
        showConfirmButton: false,
      });
      cargarRemitos();
    } catch (error) {
      console.error("Error al borrar O.C.:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo eliminar la O.C. de los remitos.",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportarExcel = () => {
    const headers = ["N° Remito", "Fecha", "Maquinista", "Máquina", "Servicio", "Cantidad", "Unidad", "$ Unitario", "$ Total", "O.C."];
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
        remito.oc || "-",
      ])
    );

    const ws = {};
    ws["A1"] = { v: "REMITOS SIN FACTURAR", t: "s", s: { font: { bold: true, sz: 14 }, alignment: leftAlign } };
    ws["A2"] = { v: `Fecha: ${new Date().toLocaleDateString("es-AR")}`, t: "s", s: { alignment: leftAlign } };
    ws["A3"] = { v: `Razón Social: ${razonsocial}`, t: "s", s: { font: { bold: true }, alignment: leftAlign } };
    ws["A4"] = { v: `Obra: ${obraNombre}`, t: "s", s: { font: { bold: true }, alignment: leftAlign } };

    headers.forEach((h, i) => {
      ws[`${cols[i]}6`] = { v: h, t: "s", s: { font: { bold: true }, alignment: centerAlign } };
    });

    const currencyCols = new Set([7, 8]); // $ Unitario y $ Total
    filas.forEach((fila, rowIdx) => {
      fila.forEach((val, colIdx) => {
        const isCurrency = currencyCols.has(colIdx) && typeof val === "number";
        ws[`${cols[colIdx]}${rowIdx + 7}`] = {
          v: val ?? "-",
          t: isCurrency ? "n" : typeof val === "number" ? "n" : "s",
          s: { alignment: centerAlign, ...(isCurrency ? { numFmt: currencyFmt } : {}) },
          ...(isCurrency ? { z: currencyFmt } : {}),
        };
      });
    });

    ws["!ref"] = `A1:K${filas.length + 6}`;
    ws["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];

    const libro = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(libro, ws, "Sin facturar");
    XLSXStyle.writeFile(libro, `SinFacturar_${obraNombre}.xlsx`);
  };

  if (!obraId)
    return <div className="mt-5">Obra no seleccionada.</div>;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
      <div className="container" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
        <div ref={headerRef} className="pt-2 pb-1">
          <h6 className="text-center mb-2">Remitos sin facturar <small className="text-muted">(sin iva)</small></h6>
          <div className="row align-items-center mb-2">
            <div className="col-4">
              <h6 className="mb-1">Razón social: <span className="titulosLetras">{razonsocial}</span></h6>
              <h6 className="mb-0">Obra: <span className="titulosLetras">{obraNombre}</span></h6>
            </div>
            <div className="col-4 text-center">
              <h6 className="mb-1">
                {modalidadState === "Precio cerrado" ? "Total obra propia" : "Total Obra"}:{" "}
                <span className="text-gray">${formatoMiles(totalObra)} + iva</span>
              </h6>
              <h6 className="mb-0">Sin facturar: <span className="text-gray">${formatoMiles(totalNoFacturado)} + iva</span></h6>
            </div>
            <div className="col-4 text-end d-flex gap-2 justify-content-end">
              <Button size="sm" variant="outline-light" onClick={exportarExcel}>Excel</Button>
              <Button size="sm" variant="outline-primary" onClick={() => {
                setOcInput("");
                setSelectedRemitoIds([]);
                setShowModalOC(true);
              }}>O.C.</Button>
              <Button size="sm" variant="outline-success" onClick={() => navigate(-1)}>Volver</Button>
            </div>
          </div>
        </div>

        <div className="d-flex flex-wrap gap-2 mb-2 align-items-center">
          <Form.Control
            size="sm"
            type="search"
            placeholder="N° Remito..."
            value={filtroRemito}
            onChange={(e) => setFiltroRemito(e.target.value)}
            style={{ width: "170px" }}
          />
          <span className="small text-muted ms-2">Desde</span>
          <div style={{ position: "relative", width: "170px" }}>
            <Form.Control
              size="sm"
              type="date"
              value={fechaDesde}
              max={fechaHasta || undefined}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
            {fechaDesde && (
              <span onClick={() => setFechaDesde("")} style={estiloX}>✕</span>
            )}
          </div>
          <span className="small text-muted">Hasta</span>
          <div style={{ position: "relative", width: "170px" }}>
            <Form.Control
              size="sm"
              type="date"
              value={fechaHasta}
              min={fechaDesde || undefined}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
            {fechaHasta && (
              <span onClick={() => setFechaHasta("")} style={estiloX}>✕</span>
            )}
          </div>
        </div>

        <div className="table-responsive shadow-sm" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          <Table striped bordered hover className="align-middle text-center tabla-remitos">
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
                <th>O.C.</th>
              </tr>
            </thead>
            <tbody>
              {remitosFiltrados.length > 0 ? (
                remitosFiltrados.map((remito) =>
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
                      <td>${formatoMiles(item.cantidad * item.precioUnitario)}</td>
                      <td>{remito.oc || "-"}</td>
                    </tr>
                  ))
                )
              ) : (
                <tr>
                  <td colSpan="10" className="py-4 text-muted">
                    {hayFiltros
                      ? "No hay remitos sin facturar con esos filtros."
                      : "No hay remitos pendientes de facturación para esta obra."}
                  </td>
                </tr>
              )}
            </tbody>
            {remitosFiltrados.length > 0 && (
              <tfoot className="table-dark">
                <tr>
                  <td colSpan={5} className="text-end fw-bold">
                    Total ({remitosFiltrados.length} remito{remitosFiltrados.length === 1 ? "" : "s"}):
                  </td>
                  {totalesFiltro.unidades.length > 1 ? (
                    <td colSpan={2} className="fw-bold">
                      {totalesFiltro.unidades
                        .map(([unidad, cant]) => `${formatoMiles(cant)} ${unidad}`)
                        .join(" / ")}
                    </td>
                  ) : (
                    <>
                      <td className="fw-bold">
                        {totalesFiltro.unidades.length ? formatoMiles(totalesFiltro.unidades[0][1]) : "-"}
                      </td>
                      <td className="fw-bold">{totalesFiltro.unidades[0]?.[0] || "-"}</td>
                    </>
                  )}
                  <td></td>
                  <td className="fw-bold">${formatoMiles(totalesFiltro.importe)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </Table>
        </div>

        {/* Modal para O.C. */}
        <Modal show={showModalOC} onHide={() => setShowModalOC(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Asignar Orden de Compra (O.C.)</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Número de O.C.</Form.Label>
              <Form.Control
                type="text"
                placeholder="Ingrese el número de O.C..."
                value={ocInput}
                onChange={(e) => setOcInput(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="d-block">Seleccionar Remitos</Form.Label>
              <Dropdown onSelect={(e) => e.preventDefault()}>
                <Dropdown.Toggle variant="outline-light" id="dropdown-remitos-oc" className="w-100 text-start d-flex justify-content-between align-items-center">
                  {selectedRemitoIds.length === 0
                    ? "Seleccionar remitos..."
                    : `${selectedRemitoIds.length} remito(s) seleccionado(s)`}
                </Dropdown.Toggle>

                <Dropdown.Menu className="w-100" style={{ maxHeight: "250px", overflowY: "auto" }}>
                  {remitosSinOC.length === 0 ? (
                    <Dropdown.Item disabled>No hay remitos sin O.C. asignada</Dropdown.Item>
                  ) : (
                    remitosSinOC.map((r) => {
                      const isChecked = selectedRemitoIds.includes(r._id);
                      const totalRemito = r.items.reduce((sum, item) => sum + item.cantidad * item.precioUnitario, 0);
                      return (
                        <div key={r._id} className="dropdown-item d-flex align-items-center gap-2" style={{ cursor: "pointer" }} onClick={(e) => {
                          e.stopPropagation();
                          if (isChecked) {
                            setSelectedRemitoIds(selectedRemitoIds.filter((id) => id !== r._id));
                          } else {
                            setSelectedRemitoIds([...selectedRemitoIds, r._id]);
                          }
                        }}>
                          <Form.Check
                            type="checkbox"
                            id={`dd-remito-${r._id}`}
                            checked={isChecked}
                            onChange={() => {}}
                            label={`Remito N° ${r.remito} (${mostrarFechaDMY(r.fecha)}) - $${formatoMiles(totalRemito)}`}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      );
                    })
                  )}
                </Dropdown.Menu>
              </Dropdown>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="justify-content-between">
            <Button variant="outline-secondary" onClick={() => setShowModalOC(false)}>
              Cancelar
            </Button>
            <div className="d-flex gap-2">
              <Button
                variant="outline-danger"
                onClick={handleDeleteOC}
                disabled={selectedRemitoIds.length === 0}
              >
                Borrar O.C.
              </Button>
              <Button
                variant="outline-success"
                onClick={handleSaveOC}
                disabled={!ocInput.trim() || selectedRemitoIds.length === 0}
              >
                Asignar O.C.
              </Button>
            </div>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
};

export default RemitosXClientesFinal;