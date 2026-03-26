const variablesBackend = import.meta.env.VITE_API_VARIABLES;

export const listarVariables = async () => {
  return fetch(variablesBackend);
};

export const crearVariable = async (variable) => {
  try {
    const respuesta = await fetch(variablesBackend, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(variable),
    });
    return respuesta;
  } catch (error) {
    console.error("Error al crear variable:", error);
    return null;
  }
};

export const editarVariable = async (id, variable) => {
  try {
    const respuesta = await fetch(`${variablesBackend}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(variable),
    });
    return respuesta;
  } catch (error) {
    console.error("Error al editar variable:", error);
    return null;
  }
};

export const borrarVariable = async (id) => {
  try {
    const respuesta = await fetch(`${variablesBackend}/${id}`, {
      method: "DELETE",
    });
    return respuesta;
  } catch (error) {
    console.error("Error al borrar variable:", error);
    return null;
  }
};
