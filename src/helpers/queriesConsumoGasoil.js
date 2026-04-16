import authFetch from "./authFetch";
import { API } from "./api";

const consumoGasoilBackend = API.consumoGasoil;

export const obtenerConsumoGasoil = async () => {
  return authFetch(consumoGasoilBackend);
};

export const guardarConsumoGasoil = async (consumos, porcentajeIndirectos) => {
  try {
    return await authFetch(consumoGasoilBackend, {
      method: "PUT",
      body: JSON.stringify({ consumos, porcentajeIndirectos }),
    });
  } catch (error) {
    console.error("Error al guardar consumos gasoil:", error);
    return null;
  }
};
