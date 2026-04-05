import { useState, useEffect } from "react";
import XLSXStyle from "xlsx-js-style";
import {
  listarGastosPorObra,
  borrarGastoAPI,
} from "../../../../../helpers/queriesGastos.js";
import { listarRemitosPorObra } from "../../../../../helpers/queriesRemitos.js";
import { listarPersonal } from "../../../../../helpers/queriesPersonal.js";
import { Table, Button, Modal } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import GastoModal from "./GastoModal";

const buscarPrecioVigente = (precios, clasificacion, trabajo, fechaRef) => {
  const candidatos = precios.filter(
    (p) => p.clasificacion === clasificacion && (!trabajo || p.trabajo === trabajo)
  );
  if (candidatos.length === 0) return null;
  if (candidatos.length === 1) return candidatos[0];

  const fechaReferencia = new Date(fechaRef);
  const vigentes = candidatos
    .filter((p) => p.fecha && new Date(p.fecha) <= fechaReferencia)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  return vigentes.length > 0 ? vigentes[0] : candidatos[0];
};

const GastoTabla = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};

  const obraId = state.obraId || state._id;
  const obraNombre = state.obraNombre || state.nombreobra || "Obra";
  const razonsocial = state.razonsocial || state.cliente || "-";

  const [gastos, setGastos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [gastoEditar, setGastoEditar] = useState(null);

  const preciosObra = state.precios || [];

  const [infoGasoil, setInfoGasoil] = useState({
    cantidad: 0,
    precio: 0,
    total: 0,
  });

  const [cargasGasoil, setCargasGasoil] = useState([]);
  const [listaMaquinistas, setListaMaquinistas] = useState([]);

  const [showVerGasoil, setShowVerGasoil] = useState(false);
  const [showVerMaquinista, setShowVerMaquinista] = useState(false);
  const [maquinistaVer, setMaquinistaVer] = useState(null);
  const [showVerGasto, setShowVerGasto] = useState(false);
  const [gastoVer, setGastoVer] = useState(null);

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obraId]);

  const cargarDatos = async () => {
    if (!obraId) {
      Swal.fire("Error", "No se detectó la obra", "error").then(() =>
        navigate(-1)
      );
      return;
    }

    try {
      const [remitos, respuestaPersonal, respuestaGastos] = await Promise.all([
        listarRemitosPorObra(obraId),
        listarPersonal(),
        listarGastosPorObra(obraId),
      ]);

      let personalDB = [];
      if (respuestaPersonal.ok) {
        personalDB = await respuestaPersonal.json();
      }

      if (respuestaGastos.ok) {
        const datosGastos = await respuestaGastos.json();
        setGastos(datosGastos);
      }

      // --- CÁLCULO GASOIL POR FECHA ---
      let cantidadGasoil = 0;
      let totalGasoil = 0;
      const detalleCargasGasoil = [];

      remitos.forEach((remito) => {
        (remito.items || []).forEach((item) => {
          const litros = Number(item.gasoil || 0);
          if (litros <= 0) return;
          cantidadGasoil += litros;
          const precioObj = buscarPrecioVigente(preciosObra, "Gasoil", null, item.fecha);
          const precioGasoilItem = precioObj ? parseFloat(precioObj.precio) : 0;
          totalGasoil += litros * precioGasoilItem;

          detalleCargasGasoil.push({
            fecha: item.fecha,
            litros: litros,
            precio: precioGasoilItem,
            total: litros * precioGasoilItem,
            maquina: item.maquina || "-",
          });
        });
      });

      setCargasGasoil(detalleCargasGasoil);

      setInfoGasoil({
        cantidad: cantidadGasoil,
        precio: cantidadGasoil > 0 ? totalGasoil / cantidadGasoil : 0,
        total: totalGasoil,
      });

      // --- LÓGICA DE AGRUPACIÓN POR MAQUINISTA Y TIPO ---
      const agrupado = {};

      remitos.forEach((remito) => {
        remito.items.forEach((item) => {
          if (item.personal) {
            const esServicio = item.servicio && item.servicio !== "";
            const tipo = esServicio ? "servicio" : "maquina";

            const key = `${item.personal}-${tipo}`;

            if (!agrupado[key]) {
              agrupado[key] = {
                nombre: item.personal,
                tipo: tipo,
                cantidad: 0,
                totalCalculado: 0,
                costosHora: [],
              };
            }

            const costoHora = Number(item.costoHoraPersonal || 0);
            if (costoHora > 0) {
              agrupado[key].costosHora.push(costoHora);
            }

            if (esServicio) {
              agrupado[key].cantidad += 1;
              agrupado[key].totalCalculado += costoHora > 0 ? costoHora * 8 : 0;
            } else {
              const horas = Number(item.cantidad || 0);
              agrupado[key].cantidad += horas;
              agrupado[key].totalCalculado += horas * costoHora;
            }
          }
        });
      });

      // Mapeamos el objeto agrupado a un array
      const arrayMaquinistas = Object.values(agrupado).map((dato) => {
        const costosUnicos = [...new Set(dato.costosHora)];
        const divisor = dato.tipo === 'servicio' ? 5.5 : 44;

        let precio;
        let precioVarios = false;

        if (costosUnicos.length === 0) {
          // Sin costoHoraPersonal (remitos anteriores al campo) → fallback PersonalDB
          const empleadoEncontrado = personalDB.find(
            (p) => p.nombre.trim().toLowerCase() === dato.nombre.trim().toLowerCase()
          );
          const semanalVal = empleadoEncontrado?.semanal;
          const precioSemanal = Array.isArray(semanalVal) && semanalVal.length
            ? Number(semanalVal[semanalVal.length - 1].valor || 0)
            : Number(semanalVal || 0);
          precio = precioSemanal > 0 ? precioSemanal / divisor : 0;
          dato.totalCalculado = dato.cantidad * precio;
        } else if (costosUnicos.length === 1) {
          // Todos los items tienen el mismo costoHoraPersonal
          precio = dato.tipo === 'servicio' ? costosUnicos[0] * 8 : costosUnicos[0];
        } else {
          // Distintos valores → "Varios"
          precioVarios = true;
          precio = 0;
        }

        return {
          nombre: dato.nombre,
          tipo: dato.tipo,
          cantidad: dato.cantidad,
          precio: precio,
          precioVarios: precioVarios,
          total: dato.totalCalculado,
        };
      });

      setListaMaquinistas(arrayMaquinistas);

    } catch (error) {
      console.error("Error cargando datos:", error);
    }
  };

  const gastosFiltrados = gastos.filter((gasto) => {
    const texto = busqueda.trim().toLowerCase();
    const item = gasto.item?.toLowerCase() || "";
    const remito = gasto.remito?.toLowerCase() || "";
    return item.includes(texto) || remito.includes(texto);
  });

  const eliminarGasto = async (id) => {
    Swal.fire({
      title: "¿Seguro querés borrar el gasto?",
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: 'swal-btn-danger' },
      confirmButtonText: "Sí, borrar",
    }).then(async (result) => {
      if (result.isConfirmed) {
        const respuesta = await borrarGastoAPI(id);
        if (respuesta.ok) {
          cargarDatos();
          Swal.fire({
            title: "Borrado!",
            text: "El gasto ha sido borrado.",
            icon: "success",
            timer: 1500,
            showConfirmButton: false,
          });
        }
      }
    });
  };

  const handleNuevoGasto = () => {
    setGastoEditar(null);
    setShowModal(true);
  };

  const handleEditarGasto = (gasto) => {
    setGastoEditar(gasto);
    setShowModal(true);
  };

  const handleVerGasoil = () => {
    setShowVerGasoil(true);
  };

  const handleVerMaquinista = (maq) => {
    setMaquinistaVer(maq);
    setShowVerMaquinista(true);
  };

  const handleVerGasto = (gasto) => {
    setGastoVer(gasto);
    setShowVerGasto(true);
  };

  const exportarExcel = () => {
    const headers = ["Item", "Cantidad", "Unidad", "$ Unitario", "$ Total", "Observaciones"];
    const cols = ["A", "B", "C", "D", "E", "F"];
    const currencyFmt = '"$"#,##0.00';
    const centerAlign = { horizontal: "center", vertical: "center" };
    const leftAlign = { horizontal: "left", vertical: "center" };

    const filas = [
      // Gasoil automático
      ["Gasoil", infoGasoil.cantidad, "lts", infoGasoil.precio, infoGasoil.total, "Total de remitos (precio prom.)"],
      // Maquinistas
      ...listaMaquinistas.map((maq) => [
        maq.nombre,
        maq.cantidad,
        maq.tipo === "servicio" ? "Día" : "Hs",
        maq.precioVarios ? "-" : maq.precio,
        maq.total,
        maq.tipo === "servicio" ? "Servicios acumulados" : "Horas acumuladas",
      ]),
      // Gastos manuales
      ...gastos.map((g) => [
        g.item,
        Number(g.cantidad) || 0,
        g.unidad,
        Number(g.costoUnitario) || 0,
        (Number(g.cantidad) || 0) * (Number(g.costoUnitario) || 0),
        g.observaciones || "-",
      ]),
    ];

    const ws = {};

    ws["A1"] = { v: "LISTADO DE GASTOS", t: "s", s: { font: { bold: true, sz: 14 }, alignment: leftAlign } };
    ws["A2"] = { v: `Razón Social: ${razonsocial}`, t: "s", s: { font: { bold: true }, alignment: leftAlign } };
    ws["A3"] = { v: `Obra: ${obraNombre}`, t: "s", s: { font: { bold: true }, alignment: leftAlign } };

    headers.forEach((h, i) => {
      ws[`${cols[i]}5`] = { v: h, t: "s", s: { font: { bold: true }, alignment: centerAlign } };
    });

    const currencyCols = new Set([3, 4]); // $ Unitario y $ Total
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

    ws["!ref"] = `A1:F${filas.length + 5}`;
    ws["!cols"] = [{ wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 30 }];

    const libro = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(libro, ws, "Gastos");
    XLSXStyle.writeFile(libro, `Gastos_${obraNombre}.xlsx`);
  };

  const calcularTotal = () => {
    const totalGastosManuales = gastos.reduce((sum, gasto) => {
      const cantidad = Number(gasto.cantidad) || 0;
      const precio = Number(gasto.costoUnitario) || 0;
      return sum + cantidad * precio;
    }, 0);

    const totalMaquinistas = listaMaquinistas.reduce(
      (acc, maq) => acc + maq.total,
      0
    );

    return totalGastosManuales + infoGasoil.total + totalMaquinistas;
  };

  const formatoMiles = (valor) => {
    const numero = Number(valor) || 0;
    const numeroFormateado = new Intl.NumberFormat("es-AR", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numero);
    return `$ ${numeroFormateado}`;
  };

  return (
    <>
      <div className="mt-3">
        <h4 className="text-center">LISTADO DE GASTOS</h4>
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

        <div className="col-4 text-center">
          <div className="">
            <h4>Total gastos:</h4>
            <h4 className="">{formatoMiles(calcularTotal())} + iva</h4>
          </div>
        </div>

        <div className="col-4 d-flex flex-column gap-2 align-items-end">
          <div className="d-flex gap-2">
            <Button variant="outline-light" onClick={exportarExcel}>Excel</Button>
            <Button variant="outline-success" onClick={() => navigate(-1)}>Volver</Button>
          </div>
          <Button variant="outline-primary" onClick={handleNuevoGasto}>
            Cargar gasto
          </Button>
        </div>
      </div>

      <div className="table-responsive">
        <Table striped bordered hover className="text-center align-middle">
          <thead className="table-dark">
            <tr>
              <th>Item</th>
              <th>Cant.</th>
              <th>Unidad</th>
              <th>$ Unit.</th>
              <th>$ Total</th>
              <th>Observaciones</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {/* 1. FILA AUTOMÁTICA DE GASOIL */}
            <tr>
              <td className="text-primary">Gasoil</td>
              <td>{infoGasoil.cantidad}</td>
              <td>lts</td>
              <td className="text-nowrap">{formatoMiles(infoGasoil.precio)}</td>
              <td className="text-nowrap">{formatoMiles(infoGasoil.total)}</td>
              <td>Total de remitos (precio prom.)</td>
              <td>
                <Button
                  size="sm"
                  variant="outline-success"
                  onClick={handleVerGasoil}
                  title="Ver Gasoil"
                >
                  Ver
                </Button>
              </td>
            </tr>

            {/* 2. MAQUINISTAS DESGLOSADOS */}
            {listaMaquinistas.map((maq, index) => (
              <tr key={`maq-${index}`}>
                <td className="text-success">{maq.nombre}</td>
                
                <td>{maq.cantidad}</td>
                
                <td>
                    {maq.tipo === 'servicio' ? 'Día' : 'Hs'}
                </td>
                
                <td className="text-nowrap">{maq.precioVarios ? "Varios" : formatoMiles(maq.precio)}</td>
                <td className="text-nowrap">{formatoMiles(maq.total)}</td>
                
                <td>{maq.tipo === 'servicio' ? 'Servicios acumulados' : 'Horas acumuladas'}</td>
                <td>
                  <Button
                    size="sm"
                    variant="outline-success"
                    onClick={() => handleVerMaquinista(maq)}
                    title="Ver Personal"
                  >
                    Ver
                  </Button>
                </td>
              </tr>
            ))}

            {/* 3. GASTOS MANUALES */}
            {gastosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-4">
                  No hay gastos manuales registrados.
                </td>
              </tr>
            ) : (
              gastosFiltrados.map((g, i) => {
                const cantidad = Number(g.cantidad) || 0;
                const precio = Number(g.costoUnitario) || 0;
                const totalFila = cantidad * precio;

                return (
                  <tr key={g._id || i}>
                    <td>{g.item}</td>
                    <td>{cantidad}</td>
                    <td>{g.unidad}</td>
                    <td className="text-nowrap">{formatoMiles(precio)}</td>
                    <td className=" text-nowrap">{formatoMiles(totalFila)}</td>
                    <td>{g.observaciones}</td>
                    <td className="d-flex gap-1 justify-content-center">
                      <Button
                        size="sm"
                        variant="outline-success"
                        onClick={() => handleVerGasto(g)}
                        title="Ver Gasto"
                      >
                        Ver
                      </Button>

                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => eliminarGasto(g._id)}
                        title="Borrar Gasto"
                      >
                        Borrar
                      </Button>

                      <Button
                        size="sm"
                        variant="outline-warning"
                        onClick={() => handleEditarGasto(g)}
                        title="Editar Gasto"
                      >
                        Editar
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </div>

      <GastoModal
        show={showModal}
        handleClose={() => {
          setShowModal(false);
          setGastoEditar(null);
        }}
        obra={obraId}
        preciosObra={preciosObra}
        actualizarTabla={cargarDatos}
        gastoEditar={gastoEditar}
      />

      {/* MODAL VER GASOIL */}
      <Modal show={showVerGasoil} onHide={() => setShowVerGasoil(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Detalle de cargas de Gasoil</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="table-responsive" style={{ maxHeight: "400px" }}>
            <Table striped bordered hover size="sm" className="text-center align-middle">
              <thead className="table-dark">
                <tr>
                  <th>Fecha</th>
                  <th>Máquina</th>
                  <th>Litros</th>
                  <th>$ Unit.</th>
                  <th>$ Total</th>
                </tr>
              </thead>
              <tbody>
                {cargasGasoil.map((c, i) => (
                  <tr key={i}>
                    <td>{c.fecha ? c.fecha.toString().slice(0, 10).split("-").reverse().join("-") : "-"}</td>
                    <td>{c.maquina}</td>
                    <td>{c.litros}</td>
                    <td className="text-nowrap">{formatoMiles(c.precio)}</td>
                    <td className="text-nowrap">{formatoMiles(c.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="table-dark fw-bold">
                <tr>
                  <td colSpan={2}>TOTAL</td>
                  <td>{infoGasoil.cantidad}</td>
                  <td></td>
                  <td className="text-nowrap">{formatoMiles(infoGasoil.total)}</td>
                </tr>
              </tfoot>
            </Table>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowVerGasoil(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL VER MAQUINISTA */}
      <Modal show={showVerMaquinista} onHide={() => setShowVerMaquinista(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{maquinistaVer?.nombre}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table bordered size="sm" className="align-middle mb-0">
            <tbody>
              <tr>
                <td className="fw-bold">Tipo</td>
                <td>{maquinistaVer?.tipo === "servicio" ? "Servicio" : "Máquina"}</td>
              </tr>
              <tr>
                <td className="fw-bold">Cantidad</td>
                <td>{maquinistaVer?.cantidad} {maquinistaVer?.tipo === "servicio" ? "días" : "hs"}</td>
              </tr>
              <tr>
                <td className="fw-bold">Precio unitario</td>
                <td>{maquinistaVer?.precioVarios ? "Varios" : formatoMiles(maquinistaVer?.precio || 0)}</td>
              </tr>
              <tr>
                <td className="fw-bold">Total</td>
                <td>{formatoMiles(maquinistaVer?.total || 0)}</td>
              </tr>
              <tr>
                <td className="fw-bold">Origen</td>
                <td>{maquinistaVer?.tipo === "servicio" ? "Servicios acumulados" : "Horas acumuladas"}</td>
              </tr>
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowVerMaquinista(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL VER GASTO MANUAL */}
      <Modal show={showVerGasto} onHide={() => setShowVerGasto(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{gastoVer?.item}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table bordered size="sm" className="align-middle mb-0">
            <tbody>
              <tr>
                <td className="fw-bold">Remito</td>
                <td>{gastoVer?.remito || "-"}</td>
              </tr>
              <tr>
                <td className="fw-bold">Cantidad</td>
                <td>{Number(gastoVer?.cantidad) || 0}</td>
              </tr>
              <tr>
                <td className="fw-bold">Unidad</td>
                <td>{gastoVer?.unidad || "-"}</td>
              </tr>
              <tr>
                <td className="fw-bold">Costo Unitario</td>
                <td>{formatoMiles(Number(gastoVer?.costoUnitario) || 0)}</td>
              </tr>
              <tr>
                <td className="fw-bold">Costo Total</td>
                <td>{formatoMiles((Number(gastoVer?.cantidad) || 0) * (Number(gastoVer?.costoUnitario) || 0))}</td>
              </tr>
              <tr>
                <td className="fw-bold">Observaciones</td>
                <td>{gastoVer?.observaciones || "-"}</td>
              </tr>
              <tr>
                <td className="fw-bold">Fecha de carga</td>
                <td>{gastoVer?.createdAt ? gastoVer.createdAt.toString().slice(0, 10).split("-").reverse().join("-") : "-"}</td>
              </tr>
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowVerGasto(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default GastoTabla;