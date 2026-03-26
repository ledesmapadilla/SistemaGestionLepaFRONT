import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  crearProveedor,
  editarProveedor,
  listarProveedores,
  borrarProveedor as borrarProveedorAPI,
} from "../../../../../helpers/queriesProveedores.js";
import Swal from "sweetalert2";
import "../../../../../styles/clientes.css";
import ProveedoresCrud from "./ProveedoresCrud.jsx";
import ProveedoresModal from "./ProveedoresModal.jsx";

const valoresIniciales = {
  razonsocial: "",
  contacto: "",
  rubro: "",
  cuit: "",
  email: "",
  telefono: "",
};

const Proveedores = () => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: valoresIniciales,
    mode: "onChange",
  });
  const [contactoOriginal, setContactoOriginal] = useState("");

  const [proveedores, setProveedores] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState(false);
  const [proveedorId, setProveedorId] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const cargarProveedores = async () => {
      const respuesta = await listarProveedores();
      if (respuesta?.ok) {
        const data = await respuesta.json();
        setProveedores(data);
      }
    };
    cargarProveedores();
  }, []);

  const cerrarModal = () => {
    setShowModal(false);
    setEditando(false);
    setProveedorId(null);
    reset(valoresIniciales);
  };

  const onSubmit = async (data) => {
    try {
      let respuesta;

      if (editando) {
        respuesta = await editarProveedor(proveedorId, data);
      } else {
        respuesta = await crearProveedor(data);
      }

      //backend devolvió error
      if (!respuesta.ok) {
        const errorData = await respuesta.json();

        if (!respuesta.ok) {
          const errorData = await respuesta.json();

          Swal.fire({
            icon: "error",
            title: "Error",
            text: errorData.mensaje || "No se pudo guardar el proveedor",
          });

          return;
        }

        return;
      }

      // éxito
      const resData = await respuesta.json();

      if (editando) {
        setProveedores(
          proveedores.map((p) =>
            p._id === proveedorId ? resData.proveedor : p
          )
        );

        Swal.fire({
          icon: "success",
          title: "Proveedor actualizado",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        setProveedores([...proveedores, resData.proveedor]);

        Swal.fire({
          icon: "success",
          title: "Proveedor creado",
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

  const borrarProveedor = async (id) => {
    const result = await Swal.fire({
      title: "¿Eliminar proveedor?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: 'swal-btn-danger' },
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      const respuesta = await borrarProveedorAPI(id);

      if (respuesta?.ok) {
        setProveedores(proveedores.filter((p) => p._id !== id));

        Swal.fire({
          icon: "success",
          title: "Proveedor eliminado",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    }
  };

  const abrirEditar = (proveedor) => {
    setEditando(true);
    setProveedorId(proveedor._id);
    setContactoOriginal(proveedor.contacto);

    reset({
      razonsocial: proveedor.razonsocial,
      contacto: proveedor.contacto,
      rubro: proveedor.rubro,
      cuit: proveedor.cuit,
      email: proveedor.email,
      telefono: proveedor.telefono,
    });

    setShowModal(true);
  };

  const abrirCrear = () => {
    setEditando(false);
    setProveedorId(null);
    reset(valoresIniciales);
    setShowModal(true);
  };

  

  return (
    <>
      <ProveedoresCrud
        proveedores={proveedores}
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        abrirCrear={abrirCrear}
        abrirEditar={abrirEditar}
        borrarProveedor={borrarProveedor}
      />

      <ProveedoresModal
        show={showModal}
        cerrarModal={cerrarModal}
        handleSubmit={handleSubmit}
        onSubmit={onSubmit}
        editando={editando}
        proveedorId={proveedorId}
        proveedores={proveedores}
        contactoOriginal={contactoOriginal}
        register={register}
        errors={errors}
      />
    </>
  );
};

export default Proveedores;
