import { useEffect, useRef, useState } from "react";
import { Card, Spinner } from "react-bootstrap";
import Swal from "sweetalert2";
import { crearCargaGasoil } from "../../../../../helpers/queriesCargaGasoil.js";
import { listarObras } from "../../../../../helpers/queriesObras.js";
import { listarMaquinas } from "../../../../../helpers/queriesMaquinas.js";
import { listarPersonal } from "../../../../../helpers/queriesPersonal.js";
import GasoilModal from "./GasoilModal.jsx";

// Página pensada para usar desde el celular: una sola tarjeta grande, sin tabla
// ni filtros. El listado y la edición siguen estando en /gasoil.
const CargaGasoil = () => {
  const [obras, setObras] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [opcionesListas, setOpcionesListas] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const opcionesPedidas = useRef(false);

  // Mismos campos que pide el modal: sin el array de precios de las obras ni el
  // historial de sueldos del personal.
  const cargarOpciones = async () => {
    if (opcionesPedidas.current) return;
    opcionesPedidas.current = true;

    try {
      const [respObras, respMaquinas, respPersonal] = await Promise.all([
        listarObras("?estado=En curso&campos=razonsocial,nombreobra,estado"),
        listarMaquinas("?campos=maquina,usaGasoil"),
        listarPersonal("?campos=nombre,activo"),
      ]);

      if (respObras?.ok) setObras(await respObras.json());
      if (respMaquinas?.ok) setMaquinas(await respMaquinas.json());
      if (respPersonal?.ok) setPersonal(await respPersonal.json());
      setOpcionesListas(true);
    } catch (error) {
      console.error("Error al cargar opciones de gasoil:", error);
      // Si falló, que el próximo intento de abrir el modal lo reintente.
      opcionesPedidas.current = false;
    }
  };

  useEffect(() => {
    cargarOpciones();
  }, []);

  const abrirModal = () => {
    cargarOpciones();
    setShowModal(true);
  };

  const guardarCarga = async (datos) => {
    const respuesta = await crearCargaGasoil(datos);

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
