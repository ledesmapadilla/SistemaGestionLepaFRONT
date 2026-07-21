import React, { useState, useEffect } from "react";
import { Table, Button, Form, Modal, Spinner } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import {
  crearPersonal,
  editarPersonal,
  listarPersonal,
  borrarPersonal as borrarPersonalAPI,
} from "../../../../../helpers/queriesPersonal.js";
import { eliminarPersonalDeAsistencias } from "../../../../../helpers/queriesAsistencia.js";
import Swal from "sweetalert2";
import PersonalModal from "./PersonalModal.jsx";

const valoresIniciales = {
  nombre: "",
  semanal: "",
  cantJornales: "",
};

const ultimoSemanal = (val) => {
  if (Array.isArray(val) && val.length) return val[val.length - 1].valor;
  if (typeof val === "number") return val;
  return 0;
};

const ultimoCantJornales = (val) => {
  if (Array.isArray(val) && val.length) return Number(val[val.length - 1].cantJornales || 0);
  return 0;
};

const formatearFecha = (fecha) => {
  if (!fecha || fecha === "-") return "-";
  const partes = fecha.split("-");
  if (partes.length === 3) return `${partes[2]}-${partes[1]}-${partes[0]}`;
  return fecha;
};

const ultimaFecha = (val) => {
  if (Array.isArray(val) && val.length) return formatearFecha(val[val.length - 1].fecha);
  return "-";
};

