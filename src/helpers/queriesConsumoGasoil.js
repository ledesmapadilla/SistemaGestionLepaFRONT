const consumoGasoilBackend = import.meta.env.VITE_API_CONSUMO_GASOIL;

export const obtenerConsumoGasoil = async () => {
  return fetch(consumoGasoilBackend);
};

export const guardarConsumoGasoil = async (consumos, porcentajeIndirectos) => {
  try {
    const respuesta = await fetch(consumoGasoilBackend, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consumos, porcentajeIndirectos }),
    });
    return respuesta;
  } catch (error) {
    console.error("Error al guardar consumos gasoil:", error);
    return null;
  }
};
