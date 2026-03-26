import React, { useState, useEffect } from "react";
import { Table, Button, Container, Form, Spinner, Row, Col } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  listarMaquinas,
  crearMaquina,
  editarMaquina,
  borrarMaquina as borrarMaquinaAPI,
} from "../../../../../helpers/queriesMaquinas.js";
import MaquinaModal from "./MaquinaModal"; 
import "../../../../../styles/verRemitos.css";

const valoresIniciales = {
  maquina: "",
  costo: "",
  marca: "",
  modelo: "",
  anio: "",
  patente: "",
  chasis: "",
  motor: "",
  descripcion: "",
};

const MaquinaTabla = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: valoresIniciales,
    mode: "onChange",
  });

  const [maquinas, setMaquinas] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState(false);
  const [maquinaId, setMaquinaId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarMaquinas();
  }, []);

  const cargarMaquinas = async () => {
    try {
      setLoading(true);
      const respuesta = await listarMaquinas();
      if (respuesta?.ok) {
        const data = await respuesta.json();
        setMaquinas(data);
      }
    } catch (error) {
      console.error("Error al cargar máquinas", error);
    } finally {
      setLoading(false);
    }
  };

  const cerrarModal = () => {
    setShowModal(false);
    setEditando(false);
    setMaquinaId(null);
    reset(valoresIniciales);
  };

  const onSubmit = async (data) => {
    try {
      let respuesta;
      // Preparamos todos los datos para enviar
      const dataToSend = {
        maquina: data.maquina,
        costo: data.costo ? Number(data.costo) : 0,
        marca: data.marca,
        modelo: data.modelo,
        anio: data.anio,
        patente: data.patente,
        chasis: data.chasis,
        motor: data.motor,
        descripcion: data.descripcion,
      };

      if (editando) {
        respuesta = await editarMaquina(maquinaId, dataToSend);
      } else {
        respuesta = await crearMaquina(dataToSend);
      }

      if (!respuesta.ok) {
        const errorData = await respuesta.json();
        Swal.fire({
          icon: "error",
          title: "Error",
          text: errorData.msg || "No se pudo guardar la máquina",
        });
        return;
      }

      const resData = await respuesta.json();

      if (editando) {
        setMaquinas(
          maquinas.map((m) => (m._id === maquinaId ? resData.maquina : m))
        );
        Swal.fire({ icon: "success", title: "Máquina editada", timer: 2000, showConfirmButton: false });
      } else {
        setMaquinas([...maquinas, resData.maquina]);
        Swal.fire({ icon: "success", title: "Máquina creada", timer: 2000, showConfirmButton: false });
      }

      cerrarModal();
    } catch (error) {
      Swal.fire({ icon: "error", title: "Error inesperado", text: "No se pudo procesar la solicitud" });
    }
  };

  const eliminarMaquina = async (id) => {
    const result = await Swal.fire({
      title: "¿Borrar máquina?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: 'swal-btn-danger' },
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      const respuesta = await borrarMaquinaAPI(id);
      if (respuesta?.ok) {
        setMaquinas(maquinas.filter((m) => m._id !== id));
        Swal.fire({ icon: "success", title: "Máquina borrada", timer: 2000, showConfirmButton: false });
      }
    }
  };

  const abrirEditar = (item) => {
    setEditando(true);
    setMaquinaId(item._id);
    // Cargamos TODOS los campos en el formulario
    reset({
      maquina: item.maquina,
      costo: item.costo || "",
      marca: item.marca || "",
      modelo: item.modelo || "",
      anio: item.anio || "",
      patente: item.patente || "",
      chasis: item.chasis || "",
      motor: item.motor || "",
      descripcion: item.descripcion || "",
    });
    setShowModal(true);
  };

  const abrirCrear = () => {
    setEditando(false);
    setMaquinaId(null);
    reset(valoresIniciales);
    setShowModal(true);
  };

  const maquinasFiltradas = maquinas.filter((m) =>
    m.maquina?.toLowerCase().includes(busqueda.toLowerCase().trim()) ||
    m.marca?.toLowerCase().includes(busqueda.toLowerCase().trim()) || // Agregué búsqueda por marca
    m.patente?.toLowerCase().includes(busqueda.toLowerCase().trim())  // Agregué búsqueda por patente
  );

  const formatoMiles = (valor) => {
    if (valor === undefined || valor === null || valor === "" || Number(valor) === 0) return "-";
    const numero = new Intl.NumberFormat("es-AR").format(valor);
    return `$ ${numero}`;
  };

  if (loading) return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <Container className="my-3" fluid> {/* Use fluid para aprovechar ancho completo */}
      <div className="">
        <h4 className="">Administración de Máquinas</h4>
      </div>

      <Row className="align-items-center mb-3">
        <Col xs={12} md={4}>
          <Form.Control
            type="search"
            placeholder="Buscar por nombre, marca o patente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </Col>

        <Col xs={12} md={4} className="offset-md-4 d-flex flex-column align-items-end gap-2 mt-3 mt-md-0">
          <Button variant="outline-success" onClick={() => navigate(-1)} className="px-4">Volver</Button>
          <Button variant="outline-primary" onClick={abrirCrear}>Nueva Máquina</Button>
        </Col>
      </Row>

      {/* FILA DE LA TABLA - AHORA MÁS ANCHA (Col-12) */}
      <Row className="justify-content-center">
        <Col xs={12}> {/* Cambiado de lg={8} xl={6} a xs={12} para que entren todas las columnas */}
          <div className="table-responsive shadow-sm rounded">
            <Table striped bordered hover className="text-center align-middle mb-0" size="sm">
              <thead className="table-dark">
                <tr>
                  <th>Denominación</th>
                  <th>Marca</th>
                  <th>Modelo</th>
                  <th>Año</th>
                  <th>Patente</th>
                  <th>Chasis</th>
                  <th>Motor</th>
                  <th>Valor ($)</th>
                  <th>Observaciones</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {maquinasFiltradas.length === 0 ? (
                  <tr><td colSpan="10" className="py-3">No hay máquinas registradas</td></tr>
                ) : (
                  maquinasFiltradas.map((m) => (
                    <tr key={m._id}>
                      <td className="fw-bold">{m.maquina}</td>
                      <td>{m.marca || "-"}</td>
                      <td>{m.modelo || "-"}</td>
                      <td>{m.anio || "-"}</td>
                      <td className="text-nowrap">{m.patente || "-"}</td>
                      <td className="small">{m.chasis || "-"}</td>
                      <td className="small">{m.motor || "-"}</td>
                      <td className="text-nowrap">{formatoMiles(m.costo)}</td>
                      
                      {/* Observaciones con un tope de ancho para que no rompa la tabla */}
                      <td style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={m.descripcion}>
                        {m.descripcion || "-"}
                      </td>
                      
                      <td>
                        <div className="d-flex gap-1 justify-content-center">
                          <Button size="sm" variant="outline-warning" onClick={() => abrirEditar(m)}>
                             Editar
                          </Button>
                          <Button size="sm" variant="outline-danger" onClick={() => eliminarMaquina(m._id)}>
                            Borrar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Col>
      </Row>

      <MaquinaModal 
        show={showModal}
        onHide={cerrarModal}
        onSubmit={onSubmit}
        handleSubmit={handleSubmit}
        register={register}
        errors={errors}
        editando={editando}
        maquinas={maquinas}
        maquinaId={maquinaId}
      />
    </Container>
  );
};

export default MaquinaTabla;