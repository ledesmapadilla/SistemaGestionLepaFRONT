import { useEffect, useMemo, useState } from "react";
import { Button, Form, InputGroup, Modal, Spinner, Table } from "react-bootstrap";
import Swal from "sweetalert2";
import AsyncButton from "../../../../shared/AsyncButton.jsx";
import {
  listarVariables,
  crearVariable,
  editarVariable,
} from "../../../../../helpers/queriesVariables.js";

// El precio del gasoil vive en la variable "Gasoil" de Operaciones → Variables,
// que ya guarda historial con { valor, fecha, observaciones }. Se reutiliza en
// vez de crear una colección nueva: así los dos lados muestran lo mismo.
const NOMBRE_VARIABLE = "Gasoil";

const hoyLocal = () => new Date().toLocaleDateString("en-CA");

const formatoMoneda = (valor) => {
  if (valor === undefined || valor === null || valor === "") return "-";
  return Number(valor).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
};

const mostrarFechaDMY = (fecha) => {
  if (!fecha) return "-";
  const [y, m, d] = fecha.split("-");
  return d ? `${d}-${m}-${y}` : fecha;
};

// El input de precio es de texto, no numérico: type="number" no admite puntos
// de miles, así que no podría mostrar el formato adentro de la caja.
const formatearEntrada = (texto) => {
  const limpio = (texto || "").replace(/[^\d,]/g, "");
  const [entera, decimal] = limpio.split(",");
  const enteraFmt = entera ? Number(entera).toLocaleString("es-AR") : "";
  return decimal !== undefined ? `${enteraFmt},${decimal.slice(0, 2)}` : enteraFmt;
};

const aNumero = (texto) => {
  const limpio = (texto || "").replace(/\./g, "").replace(",", ".");
  return limpio === "" ? NaN : Number(limpio);
};

// El vigente es el de fecha más reciente, no el último cargado: mismo criterio
// que usa la tabla de Variables.
const masReciente = (historial) => {
  if (!Array.isArray(historial) || historial.length === 0) return null;
  return [...historial].sort((a, b) => (a.fecha || "").localeCompare(b.fecha || "")).at(-1);
};

