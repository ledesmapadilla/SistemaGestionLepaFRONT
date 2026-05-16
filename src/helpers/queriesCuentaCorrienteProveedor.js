import authFetch from "./authFetch";
import { API } from "./api";

export const obtenerCuentaCorrienteProveedor = async () => {
  const res = await authFetch(API.cuentaCorrienteProveedores);
  if (!res?.ok) throw new Error("Error al obtener cuenta corriente de proveedores");
  return res.json();
};
