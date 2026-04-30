import authFetch from "./authFetch";
import { API } from "./api";

const URL = API.asistencia;

export const listarAsistencia = async () => {
  try {
    return await authFetch(URL);
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
