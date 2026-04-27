import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import NavDropdown from "react-bootstrap/NavDropdown";
import logosimple from "../../assets/logosimple.jpg";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

import "../../styles/menu.css";
import { Link } from "react-router-dom";

function Menu() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Navbar
      fixed="top"
      expand="lg"
      bg="light"
      className=" navbar-lepa shadow-sm"
      collapseOnSelect={true}
    >
      <Container fluid="lg">
        {/* Logo */}
        <Navbar.Brand
          as={Link}
          to="/"
          className="d-flex align-items-center gap-2"
        >
          <img
            src={logosimple}
            alt="LEPA"
            height="70"
            className="d-inline-block"
          />
        </Navbar.Brand>

        {/* Botón hamburguesa */}
        <Navbar.Toggle aria-controls="navbar-nav" />

        <Navbar.Collapse id="navbar-nav">
          <Nav className="ms-auto">
            <Nav.Link as={Link} to="/" className="mx-2">
              Inicio
            </Nav.Link>

            <NavDropdown
              title="Operaciones"
              id="nav-dropdown"
              className="mx-2"
            >
              <NavDropdown.Item as={Link} to="/obras" className="text-center">
                Obras
              </NavDropdown.Item>

              <NavDropdown title="Remitos" id="nav-dropdown" className="mx-3">
                <NavDropdown.Item as={Link} to="/remitos-sinfacturar">
                  Remitos sin facturar
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/remitos-todos">
                  Listado de remitos
                </NavDropdown.Item>
              </NavDropdown>

              <NavDropdown title="Informes" id="nav-dropdown" className="mx-3">
                <NavDropdown.Item as={Link} to="/costos-obra">
                  Análisis de costos
                </NavDropdown.Item>
              </NavDropdown>
            </NavDropdown>

            <NavDropdown title="Mantenimiento" id="nav-dropdown" className="mx-2">
              <NavDropdown.Item as={Link} to="/consumo-aceites">
                Consumo aceites
              </NavDropdown.Item>
            </NavDropdown>

            <NavDropdown title="Variables" id="nav-dropdown" className="mx-2">
              <NavDropdown.Item as={Link} to="/variables">
                Variables
              </NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/precios">
                Precios Máquinas
              </NavDropdown.Item>
            </NavDropdown>

            <NavDropdown title="Clientes" id="nav-dropdown-clientes" className="mx-2">
              <NavDropdown.Item as={Link} to="/facturacion">
                Facturación Clientes
              </NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/cobro-factura">
                Cobro de factura
              </NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/cuenta-corriente">
                Cuenta Corriente
              </NavDropdown.Item>
            </NavDropdown>

            <NavDropdown title="ALTAS" id="nav-dropdown" className="mx-2">
              <NavDropdown.Item as={Link} to="/proveedores">
                Proveedores
              </NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/clientes">
                Clientes
              </NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/personal">
                Personal
              </NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/maquina">
                Máquinas
              </NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/aceites">
                Aceites
              </NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/usuarios">
                Usuarios
              </NavDropdown.Item>
            </NavDropdown>

            <div className="mx-2 d-flex flex-column align-items-center justify-content-center">
              <span style={{ fontSize: "0.8rem", color: "var(--lepa-gray)", lineHeight: 1.1 }}>
                {usuario?.nombre || usuario?.usuario}
              </span>
              <Nav.Link
                onClick={handleLogout}
                className="p-0"
                style={{ color: "var(--lepa-orange)", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem" }}
              >
                Cerrar sesión
              </Nav.Link>
            </div>

          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default Menu;
