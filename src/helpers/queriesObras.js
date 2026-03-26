const obrasBackend = import.meta.env.VITE_API_OBRAS;

export const listarObras = async (query = "") => {
  return fetch(`${obrasBackend}${query}`);
};

export const crearObra = async (obra) => {
  try {
    const respuesta = await fetch(obrasBackend, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(obra),
    });
    return respuesta;
  } catch (error) {
    console.error("Error al crear obra:", error);
    return null;
  }
};

export const editarObra = async (id, obra) => {
  try {
    const respuesta = await fetch(`${obrasBackend}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(obra),
    });
    return respuesta;
  } catch (error) {
    console.error("Error al editar obra:", error);
    return null;
  }
};

export const borrarObra = async (id) => {
  try {
    const respuesta = await fetch(`${obrasBackend}/${id}`, {
      method: "DELETE",
    });
    return respuesta;
  } catch (error) {
    console.error("Error al borrar obra:", error);
    return null;
  }
};

export const obtenerObra = async (id) => {
  try {
    const respuesta = await fetch(`${obrasBackend}/${id}`);

    if (respuesta.ok) {
      return await respuesta.json();
    }

    return null;
  } catch (error) {
    console.error("Error al obtener la obra:", error);
    return null;
  }
};

