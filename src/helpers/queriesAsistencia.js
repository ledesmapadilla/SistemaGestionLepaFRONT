import authFetch from "./authFetch";
import { API } from "./api";

const URL = API.asistencia;

export const listarAsistencia = async (anio, mes) => {
  try {
    const params = anio !== undefined && mes !== undefined ? `?anio=${anio}&mes=${mes}` : "";
    return await authFetch(`${URL}${params}`);
  } catch (error) {
    console.error("Error al listar asistencia:", error);
    return null;
  }
};

export const obtenerAsistenciaPorFecha = async (fecha) => {
  try {
    return await authFetch(`${URL}?fecha=${fecha}`);
  } catch (error) {
    console.error("Error al obtener asistencia:", error);
    return null;
  }
};

// Trae todas las asistencias entre dos fechas (inclusive) en un solo pedido.
export const listarAsistenciaRango = async (desde, hasta) => {
  try {
    return await authFetch(`${URL}?desde=${desde}&hasta=${hasta}`);
  } catch (error) {
    console.error("Error al listar asistencia por rango:", error);
    return null;
  }
};

export const guardarAsistencia = async (fecha, registros) => {
  try {
    return await authFetch(URL, {
      method: "POST",
      body: JSON.stringify({ fecha, registros }),
    });
  } catch (error) {
    console.error("Error al guardar asistencia:", error);
    return null;
  }
};

export const eliminarAsistenciaPorFecha = async (fecha) => {
  try {
    return await authFetch(`${URL}/fecha/${fecha}`, { method: "DELETE" });
  } catch (error) {
    console.error("Error al eliminar asistencia por fecha:", error);
    return null;
  }
};

export const eliminarPersonalDeAsistencias = async (nombre, desde) => {
  try {
    const params = new URLSearchParams({ nombre });
    if (desde) params.append("desde", desde);
    return await authFetch(`${URL}/personal?${params}`, { method: "DELETE" });
  } catch (error) {
    console.error("Error al eliminar personal de asistencias:", error);
    return null;
  }
};
