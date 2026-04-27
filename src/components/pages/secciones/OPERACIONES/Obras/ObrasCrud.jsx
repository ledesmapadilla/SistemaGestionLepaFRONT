import { useState, useRef, useEffect } from "react";
import { Table, Button, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import GastoModal from "../Gastos/GastoModal";

const CrudObras = ({
  obras,
  busqueda,
  setBusqueda,
  filtroEstado,
  setFiltroEstado,
  abrirCrear,
  abrirObra,
  abrirDetalleObra,
  abrirModalRemito,
  abrirTablaRemitos,
  borrarObra,
  verPrecios,
  verTablaGastos,
}) => {
  const navigate = useNavigate();
  const [showGastoModal, setShowGastoModal] = useState(false);
  const [obraParaGasto, setObraParaGasto] = useState(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef(null);
  const tableContainerRef = useRef(null);

  useEffect(() => {
    if (!headerRef.current) return;
    const observer = new ResizeObserver(() => {
      setHeaderHeight(headerRef.current?.offsetHeight || 0);
    });
    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const main = document.querySelector("main");
    const footer = document.querySelector("footer");
    if (main) {
      const mainTop = main.getBoundingClientRect().top;
      const footerH = footer ? footer.offsetHeight + parseInt(window.getComputedStyle(footer).marginTop || "0") : 0;
      main.style.overflow = "hidden";
      main.style.display = "flex";
      main.style.flexDirection = "column";
      main.style.height = `calc(100vh - ${mainTop}px - ${footerH}px)`;
    }
    return () => {
      if (main) {
        main.style.overflow = "";
        main.style.display = "";
        main.style.flexDirection = "";
        main.style.height = "";
      }
    };
  }, []);

  // --- 4. FUNCIONES PARA ABRIR Y CERRAR ---
  const manejarAperturaGasto = (obra) => {
    setObraParaGasto(obra);
    setShowGastoModal(true);
  };

  const manejarCierreGasto = () => {
    setShowGastoModal(false);
    setObraParaGasto(null);
  };

  // Lógica de filtrado
  const obrasFiltradas = obras.filter((obra) => {
    if (!obra) return false;
    const texto = busqueda.trim().toLowerCase();
    const razon = obra.razonsocial?.toLowerCase() || "";
    const nombreob = obra.nombreobra?.toLowerCase() || "";
    const coincideTexto = razon.includes(texto) || nombreob.includes(texto);
    const coincideEstado =
      filtroEstado === "" ||
      (filtroEstado === "Terminada" ? obra.estado?.startsWith("Terminada") : obra.estado === filtroEstado);
    return coincideTexto && coincideEstado;
  });

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
      <div className="container" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
      <div ref={headerRef} className="bg-body pt-2 pb-1 px-3" style={{ zIndex: 10 }}>
        <h6 className="text-center mb-2">Obras</h6>

        <div className="d-flex justify-content-between align-items-center mb-2">
          <div className="d-flex gap-2 w-50">
            <Form.Control
              size="sm"
              type="search"
              placeholder="Buscar por razón social o nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <Form.Select
              size="sm"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              style={{ maxWidth: "200px" }}
            >
              <option value="">Todos los estados</option>
              <option value="En curso">En curso</option>
              <option value="Terminada">Terminadas</option>
            </Form.Select>
          </div>
          <div className="d-flex gap-2 ms-2">
            <Button size="sm" variant="outline-success" onClick={() => navigate(-1)}>Volver</Button>
            <Button size="sm" variant="outline-primary" onClick={abrirCrear}>Crear Obra</Button>
          </div>
        </div>
      </div>

      <div ref={tableContainerRef} className="px-3" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        <Table striped bordered hover className="text-center align-middle">
          <thead className="table-dark">
            <tr>
              <th>Razón Social</th>
              <th>Nombre de la Obra</th>
              <th>Contacto</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {obrasFiltradas.length === 0 ? (
              <tr>
                <td colSpan="5">No hay obras que coincidan con los filtros</td>
              </tr>
            ) : (
              obrasFiltradas.map((obra) => (
                <tr key={obra._id}>
                  <td>{obra.razonsocial}</td>
                  <td>{obra.nombreobra}</td>
                  <td>{obra.contacto}</td>
                  <td style={{ whiteSpace: "nowrap" }} className={obra.estado === "Terminada (-)" ? "text-danger" : ""}>{obra.estado}</td>
                  <td className="d-flex gap-1 justify-content-center align-items-center">
                    <Button
                      size="sm"
                      variant="outline-warning"
                      onClick={() => abrirObra(obra)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-success"
                      style={{ whiteSpace: "nowrap" }}
                      onClick={() => abrirDetalleObra(obra)}
                    >
                      Ver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => borrarObra(obra._id)}
                    >
                      Borrar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-primary"
                      onClick={() => abrirModalRemito(obra)}
                    >
                      +Remito
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-primary"
                      onClick={() => abrirTablaRemitos(obra)}
                    >
                      Remitos
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      onClick={() => verPrecios(obra)}
                    >
                      Precios
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => manejarAperturaGasto(obra)}
                    >
                      +Gasto
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => verTablaGastos(obra)}
                    >
                      Gastos
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
      </div>

      {/* AGREGAMOS EL MODAL AL FINAL (OBLIGATORIO) */}
      <GastoModal
        show={showGastoModal}
        handleClose={manejarCierreGasto}
        obra={obraParaGasto}
        actualizarTabla={() => {}}
      />
    </div>
  );
};

export default CrudObras;
