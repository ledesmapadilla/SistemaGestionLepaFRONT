import { useEffect, useMemo, useRef, useState } from "react";
import { Table, Button, Form, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import XLSXStyle from "xlsx-js-style";
import Swal from "sweetalert2";
import {
  listarCargasGasoil,
  crearCargaGasoil,
  editarCargaGasoil,
  borrarCargaGasoil,
} from "../../../../../helpers/queriesCargaGasoil.js";
import { listarObras } from "../../../../../helpers/queriesObras.js";
import { listarMaquinas } from "../../../../../helpers/queriesMaquinas.js";
import { listarPersonal } from "../../../../../helpers/queriesPersonal.js";
import { OBRA_INTERNA } from "../../../../../helpers/gasoilInterno.js";
import GasoilModal from "./GasoilModal.jsx";
import PrecioGasoil from "./PrecioGasoil.jsx";

const selectActivo = { backgroundImage: "none" };

const estiloX = {
  position: "absolute",
  right: "10px",
  top: "50%",
  transform: "translateY(-50%)",
  cursor: "pointer",
  color: "#fff",
  fontSize: "14px",
  fontWeight: "900",
  zIndex: 5,
  userSelect: "none",
};

const mostrarFechaDMY = (fecha) => {
  if (!fecha) return "-";
  const [y, m, d] = fecha.split("-");
  return d ? `${d}-${m}-${y}` : fecha;
};

const formatoLitros = (valor) =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(Number(valor) || 0);

// Opciones únicas y ordenadas de una columna, para los selects de filtro.
const opcionesDe = (filas, campo) =>
  [...new Set(filas.map((f) => f[campo]).filter(Boolean))].sort((a, b) => a.localeCompare(b));

const Gasoil = () => {
  const navigate = useNavigate();

  const [cargas, setCargas] = useState([]);
  const [obras, setObras] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [opcionesListas, setOpcionesListas] = useState(false);

  // Por defecto solo las cargas de obras en curso; el switch muestra todas.
  const [soloEnCurso, setSoloEnCurso] = useState(true);

  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroObra, setFiltroObra] = useState("");
  const [filtroMaquina, setFiltroMaquina] = useState("");
  const [filtroQuienCarga, setFiltroQuienCarga] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [cargaEditando, setCargaEditando] = useState(null);

  // Obras, máquinas y personal son solo para los selects del modal. Si la
  // tabla los esperara, la página tardaría lo que tarda el request más lento.
  const datosModalPedidos = useRef(false);

  const cargarCargas = async () => {
    try {
      const respCargas = await listarCargasGasoil();
      if (respCargas?.ok) setCargas(await respCargas.json());
    } catch (error) {
      console.error("Error al cargar gasoil:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudieron cargar las cargas de gasoil",
      });
    } finally {
      setLoading(false);
    }
  };

  // Pedimos solo los campos que usan los selects: sin el array de precios de
  // las obras ni el historial de sueldos del personal.
  const cargarDatosModal = async () => {
    if (datosModalPedidos.current) return;
    datosModalPedidos.current = true;

    try {
      const [respObras, respMaquinas, respPersonal] = await Promise.all([
        listarObras("?estado=En curso&campos=razonsocial,nombreobra,estado"),
        listarMaquinas("?campos=maquina,usaGasoil"),
        listarPersonal("?campos=nombre,activo"),
      ]);

      if (respObras?.ok) setObras(await respObras.json());
      if (respMaquinas?.ok) setMaquinas(await respMaquinas.json());
      if (respPersonal?.ok) setPersonal(await respPersonal.json());
      setOpcionesListas(true);
    } catch (error) {
      console.error("Error al cargar datos del modal de gasoil:", error);
      // Si falló, que el próximo intento de abrir el modal lo reintente.
      datosModalPedidos.current = false;
    }
  };

  useEffect(() => {
    cargarCargas();
    // Sin await: se pide en paralelo pero la tabla no lo espera.
    cargarDatosModal();
  }, []);

  const abrirCrear = () => {
    cargarDatosModal();
    setCargaEditando(null);
    setShowModal(true);
  };

  const abrirEditar = (carga) => {
    cargarDatosModal();
    setCargaEditando(carga);
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setCargaEditando(null);
  };

  const guardarCarga = async (datos) => {
    const respuesta = cargaEditando
      ? await editarCargaGasoil(cargaEditando._id, datos)
      : await crearCargaGasoil(datos);

    if (!respuesta) {
      Swal.fire({
        icon: "error",
        title: "Error de conexión",
        text: "No se pudo conectar con el servidor. Intentá de nuevo.",
      });
      return;
    }

    if (!respuesta.ok) {
      const errorData = await respuesta.json().catch(() => null);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: errorData?.msg || "No se pudo guardar la carga de gasoil",
      });
      return;
    }

    const resData = await respuesta.json();

    if (cargaEditando) {
      setCargas((prev) =>
        prev.map((c) => (c._id === cargaEditando._id ? resData.carga : c))
      );
    } else {
      // Si por lo que sea llegara dos veces la misma carga, no la duplicamos.
      setCargas((prev) =>
        prev.some((c) => c._id === resData.carga._id) ? prev : [resData.carga, ...prev]
      );
    }

    Swal.fire({
      icon: "success",
      title: cargaEditando ? "Carga editada" : "Carga registrada",
      timer: 1500,
      showConfirmButton: false,
    });
    cerrarModal();
  };

  const borrarCarga = async (id) => {
    const result = await Swal.fire({
      title: "¿Borrar carga de gasoil?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: "swal-btn-danger" },
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    const respuesta = await borrarCargaGasoil(id);
    if (respuesta?.ok) {
      setCargas((prev) => prev.filter((c) => c._id !== id));
      Swal.fire({
        icon: "success",
        title: "Carga borrada",
        timer: 1500,
        showConfirmButton: false,
      });
    } else {
      Swal.fire({ icon: "error", title: "Error", text: "No se pudo borrar la carga" });
    }
  };

  // `obras` ya viene filtrado por estado "En curso" desde el backend, así que
  // alcanza con mirar si el nombre de la obra está en esa lista.
  const obrasEnCurso = useMemo(() => new Set(obras.map((o) => o.nombreobra)), [obras]);

  // Base de toda la pantalla: filtros, tabla y Excel salen de acá. Mientras las
  // obras no hayan llegado no se filtra, para no mostrar la tabla vacía.
  // "Uso interno" no es una obra de la base, así que nunca está en obrasEnCurso:
  // se deja pasar a mano para que el consumo propio no desaparezca del listado.
  const cargasVisibles = useMemo(
    () =>
      soloEnCurso && opcionesListas
        ? cargas.filter((c) => obrasEnCurso.has(c.obra) || c.obra === OBRA_INTERNA)
        : cargas,
    [cargas, soloEnCurso, opcionesListas, obrasEnCurso]
  );

  // Las opciones de obra dependen del cliente filtrado, así no aparecen obras
  // de otros clientes en la lista.
  const cargasDelCliente = useMemo(
    () =>
      filtroCliente ? cargasVisibles.filter((c) => c.cliente === filtroCliente) : cargasVisibles,
    [cargasVisibles, filtroCliente]
  );

  // Las máquinas dependen de la obra filtrada: solo las que efectivamente
  // cargaron gasoil en esa obra, no todo el parque.
  const cargasDeLaObra = useMemo(
    () => (filtroObra ? cargasDelCliente.filter((c) => c.obra === filtroObra) : cargasDelCliente),
    [cargasDelCliente, filtroObra]
  );

  const opcionesCliente = useMemo(() => opcionesDe(cargasVisibles, "cliente"), [cargasVisibles]);
  const opcionesObra = useMemo(() => opcionesDe(cargasDelCliente, "obra"), [cargasDelCliente]);
  const opcionesMaquina = useMemo(() => opcionesDe(cargasDeLaObra, "maquina"), [cargasDeLaObra]);
  const opcionesQuienCarga = useMemo(
    () => opcionesDe(cargasVisibles, "quienCarga"),
    [cargasVisibles]
  );

  const cargasFiltradas = useMemo(
    () =>
      cargasVisibles.filter((c) => {
        if (filtroFecha && c.fecha !== filtroFecha) return false;
        if (filtroCliente && c.cliente !== filtroCliente) return false;
        if (filtroObra && c.obra !== filtroObra) return false;
        if (filtroMaquina && c.maquina !== filtroMaquina) return false;
        if (filtroQuienCarga && c.quienCarga !== filtroQuienCarga) return false;
        return true;
      }),
    [cargasVisibles, filtroFecha, filtroCliente, filtroObra, filtroMaquina, filtroQuienCarga]
  );

  const exportarExcel = () => {
    if (cargasFiltradas.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Atención",
        text: "No hay cargas para exportar.",
      });
      return;
    }

    const headers = ["Fecha", "Cliente", "Obra", "Máquina", "Litros", "Quién carga"];
    const cols = ["A", "B", "C", "D", "E", "F"];
    const centerAlign = { horizontal: "center", vertical: "center" };
    const leftAlign = { horizontal: "left", vertical: "center" };

    const ws = {};
    ws["A1"] = {
      v: "CARGAS DE GASOIL",
      t: "s",
      s: { font: { bold: true, sz: 14 }, alignment: leftAlign },
    };
    ws["A2"] = {
      v: `Fecha: ${new Date().toLocaleDateString("es-AR")}`,
      t: "s",
      s: { alignment: leftAlign },
    };

    headers.forEach((h, i) => {
      ws[`${cols[i]}3`] = {
        v: h,
        t: "s",
        s: { font: { bold: true }, alignment: centerAlign },
      };
    });

    cargasFiltradas.forEach((c, rowIdx) => {
      const fila = [
        mostrarFechaDMY(c.fecha),
        c.cliente || "-",
        c.obra || "-",
        c.maquina || "-",
        Number(c.litros) || 0,
        c.quienCarga || "-",
      ];
      fila.forEach((valor, colIdx) => {
        ws[`${cols[colIdx]}${rowIdx + 4}`] = {
          v: valor,
          t: typeof valor === "number" ? "n" : "s",
          s: { alignment: centerAlign },
        };
      });
    });

    ws["!ref"] = `A1:F${cargasFiltradas.length + 3}`;
    ws["!cols"] = [
      { wch: 12 },
      { wch: 26 },
      { wch: 26 },
      { wch: 20 },
      { wch: 12 },
      { wch: 22 },
    ];

    const libro = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(libro, ws, "Gasoil");
    XLSXStyle.writeFile(libro, "Cargas_Gasoil.xlsx");
  };

  if (loading) return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <div className="w-75 mx-auto my-2">
      <h6 className="text-center mb-2">Cargas de gasoil</h6>

      {/* Grilla de 3 columnas para que el switch quede centrado en la página,
          sin que lo corran de lugar el precio ni los botones. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        <PrecioGasoil />

        <div className="d-flex align-items-center gap-2">
          <span
            style={{ fontSize: "0.85rem", userSelect: "none" }}
            className={soloEnCurso ? "fw-semibold" : "text-muted"}
          >
            En curso
          </span>
          <Form.Check
            type="switch"
            id="switch-obras-gasoil"
            className="mb-0"
            checked={!soloEnCurso}
            onChange={(e) => setSoloEnCurso(!e.target.checked)}
          />
          <span
            style={{ fontSize: "0.85rem", userSelect: "none" }}
            className={!soloEnCurso ? "fw-semibold" : "text-muted"}
          >
            Todas
          </span>
        </div>

        <div className="d-flex gap-2 justify-content-end">
          <Button size="sm" variant="outline-light" onClick={exportarExcel}>
            Excel
          </Button>
          <Button size="sm" variant="outline-success" onClick={() => navigate(-1)}>
            Volver
          </Button>
        </div>
      </div>

      {/* --- BARRA DE FILTROS --- */}
      <div className="d-flex flex-wrap gap-3 mb-3 align-items-center">
        <div style={{ position: "relative", width: "160px" }}>
          <Form.Control
            size="sm"
            type="date"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
          />
          {filtroFecha && (
            <span onClick={() => setFiltroFecha("")} style={{ ...estiloX, right: "34px" }}>
              ✕
            </span>
          )}
        </div>

        <div style={{ position: "relative", width: "200px" }}>
          <Form.Select
            size="sm"
            value={filtroCliente}
            onChange={(e) => {
              setFiltroCliente(e.target.value);
              // Obra y máquina cuelgan del cliente: si quedaran puestas,
              // filtrarían por algo que ya no está en la lista.
              setFiltroObra("");
              setFiltroMaquina("");
            }}
            style={filtroCliente ? selectActivo : {}}
          >
            <option value="">Cliente...</option>
            {opcionesCliente.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Form.Select>
          {filtroCliente && (
            <span
              onClick={() => {
                setFiltroCliente("");
                setFiltroObra("");
                setFiltroMaquina("");
              }}
              style={estiloX}
            >
              ✕
            </span>
          )}
        </div>

        <div style={{ position: "relative", width: "200px" }}>
          <Form.Select
            size="sm"
            value={filtroObra}
            onChange={(e) => {
              setFiltroObra(e.target.value);
              setFiltroMaquina("");
            }}
            style={filtroObra ? selectActivo : {}}
          >
            <option value="">Obra...</option>
            {opcionesObra.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Form.Select>
          {filtroObra && (
            <span
              onClick={() => {
                setFiltroObra("");
                setFiltroMaquina("");
              }}
              style={estiloX}
            >
              ✕
            </span>
          )}
        </div>

        <div style={{ position: "relative", width: "170px" }}>
          <Form.Select
            size="sm"
            value={filtroMaquina}
            onChange={(e) => setFiltroMaquina(e.target.value)}
            style={filtroMaquina ? selectActivo : {}}
          >
            <option value="">Máquina...</option>
            {opcionesMaquina.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Form.Select>
          {filtroMaquina && (
            <span onClick={() => setFiltroMaquina("")} style={estiloX}>
              ✕
            </span>
          )}
        </div>

        <div style={{ position: "relative", width: "180px" }}>
          <Form.Select
            size="sm"
            value={filtroQuienCarga}
            onChange={(e) => setFiltroQuienCarga(e.target.value)}
            style={filtroQuienCarga ? selectActivo : {}}
          >
            <option value="">Quién carga...</option>
            {opcionesQuienCarga.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Form.Select>
          {filtroQuienCarga && (
            <span onClick={() => setFiltroQuienCarga("")} style={estiloX}>
              ✕
            </span>
          )}
        </div>

        <div className="ms-auto">
          <Button size="sm" variant="outline-primary" onClick={abrirCrear}>
            Nueva carga
          </Button>
        </div>
      </div>

      <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
        <Table striped bordered hover size="sm" className="text-center align-middle mb-0">
          <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
            <tr>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Obra</th>
              <th>Máquina</th>
              <th>Litros</th>
              <th>Quién carga</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cargasFiltradas.length > 0 ? (
              cargasFiltradas.map((c) => (
                <tr key={c._id}>
                  <td className="text-nowrap">{mostrarFechaDMY(c.fecha)}</td>
                  <td>{c.cliente || "-"}</td>
                  <td className="text-muted" title={c.obra}>
                    {c.obra || "-"}
                  </td>
                  <td>{c.maquina || "-"}</td>
                  <td className="text-nowrap">{formatoLitros(c.litros)}</td>
                  <td>{c.quienCarga || "-"}</td>
                  <td>
                    <div className="d-flex gap-1 justify-content-center align-items-center">
                      <Button size="sm" variant="outline-warning" onClick={() => abrirEditar(c)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="outline-danger" onClick={() => borrarCarga(c._id)}>
                        Borrar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="py-4">
                  No se encontraron cargas de gasoil con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <GasoilModal
        show={showModal}
        onHide={cerrarModal}
        onGuardar={guardarCarga}
        cargaEditando={cargaEditando}
        cargandoOpciones={!opcionesListas}
        obras={obras}
        maquinas={maquinas}
        personal={personal}
      />
    </div>
  );
};

export default Gasoil;
