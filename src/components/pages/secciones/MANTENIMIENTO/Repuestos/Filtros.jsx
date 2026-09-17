import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Col, Container, Form, Modal, Row, Spinner, Table } from "react-bootstrap";
import Swal from "sweetalert2";
import XLSXStyle from "xlsx-js-style";
import AsyncButton from "../../../../shared/AsyncButton";
import { listarMaquinas } from "../../../../../helpers/queriesMaquinas";
import {
  listarFiltrosMaquina,
  guardarFiltroMaquina,
  borrarFiltroMaquina,
} from "../../../../../helpers/queriesFiltrosMaquina";
import "../../../../../styles/filtros.css";

// Los cuatro tipos de filtro son las columnas de la tabla y las opciones del modal.
const TIPOS = [
  { campo: "aceite",      label: "Filtro de aceite" },
  { campo: "combustible", label: "Combustible" },
  { campo: "trampaAgua",  label: "Trampa de agua" },
  { campo: "hidraulico",  label: "Hidráulico" },
];

// El modal siempre pide tres marcas distintas con el código de cada una.
const FILAS_MARCAS = 3;
const marcasVacias = () => Array.from({ length: FILAS_MARCAS }, () => ({ marca: "", codigo: "" }));

const TITULO = "Filtros por máquina";

// La marca va en gris y el código en celeste: el código es el dato que se usa
// para comprar, así que se lee primero de un vistazo.
const COLOR_MARCA  = "#adb5bd";
const COLOR_CODIGO = "#6ea8fe";

// Acoplados (bateas y carretones) y camionetas: no llevan filtros propios, así
// que no van ni en la tabla ni en el select del modal.
const SIN_FILTROS = ["batea", "carreton", "carretón", "nissan", "nisan", "fiat", "ranger"];
const llevaFiltros = (nombre = "") => {
  const n = String(nombre).toLowerCase();
  return !SIN_FILTROS.some((x) => n.includes(x));
};

