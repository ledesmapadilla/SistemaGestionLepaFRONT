import authFetch from "./authFetch";
import { API } from "./api";

const URL = API.pendientesReunion;

export const listarPendientesReunion = async () => {
  const res = await authFetch(URL);
  if (!res?.ok) throw new Error("Error al listar pendientes de reunión");
  return res.json();
};

export const crearPendienteReunion = async (pendiente) => {
  const res = await authFetch(URL, { method: "POST", body: JSON.stringify(pendiente) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || "Error al crear pendiente");
  return data.data;
};

export const editarPendienteReunion = async (id, cambios) => {
  const res = await authFetch(`${URL}/${id}`, { method: "PUT", body: JSON.stringify(cambios) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || "Error al editar pendiente");
  return data.data;
};

export const borrarPendienteReunion = async (id) => {
  const res = await authFetch(`${URL}/${id}`, { method: "DELETE" });
  if (!res?.ok) throw new Error("Error al borrar pendiente");
};
