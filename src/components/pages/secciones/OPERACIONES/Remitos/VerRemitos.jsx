import { useEffect, useState } from "react";
import { Table, Button, Modal, Spinner, Form } from "react-bootstrap";
import XLSXStyle from "xlsx-js-style";
import { useLocation, useNavigate } from "react-router-dom";
import RemitosModal from "./RemitosModal";
import Swal from "sweetalert2";
import "bootstrap-icons/font/bootstrap-icons.css";
import {
  listarRemitosPorObra,
  eliminarRemito,
  eliminarItemRemito,
} from "../../../../../helpers/queriesRemitos";
import { obtenerObra } from "../../../../../helpers/queriesObras";

import "../../../../../styles/verRemitos.css";

const VerRemitos = () => {
  const [itemEditando, setItemEditando] = useState(null);
  const [remitoEditando, setRemitoEditando] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { obraId, obraNombre, razonsocial, modalidad } = location.state || {};

  const [loading, setLoading] = useState(true);
  const [remitos, setRemitos] = useState([]);
  const [filtroRemito, setFiltroRemito] = useState("");
  const [precios, setPrecios] = useState(location.state?.precios || []);
  const [showModalRemito, setShowModalRemito] = useState(false);
  const [obsSeleccionada, setObsSeleccionada] = useState("");

  const cargarRemitos = async () => {
    if (!obraId) return;

    try {
      const data = await listarRemitosPorObra(obraId);
      setRemitos(data || []);
    } catch (error) {
      console.error("ERROR AL CARGAR REMITOS:", error);
      setRemitos([]);
    } finally {
      setLoading(false);
    }
  };

  const cargarPrecios = async () => {
    if (!obraId) return;
    try {
      const obra = await obtenerObra(obraId);
      if (obra?.precio) setPrecios(obra.precio);
    } catch (error) {
      console.error("Error al cargar precios:", error);
    }
  };

  useEffect(() => {
    cargarRemitos();
    cargarPrecios();
  }, [obraId]);

  const handleEditarItem = (remito, item) => {
    setItemEditando({
      ...item,
      fecha: item.fecha || remito.fecha,
    });
    setRemitoEditando({ ...remito });
    setShowModalRemito(true);
  };

  const handleEliminarItem = async (remitoId, itemId) => {
    const result = await Swal.fire({
      title: "¿Seguro querés borrar este remito?",

      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: 'swal-btn-danger' },
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    const remitoPadre = remitos.find((r) => r._id === remitoId);

    if (remitoPadre.items.length === 1) {
      await eliminarRemito(remitoId);
    } else {
      await eliminarItemRemito(remitoId, itemId);
    }

    await Swal.fire({
      icon: "success",
      title: "Eliminado",
      timer: 1000,
      showConfirmButton: false,
    });

    cargarRemitos();
  };

  if (!obraId) return <p>Obra no seleccionada.</p>;
  if (loading) return <Spinner animation="border" className="d-block mx-auto my-5" />;

  const formatoMiles = (valor) => {
    if (valor === undefined || valor === null) return "-";
    return new Intl.NumberFormat("es-AR").format(valor);
  };

  const calcularTotalNoFacturado = () => {
    return remitos
      .filter((remito) => remito.estado === "Sin facturar")
      .reduce((total, remito) => {
        const subtotalRemito = remito.items.reduce((sum, item) => {
          return sum + item.cantidad * item.precioUnitario;
        }, 0);
        return total + subtotalRemito;
      }, 0);
  };
  // Calcula el total absoluto de todos los remitos cargados
  const calcularTotalObra = () => {
    return remitos.reduce((total, remito) => {
      const subtotalRemito = remito.items.reduce((sum, item) => {
        return sum + item.cantidad * item.precioUnitario;
      }, 0);
      return total + subtotalRemito;
    }, 0);
  };

  const totalObra = calcularTotalObra();

  const calcularTotalGasoil = () => {
    return remitos.reduce((total, remito) => {
      const gasoilRemito = (remito.items || []).reduce(
        (acc, item) => acc + Number(item.gasoil || 0),
        0,
      );
      return total + gasoilRemito;
    }, 0);
  };

  const totalGasoil = calcularTotalGasoil();

  const mostrarFechaDMY = (fecha) => {
    if (!fecha) return "-";
    const soloFecha = fecha.toString().slice(0, 10);
    const [y, m, d] = soloFecha.split("-");
    if (!y || !m || !d) return "-";
    return `${d}-${m}-${y}`;
  };

  const totalNoFacturado = calcularTotalNoFacturado();

  const estiloX = {
    position: "absolute",
    right: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    cursor: "pointer",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "900",
    zIndex: 5,
    userSelect: "none",
  };
  const selectActivo = { backgroundImage: "none" };

  const remitosUnicos = [...new Set(remitos.map((r) => r.remito).filter(Boolean))].sort((a, b) => a - b);
  const remitosFiltrados = filtroRemito ? remitos.filter((r) => String(r.remito) === filtroRemito) : remitos;

  const exportarExcel = () => {
    const headers = ["N° Remito", "Fecha", "Maquinista", "$/hs Maquinista", "Máquina", "Servicio", "Cantidad", "Unidad", "$ Unitario", "$ Total", "Estado", "Gasoil (lts)"];
    const cols = ["A","B","C","D","E","F","G","H","I","J","K","L"];
    const currencyFmt = '"$"#,##0.00';
    const centerAlign = { horizontal: "center", vertical: "center" };
    const leftAlign = { horizontal: "left", vertical: "center" };
    const colWidths = [12, 12, 18, 14, 16, 16, 10, 10, 14, 14, 14, 12];

    const filas = remitos.flatMap((remito) =>
      remito.items.map((item) => [
        remito.remito,
        mostrarFechaDMY(item.fecha || remito.fecha),
        item.personal || "-",
        item.costoHoraPersonal || null,
        item.maquina || "-",
        item.servicio || "-",
        item.cantidad,
        item.unidad,
        item.precioUnitario,
        item.cantidad * item.precioUnitario,
        remito.estado,
        item.gasoil || "-",
      ])
    );

    const ws = {};
    const mergeAll = (row) => ({ s: { r: row - 1, c: 0 }, e: { r: row - 1, c: cols.length - 1 } });

    // Fila 1: título
    ws["A1"] = { v: "LISTADO DE REMITOS", t: "s", s: { font: { bold: true, sz: 14 }, alignment: leftAlign } };
    // Fila 2: razón social
    ws["A2"] = { v: `Razón Social: ${razonsocial}`, t: "s", s: { font: { bold: true }, alignment: leftAlign } };
    // Fila 3: obra
    ws["A3"] = { v: `Obra: ${obraNombre}`, t: "s", s: { font: { bold: true }, alignment: leftAlign } };
    // Fila 4: vacía, Fila 5: headers

    headers.forEach((h, i) => {
      ws[`${cols[i]}5`] = { v: h, t: "s", s: { font: { bold: true }, alignment: centerAlign } };
    });

    // Filas desde la 6: datos
    // Columnas con moneda: D(3)=$ Hora, I(8)=$ Unitario, J(9)=$ Total
    const currencyCols = new Set([3, 8, 9]);
    filas.forEach((fila, rowIdx) => {
      fila.forEach((val, colIdx) => {
        const isCurrency = currencyCols.has(colIdx) && val !== null && val !== "-";
        ws[`${cols[colIdx]}${rowIdx + 6}`] = {
          v: val ?? "-",
          t: isCurrency ? "n" : typeof val === "number" ? "n" : "s",
          s: { alignment: centerAlign, ...(isCurrency ? { numFmt: currencyFmt } : {}) },
          ...(isCurrency ? { z: currencyFmt } : {}),
        };
      });
    });

    ws["!ref"] = `A1:${cols[cols.length - 1]}${filas.length + 5}`;
    ws["!cols"] = colWidths.map((wch) => ({ wch }));

    const libro = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(libro, ws, "Remitos");
    XLSXStyle.writeFile(libro, `Remitos_${obraNombre}.xlsx`);
  };

  return (
    <div className="container my-3">
      <div className="">
        <h4 className="text-center">
          <span className="border-bottom border-gray border-2 pb-1">
            LISTADO DE REMITOS
          </span>
        </h4>
      </div>
      <div className="row align-items-center mb-3">
        <div className="col-4">
          <h4>
            Razón social: <span className="nombreTitulos">{razonsocial}</span>
          </h4>
          <h4>
            Obra: <span className="nombreTitulos">{obraNombre}</span>
          </h4>
        </div>

        <div className="col-4 text-center my-4">
          {/* NUEVO: Total Obra */}
          <h4>
            Total Obra:{" "}
            <span className="text-gray">${formatoMiles(totalObra)} + iva</span>
          </h4>

          {/* EXISTENTE: Total sin facturar */}
          <h5>
            Total sin facturar:{" "}
            <span className="text-gray">
              ${formatoMiles(totalNoFacturado)} + iva
            </span>
          </h5>
        </div>

        <div className="col-4 d-flex flex-column gap-2 align-items-end">
          <div className="d-flex gap-2">
            <Button variant="outline-light" onClick={exportarExcel}>Excel</Button>
            <Button variant="outline-success" onClick={() => navigate(-1)}>Volver</Button>
          </div>
          <Button variant="outline-primary" onClick={() => setShowModalRemito(true)}>
            Cargar Remito
          </Button>
        </div>
      </div>
      <div className="mb-2" style={{ marginTop: "-0.5rem" }}>
        <div style={{ position: "relative", width: "180px" }}>
          <Form.Select
            value={filtroRemito}
            onChange={(e) => setFiltroRemito(e.target.value)}
            style={filtroRemito ? selectActivo : {}}
          >
            <option value="">N° Remito</option>
            {remitosUnicos.map((n) => (
              <option key={n} value={String(n)}>N° {n}</option>
            ))}
          </Form.Select>
          {filtroRemito && (
            <span onClick={() => setFiltroRemito("")} style={estiloX}>✕</span>
          )}
        </div>
      </div>

      <div className="table-responsive">
        <Table striped bordered hover className="align-middle text-center">
          <thead className="table-dark">
            <tr>
              <th>N° Remito</th>
              <th>Fecha</th>
              <th>Maquinista</th>
              <th>$/hs Maquinista</th>
              <th>Máquina</th>
              <th>Servicio</th>
              <th>Cant.</th>
              <th>Unidad</th>
              <th>$ un</th>
              <th>$ total</th>
              <th>Estado</th>
              <th>Gasoil(lts)</th>
              <th>Observaciones</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {remitosFiltrados.length > 0 ? (
              remitosFiltrados.map((remito) =>
                remito.items.map((item, index) => (
                  <tr key={`${remito._id}-${item._id}`}>
                    <td>{remito.remito}</td>
                    <td className="fecha-col">
                      {mostrarFechaDMY(item.fecha || remito.fecha)}
                    </td>

                    <td>{item.personal || "-"}</td>
                    <td>{item.costoHoraPersonal ? `$${formatoMiles(item.costoHoraPersonal)}` : "-"}</td>
                    <td>{item.maquina || "-"}</td>
                    <td>{item.servicio || "-"}</td>
                    <td>{item.cantidad}</td>
                    <td>{item.unidad}</td>
                    <td>{item.precioUnitario ? `$${formatoMiles(item.precioUnitario)}` : "Sin definir"}</td>
                    <td>
                      {item.precioUnitario ? `$${formatoMiles(item.cantidad * item.precioUnitario)}` : "Sin definir"}
                    </td>
                    <td>{remito.estado}</td>
                    <td>{item.gasoil || "-"}</td>
                    <td>
                      {item.observaciones ? (
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={() => setObsSeleccionada(item.observaciones)}
                        >
                          Ver
                        </Button>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      <div className="d-flex justify-content-center gap-1">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleEliminarItem(remito._id, item._id)}
                        >
                          Borrar
                        </Button>
                        <Button
                          variant="outline-warning"
                          size="sm"
                          onClick={() => handleEditarItem(remito, item)}
                        >
                          Editar
                        </Button>
                      </div>
                    </td>
                  </tr>
                )),
              )
            ) : (
              <tr>
                <td colSpan="14">No hay remitos</td>
              </tr>
            )}
          </tbody>

          <tfoot>
            <tr>
              <td colSpan={11} className="text-end">
                Total Gasoil:
              </td>
              <td>{formatoMiles(totalGasoil)} lts</td>
              <td></td>
            </tr>
          </tfoot>
        </Table>
      </div>

      <RemitosModal
        show={showModalRemito}
        onCancel={() => {
          setShowModalRemito(false);
          setItemEditando(null);
          setRemitoEditando(null);
        }}
        obra={{
          _id: obraId,
          nombreobra: obraNombre,
          razonsocial,
          precio: precios,
          modalidad,
        }}
        itemEditando={itemEditando}
        remitoEditando={remitoEditando}
        onCreated={(remitoActualizado) => {
          if (remitoActualizado) {
            setRemitos((prev) =>
              prev.map((r) =>
                r._id === remitoActualizado._id ? remitoActualizado : r,
              ),
            );
          } else {
            cargarRemitos(); // fallback (crear remito)
          }

          setShowModalRemito(false);
          setItemEditando(null);
          setRemitoEditando(null);
        }}
      />

      <Modal
        show={!!obsSeleccionada}
        onHide={() => setObsSeleccionada("")}
        centered
      >
        <Modal.Header closeButton className="border-bottom border-warning">
          <Modal.Title>Observaciones</Modal.Title>
        </Modal.Header>
        <Modal.Body>{obsSeleccionada}</Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setObsSeleccionada("")}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default VerRemitos;
