import { useEffect, useMemo, useRef } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { useForm } from "react-hook-form";
import AsyncButton from "../../../../shared/AsyncButton.jsx";
import { conClienteInterno, obrasDeCliente } from "../../../../../helpers/gasoilInterno.js";

const hoyLocal = () => new Date().toLocaleDateString("en-CA");

// Los únicos que cargan gasoil, tal cual figuran en el alta de Personal.
const QUIENES_CARGAN = ["Nacho", "Agustín", "Castillo, Nelson", "Ruiz, Mauricio"];

// Al editar una carga vieja, el valor guardado puede no estar más en la lista
// (obra terminada, alguien que ya no carga). Lo agregamos para no perderlo.
const conValorActual = (opciones, actual) =>
  actual && !opciones.includes(actual) ? [actual, ...opciones] : opciones;

const valoresIniciales = () => ({
  fecha: hoyLocal(),
  cliente: "",
  obra: "",
  maquina: "",
  litros: "",
  quienCarga: "",
});

const GasoilModal = ({
  show,
  onHide,
  onGuardar,
  cargaEditando,
  cargandoOpciones = false,
  obras = [],
  maquinas = [],
  personal = [],
}) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: valoresIniciales() });

  useEffect(() => {
    if (!show) return;
    reset(
      cargaEditando
        ? {
            fecha: cargaEditando.fecha || hoyLocal(),
            cliente: cargaEditando.cliente || "",
            obra: cargaEditando.obra || "",
            maquina: cargaEditando.maquina || "",
            litros: cargaEditando.litros ?? "",
            quienCarga: cargaEditando.quienCarga || "",
          }
        : valoresIniciales()
    );
  }, [show, cargaEditando, reset]);

  const clienteSel = watch("cliente");
  const obraSel = watch("obra");
  const maquinaSel = watch("maquina");
  const quienCargaSel = watch("quienCarga");

  // Solo se carga gasoil a obras abiertas, así que el modal trabaja siempre
  // sobre las que están en curso.
  const obrasEnCurso = useMemo(
    () => obras.filter((o) => o.estado === "En curso"),
    [obras]
  );

  // Lepa va siempre al final, tenga o no obras en curso: es el consumo interno.
  const clientes = useMemo(
    () =>
      conValorActual(
        conClienteInterno(
          [...new Set(obrasEnCurso.map((o) => o.razonsocial).filter(Boolean))].sort((a, b) =>
            a.localeCompare(b)
          )
        ),
        clienteSel
      ),
    [obrasEnCurso, clienteSel]
  );

  // Solo las obras del cliente elegido: evita cargar gasoil a una obra que no
  // le corresponde al cliente. Para Lepa, la única opción es "Uso interno".
  const obrasDelCliente = useMemo(
    () =>
      conValorActual(
        obrasDeCliente(
          clienteSel,
          obrasEnCurso
            .filter((o) => !clienteSel || o.razonsocial === clienteSel)
            .map((o) => o.nombreobra)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b))
        ),
        obraSel
      ),
    [obrasEnCurso, clienteSel, obraSel]
  );

  // Las máquinas que cargan gasoil se marcan con el check "Carga gasoil" del
  // alta de Máquinas. Las viejas, sin el campo, se toman como que sí cargan.
  const nombresMaquinas = useMemo(
    () =>
      conValorActual(
        [
          ...new Set(
            maquinas.filter((m) => m.usaGasoil !== false).map((m) => m.maquina).filter(Boolean)
          ),
        ].sort((a, b) => a.localeCompare(b)),
        maquinaSel
      ),
    [maquinas, maquinaSel]
  );

  const quienesCargan = useMemo(
    () =>
      conValorActual(
        QUIENES_CARGAN.filter((nombre) => personal.some((p) => p.nombre === nombre)),
        quienCargaSel
      ),
    [personal, quienCargaSel]
  );

  // El botón ya se deshabilita con isSubmitting, pero dos clicks muy seguidos
  // pueden disparar dos submits antes de que React lo repinte. Este ref corta
  // el segundo antes de que salga el request.
  const guardando = useRef(false);

  const guardar = async (data) => {
    if (guardando.current) return;
    guardando.current = true;
    try {
      await onGuardar({
        fecha: data.fecha,
        cliente: data.cliente,
        obra: data.obra,
        maquina: data.maquina,
        litros: Number(data.litros),
        quienCarga: data.quienCarga,
      });
    } finally {
      guardando.current = false;
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: "1.2rem" }}>
          {cargaEditando ? "Editar carga de gasoil" : "Nueva carga de gasoil"}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit(guardar)}>
        <Modal.Body className="d-flex flex-column align-items-center">
          <Form.Group className="mb-3 w-100" style={{ maxWidth: "180px" }}>
            <Form.Label className="d-block text-center">Fecha*</Form.Label>
            <Form.Control
              size="sm"
              type="date"
              className="text-center"
              max={hoyLocal()}
              isInvalid={!!errors.fecha}
              {...register("fecha", { required: "La fecha es obligatoria" })}
            />
            <Form.Text className="text-danger d-block text-center">
              {errors.fecha?.message}
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3 w-100" style={{ maxWidth: "280px" }}>
            <Form.Label className="d-block text-center">Cliente*</Form.Label>
            <Form.Select
              size="sm"
              disabled={cargandoOpciones}
              isInvalid={!!errors.cliente}
              {...register("cliente", { required: "El cliente es obligatorio" })}
              onChange={(e) => {
                setValue("cliente", e.target.value, { shouldValidate: true });
                setValue("obra", "");
              }}
            >
              <option value="">{cargandoOpciones ? "Cargando..." : "Seleccionar..."}</option>
              {clientes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Form.Select>
            <Form.Text className="text-danger d-block text-center">
              {errors.cliente?.message}
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3 w-100" style={{ maxWidth: "280px" }}>
            <Form.Label className="d-block text-center">Obra*</Form.Label>
            <Form.Select
              size="sm"
              disabled={!clienteSel}
              isInvalid={!!errors.obra}
              {...register("obra", { required: "La obra es obligatoria" })}
            >
              <option value="">
                {clienteSel ? "Seleccionar..." : "Elegí un cliente primero"}
              </option>
              {obrasDelCliente.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Form.Select>
            <Form.Text className="text-danger d-block text-center">
              {errors.obra?.message}
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3 w-100" style={{ maxWidth: "280px" }}>
            <Form.Label className="d-block text-center">Máquina*</Form.Label>
            <Form.Select
              size="sm"
              disabled={cargandoOpciones}
              isInvalid={!!errors.maquina}
              {...register("maquina", { required: "La máquina es obligatoria" })}
            >
              <option value="">{cargandoOpciones ? "Cargando..." : "Seleccionar..."}</option>
              {nombresMaquinas.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Form.Select>
            <Form.Text className="text-danger d-block text-center">
              {errors.maquina?.message}
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3 w-100" style={{ maxWidth: "120px" }}>
            <Form.Label className="d-block text-center">Litros*</Form.Label>
            <Form.Control
              size="sm"
              type="number"
              step="0.01"
              min="0"
              className="text-center"
              onFocus={(e) => {
                const el = e.target;
                setTimeout(() => el.select(), 0);
              }}
              isInvalid={!!errors.litros}
              {...register("litros", {
                required: "Los litros son obligatorios",
                validate: (v) => Number(v) > 0 || "Los litros deben ser mayores a 0",
              })}
            />
            <Form.Text className="text-danger d-block text-center">
              {errors.litros?.message}
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3 w-100" style={{ maxWidth: "280px" }}>
            <Form.Label className="d-block text-center">Quién carga*</Form.Label>
            <Form.Select
              size="sm"
              disabled={cargandoOpciones}
              isInvalid={!!errors.quienCarga}
              {...register("quienCarga", { required: "Indicá quién carga" })}
            >
              <option value="">{cargandoOpciones ? "Cargando..." : "Seleccionar..."}</option>
              {quienesCargan.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Form.Select>
            <Form.Text className="text-danger d-block text-center">
              {errors.quienCarga?.message}
            </Form.Text>
          </Form.Group>
        </Modal.Body>

        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={onHide} disabled={isSubmitting}>
            Cancelar
          </Button>
          <AsyncButton variant="outline-success" type="submit" loading={isSubmitting}>
            Guardar
          </AsyncButton>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default GasoilModal;
