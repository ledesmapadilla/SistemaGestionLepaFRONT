import { API } from "./api";

const URL = API.publicoGasoil;

// fetch pelado a propósito: authFetch manda el token y ante un 401 redirige a
// /login, que es justo lo que esta página tiene que evitar. Estos endpoints no
// piden token.
const JSON_HEADERS = { "Content-Type": "application/json" };

// Devuelve { obras, maquinas, personal } con lo justo para los selects.
export const listarOpcionesGasoil = async () => {
  try {
    return await fetch(`${URL}/opciones`, { headers: JSON_HEADERS });
  } catch (error) {
    console.error("Error al listar opciones de gasoil:", error);
    return null;
  }
};

export const crearCargaGasoilPublica = async (carga) => {
  try {
    return await fetch(`${URL}/carga`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(carga),
    });
  } catch (error) {
    console.error("Error al crear carga de gasoil:", error);
    return null;
  }
};

// Devuelve [{ fecha, maquina }] con las cargas del mes: solo eso, sin litros ni
// obra. Lo usa la vista mensual de /gasoil/carga/mes.
export const listarCargasGasoilDelMes = async (anio, mes) => {
  try {
    return await fetch(`${URL}/mes?anio=${anio}&mes=${mes}`, { headers: JSON_HEADERS });
  } catch (error) {
    console.error("Error al listar las cargas de gasoil del mes:", error);
    return null;
  }
};
