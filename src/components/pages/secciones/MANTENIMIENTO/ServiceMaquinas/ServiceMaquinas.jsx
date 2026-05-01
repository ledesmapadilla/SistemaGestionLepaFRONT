import { useState, useEffect } from "react";
import { Table, Button, Spinner } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  listarServices,
  crearService,
  editarService,
} from "../../../../../helpers/queriesServiceMaquinas.js";
import { listarMaquinas } from "../../../../../helpers/queriesMaquinas.js";
import { listarAsistencia } from "../../../../../helpers/queriesAsistencia.js";
import ServiceMaquinaModal from "./ServiceMaquinaModal.jsx";
import HorasModal from "./HorasModal.jsx";
import HistorialModal from "./HistorialModal.jsx";
import NuevoServiceModal from "./NuevoServiceModal.jsx";

const fmtHorometro = (val) =>
  val != null && val !== "" ? Number(val).toLocaleString("es-AR") : "-";

const valoresIniciales = {
  maquina: "",
  fecha: "",
  horometro: "",
  estado: "",
  observaciones: "",
};

const valoresHorasIniciales = { horometro: "" };
const valoresServiceIniciales = { fecha: "", horometro: "" };

const EXCLUIDAS = [
  "carreton grande", "carretón grande",
  "carreton chico", "carretón chico",
  "batea 1", "batea 2",
];

