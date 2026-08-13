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

const ayerLocal = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("en-CA");
};

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
  quienCarga: "Carga",
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
    <div className="mx-auto px-3 py-3" style={{ maxWidth: "480px" }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">Nueva carga</h6>
        <Button size="sm" variant="outline-secondary" onClick={() => navigate("/gasoil/carga")}>
          Cancelar
        </Button>
      </div>

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
                      <div
                        title={textoValor(campo)}
                        className={`text-truncate ${listo ? "fw-semibold" : "text-muted"}`}
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

              {abierto === "fecha" && (
                <Card.Body>
                  <div className="d-flex gap-2 mb-2">
                    <Button
                      size="sm"
                      variant="outline-light"
                      onClick={() => elegir("fecha", hoyLocal())}
                    >
                      Hoy
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-light"
                      onClick={() => elegir("fecha", ayerLocal())}
                    >
                      Ayer
                    </Button>
                  </div>
                  {/* El input de fecha reporta "" hasta que la fecha está
                      completa, así que solo cierra cuando ya es válida. */}
                  <Form.Control
                    type="date"
                    max={hoyLocal()}
                    value={valores.fecha}
                    onChange={(e) => {
                      if (e.target.value) elegir("fecha", e.target.value);
                      else setValores((prev) => ({ ...prev, fecha: "" }));
                    }}
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

      <AsyncButton
        variant="success"
        className="w-100 mt-3 py-2"
        disabled={faltantes.length > 0}
        onClick={guardar}
      >
        {faltantes.length > 0
          ? `Falta completar ${ETIQUETAS[faltantes[0]]}`
          : "Guardar carga"}
      </AsyncButton>
    </div>
  );
};

export default NuevaCargaGasoil;
