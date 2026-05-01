import authFetch from "./authFetch";
import { API } from "./api";

const URL = API.serviceMaquina;

export const listarServices = async () => {
  try {
    return await authFetch(URL);
  } catch (error) {
    console.error("Error al listar services:", error);
    return null;
  }
};

export const crearService = async (data) => {
  try {
    return await authFetch(URL, {
      method: "POST",
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error("Error al crear service:", error);
    return null;
  }
};

export const editarService = async (id, data) => {
  try {
    return await authFetch(`${URL}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error("Error al editar service:", error);
    return null;
  }
};

export const borrarService = async (id) => {
  try {
    return await authFetch(`${URL}/${id}`, { method: "DELETE" });
  } catch (error) {
    console.error("Error al borrar service:", error);
    return null;
  }
};
