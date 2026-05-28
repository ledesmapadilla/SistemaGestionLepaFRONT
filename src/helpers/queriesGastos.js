import authFetch from "./authFetch";
import { API } from "./api";

const URI_GASTOS = API.gastos;

export const listarGastosPorObra = async (idObra) => {
  try {
    return await authFetch(`${URI_GASTOS}?obra=${idObra}`);
  } catch (error) {
    return null;
  }
};

export const crearGastoAPI = async (gasto) => {
  try {
    return await authFetch(URI_GASTOS, {
      method: "POST",
      body: JSON.stringify(gasto),
    });
  } catch (error) {
    return null;
  }
};

export const borrarGastoAPI = async (id) => {
  try {
    return await authFetch(`${URI_GASTOS}/${id}`, { method: "DELETE" });
  } catch (error) {
    return null;
  }
};

export const editarGastoAPI = async (id, datosGasto) => {
  try {
    return await authFetch(`${URI_GASTOS}/${id}`, {
      method: "PUT",
      body: JSON.stringify(datosGasto),
    });
  } catch (error) {
    console.error("Error al editar el gasto", error);
    return false;
  }
};
