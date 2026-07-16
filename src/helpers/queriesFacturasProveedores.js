import authFetch from "./authFetch";
import { API } from "./api";

const url = API.facturasProveedores;

export const listarFacturasProveedores = async (estadoPago) => {
  let queryUrl = url;
  if (estadoPago) {
    queryUrl += `?estadoPago=${estadoPago}`;
  }
  const res = await authFetch(queryUrl);
  if (!res?.ok) throw new Error("Error al listar facturas de proveedores");
  return res.json();
};

export const crearFacturaProveedor = async (factura) => {
  try {
    return await authFetch(url, {
      method: "POST",
      body: JSON.stringify(factura),
    });
  } catch (error) {
    console.error("Error al crear factura de proveedor:", error);
    return null;
  }
};

export const editarFacturaProveedor = async (id, factura) => {
  try {
    return await authFetch(`${url}/${id}`, {
      method: "PUT",
      body: JSON.stringify(factura),
    });
  } catch (error) {
    console.error("Error al editar factura de proveedor:", error);
    return null;
  }
};

export const borrarFacturaProveedor = async (id) => {
  try {
    return await authFetch(`${url}/${id}`, { method: "DELETE" });
  } catch (error) {
    console.error("Error al borrar factura de proveedor:", error);
    return null;
  }
};
