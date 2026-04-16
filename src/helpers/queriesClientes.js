import authFetch from "./authFetch";
import { API } from "./api";

const clientesBackend = API.clientes;

export const listarClientes = async (query = "") => {
  return authFetch(`${clientesBackend}${query}`);
};

export const crearCliente = async (cliente) => {
  try {
    return await authFetch(clientesBackend, {
      method: "POST",
      body: JSON.stringify(cliente),
    });
  } catch (error) {
    console.error("Error al crear cliente:", error);
    return null;
  }
};

export const editarCliente = async (id, cliente) => {
  try {
    return await authFetch(`${clientesBackend}/${id}`, {
      method: "PUT",
      body: JSON.stringify(cliente),
    });
  } catch (error) {
    console.error("Error al editar cliente:", error);
    return null;
  }
};

export const borrarCliente = async (id) => {
  try {
    return await authFetch(`${clientesBackend}/${id}`, { method: "DELETE" });
  } catch (error) {
    console.error("Error al borrar cliente:", error);
    return null;
  }
};
