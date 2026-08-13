import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Col, Form, ListGroup, Row, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import AsyncButton from "../../../../shared/AsyncButton.jsx";
import {
  listarOpcionesGasoil,
  crearCargaGasoilPublica,
} from "../../../../../helpers/queriesPublicoGasoil.js";

const hoyLocal = () => new Date().toLocaleDateString("en-CA");

const mostrarFechaDMY = (fecha) => {
  if (!fecha) return "";
  const [y, m, d] = fecha.split("-");
  return d ? `${d}-${m}-${y}` : fecha;
};

// El orden en que se van completando las tarjetas. Al elegir un valor se abre
// sola la siguiente que falte, así se carga de arriba a abajo sin tocar de más.
const CAMPOS = ["fecha", "cliente", "obra", "maquina", "litros", "quienCarga"];

// Tres por fila. Las alternativas no se despliegan dentro de la tarjeta (queda
// muy angosta): se abren en un panel ancho debajo de la fila que se tocó.
const FILAS = [CAMPOS.slice(0, 3), CAMPOS.slice(3)];

const ETIQUETAS = {
  fecha: "Fecha",
  cliente: "Cliente",
  obra: "Obra",
  maquina: "Máquina",
  litros: "Litros",
  quienCarga: "Nombre",
};

const VALORES_INICIALES = {
  fecha: hoyLocal(),
  cliente: "",
  obra: "",
  maquina: "",
  litros: "",
  quienCarga: "",
};

