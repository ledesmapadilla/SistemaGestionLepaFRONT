import authFetch from "./authFetch";
import { API } from "./api";

const URL_ACEITES = API.aceites;

export const listarAceites = async () => {
  try {
    return await authFetch(URL_ACEITES);
  } catch (error) { return null; }
};

export const crearAceite = async (datos) => {
  try {
    return await authFetch(URL_ACEITES, {
      method: "POST",
      body: JSON.stringify(datos),
    });
  } catch (error) { return null; }
};

export const recargarStockAPI = async (id, datos) => {
  try {
    return await authFetch(`${URL_ACEITES}/recarga/${id}`, {
      method: "POST",
      body: JSON.stringify(datos),
    });
  } catch (error) { return null; }
};

export const registrarConsumoAPI = async (id, datos) => {
  try {
    return await authFetch(`${URL_ACEITES}/consumo/${id}`, {
      method: "POST",
      body: JSON.stringify(datos),
    });
  } catch (error) { return null; }
};

export const registrarCompraAPI = async (id, datos) => {
  try {
    return await authFetch(`${URL_ACEITES}/compra/${id}`, {
      method: "POST",
      body: JSON.stringify(datos),
    });
  } catch (error) { return null; }
};

export const editarAceite = async (id, datos) => {
  try {
    return await authFetch(`${URL_ACEITES}/${id}`, {
      method: "PUT",
      body: JSON.stringify(datos),
    });
  } catch (error) { return null; }
};

export const borrarAceite = async (id) => {
  try {
    return await authFetch(`${URL_ACEITES}/${id}`, { method: "DELETE" });
  } catch (error) { return null; }
};

export const editarCompraAPI = async (aceiteId, movId, datos) => {
  try {
    return await authFetch(`${URL_ACEITES}/${aceiteId}/movimiento/${movId}`, {
      method: "PUT",
      body: JSON.stringify(datos),
    });
  } catch (error) { return null; }
};

export const borrarCompraAPI = async (aceiteId, movId) => {
  try {
    return await authFetch(`${URL_ACEITES}/${aceiteId}/movimiento/${movId}`, { method: "DELETE" });
  } catch (error) { return null; }
};
