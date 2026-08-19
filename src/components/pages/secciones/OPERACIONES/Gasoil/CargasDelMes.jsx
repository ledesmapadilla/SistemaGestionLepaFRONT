import { useEffect, useMemo, useState } from "react";
import { Button, Card, Col, Form, Modal, Row, Spinner, Table } from "react-bootstrap";
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

const formatoLitros = (litros) =>
  Number(litros).toLocaleString("es-AR", { maximumFractionDigits: 2 });

// Vista de consulta del celular: una tarjeta por día del mes con las máquinas a
// las que se les cargó gasoil ese día. La tarjeta muestra solo el nombre de la
// máquina; al tocar el día se abre el detalle con los litros de cada una.
// Va sin login, igual que el resto de /gasoil/carga.
const CargasDelMes = () => {
  const navigate = useNavigate();

  const hoy = new Date();
  const [anio, setAnio] = useState(Math.max(hoy.getFullYear(), ANIO_MINIMO));
  const [mes, setMes] = useState(hoy.getMonth() + 1);

  const [cargas, setCargas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  // Día abierto en el modal de detalle, o null si está cerrado.
  const [diaAbierto, setDiaAbierto] = useState(null);

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
      // El detalle abierto es de un día del mes anterior: ya no corresponde.
      setDiaAbierto(null);

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

  // { "YYYY-MM-DD": [{ maquina, litros }] } con una fila por máquina: si la
  // misma máquina se cargó dos veces en el día, los litros se suman.
  const maquinasPorFecha = useMemo(() => {
    const mapa = {};
    cargas.forEach(({ fecha, maquina, litros }) => {
      if (!fecha || !maquina) return;
      if (!mapa[fecha]) mapa[fecha] = {};
      mapa[fecha][maquina] = (mapa[fecha][maquina] || 0) + Number(litros || 0);
    });
    return Object.fromEntries(
      Object.entries(mapa).map(([fecha, porMaquina]) => [
        fecha,
        Object.entries(porMaquina)
          .map(([maquina, litros]) => ({ maquina, litros }))
          .sort((a, b) => a.maquina.localeCompare(b.maquina)),
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
          {dias.map((datosDia) => {
            const { dia, diaSemana, maquinas } = datosDia;
            const hubo = maquinas.length > 0;

            return (
              <Col xs={6} key={dia}>
                {/* Los días sin cargas no se pueden tocar: no hay detalle que
                    mostrar. */}
                <Card
                  role={hubo ? "button" : undefined}
                  onClick={hubo ? () => setDiaAbierto(datosDia) : undefined}
                  style={hubo ? { cursor: "pointer" } : undefined}
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
                      maquinas.map(({ maquina }) => (
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

      <Modal show={diaAbierto !== null} onHide={() => setDiaAbierto(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: "1.1rem" }}>
            {diaAbierto
              ? `${diaAbierto.diaSemana} ${diaAbierto.dia} de ${MESES[mes - 1]}`
              : ""}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table striped bordered hover responsive className="mb-0 align-middle">
            <thead className="table-dark">
              <tr>
                <th>Máquina</th>
                <th className="text-end">Litros</th>
              </tr>
            </thead>
            <tbody>
              {(diaAbierto?.maquinas || []).map(({ maquina, litros }) => (
                <tr key={maquina}>
                  <td>{maquina}</td>
                  <td className="text-end">{formatoLitros(litros)}</td>
                </tr>
              ))}
            </tbody>
            {/* El total del día es lo primero que se mira: va abajo y en negrita. */}
            <tfoot>
              <tr className="fw-bold">
                <td>Total</td>
                <td className="text-end">
                  {formatoLitros(
                    (diaAbierto?.maquinas || []).reduce((suma, m) => suma + m.litros, 0)
                  )}
                </td>
              </tr>
            </tfoot>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setDiaAbierto(null)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default CargasDelMes;
