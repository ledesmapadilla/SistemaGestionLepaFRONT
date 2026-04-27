import { useEffect, useState } from "react";
import { Table, Form, Spinner, Button } from "react-bootstrap";
// Importamos useNavigate para poder redirigir
import { useNavigate } from "react-router-dom"; 
import { listarObras } from "../../../../../helpers/queriesObras.js";
import { listarRemitosPorObra } from "../../../../../helpers/queriesRemitos.js";
import { listarGastosPorObra } from "../../../../../helpers/queriesGastos.js";
import { listarPersonal } from "../../../../../helpers/queriesPersonal.js";
import { listarAceites } from "../../../../../helpers/queriesAceites.js";
import "../../../../../styles/verRemitos.css";
import CostoObraTabla from "./CostoObraTabla"; 

const buscarPrecioVigente = (precios, clasificacion, trabajo, fechaRef) => {
  const candidatos = precios.filter(
    (p) => p.clasificacion === clasificacion && (!trabajo || p.trabajo === trabajo)
  );
  if (candidatos.length === 0) return null;
  if (candidatos.length === 1) return candidatos[0];

  const ordenados = [...candidatos]
    .filter((p) => p.fecha)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const fechaReferencia = new Date(fechaRef);

  if (!isNaN(fechaReferencia.getTime())) {
    const vigentes = ordenados.filter((p) => new Date(p.fecha) <= fechaReferencia);
    if (vigentes.length > 0) return vigentes[0];
  }

  return ordenados.length > 0 ? ordenados[0] : candidatos[0];
};

