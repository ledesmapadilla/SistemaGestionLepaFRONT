import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Col, Form, ListGroup, Row, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import DatePicker, { registerLocale } from "react-datepicker";
import { es } from "date-fns/locale";
import Swal from "sweetalert2";
import AsyncButton from "../../../../shared/AsyncButton.jsx";
import {
  listarOpcionesGasoil,
  crearCargaGasoilPublica,
} from "../../../../../helpers/queriesPublicoGasoil.js";
import "react-datepicker/dist/react-datepicker.css";
import "../../../../../styles/gasoilMobile.css";

registerLocale("es", es);

const hoyLocal = () => new Date().toLocaleDateString("en-CA");

const mostrarFechaDMY = (fecha) => {
  if (!fecha) return "";
  const [y, m, d] = fecha.split("-");
  return d ? `${d}-${m}-${y}` : fecha;
};

// "YYYY-MM-DD" ↔ Date, siempre en hora local: new Date("2026-08-13") lo
// interpreta como UTC y en Argentina cae un día antes.
const aDate = (ymd) => {
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const aYMD = (date) => (date ? date.toLocaleDateString("en-CA") : "");

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

  const alternar = (campo) => setAbierto((prev) => (prev === campo ? null : campo));

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
    if (faltantes.length > 0) {
      const lista = faltantes.map((campo) => ETIQUETAS[campo]);
      await Swal.fire({
        icon: "warning",
        title: lista.length === 1 ? "Falta un dato" : "Faltan datos",
        text: `Completá: ${lista.join(", ")}.`,
      });
      // Abre la primera que falta, para no tener que buscarla.
      setAbierto(faltantes[0]);
      return;
    }

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
      className="gasoil-centrado mx-auto px-3 py-3 d-flex flex-column justify-content-center"
      style={{ maxWidth: "480px" }}
    >
      {/* Fijo arriba a la derecha: el contenido está centrado vertical y si
          Cancelar viajara con él quedaría en medio de la pantalla. */}
      <Button
        size="sm"
        variant="outline-secondary"
        onClick={() => navigate("/gasoil/carga")}
        style={{ position: "fixed", top: "12px", right: "12px", zIndex: 10 }}
      >
        Cancelar
      </Button>

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
                    <Card.Body
                      className="px-2 py-3 text-center d-flex flex-column justify-content-center"
                      style={{ minHeight: "86px" }}
                    >
                      <div className="text-muted text-uppercase mb-1" style={{ fontSize: "0.75rem" }}>
                        {ETIQUETAS[campo]}
                      </div>
                      {/* "Tocar" en cursiva y gris apagado. El opacity va sobre
                          text-body-tertiary en vez de un gris fijo, así sigue
                          funcionando si alguna vez cambia el tema. */}
                      <div
                        title={textoValor(campo)}
                        className={`gasoil-valor ${
                          listo ? "fw-semibold" : "fst-italic text-body-tertiary"
                        }`}
                        style={{
                          fontSize: "1.05rem",
                          lineHeight: 1.2,
                          opacity: listo ? 1 : 0.7,
                        }}
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
              <Card.Header
                className="py-2 fw-semibold"
                style={{ fontSize: "0.9rem", borderBottom: "2px solid #ffc107" }}
              >
                {ETIQUETAS[abierto]}
              </Card.Header>

              {abierto === "fecha" && (
                <Card.Body className="d-flex justify-content-center">
                  {/* Calendario propio en vez del nativo: al tocar un día queda
                      elegido y se cierra, sin el botón "Establecer" que mete
                      Android en su selector. */}
                  <DatePicker
                    inline
                    locale="es"
                    selected={aDate(valores.fecha)}
                    maxDate={new Date()}
                    onChange={(date) => elegir("fecha", aYMD(date))}
                  />
                </Card.Body>
              )}

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
        {/* Habilitado siempre: si falta algo lo dice, en vez de quedarse
            apagado sin explicar por qué. */}
        <AsyncButton variant="outline-success" style={{ minWidth: "140px" }} onClick={guardar}>
          Guardar
        </AsyncButton>
      </div>
    </div>
  );
};

export default NuevaCargaGasoil;
