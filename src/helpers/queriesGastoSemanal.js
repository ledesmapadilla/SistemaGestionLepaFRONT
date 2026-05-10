import authFetch from "./authFetch";
import { API } from "./api";

const URL = API.gastoSemanal;

export const obtenerGastoSemanalPorSemana = async (semana) => {
  try {
    return await authFetch(`${URL}?semana=${semana}`);
  } catch (error) {
    console.error("Error al obtener gasto semanal:", error);
    return null;
  }
};

export const guardarGastoSemanal = async (semana, registros) => {
  try {
    return await authFetch(URL, {
      method: "POST",
      body: JSON.stringify({ semana, registros }),
    });
  } catch (error) {
    console.error("Error al guardar gasto semanal:", error);
    return null;
  }
};