const PrecioGasoil = () => {
  const [variable, setVariable] = useState(null);
  const [cargando, setCargando] = useState(true);

  const [showEditar, setShowEditar] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);

  const [fecha, setFecha] = useState(hoyLocal());
  const [precio, setPrecio] = useState("");
  const [observaciones, setObservaciones] = useState("");
  // Un error por campo, para poder mostrarlo debajo del que falta.
  const [errores, setErrores] = useState({});

  const cargar = async () => {
    try {
      const respuesta = await listarVariables();
      if (respuesta?.ok) {
        const data = await respuesta.json();
        setVariable(data.find((v) => v.variable === NOMBRE_VARIABLE) || null);
      }
    } catch (err) {
      console.error("Error al cargar el precio del gasoil:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const historial = useMemo(() => variable?.historial || [], [variable]);

  // Más reciente primero, que es como se lee un historial.
  const historialOrdenado = useMemo(
    () => [...historial].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "")),
    [historial]
  );

  const vigente = masReciente(historial);

  const abrirEditar = () => {
    setFecha(hoyLocal());
    setPrecio("");
    setObservaciones("");
    setErrores({});
    setShowEditar(true);
  };

  // Guarda el historial completo: el backend hace findByIdAndUpdate con lo que
  // le mandemos, así que se manda el array entero ya modificado.
  const guardarHistorial = async (nuevoHistorial) => {
    if (variable) {
      const respuesta = await editarVariable(variable._id, {
        variable: NOMBRE_VARIABLE,
        historial: nuevoHistorial,
      });
      if (!respuesta?.ok) return null;
      const data = await respuesta.json();
      return data.variable;
    }

    // Si todavía no existe la variable, se crea con el primer valor.
    const respuesta = await crearVariable({
      variable: NOMBRE_VARIABLE,
      historial: nuevoHistorial,
    });
    if (!respuesta?.ok) return null;
    const data = await respuesta.json();
    return data.variable;
  };

  const guardarPrecio = async () => {
    const valor = aNumero(precio);
    const nuevosErrores = {};
    if (!fecha) nuevosErrores.fecha = "Falta la fecha";
    if (precio === "") nuevosErrores.precio = "Falta el precio";
    else if (isNaN(valor) || valor <= 0) nuevosErrores.precio = "Tiene que ser mayor a 0";

    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    const actualizada = await guardarHistorial([
      ...historial,
      { valor, fecha, observaciones: observaciones.trim() },
    ]);

    if (!actualizada) {
      Swal.fire({ icon: "error", title: "Error", text: "No se pudo guardar el precio" });
      return;
    }

    setVariable(actualizada);
    setShowEditar(false);
    Swal.fire({
      icon: "success",
      title: "Precio guardado",
      timer: 1200,
      showConfirmButton: false,
    });
  };

  const borrarValor = async (item) => {
    const confirmacion = await Swal.fire({
      title: "¿Borrar este precio?",
      text: `${mostrarFechaDMY(item.fecha)} — ${formatoMoneda(item.valor)}`,
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: "swal-btn-danger" },
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    });
    if (!confirmacion.isConfirmed) return;

    // Se compara por _id: dos cargas pueden coincidir en fecha y valor.
    const nuevoHistorial = historial.filter((h) => String(h._id) !== String(item._id));
    const actualizada = await guardarHistorial(nuevoHistorial);

    if (!actualizada) {
      Swal.fire({ icon: "error", title: "Error", text: "No se pudo borrar el precio" });
      return;
    }

    setVariable(actualizada);
    Swal.fire({
      icon: "success",
      title: "Precio borrado",
      timer: 1200,
      showConfirmButton: false,
    });
  };

  return (
    <>
      <div className="d-flex align-items-center gap-2">
        <span className="text-muted" style={{ fontSize: "0.9rem" }}>
          Precio gasoil
        </span>

        <span
          className="px-3 py-1 border rounded bg-body-tertiary text-nowrap"
          title={vigente ? `Cargado el ${mostrarFechaDMY(vigente.fecha)}` : ""}
        >
          {cargando ? <Spinner animation="border" size="sm" /> : formatoMoneda(vigente?.valor)}
        </span>

        <Button size="sm" variant="outline-warning" onClick={abrirEditar}>
          Editar
        </Button>
        <Button size="sm" variant="outline-info" onClick={() => setShowHistorial(true)}>
          Historial
        </Button>
      </div>

      {/* ---- MODAL EDITAR ---- */}
      <Modal show={showEditar} onHide={() => setShowEditar(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: "1.2rem" }}>Precio gasoil</Modal.Title>
        </Modal.Header>

        <Modal.Body className="d-flex flex-column align-items-center">
          <Form.Group className="mb-3 w-100" style={{ maxWidth: "180px" }}>
            <Form.Label className="d-block text-center">Fecha*</Form.Label>
            <Form.Control
              type="date"
              className="text-center"
              value={fecha}
              max={hoyLocal()}
              onChange={(e) => setFecha(e.target.value)}
            />
            {errores.fecha && (
              <div className="text-danger text-center mt-1" style={{ fontSize: "0.85rem" }}>
                {errores.fecha}
              </div>
            )}
          </Form.Group>

          <Form.Group className="mb-3 w-100" style={{ maxWidth: "180px" }}>
            <Form.Label className="d-block text-center">Precio gasoil*</Form.Label>
            <InputGroup>
              <InputGroup.Text>$</InputGroup.Text>
              <Form.Control
                type="text"
                inputMode="decimal"
                className="text-center"
                value={precio}
                onFocus={(e) => {
                  const el = e.target;
                  setTimeout(() => el.select(), 0);
                }}
                onChange={(e) => setPrecio(formatearEntrada(e.target.value))}
              />
            </InputGroup>
            {errores.precio && (
              <div className="text-danger text-center mt-1" style={{ fontSize: "0.85rem" }}>
                {errores.precio}
              </div>
            )}
          </Form.Group>

          <Form.Group className="w-100" style={{ maxWidth: "320px" }}>
            <Form.Label className="d-block text-center">Observaciones</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={() => setShowEditar(false)}>
            Cancelar
          </Button>
          <AsyncButton variant="outline-success" onClick={guardarPrecio}>
            Guardar
          </AsyncButton>
        </Modal.Footer>
      </Modal>

      {/* ---- MODAL HISTORIAL ---- */}
      <Modal show={showHistorial} onHide={() => setShowHistorial(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: "1.2rem" }}>Historial precio gasoil</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Table striped bordered hover size="sm" className="text-center align-middle mb-0">
            <thead className="table-dark">
              <tr>
                <th>Fecha</th>
                <th>Precio</th>
                <th>Observaciones</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {historialOrdenado.length > 0 ? (
                historialOrdenado.map((item) => (
                  <tr key={item._id || `${item.fecha}-${item.valor}`}>
                    <td className="text-nowrap">{mostrarFechaDMY(item.fecha)}</td>
                    <td className="text-nowrap">{formatoMoneda(item.valor)}</td>
                    <td>{item.observaciones || "-"}</td>
                    <td>
                      <AsyncButton
                        size="sm"
                        variant="outline-danger"
                        spinner={false}
                        onClick={() => borrarValor(item)}
                      >
                        ✕
                      </AsyncButton>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="py-3 text-muted">
                    No hay precios cargados
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>

        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={() => setShowHistorial(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default PrecioGasoil;
