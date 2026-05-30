import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Table, Modal, Form, Spinner } from "react-bootstrap";
import Swal from "sweetalert2";
import { obtenerDatos931, guardarDato931, eliminarDato931 } from "../../../../../helpers/queriesDato931";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const FILAS = [
  { tipo: "montoFormulario",  label: "Monto formulario mes:" },
  { tipo: "cantPersonas",     label: "Cantidad de personas mes:" },
  { tipo: "montoPromedio",    label: "Monto promedio por persona:" },
  { tipo: "intereses",        label: "Intereses mes:" },
  { tipo: "otrasDeudas",      label: "Otras deudas mes:" },
];

const formatoMoneda = (valor) =>
  valor == null ? "-" : Number(valor).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default function Impuesto931Cargar() {
  const navigate = useNavigate();
  const { anio, mes } = useParams();
  const mesNombre = MESES[Number(mes)];

  const [datos, setDatos] = useState({});
  const [cargando, setCargando] = useState(true);

  const [showVer, setShowVer]         = useState(null);
  const [showEditar, setShowEditar]         = useState(null);
  const [valorEditar, setValorEditar]       = useState("");
  const [obsEditar, setObsEditar]           = useState("");
  const [editandoValor, setEditandoValor]   = useState(false);
  const [guardando, setGuardando]     = useState(false);

  const [showCargar, setShowCargar]   = useState(false);
  const [formCargar, setFormCargar]   = useState({ montoFormulario: "", cantPersonas: "", intereses: "", otrasDeudas: "" });
  const [editandoCampo, setEditandoCampo] = useState(null);
  const [guardandoCargar, setGuardandoCargar] = useState(false);

  const montoPromedio = (() => {
    const monto = parseFloat(formCargar.montoFormulario);
    const cant  = parseFloat(formCargar.cantPersonas);
    if (!isNaN(monto) && !isNaN(cant) && cant > 0) return monto / cant;
    return null;
  })();

  useEffect(() => {
    obtenerDatos931(Number(anio), Number(mes))
      .then((lista) => {
        const mapa = {};
        lista.forEach((d) => { mapa[d.tipo] = d; });
        setDatos(mapa);
      })
      .catch(console.error)
      .finally(() => setCargando(false));
  }, [anio, mes]);

  const guardar = async (tipo, valor, observaciones = "") => {
    setGuardando(true);
    try {
      const res = await guardarDato931({ anio: Number(anio), mes: Number(mes), tipo, valor: parseFloat(valor), observaciones });
      if (res?.ok) {
        const data = await res.json();
        setDatos((prev) => ({ ...prev, [tipo]: data.dato }));
        setShowEditar(null);
        Swal.fire({ icon: "success", title: "Guardado", timer: 1200, showConfirmButton: false });
      }
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async (tipo) => {
    const dato = datos[tipo];
    if (!dato) return;
    const { isConfirmed } = await Swal.fire({
      title: "¿Borrar este valor?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc3545",
    });
    if (!isConfirmed) return;
    const res = await eliminarDato931(dato._id);
    if (res?.ok) {
      setDatos((prev) => { const copia = { ...prev }; delete copia[tipo]; return copia; });
      Swal.fire({ icon: "success", title: "Borrado", timer: 1200, showConfirmButton: false });
    }
  };

  const abrirEditar = (fila) => {
    const dato = datos[fila.tipo];
    setValorEditar(dato?.valor != null ? String(dato.valor) : "");
    setObsEditar(dato?.observaciones || "");
    setShowEditar(fila);
  };

  const guardarCargarMes = async () => {
    if (!formCargar.montoFormulario) return Swal.fire("Atención", "El monto formulario es obligatorio.", "warning");
    if (!formCargar.cantPersonas)    return Swal.fire("Atención", "La cantidad de personas es obligatoria.", "warning");

    setGuardandoCargar(true);
    try {
      const campos = [
        { tipo: "montoFormulario", valor: parseFloat(formCargar.montoFormulario) },
        { tipo: "cantPersonas",    valor: parseFloat(formCargar.cantPersonas) },
        { tipo: "montoPromedio",   valor: montoPromedio },
        { tipo: "intereses",       valor: formCargar.intereses ? parseFloat(formCargar.intereses) : 0 },
        { tipo: "otrasDeudas",     valor: formCargar.otrasDeudas ? parseFloat(formCargar.otrasDeudas) : 0 },
      ];
      const resultados = await Promise.all(
        campos.map((c) => guardarDato931({ anio: Number(anio), mes: Number(mes), tipo: c.tipo, valor: c.valor }))
      );
      const nuevos = await Promise.all(resultados.map((r) => r.json()));
      const mapa = {};
      nuevos.forEach((d) => { mapa[d.dato.tipo] = d.dato; });
      setDatos((prev) => ({ ...prev, ...mapa }));
      setShowCargar(false);
      setFormCargar({ montoFormulario: "", cantPersonas: "", intereses: "", otrasDeudas: "" });
      Swal.fire({ icon: "success", title: "Mes cargado", timer: 1500, showConfirmButton: false });
    } finally {
      setGuardandoCargar(false);
    }
  };

  if (cargando) return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div style={{ width: 70 }} />
        <h2 className="mb-0 text-center">💀 931 - Cargar - {mesNombre} {anio}</h2>
        <Button variant="outline-success" size="sm" onClick={() => navigate(-1)}>Volver</Button>
      </div>

      <div className="d-flex justify-content-end mb-2">
        <Button variant="outline-primary" size="sm" onClick={() => { setFormCargar({ montoFormulario: "", cantPersonas: "", intereses: "", otrasDeudas: "" }); setShowCargar(true); }}>
          Cargar mes
        </Button>
      </div>

      <Table striped bordered hover className="text-center align-middle w-50 mx-auto">
        <thead className="table-dark">
          <tr>
            <th className="text-start">Concepto</th>
            <th>Valor</th>
            <th>Observaciones</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {FILAS.map((fila) => {
            const dato = datos[fila.tipo];
            return (
              <tr key={fila.tipo}>
                <td className="text-start">{fila.label}</td>
                <td>{dato?.valor != null ? formatoMoneda(dato.valor) : "-"}</td>
                <td className="text-start">{dato?.observaciones || "-"}</td>
                <td>
                  <div className="d-flex gap-1 justify-content-center">
                    <Button size="sm" variant="outline-success" onClick={() => setShowVer(fila)} disabled={!dato}>Ver</Button>
                    <Button size="sm" variant="outline-warning" onClick={() => abrirEditar(fila)} disabled={fila.tipo === "montoPromedio"}>Editar</Button>
                    <Button size="sm" variant="outline-danger" onClick={() => borrar(fila.tipo)} disabled={!dato || fila.tipo === "montoPromedio"}>Borrar</Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      {/* Modal Cargar mes */}
      <Modal show={showCargar} onHide={() => setShowCargar(false)} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title>Cargar mes - {mesNombre} {anio}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {[
              { campo: "montoFormulario", label: "Monto formulario mes" },
              { campo: "cantPersonas",    label: "Cantidad de personas mes" },
              { campo: "intereses",       label: "Intereses mes" },
              { campo: "otrasDeudas",     label: "Otras deudas mes" },
            ].map(({ campo, label }) => (
              <Form.Group key={campo} className="mb-3">
                <Form.Label>{label}</Form.Label>
                <Form.Control
                  type="text"
                  value={editandoCampo === campo ? formCargar[campo] : (formCargar[campo] ? formatoMoneda(formCargar[campo]) : "")}
                  placeholder="$0"
                  onFocus={() => { setEditandoCampo(campo); setFormCargar((p) => ({ ...p, [campo]: "" })); }}
                  onChange={(e) => setFormCargar((p) => ({ ...p, [campo]: e.target.value }))}
                  onBlur={() => setEditandoCampo(null)}
                  onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                />
              </Form.Group>
            ))}
            <Form.Group className="mb-1">
              <Form.Label>Monto promedio por persona</Form.Label>
              <Form.Control
                type="text"
                value={montoPromedio != null ? formatoMoneda(montoPromedio) : "-"}
                disabled
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={() => setShowCargar(false)}>Cancelar</Button>
          <Button variant="outline-success" onClick={guardarCargarMes} disabled={guardandoCargar}>
            {guardandoCargar ? <Spinner size="sm" animation="border" /> : "Guardar"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Ver */}
      <Modal show={!!showVer} onHide={() => setShowVer(null)} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title>{showVer?.label}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <p className="mb-1">Valor: <strong>{datos[showVer?.tipo]?.valor != null ? formatoMoneda(datos[showVer?.tipo]?.valor) : "-"}</strong></p>
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={() => setShowVer(null)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Editar */}
      <Modal show={!!showEditar} onHide={() => setShowEditar(null)} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title>{showEditar?.label}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Valor</Form.Label>
            <Form.Control
              type="text"
              value={editandoValor ? valorEditar : (valorEditar ? formatoMoneda(valorEditar) : "")}
              placeholder="$0"
              onFocus={() => { setEditandoValor(true); setValorEditar(""); }}
              onChange={(e) => setValorEditar(e.target.value)}
              onBlur={() => setEditandoValor(false)}
              onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Observaciones</Form.Label>
            <Form.Control
              type="text"
              value={obsEditar}
              onChange={(e) => setObsEditar(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={() => setShowEditar(null)}>Cancelar</Button>
          <Button variant="outline-success" onClick={() => guardar(showEditar.tipo, valorEditar, obsEditar)} disabled={guardando}>
            {guardando ? <Spinner size="sm" animation="border" /> : "Guardar"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
