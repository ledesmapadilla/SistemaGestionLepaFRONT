import { useEffect, useState } from "react";
import {
  Table,
  Button,
  Spinner,
  Container,
  Form,
  Row,
  Col,
  InputGroup,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import RemitosModal from "../Remitos/RemitosModal";
import Swal from "sweetalert2";
import "bootstrap-icons/font/bootstrap-icons.css";
import {
  listarRemitos,
  eliminarRemito,
  eliminarItemRemito,
} from "../../../../../helpers/queriesRemitos.js";

import "../../../../../styles/verRemitos.css";

const TodosLosRemitos = () => {
  const [remitos, setRemitos] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- 1. ESTADOS PARA LOS BUSCADORES ---
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [busquedaObra, setBusquedaObra] = useState("");
  const [busquedaRemito, setBusquedaRemito] = useState("");
  const [busquedaFecha, setBusquedaFecha] = useState("");
  const [busquedaEstado, setBusquedaEstado] = useState("");

  // Estados para el modal
  const [showModalRemito, setShowModalRemito] = useState(false);
  const [itemEditando, setItemEditando] = useState(null);
  const [remitoEditando, setRemitoEditando] = useState(null);
  const [obraParaModal, setObraParaModal] = useState(null);

  const navigate = useNavigate();

  const cargarRemitos = async () => {
    try {
      const data = await listarRemitos();
      if (data) {
        const ordenados = data.sort(
          (a, b) => new Date(b.fecha) - new Date(a.fecha)
        );
        setRemitos(ordenados);
      } else {
        setRemitos([]);
      }
    } catch (error) {
      console.error("ERROR AL CARGAR TODOS LOS REMITOS:", error);
      setRemitos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarRemitos();
  }, []);

  const handleEditarItem = (remito, item) => {
    if (!remito.obra) {
      Swal.fire(
        "Error",
        "Este remito no tiene datos de obra vinculados",
        "error"
      );
      return;
    }

    setObraParaModal(remito.obra);
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
      text: "Se eliminará de la base de datos",
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: 'swal-btn-danger' },
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    const remitoPadre = remitos.find((r) => r._id === remitoId);

    try {
      if (remitoPadre && remitoPadre.items.length === 1) {
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
    } catch (error) {
      console.log(error);
      Swal.fire("Error", "No se pudo eliminar", "error");
    }
  };

  const formatoMiles = (valor) => {
    if (valor === undefined || valor === null) return "-";
    return new Intl.NumberFormat("es-AR").format(valor);
  };

  const mostrarFechaDMY = (fecha) => {
    if (!fecha) return "-";
    const [y, m, d] = fecha.split("-");
    return `${d}-${m}-${y}`;
  };

  // --- 2. LÓGICA DE FILTRADO ACTUALIZADA ---
  const remitosFiltrados = remitos.filter((r) => {
    const cliente = r.obra?.razonsocial?.toLowerCase() || "";
    const obra = r.obra?.nombreobra?.toLowerCase() || "";
    const numRemito = r.remito?.toString() || "";
    const fechaRemito = r.fecha ? r.fecha.toString().slice(0, 10) : "";
    const estadoRemito = r.estado || "";

    const coincideCliente = cliente.includes(busquedaCliente.toLowerCase());
    const coincideObra = obra.includes(busquedaObra.toLowerCase());
    const coincideRemito = numRemito.includes(busquedaRemito);
    const coincideFecha =
      busquedaFecha === "" || fechaRemito === busquedaFecha;
    const coincideEstado =
      busquedaEstado === "" || estadoRemito === busquedaEstado;

    return (
      coincideCliente &&
      coincideObra &&
      coincideRemito &&
      coincideFecha &&
      coincideEstado
    );
  });

  if (loading)
    return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <Container fluid className="my-3 px-4">
      <div className="mb-2">
        <h4 className="text-center">
          <span className=" ">Listado de todos los remitos</span>
        </h4>
      </div>

      {/* --- 3. BARRA DE BUSCADORES ALINEADA --- */}
      <div className=" mx-5 p-3 rounded mb-3 shadow-sm">
        <Row className="g-2 align-items-center">
          
          {/* Columna 1: Cliente (md=2) */}
          <Col md={2}>
            <InputGroup size="sm"> {/* size="sm" para que sean más compactos */}
              <Form.Control
                type="text"
                placeholder="Razón Social..."
                value={busquedaCliente}
                onChange={(e) => setBusquedaCliente(e.target.value)}
              />
              {busquedaCliente && (
                <Button
                  variant="outline-warning"
                  onClick={() => setBusquedaCliente("")}
                >
                  ✕
                </Button>
              )}
            </InputGroup>
          </Col>

          {/* Columna 2: Obra (md=2) */}
          <Col md={2}>
            <InputGroup size="sm">
              <Form.Control
                type="text"
                placeholder="Nombre de Obra..."
                value={busquedaObra}
                onChange={(e) => setBusquedaObra(e.target.value)}
              />
              {busquedaObra && (
                <Button
                  variant="outline-warning"
                  onClick={() => setBusquedaObra("")}
                >
                  ✕
                </Button>
              )}
            </InputGroup>
          </Col>

          {/* Columna 3: Remito (md=2) */}
          <Col md={2}>
            <InputGroup size="sm">
              <Form.Control
                type="number"
                placeholder="N° Remito..."
                value={busquedaRemito}
                onChange={(e) => setBusquedaRemito(e.target.value)}
              />
              {busquedaRemito && (
                <Button
                  variant="outline-warning"
                  onClick={() => setBusquedaRemito("")}
                >
                  ✕
                </Button>
              )}
            </InputGroup>
          </Col>

          {/* Columna 4: Fecha (md=2) */}
          <Col md={2}>
            <InputGroup size="sm">
              {/* Quitamos el ícono si quieres ahorrar espacio, o lo dejamos */}
              <Form.Control
                type="date"
                value={busquedaFecha}
                onChange={(e) => setBusquedaFecha(e.target.value)}
              />
              {busquedaFecha && (
                <Button
                  variant="outline-warning"
                  onClick={() => setBusquedaFecha("")}
                >
                  ✕
                </Button>
              )}
            </InputGroup>
          </Col>

          {/* Columna 5: Estado (md=2) */}
          <Col md={2}>
            <InputGroup size="sm">
              <Form.Select
                value={busquedaEstado}
                onChange={(e) => setBusquedaEstado(e.target.value)}
                style={{ cursor: "pointer" }}
              >
                <option value="">Estado...</option>
                <option value="Sin facturar">Sin facturar</option>
                <option value="Facturado">Facturado</option>
              </Form.Select>
              {busquedaEstado && (
                <Button
                  variant="outline-warning"
                  onClick={() => setBusquedaEstado("")}
                >
                  ✕
                </Button>
              )}
            </InputGroup>
          </Col>

          {/* Columna 6: Botón Volver (md=2) */}
          <Col md={2} className="d-flex justify-content-end" >
            <Button
              variant="outline-success"
              
              onClick={() => navigate(-1)}
              className="w-50"
            >
              Volver
            </Button>
          </Col>
        </Row>
      </div>

      <div className="table-responsive shadow-sm">
        <Table
          striped
          bordered
          hover
          className="align-middle text-center table-sm"
        >
          <thead className="table-dark">
            <tr>
              <th>Razón Social</th>
              <th>Obra</th>
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
              <th>Gasoil</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {remitosFiltrados.length > 0 ? (
              remitosFiltrados.map((remito) =>
                remito.items.map((item, index) => (
                  <tr key={`${remito._id}-${item._id}`}>
                    <td>{remito.obra?.razonsocial}</td>
                    <td className="text-muted">{remito.obra?.nombreobra}</td>
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
                    <td>
                      <span
                        className={
                          remito.estado === "Sin facturar"
                            ? "text-danger"
                            : "text-success"
                        }
                      >
                        {remito.estado}
                      </span>
                    </td>
                    <td>{item.gasoil || "-"}</td>
                    <td>
                      <div className="d-flex justify-content-center gap-1">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() =>
                            handleEliminarItem(remito._id, item._id)
                          }
                          title="Borrar"
                        >
                          <i className="bi bi-trash"></i>
                        </Button>
                        <Button
                          variant="outline-warning"
                          size="sm"
                          onClick={() => handleEditarItem(remito, item)}
                          title="Editar"
                        >
                          <i className="bi bi-pencil"></i>
                        </Button>
                      </div>
                    </td>
                  </tr>
                )),
              )
            ) : (
              <tr>
                <td colSpan="15" className="py-4">
                  No se encontraron remitos con esa búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <RemitosModal
        show={showModalRemito}
        onCancel={() => {
          setShowModalRemito(false);
          setItemEditando(null);
          setRemitoEditando(null);
          setObraParaModal(null);
        }}
        obra={obraParaModal}
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
            cargarRemitos();
          }
          setShowModalRemito(false);
          setItemEditando(null);
          setRemitoEditando(null);
          setObraParaModal(null);
        }}
      />
    </Container>
  );
};

export default TodosLosRemitos;