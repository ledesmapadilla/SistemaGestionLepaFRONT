import authFetch from "./authFetch";
import { API } from "./api";

export const obtenerCuentaCorriente = async (cliente = "") => {
  const query = cliente ? `?cliente=${encodeURIComponent(cliente)}` : "";
  const res = await authFetch(`${API.cuentaCorriente}${query}`);
  if (!res?.ok) throw new Error("Error al obtener cuenta corriente");
  return res.json();
};