const ServiceMaquinas = () => {
  const navigate = useNavigate();

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: valoresIniciales,
    mode: "onChange",
  });

  const {
    register: registerHoras,
    handleSubmit: handleSubmitHoras,
    reset: resetHoras,
    formState: { errors: errorsHoras },
  } = useForm({ defaultValues: valoresHorasIniciales, mode: "onChange" });

  const {
    register: registerService,
    handleSubmit: handleSubmitService,
    reset: resetService,
    formState: { errors: errorsService },
  } = useForm({ defaultValues: valoresServiceIniciales, mode: "onChange" });

  const [services, setServices] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [asistencia, setAsistencia] = useState([]);
  const [editando, setEditando] = useState(false);
  const [serviceId, setServiceId] = useState(null);
  const [maquinaSeleccionada, setMaquinaSeleccionada] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showHorasModal, setShowHorasModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [historialHoras, setHistorialHoras] = useState([]);
  const [historialService, setHistorialService] = useState([]);
  const [historialNombre, setHistorialNombre] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [resServices, resMaquinas, resAsistencia] = await Promise.all([
        listarServices(),
        listarMaquinas(),
        listarAsistencia(),
      ]);
      if (resServices?.ok) setServices(await resServices.json());
      if (resAsistencia?.ok) setAsistencia(await resAsistencia.json());
      if (resMaquinas?.ok) {
        const todas = await resMaquinas.json();
        setMaquinas(
          todas
            .filter((m) => !EXCLUIDAS.includes(m.maquina?.toLowerCase().trim()))
            .reverse()
        );
      }
    } catch (error) {
      console.error("Error al cargar datos", error);
    } finally {
      setLoading(false);
    }
  };

  // Registro tipo "horas" con mayor horómetro (para columna Horómetro principal)
  const getUltimoHorometroService = (maquinaId) => {
    const conHorometro = services.filter(
      (s) => s.maquina?._id === maquinaId && s.horometro != null && s.tipo === "horas"
    );
    if (conHorometro.length === 0) return null;
    return conHorometro.reduce((max, s) =>
      Number(s.horometro) > Number(max.horometro) ? s : max
    );
  };

  // Último registro tipo "service" (para columnas Fecha/Horómetro Últ. Service)
  const getUltimoService = (maquinaId) => {
    return (
      services
        .filter((s) => s.maquina?._id === maquinaId && s.tipo === "service")
        .sort((a, b) => new Date(b.fecha || b.createdAt) - new Date(a.fecha || a.createdAt))[0] || null
    );
  };

  // Registro de asistencia con el mayor horómetro para esa máquina
  const getUltimoRegistroAsistencia = (maquinaNombre) => {
    if (!maquinaNombre) return null;
    const nombre = maquinaNombre.toLowerCase().trim();
    let mayor = null;
    for (const dia of asistencia) {
      const reg = dia.registros?.find(
        (r) => r.maquina?.toLowerCase().trim() === nombre && r.horometro
      );
      if (reg && (mayor === null || Number(reg.horometro) > Number(mayor.horometro))) {
        mayor = { fecha: dia.fecha, horometro: reg.horometro };
      }
    }
    return mayor;
  };

  // Fecha y horómetro que se muestran en la tabla (gana el valor mayor)
  const getDatosHorometro = (maquinaId, maquinaNombre) => {
    const svc = getUltimoHorometroService(maquinaId);
    const ast = getUltimoRegistroAsistencia(maquinaNombre);
    const horSvc = svc != null ? Number(svc.horometro) : null;
    const horAst = ast != null ? Number(ast.horometro) : null;

    if (horSvc != null && horAst != null) {
      return horSvc >= horAst
        ? { fecha: svc.fecha ? svc.fecha.slice(0, 10) : null, horometro: horSvc }
        : { fecha: ast.fecha, horometro: horAst };
    }
    if (horSvc != null) return { fecha: svc.fecha ? svc.fecha.slice(0, 10) : null, horometro: horSvc };
    if (horAst != null) return { fecha: ast.fecha, horometro: horAst };
    return { fecha: null, horometro: null };
  };

  // --- Modal Nuevo Service ---
  const cerrarServiceModal = () => {
    setShowServiceModal(false);
    setMaquinaSeleccionada(null);
    resetService(valoresServiceIniciales);
  };

  const abrirNuevoService = (maquina) => {
    setMaquinaSeleccionada(maquina);
    resetService(valoresServiceIniciales);
    setShowServiceModal(true);
  };

  const onSubmitService = async (data) => {
    try {
      const payload = {
        maquina: maquinaSeleccionada._id,
        fecha: data.fecha,
        horometro: Number(data.horometro),
        tipo: "service",
      };

      const respuesta = await crearService(payload);

      if (!respuesta?.ok) {
        const err = await respuesta.json();
        Swal.fire({ icon: "error", title: "Error", text: err.msg || "No se pudo guardar" });
        return;
      }

      const resData = await respuesta.json();
      setServices([resData.service, ...services]);
      Swal.fire({ icon: "success", title: "Service registrado", timer: 2000, showConfirmButton: false });
      cerrarServiceModal();
    } catch {
      Swal.fire({ icon: "error", title: "Error inesperado", text: "No se pudo procesar la solicitud" });
    }
  };

  // --- Historial ---
  const abrirHistorial = (maquina) => {
    const nombre = maquina.maquina;
    const nombreLow = nombre.toLowerCase().trim();

    // Registros tipo "horas" de ServiceMaquina
    const deHoras = services
      .filter((s) => s.maquina?._id === maquina._id && s.horometro != null && s.fecha && s.tipo === "horas")
      .map((s) => ({ fecha: s.fecha.slice(0, 10), horometro: s.horometro, tipo: "horas" }));

    // Registros de Asistencia
    const deAsistencia = [];
    const mapaAst = {};
    asistencia.forEach((dia) => {
      dia.registros?.forEach((r) => {
        if (r.maquina?.toLowerCase().trim() === nombreLow && r.horometro) {
          const val = Number(r.horometro);
          if (!isNaN(val) && (mapaAst[dia.fecha] == null || val > mapaAst[dia.fecha])) {
            mapaAst[dia.fecha] = val;
          }
        }
      });
    });
    Object.entries(mapaAst).forEach(([fecha, horometro]) =>
      deAsistencia.push({ fecha, horometro, tipo: "horas" })
    );

    // Combinar horas + asistencia deduplicando por fecha (mayor valor)
    const mapaHoras = {};
    [...deHoras, ...deAsistencia].forEach(({ fecha, horometro }) => {
      const val = Number(horometro);
      if (!isNaN(val) && (mapaHoras[fecha] == null || val > mapaHoras[fecha])) {
        mapaHoras[fecha] = val;
      }
    });
    const horasOrdenadas = Object.entries(mapaHoras)
      .map(([fecha, horometro]) => ({ fecha, horometro, tipo: "horas" }));

    // Registros tipo "service" de ServiceMaquina
    const deServiceReg = services
      .filter((s) => s.maquina?._id === maquina._id && s.horometro != null && s.fecha && s.tipo === "service")
      .map((s) => ({ fecha: s.fecha.slice(0, 10), horometro: s.horometro, tipo: "service" }));

    const horasFinales = horasOrdenadas.sort((a, b) => b.fecha.localeCompare(a.fecha));
    const serviceFinales = deServiceReg.sort((a, b) => b.fecha.localeCompare(a.fecha));

    setHistorialNombre(nombre);
    setHistorialHoras(horasFinales);
    setHistorialService(serviceFinales);
    setShowHistorial(true);
  };

  // --- Modal Service ---
  const cerrarModal = () => {
    setShowModal(false);
    setEditando(false);
    setServiceId(null);
    setMaquinaSeleccionada(null);
    reset(valoresIniciales);
  };

  const abrirService = (maquina, service) => {
    setMaquinaSeleccionada(maquina);
    const datos = getDatosHorometro(maquina._id, maquina.maquina);
    if (service) {
      setEditando(true);
      setServiceId(service._id);
      reset({
        maquina: maquina._id,
        fecha: service.fecha ? service.fecha.slice(0, 10) : "",
        horometro: datos.horometro ?? "",
        estado: service.estado || "",
        observaciones: service.observaciones || "",
      });
    } else {
      setEditando(false);
      setServiceId(null);
      reset({ ...valoresIniciales, maquina: maquina._id, horometro: datos.horometro ?? "" });
    }
    setShowModal(true);
  };

  const onSubmit = async (data) => {
    try {
      const payload = {
        maquina: maquinaSeleccionada._id,
        fecha: data.fecha || undefined,
        horometro: data.horometro !== "" ? Number(data.horometro) : undefined,
        estado: data.estado || undefined,
        observaciones: data.observaciones || undefined,
      };

      let respuesta;
      if (editando) {
        respuesta = await editarService(serviceId, payload);
      } else {
        respuesta = await crearService(payload);
      }

      if (!respuesta?.ok) {
        const err = await respuesta.json();
        Swal.fire({ icon: "error", title: "Error", text: err.msg || "No se pudo guardar" });
        return;
      }

      const resData = await respuesta.json();
      if (editando) {
        setServices(services.map((s) => (s._id === serviceId ? resData.service : s)));
        Swal.fire({ icon: "success", title: "Service actualizado", timer: 2000, showConfirmButton: false });
      } else {
        setServices([resData.service, ...services]);
        Swal.fire({ icon: "success", title: "Service registrado", timer: 2000, showConfirmButton: false });
      }
      cerrarModal();
    } catch {
      Swal.fire({ icon: "error", title: "Error inesperado", text: "No se pudo procesar la solicitud" });
    }
  };

  // --- Modal Horas ---
  const cerrarHorasModal = () => {
    setShowHorasModal(false);
    setMaquinaSeleccionada(null);
    resetHoras(valoresHorasIniciales);
  };

  const abrirHoras = (maquina) => {
    setMaquinaSeleccionada(maquina);
    resetHoras(valoresHorasIniciales);
    setShowHorasModal(true);
  };

  const onSubmitHoras = async (data) => {
    try {
      const hoy = new Date().toISOString().slice(0, 10);
      const payload = {
        maquina: maquinaSeleccionada._id,
        fecha: hoy,
        horometro: Number(data.horometro),
        tipo: "horas",
      };

      const respuesta = await crearService(payload);

      if (!respuesta?.ok) {
        const err = await respuesta.json();
        Swal.fire({ icon: "error", title: "Error", text: err.msg || "No se pudo guardar" });
        return;
      }

      const resData = await respuesta.json();
      setServices([resData.service, ...services]);
      Swal.fire({ icon: "success", title: "Horómetro actualizado", timer: 2000, showConfirmButton: false });
      cerrarHorasModal();
    } catch {
      Swal.fire({ icon: "error", title: "Error inesperado", text: "No se pudo procesar la solicitud" });
    }
  };

  const estadoBadge = (estado) => {
    if (!estado) return <span className="text-muted">-</span>;
    const colores = {
      "Operativo": "text-success fw-bold",
      "En servicio programado": "text-primary fw-bold",
      "Requiere atención": "text-warning fw-bold",
      "Fuera de servicio": "text-danger fw-bold",
    };
    return <span className={colores[estado] || ""}>{estado}</span>;
  };

  if (loading) return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <>
      <div className="w-75 mx-auto my-2">
        <h6 className="text-center mb-3">Service de Máquinas</h6>
        <div className="d-flex justify-content-end mb-3">
          <Button size="sm" variant="outline-success" onClick={() => navigate(-1)}>Volver</Button>
        </div>

        <div style={{ maxHeight: "65vh", overflowY: "auto" }}>
        <Table striped bordered hover className="text-center align-middle mb-0" size="sm">
          <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
            <tr>
              <th>Máquina</th>
              <th>Fecha Últ. Registro</th>
              <th>Horómetro (hs)</th>
              <th>Fecha Últ. Service</th>
              <th>Horómetro Últ. Service</th>
              <th>Estado</th>
              <th>Observaciones</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {maquinas.length === 0 ? (
              <tr><td colSpan="8" className="py-3">No hay máquinas registradas</td></tr>
            ) : (
              maquinas.map((m) => {
                const s = getUltimoService(m._id);
                const { fecha, horometro } = getDatosHorometro(m._id, m.maquina);
                return (
                  <tr key={m._id}>
                    <td className="fw-bold">{m.maquina}</td>
                    <td>
                      {fecha
                        ? new Date(fecha + "T12:00:00").toLocaleDateString("es-AR")
                        : "-"}
                    </td>
                    <td>{fmtHorometro(horometro)}</td>
                    <td className="text-primary">{s?.fecha ? new Date(s.fecha.slice(0,10) + "T12:00:00").toLocaleDateString("es-AR") : "-"}</td>
                    <td className="text-primary">{fmtHorometro(s?.horometro)}</td>
                    <td>{estadoBadge(s?.estado)}</td>
                    <td
                      style={{ maxWidth: "220px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                      title={s?.observaciones}
                    >
                      {s?.observaciones || "-"}
                    </td>
                    <td>
                      <div className="d-flex gap-1 justify-content-center">
                        <Button size="sm" variant="outline-primary" onClick={() => abrirHoras(m)}>
                          + Horas
                        </Button>
                        <Button size="sm" variant="outline-warning" onClick={() => abrirNuevoService(m)}>
                          + Service
                        </Button>
                        <Button size="sm" variant="outline-secondary" onClick={() => abrirHistorial(m)}>
                          Historial
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

      <ServiceMaquinaModal
        show={showModal}
        onHide={cerrarModal}
        onSubmit={onSubmit}
        handleSubmit={handleSubmit}
        register={register}
        errors={errors}
        editando={editando}
        maquinas={maquinas}
      />

      {maquinaSeleccionada && showServiceModal && (
        <NuevoServiceModal
          show={showServiceModal}
          onHide={cerrarServiceModal}
          onSubmit={onSubmitService}
          handleSubmit={handleSubmitService}
          register={registerService}
          errors={errorsService}
          maquinaNombre={maquinaSeleccionada.maquina}
          ultimoHorometro={getDatosHorometro(maquinaSeleccionada._id, maquinaSeleccionada.maquina).horometro}
          horometroMin={
            getDatosHorometro(maquinaSeleccionada._id, maquinaSeleccionada.maquina).horometro != null
              ? Number(getDatosHorometro(maquinaSeleccionada._id, maquinaSeleccionada.maquina).horometro)
              : null
          }
        />
      )}

      <HistorialModal
        show={showHistorial}
        onHide={() => setShowHistorial(false)}
        maquinaNombre={historialNombre}
        historialHoras={historialHoras}
        historialService={historialService}
      />

      {maquinaSeleccionada && (
        <HorasModal
          show={showHorasModal}
          onHide={cerrarHorasModal}
          onSubmit={onSubmitHoras}
          handleSubmit={handleSubmitHoras}
          register={registerHoras}
          errors={errorsHoras}
          maquinaNombre={maquinaSeleccionada.maquina}
          horometroActual={getDatosHorometro(maquinaSeleccionada._id, maquinaSeleccionada.maquina).horometro}
          horometroMin={
            getDatosHorometro(maquinaSeleccionada._id, maquinaSeleccionada.maquina).horometro != null
              ? Number(getDatosHorometro(maquinaSeleccionada._id, maquinaSeleccionada.maquina).horometro)
              : null
          }
        />
      )}
    </>
  );
};

export default ServiceMaquinas;
