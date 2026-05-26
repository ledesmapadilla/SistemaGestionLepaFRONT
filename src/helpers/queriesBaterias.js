import authFetch from "./authFetch";
import { API } from "./api";

const base = API.baterias;

export const listarBaterias = async () => {
  const res = await authFetch(base);
  if (!res?.ok) throw new Error("Error al listar baterías");
  return res.json();
};

export const crearBateria = async (data) => {
  return authFetch(base, { method: "POST", body: JSON.stringify(data) });
};

export const editarBateria = async (id, data) => {
  return authFetch(`${base}/${id}`, { method: "PUT", body: JSON.stringify(data) });
};

export const borrarBateria = async (id) => {
  return authFetch(`${base}/${id}`, { method: "DELETE" });
};
