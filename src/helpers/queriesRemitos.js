import authFetch from "./authFetch";
import { API } from "./api";

const remitosBackend = API.remitos;

export const listarRemitos = async (estado = "") => {
  const estadoQuery = estado ? `?estado=${encodeURIComponent(estado)}` : "";
  const res = await authFetch(`${remitosBackend}${estadoQuery}`);
  if (!res?.ok) throw new Error("Error al listar remitos");
  return res.json();
};

export const existeRemito = async (numero) => {
  const res = await authFetch(`${remitosBackend}/existe/${Number(numero)}`);
  if (!res?.ok) throw new Error("Error al verificar remito");
  const data = await res.json();
  return data.existe;
};

export const proximoNumeroRemito = async (desde = 9000) => {
  const res = await authFetch(`${remitosBackend}/proximo-numero?desde=${desde}`);
  if (!res?.ok) throw new Error("Error al obtener próximo número de remito");
  const data = await res.json();
  return data.numero;
};

export const listarRemitosDisponibles = async () => {
  const res = await authFetch(`${remitosBackend}?disponibles=true`);
  if (!res?.ok) throw new Error("Error al listar remitos disponibles");
  return res.json();
};

export const listarRemitosPorObra = async (idObra) => {
  try {
    const res = await authFetch(`${remitosBackend}?obra=${idObra}`);
    if (!res?.ok) throw new Error("Error al listar remitos por obra");
    return res.json();
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const crearRemito = async (remito) => {
  const res = await authFetch(remitosBackend, {
    method: "POST",
    body: JSON.stringify(remito),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || "Error al crear remito");
  return data;
};

export const editarRemito = async (id, remito) => {
  const res = await authFetch(`${remitosBackend}/${id}`, {
    method: "PUT",
    body: JSON.stringify(remito),
  });
  return res.json();
};

export const eliminarRemito = async (id) => {
  return authFetch(`${remitosBackend}/${id}`, { method: "DELETE" });
};

export const eliminarItemRemito = async (remitoId, itemId) => {
  const response = await authFetch(`${remitosBackend}/${remitoId}/items/${itemId}`, { method: "DELETE" });
  if (!response?.ok) throw new Error("Error al eliminar item");
  return response.json();
};

export const recalcularEstadosRemitos = async () => {
  const res = await authFetch(`${remitosBackend}/recalcular-estados`, { method: "PUT" });
  if (!res?.ok) throw new Error("Error al recalcular estados");
  return res.json();
};

export const liberarRemitosNC = async () => {
  const res = await authFetch(`${remitosBackend}/liberar-nc`, { method: "PUT" });
  if (!res?.ok) throw new Error("Error al liberar remitos de notas de crédito");
  return res.json();
};

export const editarItemRemito = async (remitoId, itemId, datosItem) => {
  try {
    const respuesta = await authFetch(`${remitosBackend}/${remitoId}/items/${itemId}`, {
      method: "PUT",
      body: JSON.stringify(datosItem),
    });
    if (!respuesta?.ok) {
      const error = await respuesta.json();
      throw new Error(error.msg || "Error al editar ítem");
    }
    return await respuesta.json();
  } catch (error) {
    console.error("Error en editarItemRemito:", error);
    throw error;
  }
};
