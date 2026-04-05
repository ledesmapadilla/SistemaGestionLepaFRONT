import authFetch from "./authFetch";

const URI_GASTOS = import.meta.env.VITE_API_GASTOS;

export const listarGastosPorObra = async (idObra) => {
  try {
    return await authFetch(`${URI_GASTOS}?obra=${idObra}`);
  } catch (error) {
    console.log(error);
  }
};

export const crearGastoAPI = async (gasto) => {
  try {
    return await authFetch(URI_GASTOS, {
      method: "POST",
      body: JSON.stringify(gasto),
    });
  } catch (error) {
    console.log(error);
  }
};

export const borrarGastoAPI = async (id) => {
  try {
    return await authFetch(`${URI_GASTOS}/${id}`, { method: "DELETE" });
  } catch (error) {
    console.log(error);
  }
};

export const editarGastoAPI = async (id, datosGasto) => {
  try {
    return await authFetch(`${URI_GASTOS}/${id}`, {
      method: "PUT",
      body: JSON.stringify(datosGasto),
    });
  } catch (error) {
    console.error("Error al editar el gasto", error);
    return false;
  }
};
