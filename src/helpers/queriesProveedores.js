import authFetch from "./authFetch";

const proveedoresBackend = import.meta.env.VITE_API_PROVEEDORES;

export const listarProveedores = async (query = "") => {
  return authFetch(`${proveedoresBackend}${query}`);
};

export const crearProveedor = async (proveedor) => {
  try {
    return await authFetch(proveedoresBackend, {
      method: "POST",
      body: JSON.stringify(proveedor),
    });
  } catch (error) {
    console.error("Error al crear proveedor:", error);
    return null;
  }
};

export const editarProveedor = async (id, proveedor) => {
  try {
    return await authFetch(`${proveedoresBackend}/${id}`, {
      method: "PUT",
      body: JSON.stringify(proveedor),
    });
  } catch (error) {
    console.error("Error al editar proveedor:", error);
    return null;
  }
};

export const borrarProveedor = async (id) => {
  try {
    return await authFetch(`${proveedoresBackend}/${id}`, { method: "DELETE" });
  } catch (error) {
    console.error("Error al borrar proveedor:", error);
    return null;
  }
};
