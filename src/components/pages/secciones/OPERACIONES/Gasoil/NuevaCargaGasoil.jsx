import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Form, ListGroup, Spinner } from "react-bootstrap";
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
  const [abierto, setAbierto] = useState("cliente");
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

  const estaCompleto = (base, campo) => base[campo] !== "" && base[campo] != null;

  const completo = (campo) => estaCompleto(valores, campo);

  const faltantes = CAMPOS.filter((campo) => !completo(campo));

  // `base` se pasa explícito porque al elegir un valor hay que decidir con los
  // valores nuevos, no con los del render anterior: si se cambia el cliente, la
  // obra se limpia y hay que volver a pedirla en vez de saltearla.
  const abrirSiguiente = (campoActual, base = valores) => {
    const desde = CAMPOS.indexOf(campoActual) + 1;
    const siguiente = CAMPOS.slice(desde).find((campo) => !estaCompleto(base, campo));
    setAbierto(siguiente || null);
  };

  const elegir = (campo, valor) => {
    const nuevos = { ...valores, [campo]: valor };
    // Cambiar de cliente invalida la obra que estaba elegida.
    if (campo === "cliente" && valores.cliente !== valor) nuevos.obra = "";

    setValores(nuevos);
    abrirSiguiente(campo, nuevos);
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

      {CAMPOS.map((campo) => {
        const estaAbierto = abierto === campo;
        const listo = completo(campo);

        return (
          <Card key={campo} className={`mb-2 ${listo ? "border-success" : ""}`}>
            <Card.Body
              role="button"
              onClick={() => alternar(campo)}
              className="py-3 d-flex justify-content-between align-items-center"
            >
              <div>
                <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                  {ETIQUETAS[campo]}
                </div>
                <div
                  style={{ fontSize: "1.05rem" }}
                  className={listo ? "" : "text-muted fst-italic"}
                >
                  {textoValor(campo)}
                </div>
              </div>
              <span className="text-muted ms-2">{estaAbierto ? "▲" : "▼"}</span>
            </Card.Body>

            {estaAbierto && campo === "fecha" && (
              <Card.Body className="pt-0">
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
                <Form.Control
                  type="date"
                  max={hoyLocal()}
                  value={valores.fecha}
                  onChange={(e) => setValores((prev) => ({ ...prev, fecha: e.target.value }))}
                />
              </Card.Body>
            )}

            {estaAbierto && campo === "litros" && (
              <Card.Body className="pt-0">
                <Form.Control
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  autoFocus
                  placeholder="0"
                  value={valores.litros}
                  onFocus={(e) => {
                    const el = e.target;
                    setTimeout(() => el.select(), 0);
                  }}
                  onChange={(e) => setValores((prev) => ({ ...prev, litros: e.target.value }))}
                />
                <Button
                  size="sm"
                  variant="outline-success"
                  className="mt-2 w-100"
                  disabled={!(Number(valores.litros) > 0)}
                  onClick={() => abrirSiguiente("litros")}
                >
                  Listo
                </Button>
              </Card.Body>
            )}

            {estaAbierto && !["fecha", "litros"].includes(campo) && (
              <ListGroup variant="flush">
                {cargandoOpciones ? (
                  <ListGroup.Item className="text-center py-3">
                    <Spinner animation="border" size="sm" />
                  </ListGroup.Item>
                ) : listaDe(campo).length > 0 ? (
                  listaDe(campo).map((opcion) => (
                    <ListGroup.Item
                      key={opcion}
                      action
                      active={valores[campo] === opcion}
                      onClick={() => elegir(campo, opcion)}
                      className="py-3"
                    >
                      {opcion}
                    </ListGroup.Item>
                  ))
                ) : (
                  <ListGroup.Item className="text-muted py-3">
                    {campo === "obra"
                      ? "Elegí un cliente primero"
                      : "No hay opciones disponibles"}
                  </ListGroup.Item>
                )}
              </ListGroup>
            )}
          </Card>
        );
      })}

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
