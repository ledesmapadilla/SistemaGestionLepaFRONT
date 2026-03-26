import React, { useState, useEffect } from "react";
import { Table, Button, Container, Form, Spinner, Row, Col } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

// Importamos las queries
import {
  listarAceites,
  crearAceite,
  editarAceite,
  borrarAceite
} from "../../../../../helpers/queriesAceites";

// Importamos el Modal
import AceiteModal from "./AceiteModal";

const AceiteCrud = () => {
  const navigate = useNavigate();

  // Estados
  const [aceites, setAceites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  
  // Estados Modal
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(false);
  const [aceiteAEditar, setAceiteAEditar] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const resp = await listarAceites();
      if (resp?.ok) {
        const data = await resp.json();
        setAceites(data);
      }
    } catch (error) {
      console.error("Error al cargar aceites", error);
      Swal.fire("Error", "No se pudieron cargar los datos", "error");
    } finally {
      setLoading(false);
    }
  };

  // Función de Guardado (Se pasa al Modal)
  const handleGuardar = async (data) => {
    try {
      const resp = await crearAceite(data);

      if (!resp?.ok) {
        Swal.fire({ icon: "error", title: "Error", text: "No se pudo guardar la operación" });
        return;
      }

      Swal.fire({ icon: "success", title: "Aceite registrado", timer: 2000, showConfirmButton: false });
      cargarDatos();
      cerrarModal();
    } catch (error) {
      Swal.fire({ icon: "error", title: "Error inesperado", text: "No se pudo procesar la solicitud" });
    }
  };

  const eliminar = async (id) => {
    const result = await Swal.fire({
      title: "¿Borrar aceite?",
     
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: 'swal-btn-danger' },
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      const resp = await borrarAceite(id);
      if (resp?.ok) {
        setAceites(aceites.filter((a) => a._id !== id));
        Swal.fire({ icon: "success", title: "Aceite borrado", timer: 2000, showConfirmButton: false });
      } else {
        Swal.fire({ icon: "error", title: "Error", text: "No se pudo eliminar el registro" });
      }
    }
  };

  // Apertura de Modales
  const abrirCrear = () => {
    setEditando(false);
    setAceiteAEditar(null);
    setShowModal(true);
  };

  const abrirEditar = (item) => {
    setEditando(true);
    setAceiteAEditar(item);
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setAceiteAEditar(null);
  };

  // Filtros y Formatos
  const busq = busqueda.toLowerCase().trim();
  const filtrados = aceites.filter((a) =>
    (a.tipo || "").toLowerCase().includes(busq) ||
    (a.marca || "").toLowerCase().includes(busq) ||
    (a.denominacion || "").toLowerCase().includes(busq)
  );


  if (loading) return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <Container className="my-3  " fluid>
      <div className="text-center">
        <h4>Alta de aceites</h4>
      </div>

      <Row className="align-items-center mb-3">
        <Col xs={12} md={4}>
          <Form.Control
            type="search"
            placeholder="Buscar por nombre o tipo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </Col>

        <Col xs={12} md={4} className="offset-md-4 d-flex flex-column align-items-end gap-2 mt-3 mt-md-0">
          <Button variant="outline-success" onClick={() => navigate(-1)} className="px-4">Volver</Button>
          <Button variant="outline-primary" onClick={abrirCrear}>Nuevo Aceite</Button>
        </Col>
      </Row>

      <Row className="justify-content-center">
        <Col xs={12} md={10} lg={8}>
          <div className="table-responsive shadow-sm rounded ">
            <Table striped bordered hover className="text-center align-middle mb-0 w-75" size="sm">
              <thead className="table-dark">
                <tr>
                  <th>Tipo de Aceite</th>
                  <th>Marca</th>
                  <th>Denominación Comercial</th>
                  <th>Uso</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr><td colSpan="5" className="py-3">No hay aceites registrados</td></tr>
                ) : (
                  filtrados.map((item) => (
                    <tr key={item._id}>
                      <td>{item.tipo}</td>
                      <td>{item.marca}</td>
                      <td>{item.denominacion}</td>
                      <td>{item.uso}</td>
                      <td>
                        <div className="d-flex gap-1 justify-content-center">
                          <Button size="sm" variant="outline-warning" onClick={() => abrirEditar(item)}>
                            Editar
                          </Button>
                          <Button size="sm" variant="outline-danger" onClick={() => eliminar(item._id)}>
                            Borrar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Col>
      </Row>

      <AceiteModal
        show={showModal}
        onHide={cerrarModal}
        onSubmit={handleGuardar}
        editando={editando}
        aceite={aceiteAEditar}
      />
    </Container>
  );
};

export default AceiteCrud;