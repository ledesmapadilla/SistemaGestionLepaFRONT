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

export const guardarGastoSemanal = async (semana, registros, proveedores) => {
  try {
    const body = { semana };
    if (registros !== undefined) body.registros = registros;
    if (proveedores !== undefined) body.proveedores = proveedores;
    return await authFetch(URL, {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error("Error al guardar gasto semanal:", error);
    return null;
  }
};
