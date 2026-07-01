import authFetch from "./authFetch";
import { API } from "./api";

const URL = API.pendientesResponsable;

export const obtenerTodosPendientes = async () => {
  try {
    return await authFetch(URL);
  } catch (error) {
    console.error("Error al obtener pendientes:", error);
    return null;
  }
};

export const guardarPendientes = async (responsable, tareas) => {
  try {
    return await authFetch(URL, {
      method: "POST",
      body: JSON.stringify({ responsable, tareas }),
    });
  } catch (error) {
    console.error("Error al guardar pendientes:", error);
    return null;
  }
};
