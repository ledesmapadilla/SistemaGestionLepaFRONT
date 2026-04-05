import { Table, Button, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

const ProveedoresCrud = ({
  proveedores,
  busqueda,
  setBusqueda,
  abrirCrear,
  abrirEditar,
  borrarProveedor,
}) => {
  const navigate = useNavigate();

  const proveedoresFiltrados = proveedores.filter((proveedor) => {
    const texto = busqueda.trim().toLowerCase();
    const razon = proveedor.razonsocial?.toLowerCase() || "";
    const contacto = proveedor.contacto?.toLowerCase() || "";

    return razon.startsWith(texto) || contacto.startsWith(texto);
  });

  return (
    <>
      <h2 className="mt-2">Proveedores</h2>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="w-25">
          <Form.Control
            type="search"
            placeholder="Buscar por razón social o contacto"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="d-flex flex-column gap-2">
          <Button variant="outline-success" onClick={() => navigate(-1)}>
            Volver
          </Button>
          <Button variant="outline-primary" onClick={abrirCrear} className="btn-sin-hover">
            Crear Proveedor
          </Button>
        </div>
      </div>

      <div className="table-responsive">
        <Table striped bordered hover className="text-center align-middle">
          <thead className="table-dark">
            <tr>
              <th>Razón Social</th>
              <th>Contacto</th>
              <th>Rubro</th>
              <th>CUIT</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {proveedoresFiltrados.length === 0 ? (
              <tr>
                <td colSpan="7">No hay proveedores cargados</td>
              </tr>
            ) : (
              proveedoresFiltrados.map((proveedor) => (
                <tr key={proveedor._id}>
                  <td>{proveedor.razonsocial || "-"}</td>
                  <td>{proveedor.contacto || "-"}</td>
                  <td>{proveedor.rubro || "-"}</td>
                  <td>{proveedor.cuit || "-"}</td>
                  <td>{proveedor.email || "-"}</td>
                  <td>{proveedor.telefono || "-"}</td>
                  <td className="d-flex gap-1 justify-content-center">
                    <Button
                      size="sm"
                      variant="outline-warning"
                      onClick={() => abrirEditar(proveedor)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => borrarProveedor(proveedor._id)}
                    >
                      Borrar
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
    </>
  );
};

export default ProveedoresCrud;
