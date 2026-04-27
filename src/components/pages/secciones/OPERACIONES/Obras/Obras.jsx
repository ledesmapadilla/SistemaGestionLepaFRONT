import { useState, useEffect, useMemo } from "react";
import { Spinner } from "react-bootstrap";
import { useForm } from "react-hook-form";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

// Componentes Hijos
import CrudObras from "./ObrasCrud.jsx";
import ModalObras from "./ObrasModal.jsx";
import ModalPrecios from "./PreciosModal.jsx";
import ModalListaPrecios from "./ListaPreciosModal.jsx";
import RemitosModal from "../../../secciones/OPERACIONES/Remitos/RemitosModal.jsx";


// Helpers / APIs
import { listarClientes } from "../../../../../helpers/queriesClientes.js";
import { listarVariables } from "../../../../../helpers/queriesVariables.js";
import { listarPrecios as listarPreciosContable } from "../../../../../helpers/queriesPrecios.js";
import {
  crearObra,
  editarObra,
  listarObras,
  borrarObra as borrarObraAPI,
} from "../../../../../helpers/queriesObras.js";
import { crearRemito, listarRemitos } from "../../../../../helpers/queriesRemitos.js";

import "../../../../../styles/clientes.css";

const hoy = () => new Date().toISOString().split("T")[0];

const valoresIniciales = {
  razonsocial: "",
  nombreobra: "",
  contacto: "",
  estado: "En curso",
  fecha: hoy(),
  descripcion: "",
  modalidad: "Alquiler",
};

