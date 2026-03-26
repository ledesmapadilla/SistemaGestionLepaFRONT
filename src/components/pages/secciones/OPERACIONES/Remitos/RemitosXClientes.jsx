import { useEffect, useState } from "react";
import { Table, Container, Spinner, Button } from "react-bootstrap";
import { listarRemitos } from "../../../../../helpers/queriesRemitos";
import { useNavigate } from "react-router-dom";
import "../../../../../styles/remitosxCliente.css";

const RemitosXClientes = () => {
  const navigate = useNavigate();
  const [datosAgrupados, setDatosAgrupados] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargarDatos = async () => {
    try {
      const remitos = await listarRemitos();

      const agrupado = remitos.reduce((acc, remito) => {
        // 1. Validaciones básicas
        if (!remito.obra || !remito.obra.razonsocial) return acc;

        const razonSocial = remito.obra.razonsocial;

        // 2. NORMALIZACIÓN DEL ESTADO (Clave para que no falle el conteo)
        const estado = remito.estado
          ? remito.estado.toString().toLowerCase().trim()
          : "";

        // 3. COMPARAMOS CONTRA "sin facturar" (en minúsculas)
        if (estado === "sin facturar") {
          if (!acc[razonSocial]) {
            acc[razonSocial] = {
              razonSocial,
              monto: 0,
              cantidadRemitos: 0,
            };
          }

          const subtotalRemito =
            remito.items?.reduce((sum, item) => {
              return sum + Number(item.cantidad) * Number(item.precioUnitario);
            }, 0) || 0;

          acc[razonSocial].monto += subtotalRemito;
          acc[razonSocial].cantidadRemitos += 1;
        }

        return acc;
      }, {});

      // 4. Convertimos a array
      const resultadoFinal = Object.values(agrupado);

      setDatosAgrupados(resultadoFinal);
    } catch (error) {
      console.error("Error al cargar listado por clientes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const formatoMiles = (n) => new Intl.NumberFormat("es-AR").format(n);

  if (loading)
    return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <Container className="my-4 w-75">
      <div className="row mb-5 mt-3 align-items-center">
        <div className="col-12 col-md-8 offset-md-2 text-center">
          <h3 className=" mb-0">Remitos sin facturar</h3>
        </div>
        <div className="col-12 col-md-2  mt-3 mt-md-0 ">
          <Button
            variant="outline-success"
            onClick={() => navigate(-1)}
            className="w-50 w-md-auto"
          >
            Volver
          </Button>
        </div>
      </div>

      <div className="table-responsive">
        <Table
          striped
          bordered
          hover
          className="text-center align-middle shadow-sm"
        >
          <thead className="table-dark">
            <tr>
              <th>Razón Social</th>
              <th>Monto No Facturado</th>
              <th>Cant. remitos</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {datosAgrupados.length > 0 ? (
              datosAgrupados.map((item, index) => (
                <tr key={index}>
                  <td className="fw-bold">{item.razonSocial}</td>
                  <td className={item.monto > 0 ? "" : "text-success"}>
                    ${formatoMiles(item.monto)}
                  </td>
                  <td>{item.cantidadRemitos}</td>
                  <td>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() =>
                        navigate("/remitos-cliente-obras", {
                          state: { razonSocial: item.razonSocial },
                        })
                      }
                    >
                      Ver detalle
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="py-4 text-muted">
                  No hay remitos pendientes de facturación
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </Container>
  );
};

export default RemitosXClientes;
