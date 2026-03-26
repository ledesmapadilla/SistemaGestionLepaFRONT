const URI_GASTOS = import.meta.env.VITE_API_GASTOS; 

// 1. LISTAR (Filtrando por obra)
export const listarGastosPorObra = async (idObra) => {
  try {
    // Es clave enviar el ID de la obra como query param
    const respuesta = await fetch(`${URI_GASTOS}?obra=${idObra}`);
    return respuesta;
  } catch (error) {
    console.log(error);
  }
};

// 2. CREAR
export const crearGastoAPI = async (gasto) => {
  try {
    const respuesta = await fetch(URI_GASTOS, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(gasto),
    });
    return respuesta;
  } catch (error) {
    console.log(error);
  }
};

// 3. BORRAR
export const borrarGastoAPI = async (id) => {
  try {
    const respuesta = await fetch(`${URI_GASTOS}/${id}`, {
      method: "DELETE",
    });
    return respuesta;
  } catch (error) {
    console.log(error);
  }
};

// En helpers/queriesGastos.js

export const editarGastoAPI = async (id, datosGasto) => {
  try {
    const respuesta = await fetch(`${URI_GASTOS}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(datosGasto),
    });
    return respuesta;
  } catch (error) {
    console.error("Error al editar el gasto", error);
    return false;
  }
};