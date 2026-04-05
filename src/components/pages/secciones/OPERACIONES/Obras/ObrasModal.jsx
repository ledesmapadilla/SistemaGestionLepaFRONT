import { Modal, Button, Form } from "react-bootstrap";
import Select from "react-select";

const ModalObras = ({
  show,
  onHide,
  editando,
  verDetalle,
  handleSubmit,
  onSubmit,
  register,
  errors,
  clientes,
  clienteSeleccionado,
  setClienteSeleccionado,
  inputCliente,
  setInputCliente,
  setValue,
  obras,
  obraId,
  nombreObraOriginal,
  abrirModalPrecios,
}) => {
  const opcionesClientes = clientes.map((c) => ({
    value: c.razonsocial,
    label: c.razonsocial,
  }));

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {verDetalle ? "Detalles de la Obra" : editando ? "Editar" : "Crear"}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Body>
          <fieldset disabled={verDetalle}>
            {/* Razón Social */}
            <Form.Group className="mb-3">
              <Form.Label>Razón Social*</Form.Label>
              <Select
                menuPortalTarget={document.body}
                options={opcionesClientes}
                placeholder="Buscar razón social"
                isClearable={false}
                isDisabled={verDetalle}
                value={clienteSeleccionado}
                inputValue={inputCliente}
                onInputChange={(value, actionMeta) => {
                  if (actionMeta.action === "input-change")
                    setInputCliente(value);
                }}
                onChange={(opcion) => {
                  setClienteSeleccionado(opcion);
                  setValue("razonsocial", opcion ? opcion.value : "", {
                    shouldValidate: true,
                  });
                  setInputCliente("");
                }}
                styles={{
                  control: (base, state) => ({
                    ...base,
                    backgroundColor: "#212529",
                    color: "#fff",
                    borderColor: state.isFocused ? "#86b7fe" : "#495057",
                    boxShadow: state.isFocused
                      ? "0 0 0 0.25rem rgba(13, 110, 253, 0.25)"
                      : "none",
                  }),
                  input: (base) => ({ ...base, color: "#fff" }),
                  singleValue: (base) => ({ ...base, color: "#fff" }),
                  menu: (base) => ({ ...base, backgroundColor: "#212529" }),
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isFocused ? "#b6d3ffff" : "#212529",
                    color: state.isFocused ? "#353c43ff" : "#fff",
                  }),
                }}
              />
              {errors.razonsocial && (
                <div className="text-danger small mt-1">
                  {errors.razonsocial.message}
                </div>
              )}
            </Form.Group>

            <input
              type="hidden"
              {...register("razonsocial", {
                required: "La razón social es obligatoria",
              })}
            />

            {/* Contacto */}
            <Form.Group className="mb-3">
              <Form.Label>Contacto*</Form.Label>
              <Form.Control
                {...register("contacto", {
                  required: "El contacto es obligatorio",
                })}
              />
              <Form.Text className="text-danger">
                {errors.contacto?.message}
              </Form.Text>
            </Form.Group>

            {/* Nombre Obra */}
            <Form.Group className="mb-3">
              <Form.Label>Nombre Obra*</Form.Label>
              <Form.Control
                {...register("nombreobra", {
                  required: "El nombre de la obra es obligatorio",
                  validate: (value) => {
                    const normalizado = value.toLowerCase().trim();
                    if (
                      editando &&
                      nombreObraOriginal &&
                      normalizado === nombreObraOriginal.toLowerCase().trim()
                    )
                      return true;

                    const existe = obras.some(
                      (o) =>
                        o &&
                        o.nombreobra?.toLowerCase().trim() === normalizado &&
                        o._id !== obraId,
                    );
                    return !existe || "El nombre de la obra ya existe";
                  },
                })}
              />
              <Form.Text className="text-danger">
                {errors.nombreobra?.message}
              </Form.Text>
            </Form.Group>

           
          {/* Estado */}
            <Form.Group className="mb-3">
              <Form.Label>Estado*</Form.Label>
              {editando || verDetalle ? (
                // MODO EDITAR: Muestra el Select para cambiar estado
                <Form.Select
                  {...register("estado", {
                    required: "El estado es obligatorio",
                  })}
                >
                  <option value="En curso">En curso</option>
                  <option value="Terminada (+)">Terminada (+)</option>
                  <option value="Terminada (-)">Terminada (-)</option>
                </Form.Select>
              ) : (
                // MODO CREAR: Muestra un input de texto fijo (no editable)
                <Form.Control
                  type="text"
                  value="En curso"
                  readOnly // No permite escribir
                  className="text-muted" // Estilo visual de "deshabilitado"
                  {...register("estado")}
                />
              )}
              <Form.Text className="text-danger">
                {errors.estado?.message}
              </Form.Text>
            </Form.Group>

            {/* Fecha y precios */}
            <div className="row g-3 mb-3">
              <div className="col text-center">
                <Form.Label>Fecha*</Form.Label>
                <Form.Control
                  type="date"
                  max={new Date().toISOString().split("T")[0]}
                  {...register("fecha", {
                    required: "La fecha es obligatoria",
                  })}
                />
              </div>

              <div className="col text-center">
                <Form.Label>Precios*</Form.Label>
                <div>
                  <Button
                    variant="outline-secondary"
                    onClick={abrirModalPrecios}
                  >
                    {editando ? "Editar lista precios" : "Crear lista precios"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Descripción */}
            <Form.Group className="mb-3">
              <Form.Label>Descripción de la obra*</Form.Label>
              <Form.Control
                as="textarea"
                {...register("descripcion", {
                  required: "La descripción es obligatoria",
                })}
              />
              <Form.Text className="text-danger">
                {errors.descripcion?.message}
              </Form.Text>
            </Form.Group>
          </fieldset>
        </Modal.Body>

        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={onHide}>
            Cancelar
          </Button>
          {!verDetalle && (
            <Button variant="outline-success" type="submit">
              Guardar
            </Button>
          )}
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default ModalObras;
