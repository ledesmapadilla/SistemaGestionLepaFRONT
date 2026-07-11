import { useState, useEffect, useMemo } from "react";
import { Container, Table, Button, Spinner, Form, Badge } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import { listarPersonal } from "../../../../../helpers/queriesPersonal.js";
import { obtenerEntregasEPP } from "../../../../../helpers/queriesEntregaEPP.js";
import Swal from "sweetalert2";

const ResumenEPP = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Fechas iniciales de búsqueda
  const hoy = new Date().toLocaleDateString("en-CA");
  const primerDiaAnio = new Date(new Date().getFullYear(), 0, 1).toLocaleDateString("en-CA");

  const [desde, setDesde] = useState(location.state?.desde || primerDiaAnio);
  const [hasta, setHasta] = useState(location.state?.hasta || hoy);

  const [personal, setPersonal] = useState([]);
  const [entregas, setEntregas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const [resPersonal, resEntregas] = await Promise.all([
          listarPersonal(),
          obtenerEntregasEPP()
        ]);

        if (resPersonal && resPersonal.ok) {
          const dataP = await resPersonal.json();
          setPersonal(dataP.sort((a, b) => a.nombre.localeCompare(b.nombre)));
        }
        if (resEntregas && resEntregas.ok) {
          const dataE = await resEntregas.json();
          setEntregas(dataE || []);
        }
      } catch (error) {
        console.error("Error al cargar datos del resumen:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudieron cargar los datos de entregas.",
        });
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  // Entregas filtradas por fecha
  const entregasFiltradas = useMemo(() => {
    return entregas.filter((e) => {
      const f = e.fecha;
      return f >= desde && f <= hasta;
    });
  }, [entregas, desde, hasta]);

  // Mapa de entregas: { "nombre de personal": { camisa: true, pantalon: true, ... } }
  const mapaEntregados = useMemo(() => {
    const mapa = {};
    entregasFiltradas.forEach((ent) => {
      const nombreNorm = (ent.personal || "").trim().toLowerCase();
      if (!mapa[nombreNorm]) {
        mapa[nombreNorm] = { camisa: false, pantalon: false, botines: false, otros: false };
      }
      if (ent.epp) {
        mapa[nombreNorm][ent.epp.toLowerCase()] = true;
      }
    });
    return mapa;
  }, [entregasFiltradas]);

  const volver = () => {
    navigate("/personal/entrega-epp", { state: { desde, hasta } });
  };

  return (
    <Container className="mt-4 w-50">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Resumen de Entregas EPP <small className="text-muted" style={{ fontSize: "1rem", fontWeight: 400 }}>Estado de EPP Entregados por Fecha</small></h2>
        <Button variant="outline-success" onClick={volver}>Volver</Button>
      </div>

      <div className="d-flex align-items-end gap-3 mb-4 p-3 bg-dark rounded" style={{ border: "1px solid #495057" }}>
        <Form.Group controlId="desde" style={{ width: "160px" }}>
          <Form.Label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Fecha Desde</Form.Label>
          <Form.Control
            size="sm"
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
        </Form.Group>

        <Form.Group controlId="hasta" style={{ width: "160px" }}>
          <Form.Label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Fecha Hasta</Form.Label>
          <Form.Control
            size="sm"
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />
        </Form.Group>

        <div className="text-muted ms-auto" style={{ fontSize: "0.9rem" }}>
          Total Personal: {personal.length}
        </div>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center my-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "65vh" }}>
          <Table striped bordered hover size="sm" className="text-center align-middle mb-0">
            <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
              <tr>
                <th style={{ minWidth: "220px" }}>Personal</th>
                <th style={{ width: "120px" }}>Camisa</th>
                <th style={{ width: "120px" }}>Pantalón</th>
                <th style={{ width: "120px" }}>Botines</th>
                <th style={{ width: "120px" }}>Otros</th>
              </tr>
            </thead>
            <tbody>
              {personal.map((p) => {
                const nombreNorm = (p.nombre || "").trim().toLowerCase();
                const epps = mapaEntregados[nombreNorm] || { camisa: false, pantalon: false, botines: false, otros: false };

                const renderCheck = (entregado) => {
                  return entregado ? (
                    <span style={{ color: "#198754", fontSize: "1.2rem", fontWeight: "bold" }}>✓</span>
                  ) : (
                    <span className="text-muted">-</span>
                  );
                };

                return (
                  <tr key={p._id}>
                    <td className="text-start fw-semibold ps-3">{p.nombre}</td>
                    <td>{renderCheck(epps.camisa)}</td>
                    <td>{renderCheck(epps.pantalon)}</td>
                    <td>{renderCheck(epps.botines)}</td>
                    <td>{renderCheck(epps.otros)}</td>
                  </tr>
                );
              })}
              {personal.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-muted py-3">
                    No se encontraron registros de personal.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      )}
    </Container>
  );
};

export default ResumenEPP;