const Personal = () => {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: valoresIniciales,
    mode: "onChange",
  });

  const [personal, setPersonal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [soloActivos, setSoloActivos] = useState(true);
  const [editando, setEditando] = useState(false);
  const [personalId, setPersonalId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showVer, setShowVer] = useState(false);
  const [personaVer, setPersonaVer] = useState(null);

  useEffect(() => {
    cargarPersonal();
  }, []);

  const cargarPersonal = async () => {
    try {
      const respuesta = await listarPersonal();
      if (respuesta?.ok) {
        const data = await respuesta.json();
        setPersonal(data);
      }
    } catch (error) {
      console.error("Error al cargar personal:", error);
    } finally {
      setLoading(false);
    }
  };

  const cerrarModal = () => {
    setShowModal(false);
    setEditando(false);
    setPersonalId(null);
    reset(valoresIniciales);
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      let respuesta;
      let dataToSend;

      if (editando) {
        dataToSend = {
          nombre: data.nombre,
          semanal: data.semanal,
          activo: data.activo !== undefined ? data.activo : true,
        };
        respuesta = await editarPersonal(personalId, dataToSend);
      } else {
        const today = new Date();
        const hoy = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
        dataToSend = {
          nombre: data.nombre,
          semanal: data.semanal
            ? [{ valor: Number(data.semanal), fecha: hoy, cantJornales: Number(data.cantJornales) || 0 }]
            : [],
        };
        respuesta = await crearPersonal(dataToSend);
      }

      if (!respuesta) {
        Swal.fire({
          icon: "error",
          title: "Error de conexión",
          text: "No se pudo conectar con el servidor. Intente de nuevo.",
        });
        return;
      }

      if (!respuesta.ok) {
        const errorData = await respuesta.json();
        Swal.fire({
          icon: "error",
          title: "Error",
          text: errorData.mensaje || "No se pudo guardar el personal",
        });
        return;
      }

      const resData = await respuesta.json();

      if (editando) {
        setPersonal(
          personal.map((p) => (p._id === personalId ? resData.personal : p)),
        );
        Swal.fire({
          icon: "success",
          title: "Personal editado",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        setPersonal([...personal, resData.personal]);
        Swal.fire({
          icon: "success",
          title: "Personal creado",
          timer: 2000,
          showConfirmButton: false,
        });
      }

      cerrarModal();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error inesperado",
        text: "No se pudo procesar la solicitud",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const borrarPersonal = async (id) => {
    const result = await Swal.fire({
      title: "¿Borrar personal?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: 'swal-btn-danger' },
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      const persona = personal.find((p) => p._id === id);
      const respuesta = await borrarPersonalAPI(id);
      if (respuesta?.ok) {
        const hoy = new Date();
        const desde = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
        if (persona?.nombre) await eliminarPersonalDeAsistencias(persona.nombre, desde);
        setPersonal(personal.filter((p) => p._id !== id));
        Swal.fire({
          icon: "success",
          title: "Personal borrado",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    }
  };

  const abrirVer = (persona) => {
    setPersonaVer(persona);
    setShowVer(true);
  };

  const abrirEditar = (persona) => {
    setEditando(true);
    setPersonalId(persona._id);
    reset({
      nombre: persona.nombre,
      semanal: persona.semanal || [],
    });
    setShowModal(true);
  };

  const abrirCrear = () => {
    setEditando(false);
    setPersonalId(null);
    reset(valoresIniciales);
    setShowModal(true);
  };

  const personalFiltrado = personal.filter((persona) => {
    const texto = busqueda.trim().toLowerCase();
    const nombre = persona.nombre?.toLowerCase() || "";
    if (!nombre.startsWith(texto)) return false;
    if (soloActivos && persona.activo === false) return false;
    return true;
  });

  const totalActivos = personal.filter((p) => p.activo !== false).length;

  const formatoMiles = (valor) => {
    // Si el valor es nulo, indefinido o 0, devolvemos el guion solo
    if (
      valor === undefined ||
      valor === null ||
      valor === "" ||
      Number(valor) === 0
    ) {
      return "-";
    }
    // Formateamos con separador de miles y agregamos el signo pesos
    const numeroFormateado = new Intl.NumberFormat("es-AR").format(valor);
    return `$ ${numeroFormateado}`;
  };

  if (loading) return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <>
    <div className="w-75 mx-auto my-2">
        <h6 className="text-center mb-3">Personal</h6>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-3">
            <Form.Control
              size="sm"
              type="search"
              placeholder="Buscar por nombre"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ width: "220px" }}
            />
            <div className="d-flex align-items-center gap-2">
              <span style={{ fontSize: "0.85rem", userSelect: "none" }} className={soloActivos ? "fw-semibold" : "text-muted"}>Solo activos</span>
              <Form.Check
                type="switch"
                id="switch-activos-personal"
                className="mb-0"
                checked={!soloActivos}
                onChange={(e) => setSoloActivos(!e.target.checked)}
              />
              <span style={{ fontSize: "0.85rem", userSelect: "none" }} className={!soloActivos ? "fw-semibold" : "text-muted"}>Todos</span>
            </div>
            <span className="badge bg-success" style={{ fontSize: "0.85rem" }}>Activos: {totalActivos}</span>
          </div>
          <div className="d-flex gap-2">
            <Button size="sm" variant="outline-success" onClick={() => navigate(-1)}>Volver</Button>
            <Button size="sm" variant="outline-primary" onClick={abrirCrear}>Crear Personal</Button>
          </div>
        </div>

        <div style={{ maxHeight: "65vh", overflowY: "auto" }}>
            <Table
              striped
              bordered
              hover
              size="sm"
              className="text-center align-middle mb-0"
            >
              <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr>
                  <th>Nombre</th>
                  <th>Semanal</th>
                  <th>Hora</th>
                  <th>Jornal</th>
                  <th>Fecha últ. edición</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {personalFiltrado.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-3">
                      No hay personal cargado
                    </td>
                  </tr>
                ) : (
                  personalFiltrado.map((persona) => {
                    const valSemanal = ultimoSemanal(persona.semanal);
                    return (
                    <tr key={persona._id}>
                      <td className="fw-bold">{persona.nombre}</td>
                      <td className="text-nowrap">{formatoMiles(valSemanal)}</td>
                      <td className="text-nowrap">{formatoMiles(valSemanal / 44)}</td>
                      <td className="text-nowrap">{ultimoCantJornales(persona.semanal) > 0 ? formatoMiles(valSemanal / ultimoCantJornales(persona.semanal)) : "-"}</td>
                      <td className="text-nowrap">{ultimaFecha(persona.semanal)}</td>
                      <td>
                        <span className={`badge ${persona.activo !== false ? "bg-success" : "bg-danger"}`}>
                          {persona.activo !== false ? "Activo" : "Desactivado"}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-2 justify-content-center">
                          <Button
                            size="sm"
                            variant="outline-success"
                            onClick={() => abrirVer(persona)}
                          >
                            Ver
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-warning"
                            onClick={() => abrirEditar(persona)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => borrarPersonal(persona._id)}
                          >
                            Borrar
                          </Button>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
        </div>
    </div>

      {/* Modal Ver historial */}
      <Modal show={showVer} onHide={() => setShowVer(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{personaVer?.nombre}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {(() => {
            const val = ultimoSemanal(personaVer?.semanal);
            return (
              <Table bordered size="sm" className="align-middle mb-3">
                <tbody>
                  <tr>
                    <td className="fw-bold">Semanal</td>
                    <td>{formatoMiles(val)}</td>
                  </tr>
                  <tr>
                    <td className="fw-bold">Hora</td>
                    <td>{formatoMiles(val / 44)}</td>
                  </tr>
                  <tr>
                    <td className="fw-bold">Cant. jornales semanales</td>
                    <td>{ultimoCantJornales(personaVer?.semanal) || "-"}</td>
                  </tr>
                  <tr>
                    <td className="fw-bold">Jornal</td>
                    <td>{ultimoCantJornales(personaVer?.semanal) > 0 ? formatoMiles(val / ultimoCantJornales(personaVer?.semanal)) : "-"}</td>
                  </tr>
                </tbody>
              </Table>
            );
          })()}
          <h6 className="text-center fw-bold">Historial Semanal</h6>
          <Table bordered size="sm" className="text-center align-middle">
            <thead className="table-dark">
              <tr>
                <th>Valor</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(personaVer?.semanal) && personaVer.semanal.length > 0) ? (
                personaVer.semanal.map((item, i) => (
                  <tr key={i}>
                    <td>{formatoMiles(item.valor)}</td>
                    <td>{formatearFecha(item.fecha)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2" className="text-muted">Sin historial</td>
                </tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={() => setShowVer(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Uso del componente Modal separado */}
      <PersonalModal
        show={showModal}
        onHide={cerrarModal}
        onSubmit={onSubmit}
        handleSubmit={handleSubmit}
        register={register}
        watch={watch}
        setValue={setValue}
        errors={errors}
        editando={editando}
        personal={personal}
        personalId={personalId}
        submitting={submitting}
      />
    </>
  );
};

export default Personal;
