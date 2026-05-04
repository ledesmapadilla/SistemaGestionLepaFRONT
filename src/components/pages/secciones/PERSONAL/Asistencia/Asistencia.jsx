import { useState, useEffect } from "react";
import { Button, Modal, Form, Table, Spinner } from "react-bootstrap";
import { listarPersonal } from "../../../../../helpers/queriesPersonal.js";
import { listarMaquinas } from "../../../../../helpers/queriesMaquinas.js";
import { listarObras } from "../../../../../helpers/queriesObras.js";
import Swal from "sweetalert2";
import XLSXStyle from "xlsx-js-style";
import { listarAsistencia, obtenerAsistenciaPorFecha, guardarAsistencia as guardarAsistenciaAPI } from "../../../../../helpers/queriesAsistencia.js";
import { listarServices } from "../../../../../helpers/queriesServiceMaquinas.js";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const diaKey = (anio, mes, dia) =>
  `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

const calcularHorometroZamorano = (entra) => {
  if (!entra) return "0";
  const [h, m] = entra.split(":").map(Number);
  const diff = h * 60 + m - 8 * 60;
  if (diff <= 0) return "0";
  const horas = Math.floor(diff / 60);
  const mins = diff % 60;
  return mins === 0 ? `${horas}` : `${horas}:${String(mins).padStart(2, "0")}`;
};

const Asistencia = () => {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth());
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

  const [loading, setLoading] = useState(true);
  const [listaPersonal, setListaPersonal] = useState([]);
  const [listaMaquinas, setListaMaquinas] = useState([]);
  const [listaObras, setListaObras] = useState([]);

  const [registros, setRegistros] = useState({});
  const [borrador, setBorrador] = useState([]);
  const [listaServices, setListaServices] = useState([]);

  const anios = Array.from({ length: 10 }, (_, i) => 2026 + i);

  useEffect(() => {
    const cargar = async () => {
      const [resP, resM, resO, resA, resSvc] = await Promise.all([
        listarPersonal(),
        listarMaquinas(),
        listarObras(),
        listarAsistencia(),
        listarServices(),
      ]);
      if (resP?.ok) setListaPersonal(await resP.json());
      if (resM?.ok) setListaMaquinas(await resM.json());
      if (resO?.ok) setListaObras(await resO.json());
      if (resSvc?.ok) setListaServices(await resSvc.json());
      if (resA?.ok) {
        const docs = await resA.json();
        const mapa = {};
        docs.forEach((doc) => {
          mapa[doc.fecha] = doc.registros.map((r, i) => ({ ...r, id: r.id || i }));
        });
        setRegistros(mapa);
      }
      setLoading(false);
    };
    cargar();
  }, []);

  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const primerDiaSemana = (new Date(anio, mes, 1).getDay() + 6) % 7;

  const esHoy = (dia) =>
    dia === hoy.getDate() && mes === hoy.getMonth() && anio === hoy.getFullYear();

  const celdas = [
    ...Array(primerDiaSemana).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ];

  const keyDia = diaKey(anio, mes, diaSeleccionado);
  const hoyKey = diaKey(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const editandoHoy = keyDia === hoyKey;

  const abrirDia = async (dia) => {
    const fechaDia = new Date(anio, mes, dia);
    const hoyInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    if (fechaDia > hoyInicio) return;

    const key = diaKey(anio, mes, dia);
    let filas;
    if (registros[key]) {
      filas = registros[key];
    } else {
      const res = await obtenerAsistenciaPorFecha(key);
      if (res?.ok) {
        const data = await res.json();
        filas = data?.registros?.length
          ? data.registros.map((r, i) => ({ ...r, id: r.id || i }))
          : listaPersonal.map((p) => ({ id: p._id, personal: p.nombre, maquina: "", obra: "", ausente: false, horometro: "", entra: "", sale: "", observaciones: "" }));
      } else {
        filas = listaPersonal.map((p) => ({ id: p._id, personal: p.nombre, maquina: "", obra: "", ausente: false, horometro: "", entra: "", sale: "", observaciones: "" }));
      }
    }
    setBorrador(filas.map((f) => ({ ...f })));
    setDiaSeleccionado(dia);
  };

  const cerrarModal = () => {
    setBorrador([]);
    setDiaSeleccionado(null);
  };

  const getMaxHorometroPorMaquina = () => {
    const mapa = {};

    // Desde registros de Asistencia (excluyendo el día que se edita)
    Object.entries(registros).forEach(([fecha, filas]) => {
      if (fecha === keyDia) return;
      filas.forEach((fila) => {
        if (fila.maquina && fila.horometro !== "" && fila.horometro != null) {
          const val = Number(fila.horometro);
          if (!isNaN(val) && val > 0) {
            const key = fila.maquina.toLowerCase().trim();
            if (mapa[key] == null || val > mapa[key]) mapa[key] = val;
          }
        }
      });
    });

    // Desde registros de ServiceMaquina
    listaServices.forEach((s) => {
      if (s.maquina?.maquina && s.horometro != null) {
        const val = Number(s.horometro);
        if (!isNaN(val) && val > 0) {
          const key = s.maquina.maquina.toLowerCase().trim();
          if (mapa[key] == null || val > mapa[key]) mapa[key] = val;
        }
      }
    });

    return mapa;
  };

  const guardarModal = async () => {
    if (editandoHoy) {
      const maxPorMaquina = getMaxHorometroPorMaquina();
      const invalidos = borrador.filter((fila) => {
        if (!fila.maquina || fila.horometro === "" || fila.horometro == null) return false;
        const max = maxPorMaquina[fila.maquina.toLowerCase().trim()];
        return max != null && Number(fila.horometro) < max;
      });

      if (invalidos.length > 0) {
        const detalle = invalidos
          .map((f) => `${f.maquina}: mín ${Number(maxPorMaquina[f.maquina.toLowerCase().trim()]).toLocaleString("es-AR")} hs`)
          .join("\n");
        Swal.fire({
          icon: "warning",
          title: "Horómetro inválido",
          text: `El valor ingresado es menor al registrado:\n${detalle}`,
        });
        return;
      }
    }

    await guardarAsistenciaAPI(keyDia, borrador);
    setRegistros((prev) => ({ ...prev, [keyDia]: borrador }));
    setBorrador([]);
    setDiaSeleccionado(null);
  };

  const actualizarCelda = (id, campo, valor) => {
    setBorrador((prev) => prev.map((r) => (r.id === id ? { ...r, [campo]: valor } : r)));
  };

  const agregarFila = () => {
    const nueva = {
      id: Date.now(),
      personal: "",
      maquina: "",
      obra: "",
      ausente: false,
      horometro: "",
      entra: "",
      sale: "",
      observaciones: "",
      personalLibre: true,
    };
    setBorrador((prev) => [...prev, nueva]);
  };

  const exportarExcel = () => {
    const titulo = `Asistencia - ${diaSeleccionado} de ${MESES[mes]} ${anio}`;
    const headers = ["Personal", "Ausente", "Entra", "Sale", "Máquina", "Horómetro", "Obra", "Observaciones"];
    const estCentro = { alignment: { horizontal: "center", vertical: "center" } };
    const estHeader = { font: { bold: true }, alignment: { horizontal: "center", vertical: "center" } };
    const estTitulo = { font: { bold: true, sz: 14 }, alignment: { horizontal: "left", vertical: "center" } };

    const wb = XLSXStyle.utils.book_new();
    const ws = {};

    ws["A1"] = { v: titulo, t: "s", s: estTitulo };
    ws["A2"] = { v: "", t: "s" };

    const cols = "ABCDEFGH";
    headers.forEach((h, i) => {
      ws[`${cols[i]}3`] = { v: h, t: "s", s: estHeader };
    });

    borrador.forEach((fila, rowIdx) => {
      const row = rowIdx + 4;
      const vals = [
        fila.personal,
        fila.ausente ? "Ausente" : "Presente",
        fila.entra,
        fila.sale,
        fila.maquina,
        fila.personal?.toLowerCase().includes("zamorano")
          ? calcularHorometroZamorano(fila.entra)
          : fila.horometro,
        fila.obra,
        fila.observaciones,
      ];
      vals.forEach((v, i) => {
        ws[`${cols[i]}${row}`] = { v: v ?? "", t: "s", s: estCentro };
      });
    });

    const lastRow = borrador.length + 3;
    ws["!ref"] = `A1:H${lastRow}`;
    ws["!cols"] = [{ wch: 22 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 18 }, { wch: 12 }, { wch: 22 }, { wch: 24 }];

    XLSXStyle.utils.book_append_sheet(wb, ws, "Asistencia");
    XLSXStyle.writeFile(wb, `Asistencia_${diaSeleccionado}_${MESES[mes]}_${anio}.xlsx`);
  };

  const borrarFila = (id) => {
    Swal.fire({
      title: "¿Eliminar registro?",
      icon: "warning",
      showCancelButton: true,
      customClass: { confirmButton: "swal-btn-danger" },
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    }).then((res) => {
      if (res.isConfirmed) {
        setBorrador((prev) => prev.filter((r) => r.id !== id));
      }
    });
  };

  if (loading) return <Spinner animation="border" className="d-block mx-auto my-5" />;

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Asistencia</h2>

      {/* Selectores */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <Form.Select
          value={anio}
          onChange={(e) => setAnio(Number(e.target.value))}
          style={{ width: 100 }}
        >
          {anios.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </Form.Select>
        <Form.Select
          value={mes}
          onChange={(e) => setMes(Number(e.target.value))}
          style={{ width: 140 }}
        >
          {MESES.map((nombre, i) => (
            <option key={i} value={i}>{nombre}</option>
          ))}
        </Form.Select>
      </div>

      {/* Grilla */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
        {DIAS_SEMANA.map((d) => (
          <div
            key={d}
            className="text-center fw-semibold"
            style={{ fontSize: "0.82rem", paddingBottom: 4, color: "white" }}
          >
            {d}
          </div>
        ))}

        {celdas.map((dia, i) =>
          dia === null ? (
            <div key={`vacio-${i}`} />
          ) : (() => {
            const esFuturo = new Date(anio, mes, dia) > new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
            const esDomingo = (primerDiaSemana + dia - 1) % 7 === 6;
            const bgBase = esFuturo ? "#3a3a3a" : esHoy(dia) ? "#fff3cd" : esDomingo ? "#666" : "#c0c0c0";
            const bgHover = esFuturo ? "#3a3a3a" : esHoy(dia) ? "#ffe69c" : esDomingo ? "#555" : "#a8a8a8";
            return (
            <div
              key={dia}
              onClick={() => abrirDia(dia)}
              className="rounded text-center"
              style={{
                cursor: esFuturo ? "not-allowed" : "pointer",
                padding: "4px",
                height: 56,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: bgBase,
                border: "2px solid #ffc107",
                transition: "background 0.15s",
                userSelect: "none",
                opacity: esFuturo ? 0.4 : 1,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = bgHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = bgBase; }}
            >
              <span style={{ fontSize: "1rem", fontWeight: 600, color: "#000" }}>
                {dia}
              </span>
              {registros[diaKey(anio, mes, dia)]?.length > 0 && (
                <div style={{ fontSize: "0.7rem", color: "#333", marginTop: 2 }}>
                  ✓
                </div>
              )}
            </div>
            );
          })()
        )}
      </div>

      {/* Modal */}
      <Modal show={!!diaSeleccionado} onHide={cerrarModal} centered size="xl">
        <Modal.Header closeButton>
          <div className="d-flex align-items-center w-100" style={{ marginRight: 32 }}>
            <Modal.Title>
              {diaSeleccionado} de {MESES[mes]} {anio}
            </Modal.Title>
            <Button variant="outline-light" size="sm" onClick={exportarExcel} className="ms-auto">
              Excel
            </Button>
          </div>
        </Modal.Header>
        <Modal.Body>
          <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "60vh" }}>
            <Table striped bordered hover className="text-center align-middle mb-3">
              <thead className="table-dark">
                <tr>
                  <th style={{ width: 200 }}>Personal</th>
                  <th style={{ width: 60 }}>Ausente</th>
                  <th style={{ width: 100 }}>Entra</th>
                  <th style={{ width: 100 }}>Sale</th>
                  <th>Máquina</th>
                  <th style={{ width: 120 }}>Horómetro</th>
                  <th>Obra</th>
                  <th style={{ width: 140 }}>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {borrador.map((fila) => (
                  <tr key={fila.id}>
                    <td>
                      {fila.personalLibre ? (
                        <Form.Control
                          size="sm"
                          type="text"
                          value={fila.personal}
                          onChange={(e) => actualizarCelda(fila.id, "personal", e.target.value)}
                          placeholder="Nombre..."
                          autoFocus
                        />
                      ) : (
                        <Form.Select
                          size="sm"
                          value={fila.personal}
                          onChange={(e) => actualizarCelda(fila.id, "personal", e.target.value)}
                        >
                          <option value="">-</option>
                          {listaPersonal.map((p) => (
                            <option key={p._id} value={p.nombre}>{p.nombre}</option>
                          ))}
                        </Form.Select>
                      )}
                    </td>
                    <td>
                      <Form.Check
                        type="radio"
                        checked={fila.ausente}
                        onChange={() => {}}
                        onClick={() => actualizarCelda(fila.id, "ausente", !fila.ausente)}
                        className="d-flex justify-content-center"
                        style={{ cursor: "pointer" }}
                      />
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-1">
                        <Form.Control
                          size="sm"
                          type="time"
                          value={fila.entra}
                          onChange={(e) => {
                            actualizarCelda(fila.id, "entra", e.target.value);
                            if (e.target.value.length === 5) e.target.blur();
                          }}
                        />
                        {fila.entra && (
                          <span
                            onClick={() => actualizarCelda(fila.id, "entra", "")}
                            style={{ cursor: "pointer", color: "#fff", fontSize: 14, fontWeight: 900, userSelect: "none" }}
                          >✕</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-1">
                        <Form.Control
                          size="sm"
                          type="time"
                          value={fila.sale}
                          onChange={(e) => {
                            actualizarCelda(fila.id, "sale", e.target.value);
                            if (e.target.value.length === 5) e.target.blur();
                          }}
                        />
                        {fila.sale && (
                          <span
                            onClick={() => actualizarCelda(fila.id, "sale", "")}
                            style={{ cursor: "pointer", color: "#fff", fontSize: 14, fontWeight: 900, userSelect: "none" }}
                          >✕</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <Form.Select
                        size="sm"
                        value={fila.maquina}
                        onChange={(e) => actualizarCelda(fila.id, "maquina", e.target.value)}
                      >
                        <option value="">-</option>
                        {listaMaquinas.map((m) => (
                          <option key={m._id} value={m.maquina}>{m.maquina}</option>
                        ))}
                      </Form.Select>
                    </td>
                    <td>
                      {fila.personal?.toLowerCase().includes("zamorano") ? (
                        <span style={{ color: "#dc3545", fontSize: "1.2rem", fontWeight: 700 }}>
                          {calcularHorometroZamorano(fila.entra)}
                        </span>
                      ) : (() => {
                        const maxPorMaquina = getMaxHorometroPorMaquina();
                        const maqKey = fila.maquina?.toLowerCase().trim();
                        const maxPrevio = maqKey ? maxPorMaquina[maqKey] : null;
                        return (
                          <Form.Control
                            size="sm"
                            type="number"
                            value={fila.horometro}
                            onChange={(e) => actualizarCelda(fila.id, "horometro", e.target.value)}
                          />
                        );
                      })()}
                    </td>
                    <td>
                      <Form.Select
                        size="sm"
                        value={fila.obra}
                        onChange={(e) => actualizarCelda(fila.id, "obra", e.target.value)}
                      >
                        <option value="">-</option>
                        <option value="Otras">Otras</option>
                        <option value="Taller">Taller</option>
                        {listaObras.filter((o) => o.estado === "En curso").map((o) => (
                          <option key={o._id} value={o.nombreobra}>{o.nombreobra}</option>
                        ))}
                      </Form.Select>
                    </td>
                    <td>
                      <Form.Control
                        size="sm"
                        type="text"
                        value={fila.observaciones}
                        onChange={(e) => actualizarCelda(fila.id, "observaciones", e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          <Button variant="outline-primary" size="sm" onClick={agregarFila}>
            Agregar fila
          </Button>
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="outline-secondary" onClick={cerrarModal}>Cerrar</Button>
          <Button variant="outline-success" onClick={guardarModal}>Guardar</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Asistencia;
