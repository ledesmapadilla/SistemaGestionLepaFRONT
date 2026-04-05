import React, { useState, useEffect } from "react";
import { Table, Button, Modal, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  crearCliente,
  editarCliente,
  listarClientes,
  borrarCliente as borrarClienteAPI,
} from "../../../../../helpers/queriesClientes.js";
import Swal from "sweetalert2"
import "../../../../../styles/clientes.css";

const valoresIniciales = {
  razonsocial: "",
  contacto: "",
  cuit: "",
  email: "",
  telefono: "",
};

const Clientes = () => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: valoresIniciales,
    mode: "onChange",
  });
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState(false);
  const [clienteId, setClienteId] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const cargarClientes = async () => {
      const respuesta = await listarClientes();
      if (respuesta?.ok) {
        const data = await respuesta.json();
        setClientes(data);
      }
    };
    cargarClientes();
  }, []);

  const cerrarModal = () => {
    setShowModal(false);
    setEditando(false);
    setClienteId(null);
    reset(valoresIniciales);
  };

  const onSubmit = async (data) => {
    try {
      let respuesta;

      if (editando) {
        respuesta = await editarCliente(clienteId, data);
      } else {
        respuesta = await crearCliente(data);
      }

      //backend devolvió error
      if (!respuesta.ok) {
        const errorData = await respuesta.json();

        Swal.fire({
          icon: "error",
          title: "Error",
          text: errorData.mensaje || "No se pudo guardar el cliente",
        });

        return;
      }

      // éxito
      const resData = await respuesta.json();

      if (editando) {
        setClientes(
          clientes.map((c) => (c._id === clienteId ? resData.cliente : c))
        );

        Swal.fire({
          icon: "success",
          title: "Cliente actualizado",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        setClientes([...clientes, resData.cliente]);

        Swal.fire({
          icon: "success",
          title: "Cliente creado",
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

  const borrarCliente = async (id) => {
    const result = await Swal.fire({
      title: "¿Eliminar cliente?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: 'swal-btn-danger' },
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      const respuesta = await borrarClienteAPI(id);

      if (respuesta?.ok) {
        setClientes(clientes.filter((c) => c._id !== id));

        Swal.fire({
          icon: "success",
          title: "Cliente eliminado",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    }
  };

  const abrirEditar = (cliente) => {
    setEditando(true);
    setClienteId(cliente._id);
    reset({
      razonsocial: cliente.razonsocial,
      contacto: cliente.contacto,
      cuit: cliente.cuit,
      email: cliente.email,
      telefono: cliente.telefono,
    });

    setShowModal(true);
  };

  const navigate = useNavigate();

  const abrirCrear = () => {
    setEditando(false);
    setClienteId(null);
    reset(valoresIniciales);
    setShowModal(true);
  };

  const clientesFiltrados = clientes.filter((cliente) => {
    const texto = busqueda.trim().toLowerCase();
    const razon = cliente.razonsocial?.toLowerCase() || "";
    const contacto = cliente.contacto?.toLowerCase() || "";

    return razon.startsWith(texto) || contacto.startsWith(texto);
  });

  return (
    <>
      <h2 className="mt-2">Clientes</h2>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="w-25">
          <Form.Control
            type="search"
            placeholder="Buscar por razón social o contacto"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="d-flex flex-column gap-2">
          <Button variant="outline-success" onClick={() => navigate(-1)}>
            Volver
          </Button>
          <Button variant="outline-primary" onClick={abrirCrear} className="btn-sin-hover">
            Crear Cliente
          </Button>
        </div>
      </div>

      <div className="table-responsive">
        <Table striped bordered hover className="text-center align-middle">
          <thead className="table-dark">
            <tr>
              <th>Razón Social</th>
              <th>Contacto</th>
              <th>CUIT</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.length === 0 ? (
              <tr>
                <td colSpan="6">No hay clientes cargados</td>
              </tr>
            ) : (
              clientesFiltrados.map((cliente) => (
                <tr key={cliente._id}>
                  <td>{cliente.razonsocial || "-"}</td>
                  <td>{cliente.contacto || "-"}</td>
                  <td>{cliente.cuit || "-"}</td>
                  <td>{cliente.email || "-"}</td>
                  <td>{cliente.telefono || "-"}</td>
                  <td className="d-flex gap-1 justify-content-center">
                    <Button
                      size="sm"
                      variant="outline-warning"
                      onClick={() => abrirEditar(cliente)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => borrarCliente(cliente._id)}
                    >
                      Borrar
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* MODAL */}
      <Modal show={showModal} onHide={cerrarModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {editando ? "Editar Cliente" : "Crear Cliente"}
          </Modal.Title>
        </Modal.Header>

        <Form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Razón Social*</Form.Label>
              <Form.Control
                {...register("razonsocial", {
                  required: "La razón social es obligatoria",
                  validate: (value) =>
                    !clientes.some(
                      (c) =>
                        c.razonsocial.toLowerCase().trim() ===
                          value.toLowerCase().trim() && c._id !== clienteId
                    ) || "La razón social ya existe",
                })}
              />
              <Form.Text className="text-danger">
                {errors.razonsocial?.message}
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Contacto*</Form.Label>
              <Form.Control
                {...register("contacto", {
                  required: "El contacto es obligatorio",
                })}
              />

              <Form.Text className="text-danger">
                {errors.contacto?.message}
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>CUIT</Form.Label>
              <Form.Control
                type="text"
                {...register("cuit", {
                  pattern: {
                    value: /^[0-9]{11}$/,
                    message: "El CUIT debe tener 11 dígitos",
                  },
                })}
              />
              <Form.Text className="text-danger">
                {errors.cuit?.message}
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control type="email" {...register("email")} />
            </Form.Group>

            <Form.Group>
              <Form.Label>Teléfono*</Form.Label>
              <Form.Control
                {...register("telefono", {
                  required: "El teléfono es obligatorio",
                })}
              />
              <Form.Text className="text-danger">
                {errors.telefono?.message}
              </Form.Text>
            </Form.Group>
          </Modal.Body>

          <Modal.Footer className="justify-content-center">
            <Button variant="outline-secondary" onClick={cerrarModal}>
              Cancelar
            </Button>
            <Button variant="outline-success" type="submit">
              Guardar
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
};

export default Clientes;
