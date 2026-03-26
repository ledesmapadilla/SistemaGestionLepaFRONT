const preciosBackend = import.meta.env.VITE_API_PRECIOS;

export const listarPrecios = async () => {
  return fetch(preciosBackend);
};

export const crearPrecio = async (precio) => {
  try {
    const respuesta = await fetch(preciosBackend, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(precio),
    });
    return respuesta;
  } catch (error) {
    console.error("Error al crear precio:", error);
    return null;
  }
};

export const editarPrecio = async (id, precio) => {
  try {
    const respuesta = await fetch(`${preciosBackend}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(precio),
    });
    return respuesta;
  } catch (error) {
    console.error("Error al editar precio:", error);
    return null;
  }
};

export const borrarPrecio = async (id) => {
  try {
    const respuesta = await fetch(`${preciosBackend}/${id}`, {
      method: "DELETE",
    });
    return respuesta;
  } catch (error) {
    console.error("Error al borrar precio:", error);
    return null;
  }
};
