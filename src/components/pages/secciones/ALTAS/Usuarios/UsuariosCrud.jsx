import React, { useState, useEffect } from "react";
import { Table, Button, Form, Container, Row, Col } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import {
  crearUsuario,
  editarUsuario,
  listarUsuarios,
  borrarUsuario as borrarUsuarioAPI,
  verificarAcceso,
} from "../../../../../helpers/queriesUsuarios.js";
import Swal from "sweetalert2";
import UsuariosModal from "./UsuariosModal.jsx";

const valoresIniciales = {
  nombre: "",
  usuario: "",
  contrasena: "",
  rol: "",
};

const UsuariosCrud = () => {
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

  const [autorizado, setAutorizado] = useState(false);
  const [claveAcceso, setClaveAcceso] = useState("");
  const [errorAcceso, setErrorAcceso] = useState("");
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState(false);
  const [usuarioId, setUsuarioId] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (autorizado) {
      cargarUsuarios();
    }
  }, [autorizado]);

  const intentarAcceso = async (e) => {
    e.preventDefault();
    setErrorAcceso("");
    const respuesta = await verificarAcceso(claveAcceso);
    if (respuesta?.ok) {
      setAutorizado(true);
    } else {
      setErrorAcceso("Contraseña incorrecta");
    }
  };

  const cargarUsuarios = async () => {
    const respuesta = await listarUsuarios();
    if (respuesta?.ok) {
      const data = await respuesta.json();
      setUsuarios(data);
    }
  };

  const cerrarModal = () => {
    setShowModal(false);
    setEditando(false);
    setUsuarioId(null);
    reset(valoresIniciales);
  };

  const onSubmit = async (data) => {
    try {
      let respuesta;

      if (editando) {
        const dataToSend = {
          nombre: data.nombre,
          usuario: data.usuario,
          contrasena: data.contrasena,
          rol: data.rol,
        };
        respuesta = await editarUsuario(usuarioId, dataToSend);
      } else {
        respuesta = await crearUsuario(data);
      }

      if (!respuesta.ok) {
        const errorData = await respuesta.json();
        Swal.fire({
          icon: "error",
          title: "Error",
          text: errorData.msg || "No se pudo guardar el usuario",
        });
        return;
      }

      const resData = await respuesta.json();

      if (editando) {
        setUsuarios(
          usuarios.map((u) => (u._id === usuarioId ? resData.usuario : u))
        );
        Swal.fire({
          icon: "success",
          title: "Usuario editado",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        setUsuarios([...usuarios, resData.usuario]);
        Swal.fire({
          icon: "success",
          title: "Usuario creado",
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
    }
  };

  const borrarUsuario = async (id) => {
    const result = await Swal.fire({
      title: "¿Borrar usuario?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: "swal-btn-danger" },
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      const respuesta = await borrarUsuarioAPI(id);
      if (respuesta?.ok) {
        setUsuarios(usuarios.filter((u) => u._id !== id));
        Swal.fire({
          icon: "success",
          title: "Usuario borrado",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    }
  };

  const abrirEditar = (usuario) => {
    setEditando(true);
    setUsuarioId(usuario._id);
    reset({
      nombre: usuario.nombre,
      usuario: usuario.usuario,
      contrasena: "",
      rol: usuario.rol,
    });
    setShowModal(true);
  };

  const abrirCrear = () => {
    setEditando(false);
    setUsuarioId(null);
    reset(valoresIniciales);
    setShowModal(true);
  };

  const rolLabel = (rol) => {
    const labels = {
      superadministrador: "Superadministrador",
      administrador: "Administrador",
      operador: "Operador",
    };
    return labels[rol] || rol;
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    const texto = busqueda.trim().toLowerCase();
    const nombre = u.nombre?.toLowerCase() || "";
    const usuario = u.usuario?.toLowerCase() || "";
    return nombre.startsWith(texto) || usuario.startsWith(texto);
  });

  if (!autorizado) {
    return (
      <Container className="my-5">
        <Row className="justify-content-center">
          <Col xs={12} md={6} lg={4}>
            <div className="shadow-sm rounded p-4">
              <h3 className="text-center mb-4">Acceso a Usuarios</h3>
              <p className="text-center text-muted mb-3">
                Ingrese la contraseña del superadministrador
              </p>
              <Form onSubmit={intentarAcceso}>
                <Form.Group className="mb-3">
                  <Form.Control
                    type="password"
                    placeholder="Contraseña"
                    value={claveAcceso}
                    onChange={(e) => setClaveAcceso(e.target.value)}
                    isInvalid={!!errorAcceso}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errorAcceso}
                  </Form.Control.Feedback>
                </Form.Group>
                <div className="d-flex gap-2 justify-content-center">
                  <Button variant="outline-primary" type="submit">
                    Ingresar
                  </Button>
                  <Button
                    variant="outline-success"
                    onClick={() => navigate(-1)}
                  >
                    Volver
                  </Button>
                </div>
              </Form>
            </div>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container className="my-3">
      <div className="mb-0">
        <h2 className="mb-0">Usuarios</h2>
      </div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="w-25 mt-0">
          <Form.Control
            type="search"
            placeholder="Buscar por nombre o usuario"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="d-flex flex-column gap-2">
          <Button variant="outline-success" onClick={() => navigate(-1)}>
            Volver
          </Button>
          <Button variant="outline-primary" onClick={abrirCrear}>
            Crear Usuario
          </Button>
        </div>
      </div>

      <Row className="justify-content-center">
        <Col xs={12} md={12} lg={10} xl={10}>
          <div className="table-responsive shadow-sm rounded">
            <Table
              striped
              bordered
              hover
              className="text-center align-middle mb-0"
            >
              <thead className="table-dark">
                <tr>
                  <th>Nombre</th>
                  <th>Usuario</th>
                  <th>Contraseña</th>
                  <th>Rol</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-3">
                      No hay usuarios cargados
                    </td>
                  </tr>
                ) : (
                  usuariosFiltrados.map((usuario) => (
                    <tr key={usuario._id}>
                      <td className="fw-bold">{usuario.nombre}</td>
                      <td>{usuario.usuario}</td>
                      <td>{usuario.contrasenaVisible}</td>
                      <td>{rolLabel(usuario.rol)}</td>
                      <td>
                        <div className="d-flex gap-2 justify-content-center">
                          <Button
                            size="sm"
                            variant="outline-warning"
                            onClick={() => abrirEditar(usuario)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => borrarUsuario(usuario._id)}
                          >
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

      <UsuariosModal
        show={showModal}
        onHide={cerrarModal}
        onSubmit={onSubmit}
        handleSubmit={handleSubmit}
        register={register}
        errors={errors}
        editando={editando}
        usuarios={usuarios}
        usuarioId={usuarioId}
      />
    </Container>
  );
};

export default UsuariosCrud;