const Obras = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: valoresIniciales,
    mode: "onChange",
  });

  // ==================== ESTADOS ====================
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState(() => sessionStorage.getItem("obrasBusqueda") || "");
  const [filtroEstado, setFiltroEstado] = useState("En curso");

  useEffect(() => {
    sessionStorage.setItem("obrasBusqueda", busqueda);
  }, [busqueda]);


  // Estados para Crear/Editar Obra
  const [editando, setEditando] = useState(false);
  const [verDetalle, setVerDetalle] = useState(false);
  const [obraId, setObraId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [nombreObraOriginal, setNombreObraOriginal] = useState("");

  // Clientes
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [inputCliente, setInputCliente] = useState("");

  // Precios
  const [precios, setPrecios] = useState([]);
  const [preciosDraft, setPreciosDraft] = useState([]);
  const [showPrecioModal, setShowPrecioModal] = useState(false);
  const [showListaPrecios, setShowListaPrecios] = useState(false);
  const [preciosSeleccionados, setPreciosSeleccionados] = useState([]);
  const [obraSeleccionada, setObraSeleccionada] = useState(null); // Usado para ver precios

  // Remitos
  const [showModalRemito, setShowModalRemito] = useState(false);
  const [obraRemito, setObraRemito] = useState(null);

  const [variables, setVariables] = useState([]);
  const [preciosContable, setPreciosContable] = useState([]);

  // ==================== EFFECTS ====================
  useEffect(() => {
    const cargarObras = async () => {
      const resp = await listarObras();
      if (resp?.ok) {
        const data = await resp.json();
        setObras(data.filter((o) => o && o._id));
      }
      setLoading(false);
    };
    cargarObras();
  }, []);

  useEffect(() => {
    const cargarClientes = async () => {
      const resp = await listarClientes();
      if (resp?.ok) {
        const data = await resp.json();
        setClientes(data);
      }
    };
    cargarClientes();
  }, []);

  useEffect(() => {
    const cargarVariables = async () => {
      const resp = await listarVariables();
      if (resp?.ok) {
        const data = await resp.json();
        setVariables(data);
      }
    };
    cargarVariables();
  }, []);

  useEffect(() => {
    const cargarPreciosContable = async () => {
      const resp = await listarPreciosContable();
      if (resp?.ok) {
        const data = await resp.json();
        setPreciosContable(data);
      }
    };
    cargarPreciosContable();
  }, []);

  // ==================== FUNCIONES OBRAS ====================
  const cerrarModal = () => {
    setShowModal(false);
    setEditando(false);
    setVerDetalle(false);
    setObraId(null);
    reset(valoresIniciales);
    setPrecios([]);
    setClienteSeleccionado(null);
    setInputCliente("");
  };

  const onSubmit = async (data) => {
    if (precios.length === 0) {
      Swal.fire({ icon: "warning", title: "Precios obligatorios", text: "Debés cargar al menos un precio antes de guardar." });
      return;
    }
    try {
      const preciosNormalizados = precios.map((p) => {
        if (p.clasificacion === "Precio cerrado") {
          const esNumero = p.precio !== "" && !isNaN(Number(p.precio));
          return {
            trabajo: p.trabajo,
            clasificacion: p.clasificacion,
            precio: esNumero ? Number(p.precio) : 0,
            unidad: p.unidad || "Global",
            observaciones: p.observaciones?.trim() || "-",
            fecha: p.fecha || null,
          };
        }
        return {
          trabajo: p.trabajo,
          clasificacion: p.clasificacion,
          precio: Number(p.precio),
          unidad: p.unidad,
          observaciones: p.observaciones?.trim() || "-",
          fecha: p.fecha || null,
        };
      });

      const dataConPrecios = { ...data, precio: preciosNormalizados };
      let respuesta;

      if (editando) respuesta = await editarObra(obraId, dataConPrecios);
      else respuesta = await crearObra(dataConPrecios);

      if (!respuesta.ok) {
        const errorData = await respuesta.json();
        Swal.fire({
          icon: "error",
          title: "Error",
          text: errorData.mensaje || "Error al guardar",
        });
        return;
      }

      const resData = await respuesta.json();
      const obraGuardada = resData.obra || resData;

      if (editando)
        setObras((prev) => prev.map((o) => (o._id === obraId ? obraGuardada : o)));
      else setObras((prev) => [...prev, obraGuardada]);

      // Crear remito automático para obras de precio cerrado (solo al crear)
      // La obra recién creada no tiene remitos → número 9000 (único por {obra, remito})
      if (!editando && data.modalidad === "Precio cerrado") {
        try {
          const hoyStr = hoy();

          const filaPrecioCerrado = precios.find((p) => p.clasificacion === "Precio cerrado");
          const precioObra = filaPrecioCerrado?.precio;
          const esNumerico = precioObra && precioObra !== "No definido por el momento" && !isNaN(Number(precioObra));

          const itemsRemito = [{
            fecha: hoyStr,
            maquina: "",
            servicio: "Precio de la obra",
            personal: "",
            cantidad: 1,
            precioUnitario: esNumerico ? Number(precioObra) : 0,
            costoHoraPersonal: 0,
            unidad: "Global",
            gasoil: 0,
            observaciones: "",
          }];

          if (itemsRemito.length > 0) {
            const todosRemitos = await listarRemitos();
            const usados = new Set(todosRemitos.map((r) => Number(r.remito)));
            let nextNum = 9000;
            while (usados.has(nextNum)) nextNum++;

            await crearRemito({
              obra: obraGuardada._id,
              remito: nextNum,
              fecha: hoyStr,
              estado: "Sin facturar",
              items: itemsRemito,
            });
          }
        } catch (err) {
          console.error("Error al crear remito automático:", err);
        }
      }

      cerrarModal();
      Swal.fire({
        icon: "success",
        title: editando ? "Obra actualizada" : "Obra creada",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({ icon: "error", title: "Error", text: "No se pudo procesar" });
    }
  };

  const abrirObra = (obra) => {
    setEditando(true);
    setObraId(obra._id);
    setNombreObraOriginal(obra.nombreobra);
    setClienteSeleccionado({
      value: obra.razonsocial,
      label: obra.razonsocial,
    });
    reset({
      ...obra,
      fecha: obra.fecha ? obra.fecha.substring(0, 10) : "",
    });
    setPrecios(
      (obra.precio || []).map((p) =>
        p.clasificacion === "Precio cerrado"
          ? { ...p, precio: (p.observaciones === "-" || !p.observaciones) ? "" : p.observaciones }
          : p
      )
    );
    setShowModal(true);
  };

  const abrirCrear = () => {
    setEditando(false);
    setVerDetalle(false);
    setObraId(null);
    reset(valoresIniciales);
    setPrecios([]);
    setShowModal(true);
  };

  const abrirDetalleObra = (obra) => {
    setVerDetalle(true);
    abrirObra(obra);
  };

  const borrarObra = async (id) => {
    const result = await Swal.fire({
      title: "¿Seguro querés borrar la obra?",
      
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: 'swal-btn-danger' },
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    });
    if (result.isConfirmed) {
      const resp = await borrarObraAPI(id);
      if (resp?.ok) {
        setObras((prev) => prev.filter((o) => o._id !== id));
        Swal.fire({ icon: "success", title: "Obra borrada", timer: 2000, showConfirmButton: false });
      }
    }
  };

  // ==================== OTROS MODALES Y NAVEGACIÓN ====================
  const ultimaListaPrecios = useMemo(() => {
    if (preciosContable.length === 0) return [];
    const grupos = {};
    preciosContable.forEach((p) => {
      const key = p.nombre || p.fecha;
      if (!grupos[key]) grupos[key] = { fecha: p.fecha, items: [] };
      grupos[key].items.push(p);
    });
    const ordenadas = Object.values(grupos).sort(
      (a, b) => new Date(b.fecha) - new Date(a.fecha)
    );
    return ordenadas.length > 0 ? ordenadas[0].items : [];
  }, [preciosContable]);

  const getGasoilParaFecha = (fechaObra) => {
    const varGasoil = variables.find((v) => v.variable === "Gasoil");
    if (!varGasoil || !Array.isArray(varGasoil.historial) || varGasoil.historial.length === 0) return "";
    const historial = [...varGasoil.historial].sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));
    if (!fechaObra) return historial[historial.length - 1].valor;
    const anteriores = historial.filter((h) => h.fecha && h.fecha <= fechaObra);
    if (anteriores.length > 0) return anteriores[anteriores.length - 1].valor;
    return historial[0].valor;
  };

  const abrirModalPrecios = () => {
    setPreciosDraft(precios);
    setShowPrecioModal(true);
  };
  const guardarModalPrecios = () => {
    setPrecios(preciosDraft);
    setShowPrecioModal(false);
  };

  const verPrecios = (obra) => {
    setObraSeleccionada(obra);
    setPreciosSeleccionados(obra.precio || []);
    setShowListaPrecios(true);
  };

  const abrirModalRemito = (obra) => {
    setObraRemito(obra);
    setShowModalRemito(true);
  };
  const cerrarModalRemito = () => {
    setShowModalRemito(false);
    setObraRemito(null);
  };

  const abrirTablaRemitos = (obra) => {
    navigate("/remitos", {
      state: {
        obraId: obra._id,
        obraNombre: obra.nombreobra,
        razonsocial: obra.razonsocial,
        precios: obra.precio,
        modalidad: obra.modalidad,
      },
    });
  };

  // Mantenemos esta función porque hace una navegación
  const verTablaGastos = (obra) => {
    navigate("/gastos", {
      state: {
        obraId: obra._id,
        obraNombre: obra.nombreobra,
        razonsocial: obra.razonsocial,
        precios: obra.precio,
      },
    });
  };

  if (loading) return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <>
      <CrudObras
        obras={obras}
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        filtroEstado={filtroEstado}
        setFiltroEstado={setFiltroEstado}
        abrirCrear={abrirCrear}
        abrirObra={abrirObra}
        abrirDetalleObra={abrirDetalleObra}
        abrirModalRemito={abrirModalRemito}
        abrirTablaRemitos={abrirTablaRemitos}
        borrarObra={borrarObra}
        verPrecios={verPrecios}
        verTablaGastos={verTablaGastos}
      />

      <RemitosModal
        show={showModalRemito}
        onCancel={cerrarModalRemito}
        obra={obraRemito}
        onCreated={cerrarModalRemito}
      />

      <ModalObras
        show={showModal}
        onHide={cerrarModal}
        editando={editando}
        verDetalle={verDetalle}
        handleSubmit={handleSubmit}
        onSubmit={onSubmit}
        register={register}
        errors={errors}
        clientes={clientes}
        clienteSeleccionado={clienteSeleccionado}
        setClienteSeleccionado={setClienteSeleccionado}
        inputCliente={inputCliente}
        setInputCliente={setInputCliente}
        setValue={setValue}
        obras={obras}
        obraId={obraId}
        nombreObraOriginal={nombreObraOriginal}
        abrirModalPrecios={abrirModalPrecios}
      />

      <ModalPrecios
        show={showPrecioModal}
        precios={preciosDraft}
        setPrecios={setPreciosDraft}
        onCancel={() => setShowPrecioModal(false)}
        onSave={guardarModalPrecios}
        editando={editando}
        gasoilAutomatic={getGasoilParaFecha(watch("fecha"))}
        ultimaListaPrecios={ultimaListaPrecios}
        modalidad={watch("modalidad")}
      />

      {showListaPrecios && obraSeleccionada && (
        <ModalListaPrecios
          show={true}
          onClose={() => setShowListaPrecios(false)}
          precios={preciosSeleccionados}
          nombreObra={obraSeleccionada.nombreobra}
        />
      )}
    </>
  );
};

export default Obras;
