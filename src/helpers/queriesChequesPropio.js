import authFetch from "./authFetch";
import { API } from "./api";

const base = API.chequesPropio;

export const listarChequesPropio = async () => {
  const res = await authFetch(base);
  if (!res?.ok) throw new Error("Error al listar cheques propios");
  return res.json();
};

export const crearChequePropio = async (data) => {
  return authFetch(base, { method: "POST", body: JSON.stringify(data) });
};

export const editarChequePropio = async (id, data) => {
  return authFetch(`${base}/${id}`, { method: "PUT", body: JSON.stringify(data) });
};

export const borrarChequePropio = async (id) => {
  return authFetch(`${base}/${id}`, { method: "DELETE" });
};
