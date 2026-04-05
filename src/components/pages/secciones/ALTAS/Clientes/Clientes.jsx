import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  crearCliente,
  editarCliente,
  listarClientes,
  borrarCliente as borrarClienteAPI,
} from "../../../../../helpers/queriesClientes.js";
import Swal from "sweetalert2";
import "../../../../../styles/clientes.css";
import ClientesCrud from "./ClientesCrud.jsx";
import ClientesModal from "./ClientesModal.jsx";

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

  const abrirCrear = () => {
    setEditando(false);
    setClienteId(null);
    reset(valoresIniciales);
    setShowModal(true);
  };

  

  return (
    <>
      <ClientesCrud
        clientes={clientes}
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        abrirCrear={abrirCrear}
        abrirEditar={abrirEditar}
        borrarCliente={borrarCliente}
      />

      <ClientesModal
        show={showModal}
        onHide={cerrarModal}
        editando={editando}
        onSubmit={onSubmit}
        register={register}
        handleSubmit={handleSubmit}
        errors={errors}
        cerrarModal={cerrarModal}
      />
    </>
  );
};

export default Clientes;