const CostosObra = () => {
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [razonSocialSeleccionada, setRazonSocialSeleccionada] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("En curso");
  const [obraSeleccionada, setObraSeleccionada] = useState(null);
  const [datosAnalisis, setDatosAnalisis] = useState(null);
  const [loadingAnalisis, setLoadingAnalisis] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        const respuesta = await listarObras();
        if (respuesta.status === 200) {
          const data = await respuesta.json();
          setObras(data);
        } else {
          setObras([]);
        }
      } catch (error) {
        console.error("Error al cargar obras:", error);
        setObras([]);
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, []);

  useEffect(() => {
    const main = document.querySelector("main");
    const footer = document.querySelector("footer");
    if (main) {
      const mainTop = main.getBoundingClientRect().top;
      const footerH = footer ? footer.offsetHeight + parseInt(window.getComputedStyle(footer).marginTop || "0") : 0;
      main.style.overflow = "hidden";
      main.style.display = "flex";
      main.style.flexDirection = "column";
      main.style.height = `calc(100vh - ${mainTop}px - ${footerH}px)`;
    }
    return () => {
      if (main) {
        main.style.overflow = "";
        main.style.display = "";
        main.style.flexDirection = "";
        main.style.height = "";
      }
    };
  }, []);

  // Razones sociales únicas
  const razonesUnicas = [...new Set(obras.map((o) => o.razonsocial).filter(Boolean))]
    .filter((r) => r.toLowerCase().includes(busquedaCliente.trim().toLowerCase()))
    .sort();

  // Obras del cliente seleccionado
  const obrasFiltradas = obras.filter((obra) => {
    if (!obra || obra.razonsocial !== razonSocialSeleccionada) return false;
    const coincideEstado =
      filtroEstado === "" ||
      (filtroEstado === "Terminada" ? obra.estado?.startsWith("Terminada") : obra.estado === filtroEstado);
    return coincideEstado;
  });

  const handleAnalisis = async (obra) => {
    setObraSeleccionada(obra);
    setLoadingAnalisis(true);
    setDatosAnalisis(null);

    try {
      const [remitosData, gastosData, personalRes, aceitesRes] = await Promise.all([
        listarRemitosPorObra(obra._id),
        listarGastosPorObra(obra._id),
        listarPersonal(),
        listarAceites()
      ]);

      const remitos = Array.isArray(remitosData) ? remitosData : [];
      
      let gastosArray = [];
      if (gastosData && typeof gastosData.json === "function") {
         if (gastosData.ok) gastosArray = await gastosData.json();
      } else if (Array.isArray(gastosData)) {
         gastosArray = gastosData;
      }
      
      let personalDB = [];
      if (personalRes.ok) {
         personalDB = await personalRes.json();
      }

      const totalFacturacion = remitos.reduce((acc, remito) => {
        const subtotal = (remito.items || []).reduce((sum, item) => {
          return sum + (Number(item.cantidad) * Number(item.precioUnitario));
        }, 0);
        return acc + subtotal;
      }, 0);

      const preciosArray = obra.precios || obra.precio || [];
      const totalGasoil = remitos.reduce((total, remito) => {
        return total + (remito.items || []).reduce((acc, item) => {
          const litros = parseFloat(item.gasoil || 0);
          if (litros <= 0) return acc;
          const precioObj = buscarPrecioVigente(preciosArray, "Gasoil", null, item.fecha);
          const precioGasoil = precioObj ? parseFloat(precioObj.precio) : 0;
          return acc + litros * precioGasoil;
        }, 0);
      }, 0);

      const agrupado = {}; 
      remitos.forEach((remito) => {
        if(remito.items) {
            remito.items.forEach((item) => {
                if (item.personal) {
                    const esServicio = item.servicio && item.servicio !== "";
                    const tipo = esServicio ? "servicio" : "maquina";
                    const key = `${item.personal}-${tipo}`;
                    if (!agrupado[key]) agrupado[key] = { nombre: item.personal, tipo: tipo, cantidad: 0 };
                    
                    if (esServicio) agrupado[key].cantidad += 1; 
                    else agrupado[key].cantidad += Number(item.cantidad || 0); 
                }
            });
        }
      });

      let totalPersonalCalculado = 0;
      Object.values(agrupado).forEach((dato) => {
        const empleadoEncontrado = personalDB.find(
          (p) => p.nombre.trim().toLowerCase() === dato.nombre.trim().toLowerCase()
        );
        if (empleadoEncontrado) {
            const semanalVal = empleadoEncontrado.semanal;
            const precioSemanal = Array.isArray(semanalVal) && semanalVal.length
              ? Number(semanalVal[semanalVal.length - 1].valor || 0)
              : Number(semanalVal || 0);
            const divisor = dato.tipo === 'servicio' ? 5.5 : 44;
            const valorUnitario = precioSemanal > 0 ? precioSemanal / divisor : 0;
            totalPersonalCalculado += (dato.cantidad * valorUnitario);
        }
      });

      const totalManoObraManual = gastosArray
        .filter(g => {
            const cat = (g.categoria || "").toLowerCase();
            return cat === "mano de obra" || cat === "sueldos" || cat === "personal";
        })
        .reduce((acc, item) => acc + Number((item.costoUnitario || 0) * (item.cantidad || 0)), 0); 

      const totalManoObraFinal = totalPersonalCalculado + totalManoObraManual;

      const totalOtros = gastosArray
        .filter(g => {
            const cat = (g.categoria || "").toLowerCase().trim();
            if (cat === "gasoil" || cat === "combustible") return false;
            if (cat === "mano de obra" || cat === "sueldos" || cat === "personal") return false;
            return true;
        })
        .reduce((acc, item) => acc + Number((item.costoUnitario || 0) * (item.cantidad || 0)), 0);

      // --- CÁLCULO ACEITES ---
      let aceitesDB = [];
      if (aceitesRes?.ok) {
        aceitesDB = await aceitesRes.json();
      }

      let totalAceites = 0;
      aceitesDB.forEach((aceite) => {
        const movimientos = aceite.movimientos || [];
        const litrosObra = movimientos
          .filter((m) => m.tipoMov === "SALIDA" && m.obra === obra.nombreobra)
          .reduce((acc, m) => acc + Number(m.litros || 0), 0);

        if (litrosObra <= 0) return;

        const ultimaCompra = movimientos
          .filter((m) => m.tipoMov === "INGRESO" && m.litros > 0)
          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0];
        const precioPorLitro = ultimaCompra ? Number(ultimaCompra.precio || 0) / Number(ultimaCompra.litros) : 0;

        totalAceites += litrosObra * precioPorLitro;
      });

      setDatosAnalisis({
        gasoil: totalGasoil,
        manoObra: totalManoObraFinal,
        otros: totalOtros,
        aceites: totalAceites,
        facturacion: totalFacturacion
      });

    } catch (error) {
      console.error("Error crítico en análisis:", error);
      setDatosAnalisis({ gasoil: 0, manoObra: 0, otros: 0, aceites: 0, facturacion: 0 });
    } finally {
      setLoadingAnalisis(false);
    }
  };

  const handleVolver = () => {
    setObraSeleccionada(null);
    setDatosAnalisis(null);
  };

  const handleVolverAClientes = () => {
    setRazonSocialSeleccionada(null);
    setFiltroEstado("En curso");
  };

 
  // --- FUNCIÓN PARA IR A VER LOS GASTOS ---
  const handleVerGastos = () => {
    // 1. Buscamos los precios donde sea que estén (singular o plural)
    const listaPrecios = obraSeleccionada.precios || obraSeleccionada.precio || [];

    // 2. Preparamos el objeto EXACTO que GastoTabla espera recibir
    const obraParaEnviar = {
        ...obraSeleccionada,       // Copiamos _id, nombreobra, razonsocial, etc.
        precios: listaPrecios      // FORZAMOS a que la propiedad se llame "precios"
    };

    // 3. Enviamos el objeto corregido
    // REVISA QUE LA RUTA SEA LA CORRECTA (ej: "/gastos", "/gastos-tabla", etc.)
    navigate("/gastos", { state: obraParaEnviar });
  };

  if (loading) return <Spinner animation="border" className="d-block mx-auto my-5" />;

  if (obraSeleccionada) {
    if (loadingAnalisis) {
        return (
            <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2">Calculando...</p>
            </div>
        );
    }
    return (
        <CostoObraTabla 
            obra={obraSeleccionada}
            costos={datosAnalisis}
            onVolver={handleVolver}
            onVerGastos={handleVerGastos} // <--- Pasamos la función nueva
        />
    );
  }

  // PASO 1: elegir razón social
  if (!razonSocialSeleccionada) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
        <div style={{ width: "50%", marginLeft: "auto", marginRight: "auto", display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
          <div className="pt-2 pb-1">
            <h6 className="text-center mb-2">Análisis y resultado de cada obra</h6>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <Form.Control size="sm" type="search" placeholder="Buscar razón social..." value={busquedaCliente} onChange={(e) => setBusquedaCliente(e.target.value)} style={{ width: "55%" }} />
              <Button size="sm" variant="outline-success" onClick={() => navigate(-1)}>Volver</Button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            <Table striped bordered hover className="text-center align-middle" size="sm">
              <thead className="table-dark">
                <tr>
                  <th>Razón Social</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {razonesUnicas.length === 0 ? (
                  <tr><td colSpan="2">No hay clientes</td></tr>
                ) : (
                  razonesUnicas.map((razon) => (
                    <tr key={razon}>
                      <td className="text-start ps-3">{razon}</td>
                      <td>
                        <Button size="sm" variant="outline-primary" onClick={() => setRazonSocialSeleccionada(razon)}>Ver obras</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </div>
      </div>
    );
  }

  const estiloX = { position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#fff", fontSize: "14px", fontWeight: "900", zIndex: 5, userSelect: "none" };
  const selectActivo = { backgroundImage: "none" };

  // PASO 2: obras del cliente seleccionado
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
      <div style={{ width: "50%", marginLeft: "auto", marginRight: "auto", display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
        <div className="pt-2 pb-1">
          <h6 className="text-center mb-1">Análisis y resultado de cada obra</h6>
          <h6 className="text-center mb-2">Razón social: <span className="nombreTitulos">{razonSocialSeleccionada}</span></h6>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div style={{ position: "relative", width: "200px" }}>
              <Form.Select size="sm" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={filtroEstado ? selectActivo : {}}>
                <option value="">Todos los estados</option>
                <option value="En curso">En curso</option>
                <option value="Terminada">Terminada</option>
              </Form.Select>
              {filtroEstado && <span onClick={() => setFiltroEstado("")} style={estiloX}>✕</span>}
            </div>
            <Button size="sm" variant="outline-success" onClick={handleVolverAClientes}>Volver</Button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          <Table striped bordered hover className="text-center align-middle" size="sm">
            <thead className="table-dark">
              <tr>
                <th>Nombre de la Obra</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {obrasFiltradas.length === 0 ? (
                <tr><td colSpan="3">No hay obras para este cliente</td></tr>
              ) : (
                obrasFiltradas.map((obra) => (
                  <tr key={obra._id}>
                    <td>{obra.nombreobra}</td>
                    <td>{obra.estado}</td>
                    <td>
                      <Button size="sm" variant="outline-primary" onClick={() => handleAnalisis(obra)}>Análisis</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default CostosObra;