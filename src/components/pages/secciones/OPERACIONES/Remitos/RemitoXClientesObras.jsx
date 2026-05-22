import { useEffect, useState } from "react";
import { Table, Spinner, Button } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import { listarRemitos } from "../../../../../helpers/queriesRemitos";

const RemitosXClientesObras = () => {
  const [datosAgrupados, setDatosAgrupados] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  const { razonSocial } = location.state || {};

  const cargarDatos = async () => {
    if (!razonSocial) return;

    try {
      const remitos = await listarRemitos();

      const agrupado = remitos.reduce((acc, remito) => {
        // 1. Verificamos coincidencia de cliente
        if (remito.obra?.razonsocial === razonSocial) {
          
          // 2. NORMALIZACIÓN DEL ESTADO
          const estado = remito.estado
            ? remito.estado.toString().toLowerCase().trim()
            : "";

          // 3. COMPARAMOS
          if (estado === "sin facturar") {
            
            const nombreObra = remito.obra?.nombreobra || "Obra sin nombre";

            if (!acc[nombreObra]) {
              acc[nombreObra] = {
                nombreObra,
                monto: 0,
                cantidadRemitos: 0,
                obraData: remito.obra,
              };
            }

            const subtotalRemito =
              remito.items?.reduce((sum, item) => {
                const cant = Number(item.cantidad) || 0;
                const precio = Number(item.precioUnitario) || 0;
                return sum + cant * precio;
              }, 0) || 0;

            acc[nombreObra].monto += subtotalRemito;
            acc[nombreObra].cantidadRemitos += 1;
          }
        }
        return acc;
      }, {});

      const resultado = Object.values(agrupado);
      setDatosAgrupados(resultado);
    } catch (error) {
      console.error("Error al agrupar por obras:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [razonSocial]);

  const formatoMiles = (n) => new Intl.NumberFormat("es-AR").format(n);

  if (!razonSocial)
    return <div className="mt-5">No se seleccionó un cliente.</div>;
  if (loading)
    return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <div className="w-50 mx-auto my-2">
      <h6 className="text-center mb-1">Obras con remitos sin facturar</h6>
      <h6 className="text-center mb-1">Razón social: <span className="titulosLetras">{razonSocial}</span></h6>
      <div className="d-flex justify-content-end mb-3">
        <Button size="sm" variant="outline-success" onClick={() => navigate(-1)}>Volver</Button>
      </div>

      <div>
        <Table striped bordered hover className="text-center align-middle">
          <thead className="table-dark">
            <tr>
              <th>Nombre de la Obra</th>
              <th>Monto No facturado</th>
              <th>Cant. remitos</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {datosAgrupados.length > 0 ? (
              datosAgrupados.map((item, index) => (
                <tr key={index}>
                  <td className="fw-bold text-start ps-4">{item.nombreObra}</td>
                  <td className="">${formatoMiles(item.monto)}</td>
                  <td>{item.cantidadRemitos}</td>
                  <td>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() =>
                        navigate("/remito-cliente-final", {
                          state: {
                            obraId: item.obraData._id,
                            obraNombre: item.nombreObra,
                            razonsocial: razonSocial,
                          },
                        })
                      }
                    >
                      Ver Detalle
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="py-4 text-muted">
                  No se encontraron obras con deuda para este cliente.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
};

export default RemitosXClientesObras;