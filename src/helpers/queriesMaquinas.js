const URL_MAQUINAS = import.meta.env.VITE_API_MAQUINAS;


export const listarMaquinas = async () => {
  try {
    const respuesta = await fetch(URL_MAQUINAS);
    return respuesta;
  } catch (error) {
    console.error("Error al listar máquinas:", error);
    return null;
  }
};

// CREAR
export const crearMaquina = async (maquina) => {
  try {
    const respuesta = await fetch(URL_MAQUINAS, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(maquina),
    });
    return respuesta;
  } catch (error) {
    console.error("Error al crear máquina:", error);
    return null;
  }
};

// EDITAR
export const editarMaquina = async (id, maquina) => {
  try {
    const respuesta = await fetch(`${URL_MAQUINAS}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(maquina),
    });
    return respuesta;
  } catch (error) {
    console.error("Error al editar máquina:", error);
    return null;
  }
};

// BORRAR
export const borrarMaquina = async (id) => {
  try {
    const respuesta = await fetch(`${URL_MAQUINAS}/${id}`, {
      method: "DELETE",
    });
    return respuesta;
  } catch (error) {
    console.error("Error al borrar máquina:", error);
    return null;
  }
};