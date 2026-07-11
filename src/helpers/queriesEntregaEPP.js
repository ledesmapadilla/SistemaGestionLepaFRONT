import authFetch from "./authFetch";
import { API } from "./api";

const eppBackend = API.entregaEPP;

export const registrarEntregaEPP = async (datos) => {
  try {
    return await authFetch(eppBackend, {
      method: "POST",
      body: JSON.stringify(datos),
    });
  } catch (error) {
    console.error("Error al registrar entrega de EPP:", error);
    return null;
  }
};

export const obtenerEntregasEPP = async (personal = "", desde = "", hasta = "") => {
  try {
    const params = new URLSearchParams();
    if (personal) params.append("personal", personal);
    if (desde) params.append("desde", desde);
    if (hasta) params.append("hasta", hasta);
    const query = params.toString() ? `?${params.toString()}` : "";
    return await authFetch(`${eppBackend}${query}`);
  } catch (error) {
    console.error("Error al obtener entregas de EPP:", error);
    return null;
  }
};

export const borrarEntregaEPP = async (id) => {
  try {
    return await authFetch(`${eppBackend}/${id}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error("Error al borrar entrega de EPP:", error);
    return null;
  }
};
