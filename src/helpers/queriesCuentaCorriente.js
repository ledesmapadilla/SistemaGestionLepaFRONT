import authFetch from "./authFetch";
import { API } from "./api";

export const obtenerCuentaCorriente = async () => {
  const res = await authFetch(API.cuentaCorriente);
  if (!res?.ok) throw new Error("Error al obtener cuenta corriente");
  return res.json();
};
