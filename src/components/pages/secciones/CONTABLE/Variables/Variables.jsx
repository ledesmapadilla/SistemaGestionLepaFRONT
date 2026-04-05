import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  crearVariable,
  editarVariable,
  listarVariables,
  borrarVariable as borrarVariableAPI,
} from "../../../../../helpers/queriesVariables.js";
import Swal from "sweetalert2";
import { Modal, Button, Table } from "react-bootstrap";
import VariablesTabla from "./VariablesTabla.jsx";
import VariablesModal from "./VariablesModal.jsx";

const valoresIniciales = {
  variable: "",
  valor: "",
  fecha: "",
  observaciones: "",
};

const formatoMoneda = (valor) => {
  if (valor === undefined || valor === null || valor === "" || Number(valor) === 0) return "-";
  return Number(valor).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
};

const formatearFecha = (fecha) => {
  if (!fecha || fecha === "-") return "-";
  const p = fecha.split("-");
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : fecha;
};

const Variables = () => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: valoresIniciales,
    mode: "onChange",
  });

  const [variables, setVariables] = useState([]);
  const [editando, setEditando] = useState(false);
  const [variableId, setVariableId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showVer, setShowVer] = useState(false);
  const [variableVer, setVariableVer] = useState(null);

  useEffect(() => {
    const cargarVariables = async () => {
      const respuesta = await listarVariables();
      if (respuesta?.ok) {
        const data = await respuesta.json();
        setVariables(data);
      }
    };
    cargarVariables();
  }, []);

  const cerrarModal = () => {
    setShowModal(false);
    setEditando(false);
    setVariableId(null);
    reset(valoresIniciales);
  };

  const onSubmit = async (data) => {
    try {
      let respuesta;
      let dataToSend;

      if (editando) {
        dataToSend = {
          variable: data.variable,
          historial: data.historial,
        };
        respuesta = await editarVariable(variableId, dataToSend);
      } else {
        const today = new Date();
        const hoy = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
        dataToSend = {
          variable: data.variable,
          historial: data.valor
            ? [{ valor: Number(data.valor), fecha: data.fecha || hoy, observaciones: data.observaciones || "" }]
            : [],
        };
        respuesta = await crearVariable(dataToSend);
      }

      if (!respuesta.ok) {
        const errorData = await respuesta.json();
        Swal.fire({
          icon: "error",
          title: "Error",
          text: errorData.mensaje || "No se pudo guardar la variable",
        });
        return;
      }

      const resData = await respuesta.json();

      if (editando) {
        setVariables(
          variables.map((v) => (v._id === variableId ? resData.variable : v))
        );
        Swal.fire({
          icon: "success",
          title: "Variable actualizada",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        setVariables([...variables, resData.variable]);
        Swal.fire({
          icon: "success",
          title: "Variable creada",
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

  const borrarVariable = async (id) => {
    const result = await Swal.fire({
      title: "¿Eliminar variable?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: "swal-btn-danger" },
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      const respuesta = await borrarVariableAPI(id);

      if (respuesta?.ok) {
        setVariables(variables.filter((v) => v._id !== id));
        Swal.fire({
          icon: "success",
          title: "Variable eliminada",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    }
  };

  const abrirEditar = (variable) => {
    setEditando(true);
    setVariableId(variable._id);
    reset({
      variable: variable.variable,
      historial: variable.historial || [],
    });
    setShowModal(true);
  };

  const abrirVer = (variable) => {
    setVariableVer(variable);
    setShowVer(true);
  };

  const abrirCrear = () => {
    const hoy = new Date().toISOString().slice(0, 10);
    setEditando(false);
    setVariableId(null);
    reset({ ...valoresIniciales, fecha: hoy });
    setShowModal(true);
  };

  return (
    <>
      <VariablesTabla
        variables={variables}
        abrirCrear={abrirCrear}
        abrirEditar={abrirEditar}
        abrirVer={abrirVer}
        borrarVariable={borrarVariable}
      />

      <VariablesModal
        show={showModal}
        onHide={cerrarModal}
        editando={editando}
        onSubmit={onSubmit}
        register={register}
        handleSubmit={handleSubmit}
        errors={errors}
        cerrarModal={cerrarModal}
        variables={variables}
        variableId={variableId}
      />

      <Modal show={showVer} onHide={() => setShowVer(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{variableVer?.variable}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h6 className="text-center fw-bold">Historial</h6>
          <Table bordered size="sm" className="text-center align-middle">
            <thead className="table-dark">
              <tr>
                <th>Fecha</th>
                <th>Valor</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(variableVer?.historial) && variableVer.historial.length > 0) ? (
                [...variableVer.historial]
                  .sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""))
                  .map((item, i) => (
                  <tr key={i}>
                    <td>{formatearFecha(item.fecha)}</td>
                    <td>{formatoMoneda(item.valor)}</td>
                    <td>{item.observaciones || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="text-muted">Sin historial</td>
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
    </>
  );
};

export default Variables;
