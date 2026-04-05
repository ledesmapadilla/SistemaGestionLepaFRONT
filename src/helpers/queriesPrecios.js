import authFetch from "./authFetch";

const preciosBackend = import.meta.env.VITE_API_PRECIOS;

export const listarPrecios = async () => {
  return authFetch(preciosBackend);
};

export const crearPrecio = async (precio) => {
  try {
    return await authFetch(preciosBackend, {
      method: "POST",
      body: JSON.stringify(precio),
    });
  } catch (error) {
    console.error("Error al crear precio:", error);
    return null;
  }
};

export const editarPrecio = async (id, precio) => {
  try {
    return await authFetch(`${preciosBackend}/${id}`, {
      method: "PUT",
      body: JSON.stringify(precio),
    });
  } catch (error) {
    console.error("Error al editar precio:", error);
    return null;
  }
};

export const borrarPrecio = async (id) => {
  try {
    return await authFetch(`${preciosBackend}/${id}`, { method: "DELETE" });
  } catch (error) {
    console.error("Error al borrar precio:", error);
    return null;
  }
};
