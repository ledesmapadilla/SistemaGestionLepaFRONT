import React, { useState, useEffect, useMemo } from "react";
import {
  crearPrecio as crearPrecioAPI,
  editarPrecio,
  listarPrecios,
  borrarPrecio as borrarPrecioAPI,
} from "../../../../../helpers/queriesPrecios.js";
import { listarMaquinas } from "../../../../../helpers/queriesMaquinas.js";
import { listarVariables } from "../../../../../helpers/queriesVariables.js";
import { listarPersonal } from "../../../../../helpers/queriesPersonal.js";
import {
  obtenerConsumoGasoil,
  guardarConsumoGasoil as guardarConsumoGasoilAPI,
} from "../../../../../helpers/queriesConsumoGasoil.js";
import Swal from "sweetalert2";
import PreciosTabla from "./PreciosTabla.jsx";
import ConsumosGasoilModal from "./ConsumosGasoilModal.jsx";
import CotizarModal from "./CotizarModal.jsx";
import DetallePrecioModal from "./DetallePrecioModal.jsx";
import CrearListaModal from "./CrearListaModal.jsx";

const GRUPOS = {
  PC200: ["PC1", "PC2", "PC3", "PC4", "PC5"],
  "John Deere": ["JD1", "JD2"],
  "Mercedes Benz": ["ETX", "EIQ"],
  "Pala cargadora": ["WA200"],
  "Carretón chico x km": ["Carretón chico"],
  "Viaje de batea x km": ["Batea"],
};

const EXCLUIR = ["XCMG"];

const buildConsumosFromMaquinas = (maquinas, consumosGuardados) => {
  const unicas = [];
  const nombresVistos = new Set();
  const gruposAgregados = new Set();
  maquinas.forEach((m) => {
    if (nombresVistos.has(m.maquina)) return;
    if (EXCLUIR.includes(m.maquina)) return;
    nombresVistos.add(m.maquina);
    const grupo = Object.entries(GRUPOS).find(([, nombres]) =>
      nombres.includes(m.maquina)
    );
    if (grupo) {
      const [nombreGrupo] = grupo;
      if (!gruposAgregados.has(nombreGrupo)) {
        gruposAgregados.add(nombreGrupo);
        const guardado = consumosGuardados.find((c) => c.maquina === nombreGrupo);
        unicas.push({
          maquinaId: m._id,
          maquina: nombreGrupo,
          consumo: guardado ? guardado.consumo : "",
        });
      }
    } else {
      const guardado = consumosGuardados.find((c) => c.maquina === m.maquina);
      unicas.push({
        maquinaId: m._id,
        maquina: m.maquina,
        consumo: guardado ? guardado.consumo : "",
      });
    }
  });
  return unicas;
};

