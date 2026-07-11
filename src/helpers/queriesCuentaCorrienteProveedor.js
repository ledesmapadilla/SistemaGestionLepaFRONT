import authFetch from "./authFetch";
import { API } from "./api";

export const obtenerCuentaCorrienteProveedor = async (proveedor = "") => {
  const query = proveedor ? `?proveedor=${encodeURIComponent(proveedor)}` : "";
  const res = await authFetch(`${API.cuentaCorrienteProveedores}${query}`);
  if (!res?.ok) throw new Error("Error al obtener cuenta corriente de proveedores");
  return res.json();
};
