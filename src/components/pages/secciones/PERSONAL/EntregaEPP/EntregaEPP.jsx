import { useState, useEffect } from "react";
import { Container, Table, Button, Spinner, Form, Badge } from "react-bootstrap";
import { listarPersonal } from "../../../../../helpers/queriesPersonal.js";
import Swal from "sweetalert2";
import "../../../../../styles/clientes.css";

const EntregaEPP = () => {
  const [personal, setPersonal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    const cargarPersonal = async () => {
      setLoading(true);
      try {
        const response = await listarPersonal();
        if (response && response.ok) {
          const data = await response.json();
          // Ordenar alfabéticamente por nombre
          const ordenado = (data || []).sort((a, b) =>
            a.nombre.localeCompare(b.nombre)
          );
          setPersonal(ordenado);
        } else {
          setPersonal([]);
        }
      } catch (error) {
        console.error("Error cargando personal para EPP:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudo cargar la lista de personal.",
        });
      } finally {
        setLoading(false);
      }
    };

    cargarPersonal();
  }, []);

  const handleHistorial = (nombre) => {
    Swal.fire({
      title: `Historial de EPP - ${nombre}`,
      text: "Sección en desarrollo. Aquí se mostrará el historial de entregas.",
      icon: "info",
      confirmButtonColor: "#3085d6",
    });
  };

  const handleNuevaEntrega = (nombre) => {
    Swal.fire({
      title: `Nueva Entrega de EPP - ${nombre}`,
      text: "Sección en desarrollo. Aquí se registrará una nueva entrega.",
      icon: "info",
      confirmButtonColor: "#3085d6",
    });
  };

  const personalFiltrado = personal.filter((p) =>
    (p.nombre || "").toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <Container className="mt-4 w-75">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Entrega de EPP <small className="text-muted" style={{ fontSize: "1rem", fontWeight: 400 }}>Control de Elementos de Protección Personal</small></h2>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="position-relative" style={{ width: "300px" }}>
          <Form.Control
            size="sm"
            type="text"
            placeholder="Buscar por nombre..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            style={{ paddingRight: "30px" }}
          />
          {filtro && (
            <button
              type="button"
              className="btn btn-sm text-warning position-absolute top-50 translate-middle-y end-0 me-2 p-0 border-0 fw-bold"
              aria-label="Limpiar"
              onClick={() => setFiltro("")}
            >
              ✕
            </button>
          )}
        </div>
        <div className="text-muted" style={{ fontSize: "0.9rem" }}>
          Total: {personalFiltrado.length} personas
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
                <th style={{ minWidth: "250px" }}>Personal</th>
                <th style={{ minWidth: "120px" }}>Estado</th>
                <th style={{ minWidth: "220px" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {personalFiltrado.map((p) => (
                <tr key={p._id}>
                  <td className="text-start fw-semibold ps-3">
                    {p.nombre}
                  </td>
                  <td>
                    {p.activo !== false ? (
                      <Badge bg="success">Activo</Badge>
                    ) : (
                      <Badge bg="danger">Inactivo</Badge>
                    )}
                  </td>
                  <td>
                    <div className="d-flex gap-2 justify-content-center align-items-center">
                      <Button
                        variant="outline-info"
                        size="sm"
                        onClick={() => handleHistorial(p.nombre)}
                      >
                        Historial
                      </Button>
                      <Button
                        variant="outline-success"
                        size="sm"
                        onClick={() => handleNuevaEntrega(p.nombre)}
                      >
                        Nueva Entrega
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {personalFiltrado.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-muted py-3">
                    No se encontró personal que coincida con la búsqueda.
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

export default EntregaEPP;
