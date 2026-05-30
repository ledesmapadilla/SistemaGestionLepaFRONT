import authFetch from "./authFetch";
import { API } from "./api";

const base = API.registroCubiertas;

export const listarRegistrosCubiertas = async () => {
  const res = await authFetch(base);
  if (!res?.ok) throw new Error("Error al listar registros de cubiertas");
  return res.json();
};

export const crearRegistroCubierta = async (data) => {
  return authFetch(base, { method: "POST", body: JSON.stringify(data) });
};

export const editarRegistroCubierta = async (id, data) => {
  return authFetch(`${base}/${id}`, { method: "PUT", body: JSON.stringify(data) });
};

export const borrarRegistroCubierta = async (id) => {
  return authFetch(`${base}/${id}`, { method: "DELETE" });
};
