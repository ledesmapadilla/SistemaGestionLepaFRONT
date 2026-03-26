const proveedoresBackend = import.meta.env.VITE_API_PROVEEDORES;

export const listarProveedores = async (query = "") => {
  return fetch(`${proveedoresBackend}${query}`);
};

export const crearProveedor = async (proveedor) => {
  try {
    const respuesta = await fetch(proveedoresBackend, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(proveedor),
    });
    return respuesta;
  } catch (error) {
    console.error("Error al crear proveedor:", error);
    return null;
  }
};

export const editarProveedor = async (id, proveedor) => {
  try {
    const respuesta = await fetch(`${proveedoresBackend}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(proveedor),
    });
    return respuesta;
  } catch (error) {
    console.error("Error al editar proveedor:", error);
    return null;
  }
};

export const borrarProveedor = async (id) => {
  try {
    const respuesta = await fetch(`${proveedoresBackend}/${id}`, {
      method: "DELETE",
    });
    return respuesta;
  } catch (error) {
    console.error("Error al borrar proveedor:", error);
    return null;
  }
};
