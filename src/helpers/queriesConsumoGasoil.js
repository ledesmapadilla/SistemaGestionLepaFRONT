import authFetch from "./authFetch";

const consumoGasoilBackend = import.meta.env.VITE_API_CONSUMO_GASOIL;

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
