import authFetch from "./authFetch";
import { API } from "./api";

const variablesBackend = API.variables;

export const listarVariables = async () => {
  return authFetch(variablesBackend);
};

export const crearVariable = async (variable) => {
  try {
    return await authFetch(variablesBackend, {
      method: "POST",
      body: JSON.stringify(variable),
    });
  } catch (error) {
    console.error("Error al crear variable:", error);
    return null;
  }
};

export const editarVariable = async (id, variable) => {
  try {
    return await authFetch(`${variablesBackend}/${id}`, {
      method: "PUT",
      body: JSON.stringify(variable),
    });
  } catch (error) {
    console.error("Error al editar variable:", error);
    return null;
  }
};

export const borrarVariable = async (id) => {
  try {
    return await authFetch(`${variablesBackend}/${id}`, { method: "DELETE" });
  } catch (error) {
    console.error("Error al borrar variable:", error);
    return null;
  }
};
