import authFetch from "./authFetch";
import { API } from "./api";

const base = API.dato931;

export const obtenerDatos931 = async (anio, mes) => {
  const res = await authFetch(`${base}?anio=${anio}&mes=${mes}`);
  if (!res?.ok) throw new Error("Error al obtener datos 931");
  return res.json();
};

export const guardarDato931 = async (data) => {
  return authFetch(base, { method: "POST", body: JSON.stringify(data) });
};

export const eliminarDato931 = async (id) => {
  return authFetch(`${base}/${id}`, { method: "DELETE" });
};
