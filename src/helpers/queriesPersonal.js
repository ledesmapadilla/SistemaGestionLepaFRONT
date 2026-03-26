const personalBackend = import.meta.env.VITE_API_PERSONAL;

export const listarPersonal = async (query = "") => {
  return fetch(`${personalBackend}${query}`);
};

export const crearPersonal = async (personal) => {
  try {
    const respuesta = await fetch(personalBackend, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(personal),
    });
    return respuesta;
  } catch (error) {
    console.error("Error al crear personal:", error);
    return null;
  }
};

export const editarPersonal = async (id, personal) => {
  try {
    const respuesta = await fetch(`${personalBackend}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(personal),
    });
    return respuesta;
  } catch (error) {
    console.error("Error al editar personal:", error);
    return null;
  }
};

export const borrarPersonal = async (id) => {
  try {
    const respuesta = await fetch(`${personalBackend}/${id}`, {
      method: "DELETE",
    });
    return respuesta;
  } catch (error) {
    console.error("Error al borrar personal:", error);
    return null;
  }
};
