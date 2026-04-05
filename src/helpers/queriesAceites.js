import authFetch from "./authFetch";

const URL_ACEITES = import.meta.env.VITE_API_ACEITES;

export const listarAceites = async () => {
  try {
    return await authFetch(URL_ACEITES);
  } catch (error) { console.log(error); }
};

export const crearAceite = async (datos) => {
  try {
    return await authFetch(URL_ACEITES, {
      method: "POST",
      body: JSON.stringify(datos),
    });
  } catch (error) { console.log(error); }
};

export const recargarStockAPI = async (id, datos) => {
  try {
    return await authFetch(`${URL_ACEITES}/recarga/${id}`, {
      method: "POST",
      body: JSON.stringify(datos),
    });
  } catch (error) { console.log(error); }
};

export const registrarConsumoAPI = async (id, datos) => {
  try {
    return await authFetch(`${URL_ACEITES}/consumo/${id}`, {
      method: "POST",
      body: JSON.stringify(datos),
    });
  } catch (error) { console.log(error); }
};

export const registrarCompraAPI = async (id, datos) => {
  try {
    return await authFetch(`${URL_ACEITES}/compra/${id}`, {
      method: "POST",
      body: JSON.stringify(datos),
    });
  } catch (error) { console.log(error); }
};

export const editarAceite = async (id, datos) => {
  try {
    return await authFetch(`${URL_ACEITES}/${id}`, {
      method: "PUT",
      body: JSON.stringify(datos),
    });
  } catch (error) { console.log(error); }
};

export const borrarAceite = async (id) => {
  try {
    return await authFetch(`${URL_ACEITES}/${id}`, { method: "DELETE" });
  } catch (error) { console.log(error); }
};

export const editarCompraAPI = async (aceiteId, movId, datos) => {
  try {
    return await authFetch(`${URL_ACEITES}/${aceiteId}/movimiento/${movId}`, {
      method: "PUT",
      body: JSON.stringify(datos),
    });
  } catch (error) { console.log(error); }
};

export const borrarCompraAPI = async (aceiteId, movId) => {
  try {
    return await authFetch(`${URL_ACEITES}/${aceiteId}/movimiento/${movId}`, { method: "DELETE" });
  } catch (error) { console.log(error); }
};
