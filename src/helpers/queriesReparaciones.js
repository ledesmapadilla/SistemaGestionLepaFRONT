import authFetch from "./authFetch";
import { API } from "./api";

const URL = API.reparacionesMaquina;

export const obtenerTodasReparaciones = async () => {
  try {
    return await authFetch(URL);
  } catch (error) {
    console.error("Error al obtener todas las reparaciones:", error);
    return null;
  }
};

export const obtenerReparacionesPorMaquina = async (maquinaId) => {
  try {
    return await authFetch(`${URL}/${maquinaId}`);
  } catch (error) {
    console.error("Error al obtener reparaciones:", error);
    return null;
  }
};

export const guardarReparaciones = async (maquina, reparaciones) => {
  try {
    return await authFetch(URL, {
      method: "POST",
      body: JSON.stringify({ maquina, reparaciones }),
    });
  } catch (error) {
    console.error("Error al guardar reparaciones:", error);
    return null;
  }
};
