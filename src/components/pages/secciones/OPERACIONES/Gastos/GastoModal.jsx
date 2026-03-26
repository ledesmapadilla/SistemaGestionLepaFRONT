import { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import {
  crearGastoAPI,
  editarGastoAPI,
} from "../../../../../helpers/queriesGastos";
import Swal from "sweetalert2";

const GastoModal = ({
  show,
  handleClose,
  obra,
  actualizarTabla,
  gastoEditar,
  preciosObra,
}) => {
  const initialState = {
    item: "",
    cantidad: "",
    unidad: "",
    costoUnitario: "",
    observaciones: "",
  };

  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState({});

  const listaPreciosObra = preciosObra || [];


  useEffect(() => {
    if (show) {
      if (gastoEditar) {
        setFormData({
          item: gastoEditar.item || "",
          cantidad: gastoEditar.cantidad || "",
          unidad: gastoEditar.unidad || "",
          costoUnitario: gastoEditar.costoUnitario || "",
          observaciones: gastoEditar.observaciones || "",
        });
      } else {
        setFormData(initialState);
      }
      setErrors({});
    }
  }, [show, gastoEditar]);

  // --- LÓGICA MODIFICADA PARA INPUT LIBRE + AUTOCOMPLETADO ---
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      let nuevosDatos = { ...prev, [name]: value };

      // Si el usuario está escribiendo en el campo "item"
      if (name === "item") {
        // Buscamos si lo que escribió coincide EXACTAMENTE con algo de la lista
        const precioEncontrado = listaPreciosObra.find(
          (p) => p.clasificacion === value || p.trabajo === value
        );

        if (precioEncontrado) {
          nuevosDatos.costoUnitario = precioEncontrado.precio;
          nuevosDatos.unidad = precioEncontrado.unidad;
        } else {
        }
      }

      return nuevosDatos;
    });
  };

  const validarFormulario = () => {
    const nuevosErrores = {};
    if (!formData.item.trim()) nuevosErrores.item = "Requerido";
    if (!formData.cantidad || Number(formData.cantidad) <= 0)
      nuevosErrores.cantidad = "> 0";
    if (!formData.unidad.trim()) nuevosErrores.unidad = "Requerido";
    if (!formData.costoUnitario || Number(formData.costoUnitario) <= 0)
      nuevosErrores.costoUnitario = "> 0";

    setErrors(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarFormulario()) return;

    const datosGasto = {
      item: formData.item,
      cantidad: Number(formData.cantidad),
      unidad: formData.unidad,
      costoUnitario: Number(formData.costoUnitario),
      observaciones: formData.observaciones || "-",
      obra: obra._id || obra,
    };

    try {
      let respuesta;
      if (gastoEditar) {
        respuesta = await editarGastoAPI(gastoEditar._id, datosGasto);
      } else {
        respuesta = await crearGastoAPI(datosGasto);
      }

      if (respuesta.status === 201 || respuesta.status === 200) {
        Swal.fire({
          icon: "success",
          title: gastoEditar ? "Editado" : "Guardado",
          showConfirmButton: false,
          timer: 1500,
        });
        actualizarTabla();
        handleClose();
      } else {
        Swal.fire("Error", "No se pudo procesar la solicitud", "error");
      }
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Ocurrió un error en el servidor", "error");
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {gastoEditar ? "Editar Gasto" : "Nuevo Gasto"}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Item *</Form.Label>

            {/*  INPUT DE TEXTO NORMAL CON EL ATRIBUTO LIST */}
            <Form.Control
              type="text"
              name="item"
              value={formData.item}
              onChange={handleChange}
              list="opciones-precios" // ESTO LO VINCULA CON EL DATALIST DE ABAJO
              placeholder="Escriba o seleccione..."
              autoComplete="off" // Recomendado para que no se mezcle con el historial del navegador
              isInvalid={!!errors.item}
            />

            {/*  LISTA INVISIBLE DE SUGERENCIAS */}
            <datalist id="opciones-precios">
              {/* Opción manual de Gasoil si existe */}
              {listaPreciosObra.some((p) => p.clasificacion === "Gasoil") && (
                <option value="Gasoil" />
              )}

              {/* El resto de opciones */}
              {listaPreciosObra
                .filter((p) => p.clasificacion !== "Gasoil")
                .map((p, index) => (
                  <option
                    key={index}
                    value={
                      p.clasificacion === "Alquiler"
                        ? p.trabajo
                        : p.clasificacion
                    }
                  />
                ))}
            </datalist>

            <Form.Control.Feedback type="invalid">
              {errors.item}
            </Form.Control.Feedback>
          </Form.Group>

          <div className="row">
            <div className="col-6">
              <Form.Group className="mb-3">
                <Form.Label>Cantidad *</Form.Label>
                <Form.Control
                  type="number"
                  name="cantidad"
                  value={formData.cantidad}
                  onChange={handleChange}
                  isInvalid={!!errors.cantidad}
                />
              </Form.Group>
            </div>
            <div className="col-6">
              <Form.Group className="mb-3">
                <Form.Label>Unidad *</Form.Label>
                <Form.Control
                  name="unidad"
                  value={formData.unidad}
                  onChange={handleChange}
                  isInvalid={!!errors.unidad}
                />
              </Form.Group>
            </div>
          </div>

          <Form.Group className="mb-3">
            <Form.Label>Costo Unitario *</Form.Label>
            <Form.Control
              type="number"
              name="costoUnitario"
              value={formData.costoUnitario}
              onChange={handleChange}
              isInvalid={!!errors.costoUnitario}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Observaciones</Form.Label>
            <Form.Control
              as="textarea"
              name="observaciones"
              value={formData.observaciones}
              onChange={handleChange}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button variant="outline-success" type="submit">
            {gastoEditar ? "Editar" : "Guardar"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default GastoModal;
