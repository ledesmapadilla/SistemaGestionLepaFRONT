import authFetch from "./authFetch";
import { API } from "./api";

const base = API.registroBaterias;

export const listarRegistrosBaterias = async () => {
  const res = await authFetch(base);
  if (!res?.ok) throw new Error("Error al listar registros de baterías");
  return res.json();
};

export const crearRegistroBateria = async (data) => {
  return authFetch(base, { method: "POST", body: JSON.stringify(data) });
};

export const editarRegistroBateria = async (id, data) => {
  return authFetch(`${base}/${id}`, { method: "PUT", body: JSON.stringify(data) });
};

export const borrarRegistroBateria = async (id) => {
  return authFetch(`${base}/${id}`, { method: "DELETE" });
};
