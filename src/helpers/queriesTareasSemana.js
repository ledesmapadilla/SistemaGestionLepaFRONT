import authFetch from "./authFetch";
import { API } from "./api";

const URL = API.tareasSemana;

export const obtenerTareasSemana = async () => {
  try {
    return await authFetch(URL);
  } catch (error) {
    console.error("Error al obtener tareas de la semana:", error);
    return null;
  }
};

// Reemplaza todas las tareas semanales del responsable.
export const guardarTareasSemana = async (responsable, tareas) => {
  try {
    return await authFetch(URL, {
      method: "POST",
      body: JSON.stringify({ responsable, tareas }),
    });
  } catch (error) {
    console.error("Error al guardar tareas de la semana:", error);
    return null;
  }
};

// Agrega una sola tarea (botón "A semanal" de Pendientes). 409 si ya está en esa semana.
export const agregarTareaSemana = async (responsable, tarea) => {
  try {
    return await authFetch(`${URL}/agregar`, {
      method: "POST",
      body: JSON.stringify({ responsable, tarea }),
    });
  } catch (error) {
    console.error("Error al agregar tarea a la semana:", error);
    return null;
  }
};
