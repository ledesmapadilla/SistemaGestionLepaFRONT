import { useEffect, useMemo, useState } from "react";
import { Button, Form, Modal, Spinner, Table } from "react-bootstrap";
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
  const [error, setError] = useState("");

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
    setError("");
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
    if (!fecha) return setError("La fecha es obligatoria");
    if (precio === "" || isNaN(Number(precio)) || Number(precio) <= 0) {
      return setError("El precio debe ser un número mayor a 0");
    }
    setError("");

    const actualizada = await guardarHistorial([
      ...historial,
      { valor: Number(precio), fecha, observaciones: observaciones.trim() },
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

        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Fecha*</Form.Label>
            <Form.Control
              type="date"
              value={fecha}
              max={hoyLocal()}
              onChange={(e) => setFecha(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Precio gasoil*</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              min="0"
              value={precio}
              onFocus={(e) => {
                const el = e.target;
                setTimeout(() => el.select(), 0);
              }}
              onChange={(e) => setPrecio(e.target.value)}
            />
          </Form.Group>

          <Form.Group>
            <Form.Label>Observaciones</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </Form.Group>

          {error && <div className="text-danger mt-2">{error}</div>}
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
