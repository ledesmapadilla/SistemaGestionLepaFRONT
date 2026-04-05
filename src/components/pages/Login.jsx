import { useForm } from "react-hook-form";
import { useNavigate, Navigate } from "react-router-dom";
import { Container, Form, Button, Card } from "react-bootstrap";
import Swal from "sweetalert2";
import { loginUsuario } from "../../helpers/queriesUsuarios";
import { useAuth } from "../../context/AuthContext";
import logoLepa from "../../assets/logoLepa.jpg";

const Login = () => {
  const { usuario, login } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  if (usuario) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (datos) => {
    const respuesta = await loginUsuario(datos);
    if (!respuesta) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo conectar con el servidor",
      });
      return;
    }
    if (respuesta.status === 200) {
      const usuarioData = await respuesta.json();
      login(usuarioData);
      navigate("/");
    } else {
      const errorData = await respuesta.json();
      Swal.fire({
        icon: "error",
        title: "Error",
        text: errorData.msg || "Usuario o contraseña incorrectos",
      });
    }
  };

  return (
    <Container
      className="d-flex align-items-center justify-content-center"
      style={{ minHeight: "100vh" }}
    >
      <Card style={{ width: "100%", maxWidth: "420px" }}>
        <Card.Body className="p-4">
          <div className="text-center mb-4">
            <img
              src={logoLepa}
              alt="LEPA"
              style={{ height: "80px", borderRadius: "8px" }}
            />
          </div>
          <h4
            className="text-center mb-4 fw-bold"
            style={{ color: "var(--lepa-orange)" }}
          >
            Iniciar sesión
          </h4>

          <Form onSubmit={handleSubmit(onSubmit)}>
            <Form.Group className="mb-3">
              <Form.Label>Usuario*</Form.Label>
              <Form.Control
                type="text"
                {...register("usuario", {
                  required: "El usuario es obligatorio",
                })}
              />
              <Form.Text className="text-danger">
                {errors.usuario?.message}
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Contraseña*</Form.Label>
              <Form.Control
                type="password"
                {...register("contrasena", {
                  required: "La contraseña es obligatoria",
                })}
              />
              <Form.Text className="text-danger">
                {errors.contrasena?.message}
              </Form.Text>
            </Form.Group>

            <div className="d-grid mt-4">
              <Button variant="outline-success" type="submit">
                Ingresar
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Login;