// Página de alta pensada para el celular: en vez de un modal con selects, una
// tarjeta por campo que se despliega al tocarla y muestra las alternativas.
// Va sin login, igual que /gasoil/carga.
const NuevaCargaGasoil = () => {
  const navigate = useNavigate();

  const [valores, setValores] = useState(VALORES_INICIALES);
  // Arranca con todas cerradas: la pantalla se ve entera antes de tocar nada.
  const [abierto, setAbierto] = useState(null);
  const [opciones, setOpciones] = useState(null);

  const opcionesPedidas = useRef(false);
  const fechaRef = useRef(null);

  const pedirOpciones = async () => {
    if (opcionesPedidas.current) return null;
    opcionesPedidas.current = true;

    try {
      const respuesta = await listarOpcionesGasoil();
      if (respuesta?.ok) return await respuesta.json();
      opcionesPedidas.current = false;
    } catch (error) {
      console.error("Error al cargar opciones de gasoil:", error);
      opcionesPedidas.current = false;
    }
    return null;
  };

  useEffect(() => {
    pedirOpciones().then((datos) => {
      if (datos) setOpciones(datos);
    });
  }, []);

  const obras = useMemo(() => opciones?.obras || [], [opciones]);

  const clientes = useMemo(
    () =>
      [...new Set(obras.map((o) => o.razonsocial).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [obras]
  );

  // Solo las obras del cliente elegido: no se puede cargar gasoil a una obra
  // que no le corresponde.
  const obrasDelCliente = useMemo(
    () =>
      obras
        .filter((o) => o.razonsocial === valores.cliente)
        .map((o) => o.nombreobra)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [obras, valores.cliente]
  );

  const maquinas = useMemo(
    () =>
      [...new Set((opciones?.maquinas || []).map((m) => m.maquina).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [opciones]
  );

  const quienesCargan = useMemo(
    () => (opciones?.personal || []).map((p) => p.nombre).filter(Boolean),
    [opciones]
  );

  const listaDe = (campo) => {
    if (campo === "cliente") return clientes;
    if (campo === "obra") return obrasDelCliente;
    if (campo === "maquina") return maquinas;
    if (campo === "quienCarga") return quienesCargan;
    return [];
  };

  const completo = (campo) => valores[campo] !== "" && valores[campo] != null;

  const faltantes = CAMPOS.filter((campo) => !completo(campo));

  // Al elegir se cierra el panel y no se abre ninguno: el orden lo decide quien
  // carga, tocando la tarjeta que quiera.
  const elegir = (campo, valor) => {
    setValores((prev) => {
      // Cambiar de cliente invalida la obra que estaba elegida.
      if (campo === "cliente" && prev.cliente !== valor) {
        return { ...prev, cliente: valor, obra: "" };
      }
      return { ...prev, [campo]: valor };
    });
    setAbierto(null);
  };

  // La fecha no abre panel propio: dispara el calendario nativo del teléfono.
  // showPicker() no existe en todos los navegadores, de ahí el fallback.
  const abrirCalendario = () => {
    const el = fechaRef.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
      el.click();
    }
  };

  const alternar = (campo) => {
    if (campo === "fecha") {
      setAbierto(null);
      abrirCalendario();
      return;
    }
    setAbierto((prev) => (prev === campo ? null : campo));
  };

  const textoValor = (campo) => {
    if (!completo(campo)) {
      if (campo === "obra" && !valores.cliente) return "Elegí un cliente primero";
      return "Tocar para elegir";
    }
    if (campo === "fecha") return mostrarFechaDMY(valores.fecha);
    if (campo === "litros") return `${valores.litros} L`;
    return valores[campo];
  };

  const guardar = async () => {
    const respuesta = await crearCargaGasoilPublica({
      fecha: valores.fecha,
      cliente: valores.cliente,
      obra: valores.obra,
      maquina: valores.maquina,
      litros: Number(valores.litros),
      quienCarga: valores.quienCarga,
    });

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

    await Swal.fire({
      icon: "success",
      title: "Carga registrada",
      timer: 1500,
      showConfirmButton: false,
    });
    navigate("/gasoil/carga");
  };

  const cargandoOpciones = opciones === null;

  return (
    <div
      className="mx-auto px-3 py-3 d-flex flex-column justify-content-center"
      style={{ maxWidth: "480px", minHeight: "100dvh" }}
    >
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">Nueva carga</h6>
        <Button size="sm" variant="outline-secondary" onClick={() => navigate("/gasoil/carga")}>
          Cancelar
        </Button>
      </div>

      {/* Fuera de la vista pero renderizado: showPicker() no funciona sobre un
          input con display:none. Es el que abre el calendario del teléfono. */}
      <Form.Control
        ref={fechaRef}
        type="date"
        max={hoyLocal()}
        value={valores.fecha}
        onChange={(e) => setValores((prev) => ({ ...prev, fecha: e.target.value }))}
        style={{
          position: "absolute",
          opacity: 0,
          width: 0,
          height: 0,
          padding: 0,
          border: "none",
          pointerEvents: "none",
        }}
        tabIndex={-1}
        aria-hidden="true"
      />

      {FILAS.map((fila, indiceFila) => (
        <div key={indiceFila}>
          <Row className="g-2 mb-2">
            {fila.map((campo) => {
              const estaAbierto = abierto === campo;
              const listo = completo(campo);

              // Una sola clase de borde: si se acumulan dos, cuál gana depende
              // del orden del CSS de Bootstrap, no del orden acá.
              const borde = estaAbierto
                ? "border-success"
                : listo
                ? "border-success-subtle"
                : "border-secondary-subtle";

              return (
                <Col xs={4} key={campo}>
                  <Card
                    role="button"
                    onClick={() => alternar(campo)}
                    className={`h-100 ${listo ? "bg-success-subtle" : "bg-body-tertiary"} ${borde}`}
                  >
                    <Card.Body className="p-2 text-center">
                      <div className="text-muted text-uppercase" style={{ fontSize: "0.65rem" }}>
                        {ETIQUETAS[campo]}
                      </div>
                      {/* "Tocar" va en text-body-tertiary, un gris más apagado
                          que el text-muted de la etiqueta: se lee que falta
                          completar sin competir con el título. */}
                      <div
                        title={textoValor(campo)}
                        className={`text-truncate ${
                          listo ? "fw-semibold" : "text-body-tertiary"
                        }`}
                        style={{ fontSize: "0.85rem" }}
                      >
                        {listo ? textoValor(campo) : "Tocar"}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>

          {/* El panel de alternativas va debajo de la fila tocada, a lo ancho. */}
          {fila.includes(abierto) && (
            <Card className="mb-2 bg-body-tertiary border-success">
              <Card.Header className="py-2 fw-semibold" style={{ fontSize: "0.9rem" }}>
                {ETIQUETAS[abierto]}
              </Card.Header>

              {abierto === "litros" && (
                <Card.Body className="d-flex flex-column align-items-center">
                  {/* Sin placeholder: un 0 en gris se lee como si ya hubiera un
                      valor cargado. Arranca vacío. */}
                  <Form.Control
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    autoFocus
                    value={valores.litros}
                    className="text-center"
                    style={{ maxWidth: "130px", height: "60px", fontSize: "1.6rem" }}
                    onFocus={(e) => {
                      const el = e.target;
                      setTimeout(() => el.select(), 0);
                    }}
                    onChange={(e) => setValores((prev) => ({ ...prev, litros: e.target.value }))}
                  />
                  <Button
                    size="sm"
                    variant="outline-success"
                    className="mt-2"
                    style={{ maxWidth: "130px", width: "100%" }}
                    disabled={!(Number(valores.litros) > 0)}
                    onClick={() => setAbierto(null)}
                  >
                    Listo
                  </Button>
                </Card.Body>
              )}

              {!["fecha", "litros"].includes(abierto) && (
                <ListGroup variant="flush" style={{ maxHeight: "50vh", overflowY: "auto" }}>
                  {cargandoOpciones ? (
                    <ListGroup.Item className="text-center py-3 bg-transparent">
                      <Spinner animation="border" size="sm" />
                    </ListGroup.Item>
                  ) : listaDe(abierto).length > 0 ? (
                    listaDe(abierto).map((opcion) => (
                      <ListGroup.Item
                        key={opcion}
                        action
                        active={valores[abierto] === opcion}
                        onClick={() => elegir(abierto, opcion)}
                        className="py-3 bg-transparent"
                      >
                        {opcion}
                      </ListGroup.Item>
                    ))
                  ) : (
                    <ListGroup.Item className="text-muted py-3 bg-transparent">
                      {abierto === "obra"
                        ? "Elegí un cliente primero"
                        : "No hay opciones disponibles"}
                    </ListGroup.Item>
                  )}
                </ListGroup>
              )}
            </Card>
          )}
        </div>
      ))}

      <div className="d-flex justify-content-center mt-3">
        <AsyncButton
          variant="outline-success"
          style={{ minWidth: "140px" }}
          disabled={faltantes.length > 0}
          onClick={guardar}
        >
          Guardar
        </AsyncButton>
      </div>
    </div>
  );
};

export default NuevaCargaGasoil;
