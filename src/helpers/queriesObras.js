import authFetch from "./authFetch";
import { API } from "./api";

const obrasBackend = API.obras;

export const listarObras = async (query = "") => {
  return authFetch(`${obrasBackend}${query}`);
};

export const crearObra = async (obra) => {
  try {
    return await authFetch(obrasBackend, {
      method: "POST",
      body: JSON.stringify(obra),
    });
  } catch (error) {
    console.error("Error al crear obra:", error);
    return null;
  }
};

export const editarObra = async (id, obra) => {
  try {
    return await authFetch(`${obrasBackend}/${id}`, {
      method: "PUT",
      body: JSON.stringify(obra),
    });
  } catch (error) {
    console.error("Error al editar obra:", error);
    return null;
  }
};

export const borrarObra = async (id) => {
  try {
    return await authFetch(`${obrasBackend}/${id}`, { method: "DELETE" });
  } catch (error) {
    console.error("Error al borrar obra:", error);
    return null;
  }
};

export const obtenerObra = async (id) => {
  try {
    const respuesta = await authFetch(`${obrasBackend}/${id}`);
    if (respuesta?.ok) return await respuesta.json();
    return null;
  } catch (error) {
    console.error("Error al obtener la obra:", error);
    return null;
  }
};
