import authFetch from "./authFetch";
import { API } from "./api";

const cobrosBackend = API.cobros;

export const listarCobros = async () => {
  const res = await authFetch(cobrosBackend);
  if (!res?.ok) throw new Error("Error al listar cobros");
  return res.json();
};

export const crearCobro = async (cobro) => {
  try {
    return await authFetch(cobrosBackend, {
      method: "POST",
      body: JSON.stringify(cobro),
    });
  } catch (error) {
    console.error("Error al crear cobro:", error);
    return null;
  }
};

export const editarCobro = async (id, cobro) => {
  try {
    return await authFetch(`${cobrosBackend}/${id}`, {
      method: "PUT",
      body: JSON.stringify(cobro),
    });
  } catch (error) {
    console.error("Error al editar cobro:", error);
    return null;
  }
};

export const borrarCobro = async (id) => {
  try {
    return await authFetch(`${cobrosBackend}/${id}`, { method: "DELETE" });
  } catch (error) {
    console.error("Error al borrar cobro:", error);
    return null;
  }
};

export const actualizarEstadoCheque = async (cobroId, medioIndex, estado, observaciones, proveedor = "", extras = {}) => {
  try {
    return await authFetch(`${cobrosBackend}/${cobroId}/medio/${medioIndex}`, {
      method: "PATCH",
      body: JSON.stringify({ estado, observaciones, proveedor, ...extras }),
    });
  } catch (error) {
    console.error("Error al actualizar estado:", error);
    return null;
  }
};

export const recalcularEstadosFacturas = async () => {
  try {
    return await authFetch(`${cobrosBackend}/recalcular-todo`);
  } catch (error) {
    console.error("Error al recalcular estados:", error);
    return null;
  }
};
