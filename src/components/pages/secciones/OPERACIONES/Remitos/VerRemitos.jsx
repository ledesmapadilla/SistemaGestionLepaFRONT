import { useEffect, useState } from "react";
import { Table, Button } from "react-bootstrap";
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
  const { obraId, obraNombre, razonsocial } = location.state || {};

  const [remitos, setRemitos] = useState([]);
  const [precios, setPrecios] = useState(location.state?.precios || []);
  const [showModalRemito, setShowModalRemito] = useState(false);

  const cargarRemitos = async () => {
    if (!obraId) return;

    try {
      const data = await listarRemitosPorObra(obraId);
      setRemitos(data || []);
    } catch (error) {
      console.error("ERROR AL CARGAR REMITOS:", error);
      setRemitos([]);
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
    console.log("Item a editar:", item);
    console.log("Remito completo:", remito);

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

  const remitosAplanados = remitos.flatMap((r) =>
    r.items.map((item) => ({
      ...item,
      _id: `${r._id}-${item._id}`,
      remito: r.remito,
      fecha: r.fecha,
      estado: r.estado,
    })),
  );
  console.log("REMITOS:", remitos);

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
          <Button variant="outline-success" onClick={() => navigate(-1)}>
            Volver
          </Button>
          <Button
            variant="outline-primary"
            onClick={() => setShowModalRemito(true)}
          >
            Cargar Remito
          </Button>
        </div>
      </div>
      <div className="table-responsive">
        <Table striped bordered hover className="align-middle text-center">
          <thead className="table-dark">
            <tr>
              <th>N° Remito</th>
              <th>Fecha</th>
              <th>Maquinista</th>
              <th>$ Hora</th>
              <th>Máquina</th>
              <th>Servicio</th>
              <th>Cant.</th>
              <th>Unidad</th>
              <th>$ un</th>
              <th>$ total</th>
              <th>Estado</th>
              <th>Gasoil(lts)</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {remitos.length > 0 ? (
              remitos.map((remito) =>
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
                    <td>${formatoMiles(item.precioUnitario)}</td>
                    <td>
                      ${formatoMiles(item.cantidad * item.precioUnitario)}
                    </td>
                    <td>{remito.estado}</td>
                    <td>{item.gasoil || "-"}</td>
                    <td>
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
                        className="mx-2"
                        onClick={() => handleEditarItem(remito, item)}
                      >
                        Editar
                      </Button>
                    </td>
                  </tr>
                )),
              )
            ) : (
              <tr>
                <td colSpan="13">No hay remitos</td>
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
    </div>
  );
};

export default VerRemitos;