const Precios = () => {
  const [precios, setPrecios] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [showConsumos, setShowConsumos] = useState(false);
  const [showCotizar, setShowCotizar] = useState(false);
  const [cotizarPrecioPorKm, setCotizarPrecioPorKm] = useState(0);
  const [cotizarTitulo, setCotizarTitulo] = useState("");
  const [consumos, setConsumos] = useState([]);
  const [porcentajeIndirectos, setPorcentajeIndirectos] = useState("");
  const [variables, setVariables] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [showDetalle, setShowDetalle] = useState(false);
  const [detalleData, setDetalleData] = useState(null);
  const [showCrearLista, setShowCrearLista] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      const [respPrecios, respMaquinas, respVariables, respPersonal, respConsumos] =
        await Promise.all([
          listarPrecios(),
          listarMaquinas(),
          listarVariables(),
          listarPersonal(),
          obtenerConsumoGasoil(),
        ]);
      if (respPrecios?.ok) {
        const data = await respPrecios.json();
        setPrecios(data);
      }

      let consumosGuardados = [];
      let porcGuardado = "";
      if (respConsumos?.ok) {
        const dataConsumos = await respConsumos.json();
        consumosGuardados = dataConsumos.consumos || [];
        porcGuardado = dataConsumos.porcentajeIndirectos ?? "";
        setPorcentajeIndirectos(String(porcGuardado));
      }

      if (respMaquinas?.ok) {
        const data = await respMaquinas.json();
        setMaquinas(data);
        setConsumos(buildConsumosFromMaquinas(data, consumosGuardados));
      }
      if (respVariables?.ok) {
        const data = await respVariables.json();
        setVariables(data);
      }
      if (respPersonal?.ok) {
        const data = await respPersonal.json();
        setPersonal(data);
      }
    };
    cargarDatos();
  }, []);

  const borrarPrecio = async (id) => {
    const result = await Swal.fire({
      title: "¿Eliminar precio?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: "swal-btn-danger" },
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      const respuesta = await borrarPrecioAPI(id);

      if (respuesta?.ok) {
        setPrecios(precios.filter((p) => p._id !== id));

        Swal.fire({
          icon: "success",
          title: "Precio eliminado",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    }
  };

  const getUltimoValor = (nombreVar) => {
    const v = variables.find((x) => x.variable === nombreVar);
    if (!v) return 0;
    if (Array.isArray(v.historial) && v.historial.length) {
      const ordenado = [...v.historial].sort((a, b) =>
        (a.fecha || "").localeCompare(b.fecha || "")
      );
      return Number(ordenado[ordenado.length - 1].valor) || 0;
    }
    return Number(v.valor) || 0;
  };

  const comp3Comun = useMemo(() => {
    let promedio = 0;
    if (personal.length > 0) {
      const suma = personal.reduce((acc, p) => {
        const semanal = Array.isArray(p.semanal) && p.semanal.length
          ? Number(p.semanal[p.semanal.length - 1].valor) || 0
          : 0;
        return acc + semanal / 44;
      }, 0);
      promedio = suma / personal.length;
    }
    const porcIndirectos = Number(porcentajeIndirectos) || 0;
    return promedio + promedio * (porcIndirectos / 100);
  }, [personal, porcentajeIndirectos]);

  const completoPC200 = useMemo(() => {
    const sullair = getUltimoValor("PC200 (Sullair)");
    const dolar = getUltimoValor("Dolar oficial venta");
    const comp1 = (sullair * dolar) / 200;

    const consumoPC200 =
      Number(consumos.find((c) => c.maquina === "PC200")?.consumo) || 0;
    const precioGasoil = getUltimoValor("Gasoil");
    const comp2 = (consumoPC200 * precioGasoil) / 8;

    return { total: comp1 + comp2 + comp3Comun, comp1, comp2, comp3: comp3Comun };
  }, [variables, consumos, comp3Comun]);

  const completoRetropala = useMemo(() => {
    const sullair = getUltimoValor("Retropala (Sullair)");
    const dolar = getUltimoValor("Dolar oficial venta");
    const comp1 = (sullair * dolar) / 200;

    const consumoJD =
      Number(consumos.find((c) => c.maquina === "John Deere")?.consumo) || 0;
    const precioGasoil = getUltimoValor("Gasoil");
    const comp2 = (consumoJD * precioGasoil) / 8;

    return { total: comp1 + comp2 + comp3Comun, comp1, comp2, comp3: comp3Comun };
  }, [variables, consumos, comp3Comun]);

  const completoPala = useMemo(() => {
    const sullair = getUltimoValor("Pala (Sullair)");
    const dolar = getUltimoValor("Dolar oficial venta");
    const comp1 = (sullair * dolar) / 200;

    const consumoWA200 =
      Number(consumos.find((c) => c.maquina === "Pala cargadora")?.consumo) || 0;
    const precioGasoil = getUltimoValor("Gasoil");
    const comp2 = (consumoWA200 * precioGasoil) / 8;

    return { total: comp1 + comp2 + comp3Comun, comp1, comp2, comp3: comp3Comun };
  }, [variables, consumos, comp3Comun]);

  const handleVerDetalle = (maquina) => {
    const precioGasoil = getUltimoValor("Gasoil");
    const dolar = getUltimoValor("Dolar oficial venta");
    const porcIndirectos = Number(porcentajeIndirectos) || 0;

    let promedioHora = 0;
    if (personal.length > 0) {
      const suma = personal.reduce((acc, p) => {
        const semanal =
          Array.isArray(p.semanal) && p.semanal.length
            ? Number(p.semanal[p.semanal.length - 1].valor) || 0
            : 0;
        return acc + semanal / 44;
      }, 0);
      promedioHora = suma / personal.length;
    }

    if (
      maquina === "PC200" ||
      maquina === "Retropala" ||
      maquina === "Pala cargadora"
    ) {
      let sullairVar, consumoMaquina, datos;
      if (maquina === "PC200") {
        sullairVar = "PC200 (Sullair)";
        consumoMaquina =
          Number(consumos.find((c) => c.maquina === "PC200")?.consumo) || 0;
        datos = completoPC200;
      } else if (maquina === "Retropala") {
        sullairVar = "Retropala (Sullair)";
        consumoMaquina =
          Number(consumos.find((c) => c.maquina === "John Deere")?.consumo) || 0;
        datos = completoRetropala;
      } else {
        sullairVar = "Pala (Sullair)";
        consumoMaquina =
          Number(consumos.find((c) => c.maquina === "Pala cargadora")?.consumo) || 0;
        datos = completoPala;
      }

      setDetalleData({
        maquina,
        tipo: "sullair",
        sullair: getUltimoValor(sullairVar),
        dolar,
        comp1: datos.comp1,
        consumo: consumoMaquina,
        precioGasoil,
        comp2: datos.comp2,
        promedioHora,
        porcIndirectos,
        comp3: datos.comp3,
        total: datos.total,
      });
    } else if (maquina === "Motoniveladora" || maquina === "Camión batea") {
      const porc = maquina === "Motoniveladora" ? 75 : 60;
      setDetalleData({
        maquina,
        tipo: "porcentaje",
        precioPC200: completoPC200.total,
        porcentaje: porc,
        total: completoPC200.total * (porc / 100),
      });
    } else if (maquina === "Carretón grande") {
      setDetalleData({
        maquina,
        tipo: "porcentaje",
        precioPC200: completoPC200.total,
        porcentaje: 385,
        total: completoPC200.total * 3.85,
      });
    } else if (maquina === "Carretón chico" || maquina === "Viaje batea") {
      const consumoKey = maquina === "Carretón chico" ? "Carretón chico x km" : "Viaje de batea x km";
      const consumoKm = Number(consumos.find((c) => c.maquina === consumoKey)?.consumo) || 0;
      const precioGasoilVal = getUltimoValor("Gasoil");
      setDetalleData({
        maquina,
        tipo: "km",
        consumoKm,
        precioGasoil: precioGasoilVal,
        kmBase: 50,
        total: precioGasoilVal * consumoKm * 50,
      });
    }

    setShowDetalle(true);
  };

  const confirmarCrearLista = async (nombreLista) => {
    setShowCrearLista(false);
    const fecha = new Date();
    const precioGasoil = getUltimoValor("Gasoil");
    const consumoMoto =
      Number(consumos.find((c) => c.maquina === "Motoniveladora")?.consumo) || 0;
    const consumoCarreton =
      Number(consumos.find((c) => c.maquina === "Carretón chico x km")?.consumo) || 0;
    const consumoBatea =
      Number(consumos.find((c) => c.maquina === "Viaje de batea x km")?.consumo) || 0;

    const lista = [
      {
        maquina: "PC200",
        completo: completoPC200.total,
        sinGasoil: completoPC200.comp1 + completoPC200.comp3,
        porcentajeTeorico: 100,
      },
      {
        maquina: "Retropala",
        completo: completoRetropala.total,
        sinGasoil: completoRetropala.comp1 + completoRetropala.comp3,
        porcentajeTeorico: 45,
      },
      {
        maquina: "Pala cargadora",
        completo: completoPala.total,
        sinGasoil: completoPala.comp1 + completoPala.comp3,
        porcentajeTeorico: 70,
      },
      {
        maquina: "Motoniveladora",
        completo: completoPC200.total * 0.75,
        sinGasoil: completoPC200.total * 0.75 - (consumoMoto * precioGasoil) / 8,
        porcentajeTeorico: 75,
      },
      {
        maquina: "Camión batea",
        completo: completoPC200.total * 0.6,
        sinGasoil: 0,
        porcentajeTeorico: 60,
      },
      {
        maquina: "Carretón grande",
        completo: completoPC200.total * 3.85,
        sinGasoil: 0,
        porcentajeTeorico: 385,
      },
      {
        maquina: "Carretón chico",
        completo: precioGasoil * consumoCarreton * 50,
        sinGasoil: 0,
        porcentajeTeorico: 300,
      },
      {
        maquina: "Viaje batea",
        completo: precioGasoil * consumoBatea * 50,
        sinGasoil: 0,
        porcentajeTeorico: 5,
      },
    ];

    const promesas = lista.map((m) =>
      crearPrecioAPI({
        nombre: nombreLista,
        fecha,
        maquina: m.maquina,
        completo: m.completo,
        sinGasoil: m.sinGasoil,
        porcentajeReal: completoPC200.total
          ? Number(((m.completo / completoPC200.total) * 100).toFixed(0))
          : 0,
        porcentajeTeorico: m.porcentajeTeorico,
      })
    );

    const respuestas = await Promise.all(promesas);
    const todasOk = respuestas.every((r) => r?.ok);

    if (todasOk) {
      const resp = await listarPrecios();
      if (resp?.ok) {
        const data = await resp.json();
        setPrecios(data);
      }
      Swal.fire({
        icon: "success",
        title: "Lista de precios creada",
        timer: 2000,
        showConfirmButton: false,
      });
    }
  };

  const borrarLista = async (nombre, ids) => {
    const result = await Swal.fire({
      title: `¿Eliminar lista "${nombre}"?`,
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: "swal-btn-danger" },
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed) return;

    const promesas = ids.map((id) => borrarPrecioAPI(id));
    const respuestas = await Promise.all(promesas);
    const todasOk = respuestas.every((r) => r?.ok);

    if (todasOk) {
      setPrecios(precios.filter((p) => !ids.includes(p._id)));
      Swal.fire({
        icon: "success",
        title: "Lista eliminada",
        timer: 2000,
        showConfirmButton: false,
      });
    }
  };

  const guardarConsumos = async (nuevosConsumos, nuevoPorcentaje) => {
    const payload = nuevosConsumos.map((c) => ({
      maquina: c.maquina,
      consumo: Number(c.consumo) || 0,
    }));
    const resp = await guardarConsumoGasoilAPI(payload, Number(nuevoPorcentaje) || 0);
    if (resp?.ok) {
      setConsumos(nuevosConsumos);
      setPorcentajeIndirectos(nuevoPorcentaje);
    }
  };

  return (
    <>
      <PreciosTabla
        precios={precios}
        borrarPrecio={borrarPrecio}
        onCrearLista={() => setShowCrearLista(true)}
        onBorrarLista={borrarLista}
        onVerDetalle={handleVerDetalle}
        onAbrirConsumos={() => setShowConsumos(true)}
        completoPC200={completoPC200.total}
        sinGasoilPC200={completoPC200.comp1 + completoPC200.comp3}
        completoRetropala={completoRetropala.total}
        sinGasoilRetropala={completoRetropala.comp1 + completoRetropala.comp3}
        completoPala={completoPala.total}
        sinGasoilPala={completoPala.comp1 + completoPala.comp3}
        completoMotoniveladora={completoPC200.total * 0.75}
        sinGasoilMotoniveladora={completoPC200.total * 0.75 - ((Number(consumos.find((c) => c.maquina === "Motoniveladora")?.consumo) || 0) * getUltimoValor("Gasoil")) / 8}
        completoCamionBatea={completoPC200.total * 0.60}
        completoCarretonChico={getUltimoValor("Gasoil") * (Number(consumos.find((c) => c.maquina === "Carretón chico x km")?.consumo) || 0) * 50}
        completoCarretonGrande={completoPC200.total * 3.85}
        completoViajeBatea={getUltimoValor("Gasoil") * (Number(consumos.find((c) => c.maquina === "Viaje de batea x km")?.consumo) || 0) * 50}
        onCotizarCarreton={() => {
          setCotizarPrecioPorKm((Number(consumos.find((c) => c.maquina === "Carretón chico x km")?.consumo) || 0) * getUltimoValor("Gasoil"));
          setCotizarTitulo("Cotizar viaje de carretón");
          setShowCotizar(true);
        }}
        onCotizarBatea={() => {
          setCotizarPrecioPorKm((Number(consumos.find((c) => c.maquina === "Viaje de batea x km")?.consumo) || 0) * getUltimoValor("Gasoil"));
          setCotizarTitulo("Cotizar viaje de batea");
          setShowCotizar(true);
        }}
      />
      <DetallePrecioModal
        show={showDetalle}
        onHide={() => setShowDetalle(false)}
        detalle={detalleData}
      />
      <CotizarModal
        show={showCotizar}
        onHide={() => setShowCotizar(false)}
        precioPorKm={cotizarPrecioPorKm}
        titulo={cotizarTitulo}
      />
      <CrearListaModal
        show={showCrearLista}
        onHide={() => setShowCrearLista(false)}
        onCrear={confirmarCrearLista}
        nombresExistentes={[...new Set(precios.map((p) => p.nombre).filter(Boolean))]}
      />
      <ConsumosGasoilModal
        show={showConsumos}
        onHide={() => setShowConsumos(false)}
        consumos={consumos}
        setConsumos={setConsumos}
        porcentajeIndirectos={porcentajeIndirectos}
        setPorcentajeIndirectos={setPorcentajeIndirectos}
        onGuardar={guardarConsumos}
      />
    </>
  );
};

export default Precios;
