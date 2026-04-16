import authFetch from "./authFetch";
import { API } from "./api";

const facturasBackend = API.facturas;

export const listarFacturas = async () => {
  const res = await authFetch(facturasBackend);
  if (!res?.ok) throw new Error("Error al listar facturas");
  return res.json();
};

export const crearFactura = async (factura) => {
  try {
    return await authFetch(facturasBackend, {
      method: "POST",
      body: JSON.stringify(factura),
    });
  } catch (error) {
    console.error("Error al crear factura:", error);
    return null;
  }
};

export const editarFactura = async (id, factura) => {
  try {
    return await authFetch(`${facturasBackend}/${id}`, {
      method: "PUT",
      body: JSON.stringify(factura),
    });
  } catch (error) {
    console.error("Error al editar factura:", error);
    return null;
  }
};

export const borrarFactura = async (id) => {
  try {
    return await authFetch(`${facturasBackend}/${id}`, { method: "DELETE" });
  } catch (error) {
    console.error("Error al borrar factura:", error);
    return null;
  }
};
