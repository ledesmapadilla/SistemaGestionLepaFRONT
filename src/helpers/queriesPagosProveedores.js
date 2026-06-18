import authFetch from "./authFetch";
import { API } from "./api";

const base = API.pagosProveedores;

export const listarPagosProveedores = async () => {
  const res = await authFetch(base);
  if (!res?.ok) throw new Error("Error al listar pagos de proveedores");
  return res.json();
};

export const listarPagosProveedoresPorObra = async (obraNombre) => {
  const res = await authFetch(`${base}?obra=${encodeURIComponent(obraNombre)}`);
  if (!res?.ok) return [];
  return res.json();
};

export const crearPagoProveedor = async (pago) => {
  try {
    return await authFetch(base, { method: "POST", body: JSON.stringify(pago) });
  } catch (error) {
    console.error("Error al crear pago de proveedor:", error);
    return null;
  }
};

export const crearPagoEfectivoProveedor = async ({ proveedor, monto, fecha }) => {
  try {
    return await authFetch(`${base}/efectivo`, {
      method: "POST",
      body: JSON.stringify({ proveedor, monto, fecha }),
    });
  } catch (error) {
    console.error("Error al registrar pago en efectivo:", error);
    return null;
  }
};

export const editarPagoProveedor = async (id, pago) => {
  try {
    return await authFetch(`${base}/${id}`, { method: "PUT", body: JSON.stringify(pago) });
  } catch (error) {
    console.error("Error al editar pago de proveedor:", error);
    return null;
  }
};

export const borrarPagoProveedor = async (id) => {
  try {
    return await authFetch(`${base}/${id}`, { method: "DELETE" });
  } catch (error) {
    console.error("Error al borrar pago de proveedor:", error);
    return null;
  }
};
