import { Link } from "react-router-dom";
import { Button } from "react-bootstrap";
import "../../styles/error404.css";

const Error404 = () => {
  return (
    <div className="error404-fixed bg-white">
      <h1 className="error404-title ">ERROR # 404</h1>

      <img
        src="/img/e404.jpg"
        alt="Máquina vial rota"
        className="error404-img"
      />
      <h5 className="text-dark">Algo salió mal #&@%!</h5>
      <Button as={Link} to="/" variant="outline-success" >
        Volver al inicio
      </Button>
    </div>
  );
};

export default Error404;
