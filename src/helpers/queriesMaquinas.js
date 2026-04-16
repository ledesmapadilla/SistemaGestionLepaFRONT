import authFetch from "./authFetch";
import { API } from "./api";

const URL_MAQUINAS = API.maquinas;

export const listarMaquinas = async () => {
  try {
    return await authFetch(URL_MAQUINAS);
  } catch (error) {
    console.error("Error al listar máquinas:", error);
    return null;
  }
};

export const crearMaquina = async (maquina) => {
  try {
    return await authFetch(URL_MAQUINAS, {
      method: "POST",
      body: JSON.stringify(maquina),
    });
  } catch (error) {
    console.error("Error al crear máquina:", error);
    return null;
  }
};

export const editarMaquina = async (id, maquina) => {
  try {
    return await authFetch(`${URL_MAQUINAS}/${id}`, {
      method: "PUT",
      body: JSON.stringify(maquina),
    });
  } catch (error) {
    console.error("Error al editar máquina:", error);
    return null;
  }
};

export const borrarMaquina = async (id) => {
  try {
    return await authFetch(`${URL_MAQUINAS}/${id}`, { method: "DELETE" });
  } catch (error) {
    console.error("Error al borrar máquina:", error);
    return null;
  }
};
