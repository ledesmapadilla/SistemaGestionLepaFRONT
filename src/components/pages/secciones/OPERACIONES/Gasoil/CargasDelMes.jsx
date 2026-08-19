import { useEffect, useMemo, useState } from "react";
import { Button, Card, Col, Form, Row, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { listarCargasGasoilDelMes } from "../../../../../helpers/queriesPublicoGasoil.js";
import "../../../../../styles/gasoilMobile.css";

// No hay cargas anteriores a 2026: el selector arranca ahí, igual que el
// backend, que rechaza cualquier año previo.
const ANIO_MINIMO = 2026;

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const diasDelMes = (anio, mes) => new Date(anio, mes, 0).getDate();

// Vista de consulta del celular: una tarjeta por día del mes con las máquinas a
// las que se les cargó gasoil ese día. Solo el nombre de la máquina, sin litros
// ni ningún otro dato. Va sin login, igual que el resto de /gasoil/carga.
const CargasDelMes = () => {
  const navigate = useNavigate();

  const hoy = new Date();
  const [anio, setAnio] = useState(Math.max(hoy.getFullYear(), ANIO_MINIMO));
  const [mes, setMes] = useState(hoy.getMonth() + 1);

  const [cargas, setCargas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const anios = useMemo(() => {
    const hasta = Math.max(hoy.getFullYear(), ANIO_MINIMO);
    const lista = [];
    for (let a = ANIO_MINIMO; a <= hasta; a++) lista.push(a);
    return lista;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let vigente = true;

    const traer = async () => {
      setCargando(true);
      setError("");

      const respuesta = await listarCargasGasoilDelMes(anio, mes);
      if (!vigente) return;

      if (!respuesta) {
        setCargas([]);
        setError("No se pudo conectar con el servidor.");
      } else if (!respuesta.ok) {
        setCargas([]);
        setError("No se pudieron cargar los datos del mes.");
      } else {
        setCargas(await respuesta.json());
      }
      if (vigente) setCargando(false);
    };

    traer();
    // Si se cambia de mes antes de que llegue la respuesta anterior, la vieja
    // no tiene que pisar a la nueva.
    return () => {
      vigente = false;
    };
  }, [anio, mes]);

  // { "YYYY-MM-DD": ["Máquina A", "Máquina B"] } sin repetir: si una máquina se
  // cargó dos veces el mismo día, en la tarjeta va una sola vez.
  const maquinasPorFecha = useMemo(() => {
    const mapa = {};
    cargas.forEach(({ fecha, maquina }) => {
      if (!fecha || !maquina) return;
      if (!mapa[fecha]) mapa[fecha] = new Set();
      mapa[fecha].add(maquina);
    });
    return Object.fromEntries(
      Object.entries(mapa).map(([fecha, set]) => [
        fecha,
        [...set].sort((a, b) => a.localeCompare(b)),
      ])
    );
  }, [cargas]);

  const dias = useMemo(() => {
    const total = diasDelMes(anio, mes);
    const mm = String(mes).padStart(2, "0");
    return Array.from({ length: total }, (_, i) => {
      const dia = i + 1;
      const fecha = `${anio}-${mm}-${String(dia).padStart(2, "0")}`;
      return {
        dia,
        fecha,
        diaSemana: DIAS_SEMANA[new Date(anio, mes - 1, dia).getDay()],
        maquinas: maquinasPorFecha[fecha] || [],
      };
    });
  }, [anio, mes, maquinasPorFecha]);

  return (
    <div className="mx-auto px-3 py-3" style={{ maxWidth: "480px" }}>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h5 className="mb-0">Cargas del mes</h5>
        <Button size="sm" variant="outline-secondary" onClick={() => navigate("/gasoil/carga")}>
          Volver
        </Button>
      </div>

      <Row className="g-2 mb-3">
        <Col xs={7}>
          <Form.Select
            size="sm"
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            aria-label="Mes"
          >
            {MESES.map((nombre, indice) => (
              <option key={nombre} value={indice + 1}>
                {nombre}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col xs={5}>
          <Form.Select
            size="sm"
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            aria-label="Año"
          >
            {anios.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Form.Select>
        </Col>
      </Row>

      {error && <div className="text-danger text-center mb-3">{error}</div>}

      {cargando ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="success" />
        </div>
      ) : (
        <Row className="g-2">
          {dias.map(({ dia, diaSemana, maquinas }) => {
            const hubo = maquinas.length > 0;

            return (
              <Col xs={6} key={dia}>
                <Card
                  className={`h-100 ${hubo ? "bg-success-subtle border-success-subtle" : "bg-body-tertiary border-secondary-subtle"}`}
                >
                  <Card.Body className="px-2 py-2" style={{ minHeight: "78px" }}>
                    <div
                      className="text-muted text-uppercase mb-1"
                      style={{ fontSize: "0.75rem" }}
                    >
                      {diaSemana} {dia}
                    </div>
                    {hubo ? (
                      maquinas.map((maquina) => (
                        <div
                          key={maquina}
                          className="fw-semibold"
                          style={{
                            fontSize: "0.95rem",
                            lineHeight: 1.25,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {maquina}
                        </div>
                      ))
                    ) : (
                      <div
                        className="fst-italic text-body-tertiary"
                        style={{ fontSize: "0.9rem", opacity: 0.7 }}
                      >
                        Sin cargas
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
};

export default CargasDelMes;
