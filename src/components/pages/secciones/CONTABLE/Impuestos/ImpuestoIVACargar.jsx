import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Table, Modal, Form, Spinner } from "react-bootstrap";
import Swal from "sweetalert2";
import { obtenerDatosImpuesto, guardarDatoImpuesto, agregarHistorialImpuesto, eliminarDatoImpuesto } from "../../../../../helpers/queriesDatoImpuesto";

const IMP = "iva";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const FILAS = [
  { tipo: "montoFormulario",  label: "Monto formulario mes" },
  { tipo: "cantPersonas",     label: "Cantidad de personas mes" },
  { tipo: "montoPromedio",    label: "Monto promedio por persona" },
  { tipo: "intereses",        label: "Intereses mes" },
  { tipo: "otrasDeudas",      label: "Otras deudas mes" },
];

const FILAS_TOTAL    = ["montoFormulario", "intereses", "otrasDeudas"];
const TIPOS_HISTORIAL = ["intereses", "otrasDeudas"];
const SIN_VER         = ["montoFormulario", "cantPersonas", "montoPromedio"];

const formatoMoneda = (valor) =>
  valor == null ? "-" : Number(valor).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default function ImpuestoIVACargar() {
  const navigate = useNavigate();
  const { anio, mes } = useParams();
  const mesNombre = MESES[Number(mes)];

  const [datos, setDatos] = useState({});
  const [cargando, setCargando] = useState(true);

  const [showVer, setShowVer]               = useState(null);
  const [showEditar, setShowEditar]         = useState(null);
  const [valorEditar, setValorEditar]       = useState("");
  const [obsEditar, setObsEditar]           = useState("");
  const [editandoValor, setEditandoValor]   = useState(false);
  const [guardando, setGuardando]           = useState(false);
  const [showHistorial, setShowHistorial]   = useState(null);
  const [formHistorial, setFormHistorial]   = useState({ valor: "", fecha: new Date().toLocaleDateString("en-CA"), observaciones: "" });
  const [editandoValorH, setEditandoValorH] = useState(false);
  const [guardandoH, setGuardandoH]         = useState(false);
  const [showPagarModal, setShowPagarModal] = useState(null);
  const [showResumen, setShowResumen]       = useState(null);
  const [formPagarH, setFormPagarH]         = useState({ valor: "", fecha: new Date().toLocaleDateString("en-CA"), observaciones: "" });
  const [editandoValorP, setEditandoValorP] = useState(false);
  const [guardandoP, setGuardandoP]         = useState(false);
  const [showCargar, setShowCargar]         = useState(false);
  const [formCargar, setFormCargar]         = useState({ montoFormulario: "", cantPersonas: "", intereses: "", otrasDeudas: "" });
  const [editandoCampo, setEditandoCampo]   = useState(null);
  const [guardandoCargar, setGuardandoCargar] = useState(false);

  const montoPromedio = (() => {
    const monto = parseFloat(formCargar.montoFormulario);
    const cant  = parseFloat(formCargar.cantPersonas);
    if (!isNaN(monto) && !isNaN(cant) && cant > 0) return monto / cant;
    return null;
  })();

  useEffect(() => {
    obtenerDatosImpuesto(IMP, Number(anio), Number(mes))
      .then((lista) => {
        const mapa = {};
        lista.forEach((d) => { mapa[d.tipo] = d; });
        setDatos(mapa);
      })
      .catch(console.error)
      .finally(() => setCargando(false));
  }, [anio, mes]);

  const getValorNum = (tipo) => {
    const dato = datos[tipo];
    if (!dato) return 0;
    if (TIPOS_HISTORIAL.includes(tipo)) {
      const suma = (dato.historial || []).reduce((s, h) => s + (h.valor || 0), 0);
      return suma > 0 ? suma : (dato.valor || 0);
    }
    return dato.valor || 0;
  };

  const getPagadoNum = (tipo) => {
    const dato = datos[`pago_${tipo}`];
    if (!dato) return 0;
    const suma = (dato.historial || []).reduce((s, h) => s + (h.valor || 0), 0);
    return suma > 0 ? suma : (dato.valor || 0);
  };

  const guardar = async (tipo, valor, observaciones = "") => {
    setGuardando(true);
    try {
      const res = await guardarDatoImpuesto({ impuesto: IMP, anio: Number(anio), mes: Number(mes), tipo, valor: parseFloat(valor), observaciones });
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
      title: "¿Borrar este valor?", icon: "warning", showCancelButton: true,
      confirmButtonText: "Sí, borrar", cancelButtonText: "Cancelar", confirmButtonColor: "#dc3545",
    });
    if (!isConfirmed) return;
    const res = await eliminarDatoImpuesto(dato._id);
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

  const abrirHistorial = (fila) => {
    setFormHistorial({ valor: "", fecha: new Date().toLocaleDateString("en-CA"), observaciones: "" });
    setShowHistorial(fila);
  };

  const agregarEntrada = async () => {
    if (!formHistorial.valor || isNaN(parseFloat(formHistorial.valor)))
      return Swal.fire("Atención", "El valor es obligatorio.", "warning");
    if (!formHistorial.fecha)
      return Swal.fire("Atención", "La fecha es obligatoria.", "warning");
    setGuardandoH(true);
    try {
      const res = await agregarHistorialImpuesto({
        impuesto: IMP, anio: Number(anio), mes: Number(mes),
        tipo: showHistorial.tipo, valor: parseFloat(formHistorial.valor),
        fecha: formHistorial.fecha, observaciones: formHistorial.observaciones,
      });
      if (res?.ok) {
        const data = await res.json();
        setDatos((prev) => ({ ...prev, [showHistorial.tipo]: data.dato }));
        setFormHistorial({ valor: "", fecha: new Date().toLocaleDateString("en-CA"), observaciones: "" });
      }
    } finally {
      setGuardandoH(false);
    }
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
        campos.map((c) => guardarDatoImpuesto({ impuesto: IMP, anio: Number(anio), mes: Number(mes), tipo: c.tipo, valor: c.valor }))
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

  const abrirPagar = (fila) => {
    const valorTotal = getValorNum(fila.tipo);
    setFormPagarH({ valor: valorTotal > 0 ? String(valorTotal) : "", fecha: new Date().toLocaleDateString("en-CA"), observaciones: "" });
    setShowPagarModal(fila);
  };

  const agregarEntradaPago = async () => {
    if (!formPagarH.valor || isNaN(parseFloat(formPagarH.valor)))
      return Swal.fire("Atención", "El valor es obligatorio.", "warning");
    if (!formPagarH.fecha)
      return Swal.fire("Atención", "La fecha es obligatoria.", "warning");
    setGuardandoP(true);
    try {
      const res = await agregarHistorialImpuesto({
        impuesto: IMP, anio: Number(anio), mes: Number(mes),
        tipo: `pago_${showPagarModal.tipo}`,
        valor: parseFloat(formPagarH.valor), fecha: formPagarH.fecha,
        observaciones: formPagarH.observaciones,
      });
      if (res?.ok) {
        const data = await res.json();
        setDatos((prev) => ({ ...prev, [`pago_${showPagarModal.tipo}`]: data.dato }));
        setFormPagarH({ valor: "", fecha: new Date().toLocaleDateString("en-CA"), observaciones: "" });
      }
    } finally {
      setGuardandoP(false);
    }
  };

  if (cargando) return <Spinner animation="border" className="d-block mx-auto my-5" />;

  const renderHistorialTable = (historial) => {
    const total = historial.reduce((s, h) => s + (h.valor || 0), 0);
    if (!historial.length) return null;
    return (
      <Table striped bordered size="sm" className="text-center align-middle mb-3">
        <thead className="table-dark">
          <tr><th>Fecha</th><th>Valor</th><th>Observaciones</th></tr>
        </thead>
        <tbody>
          {[...historial].reverse().map((h, i) => (
            <tr key={i}>
              <td>{h.fecha ? h.fecha.split("-").reverse().join("/") : "-"}</td>
              <td>{formatoMoneda(h.valor)}</td>
              <td>{h.observaciones || "-"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot style={{ borderTop: "2px solid #ffc107" }}>
          <tr>
            <td className="text-end fw-bold">Total:</td>
            <td className="fw-bold" style={{ color: "#ffc107" }}>{formatoMoneda(total)}</td>
            <td />
          </tr>
        </tfoot>
      </Table>
    );
  };

  return (
    <div className="container mt-4">
      <div className="w-100">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="mb-0">💀 IVA</h2>
          <h2 className="mb-0 text-center" style={{ fontSize: "1.4rem" }}>Cargar - {mesNombre} {anio}</h2>
          <div className="d-flex gap-2">
            <Button variant="outline-primary" size="sm" disabled={!!datos["montoFormulario"]} onClick={() => { setFormCargar({ montoFormulario: "", cantPersonas: "", intereses: "", otrasDeudas: "" }); setShowCargar(true); }}>Cargar mes</Button>
            <Button variant="outline-success" size="sm" onClick={() => navigate(-1)}>Volver</Button>
          </div>
        </div>

        <Table striped bordered hover className="text-center align-middle w-100 mt-5">
          <thead className="table-dark">
            <tr>
              <th className="text-start">Concepto</th>
              <th style={{ width: 130 }}>Valor</th>
              <th style={{ width: 130 }}>Pagado</th>
              <th style={{ width: 130 }}>Saldo</th>
              <th style={{ minWidth: 200 }}>Observaciones</th>
              <th style={{ width: 155 }}>Carga</th>
              <th style={{ width: 155 }}>Pago</th>
            </tr>
          </thead>
          <tbody>
            {FILAS.map((fila) => {
              const dato = datos[fila.tipo];
              return (
                <tr key={fila.tipo}>
                  <td className="text-start">{fila.label}</td>
                  <td>
                    {(() => {
                      if (!dato) return "-";
                      if (fila.tipo === "cantPersonas") return Number(dato.valor).toLocaleString("es-AR");
                      if (TIPOS_HISTORIAL.includes(fila.tipo)) {
                        const suma = (dato.historial || []).reduce((s, h) => s + (h.valor || 0), 0);
                        return suma > 0 ? formatoMoneda(suma) : (dato.valor != null ? formatoMoneda(dato.valor) : "-");
                      }
                      return dato.valor != null ? formatoMoneda(dato.valor) : "-";
                    })()}
                  </td>
                  <td>{fila.tipo !== "cantPersonas" && fila.tipo !== "montoPromedio" ? formatoMoneda(getPagadoNum(fila.tipo)) : "-"}</td>
                  <td>{fila.tipo !== "cantPersonas" && fila.tipo !== "montoPromedio" ? formatoMoneda(getValorNum(fila.tipo) - getPagadoNum(fila.tipo)) : "-"}</td>
                  <td className="text-start">{dato?.observaciones || "-"}</td>
                  <td>
                    {fila.tipo !== "montoPromedio" && (
                      <div className="d-flex gap-1 justify-content-center">
                        {!SIN_VER.includes(fila.tipo) && (
                          <Button size="sm" variant="outline-success" onClick={() => setShowVer(fila)} disabled={!dato}>Ver</Button>
                        )}
                        {TIPOS_HISTORIAL.includes(fila.tipo)
                          ? <Button size="sm" variant="outline-warning" onClick={() => abrirHistorial(fila)}>Editar</Button>
                          : <Button size="sm" variant="outline-warning" onClick={() => abrirEditar(fila)}>Editar</Button>
                        }
                        <Button size="sm" variant="outline-danger" onClick={() => borrar(fila.tipo)} disabled={!dato}>Borrar</Button>
                      </div>
                    )}
                  </td>
                  <td>
                    {fila.tipo !== "cantPersonas" && (
                      <div className="d-flex gap-1 justify-content-center">
                        <Button size="sm" variant="outline-primary" onClick={() => abrirPagar(fila)}>Pagar</Button>
                        <Button size="sm" variant="outline-secondary" onClick={() => setShowResumen(fila)}>Resumen</Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot style={{ borderTop: "2px solid #ffc107" }}>
            <tr className="table-dark fw-bold">
              <td className="text-start">Total</td>
              <td>{formatoMoneda(FILAS_TOTAL.reduce((s, t) => s + getValorNum(t), 0))}</td>
              <td>{formatoMoneda(FILAS_TOTAL.reduce((s, t) => s + getPagadoNum(t), 0))}</td>
              <td>{formatoMoneda(FILAS_TOTAL.reduce((s, t) => s + getValorNum(t) - getPagadoNum(t), 0))}</td>
              <td /><td /><td />
            </tr>
          </tfoot>
        </Table>

        {/* Modal Resumen */}
        <Modal show={!!showResumen} onHide={() => setShowResumen(null)} centered size="lg">
          <Modal.Header closeButton><Modal.Title>Resumen pagos - {showResumen?.label}</Modal.Title></Modal.Header>
          <Modal.Body>
            {(() => {
              const h = datos[`pago_${showResumen?.tipo}`]?.historial || [];
              if (!h.length) return <p className="text-muted text-center">Sin pagos registrados.</p>;
              return renderHistorialTable(h);
            })()}
          </Modal.Body>
          <Modal.Footer className="justify-content-center">
            <Button variant="outline-secondary" onClick={() => setShowResumen(null)}>Cerrar</Button>
          </Modal.Footer>
        </Modal>

        {/* Modal Pagar */}
        <Modal show={!!showPagarModal} onHide={() => setShowPagarModal(null)} centered size="lg">
          <Modal.Header closeButton><Modal.Title>Pago - {showPagarModal?.label}</Modal.Title></Modal.Header>
          <Modal.Body>
            {renderHistorialTable(datos[`pago_${showPagarModal?.tipo}`]?.historial || [])}
            <div className="border rounded p-3">
              <p className="mb-2 fw-semibold">Agregar pago</p>
              <div className="d-flex gap-2 align-items-end">
                <Form.Group style={{ flex: 1 }}>
                  <Form.Label className="small mb-1">Fecha</Form.Label>
                  <Form.Control size="sm" type="date" value={formPagarH.fecha} onChange={(e) => setFormPagarH((p) => ({ ...p, fecha: e.target.value }))} />
                </Form.Group>
                <Form.Group style={{ flex: 1 }}>
                  <Form.Label className="small mb-1">Valor</Form.Label>
                  <Form.Control size="sm" type="text"
                    value={editandoValorP ? formPagarH.valor : (formPagarH.valor ? formatoMoneda(formPagarH.valor) : "")}
                    placeholder="$0"
                    onFocus={() => { setEditandoValorP(true); setFormPagarH((p) => ({ ...p, valor: "" })); }}
                    onChange={(e) => setFormPagarH((p) => ({ ...p, valor: e.target.value }))}
                    onBlur={() => setEditandoValorP(false)}
                  />
                </Form.Group>
                <Form.Group style={{ flex: 2 }}>
                  <Form.Label className="small mb-1">Observaciones</Form.Label>
                  <Form.Control size="sm" type="text" value={formPagarH.observaciones} onChange={(e) => setFormPagarH((p) => ({ ...p, observaciones: e.target.value }))} />
                </Form.Group>
                <Button variant="outline-primary" size="sm" onClick={agregarEntradaPago} disabled={guardandoP}>
                  {guardandoP ? <Spinner size="sm" animation="border" /> : "Agregar"}
                </Button>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer className="justify-content-center">
            <Button variant="outline-secondary" onClick={() => setShowPagarModal(null)}>Cerrar</Button>
          </Modal.Footer>
        </Modal>

        {/* Modal Cargar mes */}
        <Modal show={showCargar} onHide={() => setShowCargar(false)} centered size="sm">
          <Modal.Header closeButton><Modal.Title>Cargar mes - {mesNombre} {anio}</Modal.Title></Modal.Header>
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
                  <Form.Control type="text"
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
                <Form.Control type="text" value={montoPromedio != null ? formatoMoneda(montoPromedio) : "-"} disabled />
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

        {/* Modal Historial */}
        <Modal show={!!showHistorial} onHide={() => setShowHistorial(null)} centered size="lg">
          <Modal.Header closeButton><Modal.Title>{showHistorial?.label}</Modal.Title></Modal.Header>
          <Modal.Body>
            {renderHistorialTable(datos[showHistorial?.tipo]?.historial || [])}
            <div className="border rounded p-3">
              <p className="mb-2 fw-semibold">Agregar entrada</p>
              <div className="d-flex gap-2 align-items-end">
                <Form.Group style={{ flex: 1 }}>
                  <Form.Label className="small mb-1">Fecha</Form.Label>
                  <Form.Control size="sm" type="date" value={formHistorial.fecha} onChange={(e) => setFormHistorial((p) => ({ ...p, fecha: e.target.value }))} />
                </Form.Group>
                <Form.Group style={{ flex: 1 }}>
                  <Form.Label className="small mb-1">Valor</Form.Label>
                  <Form.Control size="sm" type="text"
                    value={editandoValorH ? formHistorial.valor : (formHistorial.valor ? formatoMoneda(formHistorial.valor) : "")}
                    placeholder="$0"
                    onFocus={() => { setEditandoValorH(true); setFormHistorial((p) => ({ ...p, valor: "" })); }}
                    onChange={(e) => setFormHistorial((p) => ({ ...p, valor: e.target.value }))}
                    onBlur={() => setEditandoValorH(false)}
                  />
                </Form.Group>
                <Form.Group style={{ flex: 2 }}>
                  <Form.Label className="small mb-1">Observaciones</Form.Label>
                  <Form.Control size="sm" type="text" value={formHistorial.observaciones} onChange={(e) => setFormHistorial((p) => ({ ...p, observaciones: e.target.value }))} />
                </Form.Group>
                <Button variant="outline-primary" size="sm" onClick={agregarEntrada} disabled={guardandoH}>
                  {guardandoH ? <Spinner size="sm" animation="border" /> : "Agregar"}
                </Button>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer className="justify-content-center">
            <Button variant="outline-secondary" onClick={() => setShowHistorial(null)}>Cerrar</Button>
          </Modal.Footer>
        </Modal>

        {/* Modal Ver */}
        <Modal show={!!showVer} onHide={() => setShowVer(null)} centered size={TIPOS_HISTORIAL.includes(showVer?.tipo) ? "lg" : "sm"}>
          <Modal.Header closeButton><Modal.Title>{showVer?.label}</Modal.Title></Modal.Header>
          <Modal.Body>
            {TIPOS_HISTORIAL.includes(showVer?.tipo)
              ? (datos[showVer?.tipo]?.historial?.length
                  ? renderHistorialTable(datos[showVer?.tipo].historial)
                  : <p className="text-muted text-center">Sin entradas registradas.</p>)
              : <p className="text-center mb-1">Valor: <strong>{datos[showVer?.tipo]?.valor != null ? formatoMoneda(datos[showVer?.tipo]?.valor) : "-"}</strong></p>
            }
          </Modal.Body>
          <Modal.Footer className="justify-content-center">
            <Button variant="outline-secondary" onClick={() => setShowVer(null)}>Cerrar</Button>
          </Modal.Footer>
        </Modal>

        {/* Modal Editar */}
        <Modal show={!!showEditar} onHide={() => setShowEditar(null)} centered size="sm">
          <Modal.Header closeButton><Modal.Title>{showEditar?.label}</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Valor</Form.Label>
              <Form.Control type="text"
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
              <Form.Control type="text" value={obsEditar} onChange={(e) => setObsEditar(e.target.value)} />
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
    </div>
  );
}
