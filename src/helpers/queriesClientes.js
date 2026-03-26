const clientesBackend = import.meta.env.VITE_API_CLIENTES;

export const listarClientes = async (query = "") => {
  return fetch(`${clientesBackend}${query}`);
};

export const crearCliente = async (cliente) => {
  try {
    const respuesta = await fetch(clientesBackend, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cliente),
    });
    return respuesta;
  } catch (error) {
    console.error("Error al crear cliente:", error);
    return null;
  }
};

export const editarCliente = async (id, cliente) => {
  try {
    const respuesta = await fetch(`${clientesBackend}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cliente),
    });
    return respuesta;
  } catch (error) {
    console.error("Error al editar cliente:", error);
    return null;
  }
};

export const borrarCliente = async (id) => {
  try {
    const respuesta = await fetch(`${clientesBackend}/${id}`, {
      method: "DELETE",
    });
    return respuesta;
  } catch (error) {
    console.error("Error al borrar cliente:", error);
    return null;
  }
};
