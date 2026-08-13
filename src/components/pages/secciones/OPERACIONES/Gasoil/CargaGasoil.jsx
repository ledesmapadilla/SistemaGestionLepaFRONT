import { useEffect, useRef, useState } from "react";
import { Card, Spinner } from "react-bootstrap";
import Swal from "sweetalert2";
import {
  listarOpcionesGasoil,
  crearCargaGasoilPublica,
} from "../../../../../helpers/queriesPublicoGasoil.js";
import GasoilModal from "./GasoilModal.jsx";

// Página pensada para usar desde el celular: una sola tarjeta grande, sin tabla
// ni filtros. El listado y la edición siguen estando en /gasoil.
// Va sin login (ruta fuera de RutaProtegida) para poder instalarla como acceso
// directo en el teléfono, así que pega contra los endpoints /api/publico/gasoil.
const CargaGasoil = () => {
  const [obras, setObras] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [opcionesListas, setOpcionesListas] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const opcionesPedidas = useRef(false);

  // Un solo request que trae obras en curso, máquinas que usan gasoil y los que
  // cargan, ya filtrados por el backend. Devuelve las opciones en vez de
  // guardarlas: así el setState queda en el callback y no en el cuerpo del efecto.
  const pedirOpciones = async () => {
    if (opcionesPedidas.current) return null;
    opcionesPedidas.current = true;

    try {
      const respuesta = await listarOpcionesGasoil();
      if (respuesta?.ok) return await respuesta.json();
      // Si falló, que el próximo intento de abrir el modal lo reintente.
      opcionesPedidas.current = false;
    } catch (error) {
      console.error("Error al cargar opciones de gasoil:", error);
      opcionesPedidas.current = false;
    }
    return null;
  };

  const aplicarOpciones = (opciones) => {
    if (!opciones) return;
    setObras(opciones.obras || []);
    setMaquinas(opciones.maquinas || []);
    setPersonal(opciones.personal || []);
    setOpcionesListas(true);
  };

  const cargarOpciones = () => pedirOpciones().then(aplicarOpciones);

  useEffect(() => {
    cargarOpciones();
  }, []);

  const abrirModal = () => {
    cargarOpciones();
    setShowModal(true);
  };

  const guardarCarga = async (datos) => {
    const respuesta = await crearCargaGasoilPublica(datos);

    if (!respuesta) {
      Swal.fire({
        icon: "error",
        title: "Error de conexión",
        text: "No se pudo conectar con el servidor. Intentá de nuevo.",
      });
      return;
    }

    if (!respuesta.ok) {
      const errorData = await respuesta.json().catch(() => null);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: errorData?.msg || "No se pudo guardar la carga de gasoil",
      });
      return;
    }

    Swal.fire({
      icon: "success",
      title: "Carga registrada",
      timer: 1500,
      showConfirmButton: false,
    });
    setShowModal(false);
  };

  return (
    <div className="mx-auto px-3 py-4" style={{ maxWidth: "480px" }}>
      <h6 className="text-center mb-4">Carga de gasoil</h6>

      <Card
        role="button"
        onClick={abrirModal}
        className="text-center border-success"
        style={{ cursor: "pointer" }}
      >
        <Card.Body className="py-5">
          <div style={{ fontSize: "2.5rem", lineHeight: 1 }}>⛽</div>
          <Card.Title className="mt-3 mb-0" style={{ fontSize: "1.4rem" }}>
            Nueva carga
          </Card.Title>
          {!opcionesListas && (
            <div className="mt-3">
              <Spinner animation="border" size="sm" />
            </div>
          )}
        </Card.Body>
      </Card>

      <GasoilModal
        show={showModal}
        onHide={() => setShowModal(false)}
        onGuardar={guardarCarga}
        cargaEditando={null}
        cargandoOpciones={!opcionesListas}
        obras={obras}
        maquinas={maquinas}
        personal={personal}
      />
    </div>
  );
};

export default CargaGasoil;