export default function Filtros() {
  const navigate = useNavigate();
  const [maquinas, setMaquinas] = useState([]);
  const [filtros, setFiltros]   = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  // Modal agregar / editar. La máquina es una selección múltiple: el mismo
  // filtro sirve para varias máquinas y se carga una sola vez para todas.
  const [showModal, setShowModal]         = useState(false);
  const [maquinasSel, setMaquinasSel]     = useState([]);
  const [tipoSel, setTipoSel]             = useState("");
  const [marcas, setMarcas]               = useState(marcasVacias());
  const [observaciones, setObservaciones] = useState("");

  const cargar = async () => {
    setCargando(true);
    try {
      const [resMaquinas, listaFiltros] = await Promise.all([
        listarMaquinas("?campos=maquina"),
        listarFiltrosMaquina(),
      ]);
      const lista = resMaquinas?.ok ? await resMaquinas.json() : [];
      setMaquinas(lista.filter((m) => llevaFiltros(m.maquina)));
      setFiltros(listaFiltros || []);
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "No se pudieron cargar los filtros.", "error");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  // Índice por id de máquina para no recorrer el array en cada celda.
  const filtrosPorMaquina = useMemo(() => {
    const mapa = {};
    filtros.forEach((f) => {
      const id = f.maquina?._id || f.maquina;
      if (id) mapa[String(id)] = f;
    });
    return mapa;
  }, [filtros]);

  // El botón Editar abre en el primer tipo que tenga algo cargado, para que no
  // se vea el modal vacío cuando la máquina solo tiene, por ejemplo, hidráulico.
  const primerTipoCargado = (idMaquina) => {
    const filtro = filtrosPorMaquina[String(idMaquina)];
    return TIPOS.find((t) => (filtro?.[t.campo] || []).length > 0)?.campo || TIPOS[0].campo;
  };

  // Una fila por máquina: así se ve de una lo que todavía falta cargar.
  const filas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return maquinas
      .filter((m) => !texto || (m.maquina || "").toLowerCase().includes(texto))
      .slice()
      .sort((a, b) => (a.maquina || "").localeCompare(b.maquina || ""))
      .map((m) => ({ maquina: m, filtro: filtrosPorMaquina[String(m._id)] || null }));
  }, [maquinas, filtrosPorMaquina, busqueda]);

  const maquinasOrdenadas = useMemo(
    () => maquinas.slice().sort((a, b) => (a.maquina || "").localeCompare(b.maquina || "")),
    [maquinas]
  );

  const abrirNuevo = () => {
    setMaquinasSel([]);
    setTipoSel("");
    setMarcas(marcasVacias());
    setObservaciones("");
    setShowModal(true);
  };

  const limpiarCampos = () => {
    setMarcas(marcasVacias());
    setObservaciones("");
  };

  // Al editar se precarga lo que esa máquina ya tiene en ese tipo de filtro.
  const precargar = (idMaquina, tipo) => {
    const filtro = filtrosPorMaquina[String(idMaquina)];
    const items = filtro?.[tipo] || [];
    const nuevas = marcasVacias();
    items.slice(0, FILAS_MARCAS).forEach((item, i) => {
      nuevas[i] = { marca: item.marca || "", codigo: item.codigo || "" };
    });
    setMarcas(nuevas);
    setObservaciones(filtro?.observaciones || "");
  };

  const abrirEditar = (idMaquina, tipo) => {
    setMaquinasSel([idMaquina]);
    setTipoSel(tipo);
    precargar(idMaquina, tipo);
    setShowModal(true);
  };

  // Con una sola máquina elegida se precarga lo que ya tiene; con varias no hay
  // un valor único que mostrar, así que las filas quedan en blanco para cargarlas
  // una vez y que se guarden en todas.
  const toggleMaquina = (id) => {
    const seleccion = maquinasSel.includes(id)
      ? maquinasSel.filter((x) => x !== id)
      : [...maquinasSel, id];
    setMaquinasSel(seleccion);
    if (seleccion.length === 1) precargar(seleccion[0], tipoSel);
    else limpiarCampos();
  };

  const cambiarTipo = (tipo) => {
    setTipoSel(tipo);
    if (maquinasSel.length === 1) precargar(maquinasSel[0], tipo);
    else if (maquinasSel.length > 1) limpiarCampos();
  };

  const cambiarMarca = (i, campo, valor) => {
    setMarcas((prev) => prev.map((f, idx) => (idx === i ? { ...f, [campo]: valor } : f)));
  };

  const guardar = async () => {
    if (!maquinasSel.length) return Swal.fire("Atención", "Seleccioná al menos una máquina.", "warning");
    if (!tipoSel)            return Swal.fire("Atención", "Seleccioná un tipo de filtro.", "warning");

    const cargadas = marcas.filter((f) => f.marca.trim() || f.codigo.trim());
    if (!cargadas.length) return Swal.fire("Atención", "Cargá al menos una marca con su código.", "warning");

    if (cargadas.some((f) => !f.marca.trim() || !f.codigo.trim())) {
      return Swal.fire("Atención", "Cada marca tiene que tener su código.", "warning");
    }

    const nombres = cargadas.map((f) => f.marca.trim().toLowerCase());
    if (new Set(nombres).size !== nombres.length) {
      return Swal.fire("Atención", "Las marcas tienen que ser distintas entre sí.", "warning");
    }

    const res = await guardarFiltroMaquina({
      maquinas: maquinasSel,
      tipo: tipoSel,
      items: cargadas.map((f) => ({ marca: f.marca.trim(), codigo: f.codigo.trim() })),
      observaciones,
    });

    if (res?.ok) {
      setShowModal(false);
      await cargar();
      Swal.fire({
        icon: "success",
        title: maquinasSel.length > 1
          ? `Filtros guardados en ${maquinasSel.length} máquinas`
          : "Filtros guardados",
        timer: 1500,
        showConfirmButton: false,
      });
    } else {
      const err = await res?.json().catch(() => ({}));
      Swal.fire("Error", err?.msg || "No se pudieron guardar los filtros.", "error");
    }
  };

  const eliminar = async (filtro) => {
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "¿Borrar los filtros de esta máquina?",
      text: filtro.maquina?.maquina || "",
      showCancelButton: true,
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    });
    if (!isConfirmed) return;

    const res = await borrarFiltroMaquina(filtro._id);
    if (res?.ok) {
      await cargar();
      Swal.fire({ icon: "success", title: "Filtros eliminados", timer: 1500, showConfirmButton: false });
    } else {
      Swal.fire("Error", "No se pudieron eliminar los filtros.", "error");
    }
  };

  // Texto plano de una celda, para el Excel.
  const textoItems = (items) => (items || []).map((i) => `${i.marca}: ${i.codigo}`).join("\n");

  const exportarExcel = () => {
    const headers = ["Máquina", ...TIPOS.map((t) => t.label), "Observaciones"];
    const cols = "ABCDEF";
    const estCentro = { alignment: { horizontal: "center", vertical: "center", wrapText: true } };
    const estHeader = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "222222" } }, alignment: { horizontal: "center", vertical: "center" } };
    const estTitulo = { font: { bold: true, sz: 13 }, alignment: { horizontal: "left", vertical: "center" } };

    const wb = XLSXStyle.utils.book_new();
    const ws = {};

    const hoy = new Date();
    const fechaSerial = Math.round((Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) - Date.UTC(1899, 11, 30)) / 86400000);

    ws["A1"] = { v: TITULO, t: "s", s: estTitulo };
    ws["A2"] = { v: fechaSerial, t: "n", s: { ...estTitulo, numFmt: "DD/MM/YYYY" } };
    ws["A3"] = { v: "", t: "s" };
    headers.forEach((h, i) => { ws[`${cols[i]}4`] = { v: h, t: "s", s: estHeader }; });

    filas.forEach((fila, idx) => {
      const row = idx + 5;
      ws[`A${row}`] = { v: fila.maquina.maquina || "-", t: "s", s: estCentro };
      TIPOS.forEach((t, i) => {
        ws[`${cols[i + 1]}${row}`] = { v: textoItems(fila.filtro?.[t.campo]) || "-", t: "s", s: estCentro };
      });
      ws[`F${row}`] = { v: fila.filtro?.observaciones || "-", t: "s", s: estCentro };
    });

    const lastRow = Math.max(filas.length + 4, 4);
    ws["!ref"] = `A1:F${lastRow}`;
    ws["!cols"] = [{ wch: 24 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 28 }];

    XLSXStyle.utils.book_append_sheet(wb, ws, TITULO.substring(0, 31));
    XLSXStyle.writeFile(wb, `${TITULO}.xlsx`);
  };

  return (
    <Container className="py-4 filtros-page">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0 fw-bold">Filtros</h2>
        <Button size="sm" variant="outline-success" onClick={() => navigate(-1)}>Volver</Button>
      </div>

      <div className="d-flex justify-content-between align-items-center gap-2 mb-2 flex-wrap">
        <Form.Control
          size="sm"
          type="search"
          placeholder="Máquina..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ width: "220px" }}
        />
        <div className="d-flex gap-2">
          <Button size="sm" variant="outline-light" onClick={exportarExcel}>Excel</Button>
          <Button size="sm" variant="outline-primary" onClick={abrirNuevo}>+ Agregar filtros</Button>
        </div>
      </div>

      {cargando ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : (
        <div style={{ maxHeight: "65vh", overflowY: "auto" }}>
          <Table striped bordered hover className="text-center align-middle mb-0">
            <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
              <tr>
                <th>Máquina</th>
                {TIPOS.map((t) => <th key={t.campo}>{t.label}</th>)}
                <th>Observaciones</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filas.length === 0 ? (
                <tr><td colSpan={TIPOS.length + 3} className="text-muted py-3">Sin máquinas para mostrar</td></tr>
              ) : (
                filas.map(({ maquina, filtro }) => (
                  <tr key={maquina._id}>
                    <td className="fw-semibold">{maquina.maquina || "-"}</td>
                    {TIPOS.map((t) => {
                      const items = filtro?.[t.campo] || [];
                      return (
                        <td
                          key={t.campo}
                          style={{ cursor: "pointer" }}
                          title="Click para cargar o editar"
                          onClick={() => abrirEditar(maquina._id, t.campo)}
                        >
                          {items.length === 0 ? (
                            <span className="text-muted">-</span>
                          ) : (
                            items.map((i, idx) => (
                              <div key={idx} className="small">
                                <span style={{ color: COLOR_MARCA }}>{i.marca}</span>
                                {": "}
                                <span className="fw-semibold" style={{ color: COLOR_CODIGO }}>{i.codigo}</span>
                              </div>
                            ))
                          )}
                        </td>
                      );
                    })}
                    <td>{filtro?.observaciones || "-"}</td>
                    <td>
                      <div className="d-flex gap-1 justify-content-center">
                        <Button size="sm" variant="outline-warning" onClick={() => abrirEditar(maquina._id, primerTipoCargado(maquina._id))}>
                          Editar
                        </Button>
                        <AsyncButton
                          size="sm"
                          variant="outline-danger"
                          disabled={!filtro}
                          onClick={async () => { await eliminar(filtro); }}
                        >
                          Borrar
                        </AsyncButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      )}

      {/* ── Modal agregar / editar filtros ── */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg" className="filtros-modal">
        <Modal.Header closeButton>
          <Modal.Title>Agregar filtros</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <Form.Label className="mb-0">
                  Máquinas <span className="text-danger">*</span>
                </Form.Label>
                <span className="small text-muted">
                  {maquinasSel.length === 0
                    ? "Ninguna seleccionada"
                    : `${maquinasSel.length} seleccionada${maquinasSel.length > 1 ? "s" : ""}`}
                  {maquinasSel.length > 0 && (
                    <Button
                      size="sm"
                      variant="link"
                      className="p-0 ms-2 align-baseline"
                      onClick={() => { setMaquinasSel([]); limpiarCampos(); }}
                    >
                      Limpiar
                    </Button>
                  )}
                </span>
              </div>
              <div className="lista-maquinas">
                {maquinasOrdenadas.length === 0 ? (
                  <div className="text-muted small p-2">Sin máquinas para mostrar</div>
                ) : (
                  maquinasOrdenadas.map((m) => (
                    <Form.Check
                      key={m._id}
                      type="checkbox"
                      id={`maq-${m._id}`}
                      label={m.maquina}
                      checked={maquinasSel.includes(m._id)}
                      onChange={() => toggleMaquina(m._id)}
                    />
                  ))
                )}
              </div>
            </Form.Group>

            {/* Tipo y observaciones van a la par para que el modal entre de una
                sola pantalla, sin scroll. */}
            <Row className="mb-2">
              <Col md={5}>
                <Form.Group>
                  <Form.Label>Tipo de filtro <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    size="sm"
                    className={tipoSel ? "" : "select-vacio"}
                    value={tipoSel}
                    onChange={(e) => cambiarTipo(e.target.value)}
                  >
                    <option value="">Seleccioná un tipo de filtro</option>
                    {TIPOS.map((t) => <option key={t.campo} value={t.campo}>{t.label}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={7}>
                <Form.Group>
                  <Form.Label>Observaciones</Form.Label>
                  <Form.Control
                    size="sm"
                    as="textarea"
                    rows={1}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Table borderless size="sm" className="align-middle mb-0">
              <thead>
                <tr>
                  <th style={{ width: "50%", color: "#adb5bd" }}>Marca</th>
                  <th style={{ width: "50%", color: "#adb5bd" }}>Código</th>
                </tr>
              </thead>
              <tbody>
                {marcas.map((fila, i) => (
                  <tr key={i}>
                    <td>
                      <Form.Control
                        size="sm"
                        placeholder={`Marca ${i + 1}`}
                        value={fila.marca}
                        onChange={(e) => cambiarMarca(i, "marca", e.target.value)}
                      />
                    </td>
                    <td>
                      <Form.Control
                        size="sm"
                        placeholder="Código"
                        value={fila.codigo}
                        onChange={(e) => cambiarMarca(i, "codigo", e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Form>
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
          <AsyncButton variant="outline-success" onClick={guardar}>Guardar</AsyncButton>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
