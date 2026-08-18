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
import { crearRemito, proximoNumeroRemito } from "../../../../../helpers/queriesRemitos.js";

import "../../../../../styles/clientes.css";

const hoy = () => new Date().toISOString().split("T")[0];

const valoresIniciales = {
  razonsocial: "",
  nombreobra: "",
  contacto: "",
  telefono: "",
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
    formState: { errors, isSubmitting },
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
  const [modalidadOriginal, setModalidadOriginal] = useState("");

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
    setModalidadOriginal("");
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

    // Cambio de modalidad en edición: avisar qué va a pasar con los remitos.
    const cambiaModalidad = editando && data.modalidad !== modalidadOriginal;
    if (cambiaModalidad) {
      const aPrecioCerrado = data.modalidad === "Precio cerrado";
      const confirmacion = await Swal.fire({
        icon: "warning",
        title: `¿Cambiar la modalidad a "${data.modalidad}"?`,
        html: aPrecioCerrado
          ? "Los remitos <b>sin facturar</b> de la obra pasarán a <b>Obra propia</b> y se creará el remito automático con el precio de la obra.<br><br>Los remitos ya facturados no se modifican."
          : "Los remitos de <b>Obra propia</b> pasarán a <b>Sin facturar</b> y se borrará el remito automático del precio de la obra.<br><br>Los remitos ya facturados no se modifican.",
        showCancelButton: true,
        confirmButtonText: "Sí, cambiar",
        cancelButtonText: "Cancelar",
      });
      if (!confirmacion.isConfirmed) return;
    }

    // Al pasar a precio cerrado, asegurar la fila de precio de la obra.
    let preciosAGuardar = precios;
    if (
      cambiaModalidad &&
      data.modalidad === "Precio cerrado" &&
      !precios.some((p) => p.clasificacion === "Precio cerrado")
    ) {
      preciosAGuardar = [
        ...precios,
        {
          clasificacion: "Precio cerrado",
          trabajo: "Precio de la obra",
          precio: "",
          unidad: "Global",
          observaciones: "",
          fecha: hoy(),
        },
      ];
      setPrecios(preciosAGuardar);
    }

    try {
      const preciosNormalizados = preciosAGuardar.map((p) => {
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

          const filaPrecioCerrado = preciosAGuardar.find((p) => p.clasificacion === "Precio cerrado");
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
            const nextNum = await proximoNumeroRemito(9000);

            await crearRemito({
              obra: obraGuardada._id,
              remito: nextNum,
              fecha: hoyStr,
              estado: "Sin facturar",
              items: itemsRemito,
            });

            // Se permite crear la obra sin el precio definido, pero hay que
            // avisar: el remito automático queda en $0 y no se puede facturar
            // hasta que se cargue el precio en la obra.
            if (!esNumerico) {
              await Swal.fire({
                icon: "info",
                title: "Precio de la obra sin definir",
                html: `Se creó el remito automático <b>N° ${nextNum}</b> con importe <b>$0</b>.<br><br>Cuando cargues el precio cerrado en la obra, el remito lo toma solo. Hasta entonces no se puede facturar.`,
              });
            }
          }
        } catch (err) {
          console.error("Error al crear remito automático:", err);
        }
      }

      cerrarModal();
      const remitosActualizados = obraGuardada.remitosActualizados || 0;
      const cambio = resData.cambioModalidad;

      const detalles = [];
      if (cambio) {
        if (cambio.remitosMigrados > 0) {
          detalles.push(
            cambio.hasta === "Precio cerrado"
              ? `${cambio.remitosMigrados} remito(s) pasaron a "Obra propia".`
              : `${cambio.remitosMigrados} remito(s) pasaron a "Sin facturar".`
          );
        }
        if (cambio.remitoAutoCreado)
          detalles.push(`Se creó el remito automático N° ${cambio.remitoAutoCreado}.`);
        if (cambio.remitoAutoBorrado)
          detalles.push(`Se borró el remito automático N° ${cambio.remitoAutoBorrado}.`);
        if (cambio.remitosFacturadosSinTocar > 0)
          detalles.push(
            `${cambio.remitosFacturadosSinTocar} remito(s) facturados no se modificaron.`
          );
      }
      if (editando && remitosActualizados > 0)
        detalles.push(`Se actualizaron precios en ${remitosActualizados} remito(s).`);

      Swal.fire({
        icon: "success",
        title: editando ? "Obra actualizada" : "Obra creada",
        html: detalles.length > 0 ? detalles.join("<br>") : undefined,
        timer: detalles.length > 0 ? 4000 : 2000,
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
    setModalidadOriginal(obra.modalidad || "");
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
          ? { ...p, precio: (p.precio && p.precio !== 0) ? String(p.precio) : "", observaciones: (p.observaciones === "-") ? "" : (p.observaciones || "") }
          : p
      )
    );
    setShowModal(true);
  };

  const abrirCrear = () => {
    setEditando(false);
    setVerDetalle(false);
    setObraId(null);
    setModalidadOriginal("");
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
        isSubmitting={isSubmitting}
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
