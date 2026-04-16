import authFetch from "./authFetch";
import { API } from "./api";

const personalBackend = API.personal;

export const listarPersonal = async (query = "") => {
  return authFetch(`${personalBackend}${query}`);
};

export const crearPersonal = async (personal) => {
  try {
    return await authFetch(personalBackend, {
      method: "POST",
      body: JSON.stringify(personal),
    });
  } catch (error) {
    console.error("Error al crear personal:", error);
    return null;
  }
};

export const editarPersonal = async (id, personal) => {
  try {
    return await authFetch(`${personalBackend}/${id}`, {
      method: "PUT",
      body: JSON.stringify(personal),
    });
  } catch (error) {
    console.error("Error al editar personal:", error);
    return null;
  }
};

export const borrarPersonal = async (id) => {
  try {
    return await authFetch(`${personalBackend}/${id}`, { method: "DELETE" });
  } catch (error) {
    console.error("Error al borrar personal:", error);
    return null;
  }
};
