import authFetch from "./authFetch";
import { API } from "./api";

const URL = API.cargasGasoil;

// filtros opcionales: { desde, hasta, fecha, cliente, obra, maquina, quienCarga }
export const listarCargasGasoil = async (filtros = {}) => {
  try {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([clave, valor]) => {
      if (valor) params.append(clave, valor);
    });
    const query = params.toString() ? `?${params.toString()}` : "";
    return await authFetch(`${URL}${query}`);
  } catch (error) {
    console.error("Error al listar cargas de gasoil:", error);
    return null;
  }
};

export const crearCargaGasoil = async (carga) => {
  try {
    return await authFetch(URL, {
      method: "POST",
      body: JSON.stringify(carga),
    });
  } catch (error) {
    console.error("Error al crear carga de gasoil:", error);
    return null;
  }
};

export const editarCargaGasoil = async (id, carga) => {
  try {
    return await authFetch(`${URL}/${id}`, {
      method: "PUT",
      body: JSON.stringify(carga),
    });
  } catch (error) {
    console.error("Error al editar carga de gasoil:", error);
    return null;
  }
};

export const borrarCargaGasoil = async (id) => {
  try {
    return await authFetch(`${URL}/${id}`, { method: "DELETE" });
  } catch (error) {
    console.error("Error al borrar carga de gasoil:", error);
    return null;
  }
};
