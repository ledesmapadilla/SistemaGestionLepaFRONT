import authFetch from "./authFetch";
import { API } from "./api";

const URL = API.tablero;

export const obtenerTablero = async () => {
  try {
    return await authFetch(URL);
  } catch (error) {
    console.error("Error al obtener tablero:", error);
    return null;
  }
};
