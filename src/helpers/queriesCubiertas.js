import authFetch from "./authFetch";
import { API } from "./api";

const base = API.cubiertas;

export const listarCubiertas = async (categoria = "camiones") => {
  const url = categoria ? `${base}?categoria=${encodeURIComponent(categoria)}` : base;
  const res = await authFetch(url);
  if (!res?.ok) throw new Error("Error al listar cubiertas");
  return res.json();
};

export const crearCubierta = async (data) => {
  return authFetch(base, { method: "POST", body: JSON.stringify(data) });
};

export const editarCubierta = async (id, data) => {
  return authFetch(`${base}/${id}`, { method: "PUT", body: JSON.stringify(data) });
};

export const borrarCubierta = async (id) => {
  return authFetch(`${base}/${id}`, { method: "DELETE" });
};
