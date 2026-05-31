import authFetch from "./authFetch";
import { API } from "./api";

const base = API.datoImpuesto;

export const obtenerDatosImpuesto = async (impuesto, anio, mes) => {
  const res = await authFetch(`${base}?impuesto=${impuesto}&anio=${anio}&mes=${mes}`);
  if (!res?.ok) throw new Error("Error al obtener datos");
  return res.json();
};

export const obtenerDatosImpuestoAnio = async (impuesto, anio) => {
  const res = await authFetch(`${base}?impuesto=${impuesto}&anio=${anio}`);
  if (!res?.ok) throw new Error("Error al obtener datos anuales");
  return res.json();
};

export const guardarDatoImpuesto = async (data) => {
  return authFetch(base, { method: "POST", body: JSON.stringify(data) });
};

export const agregarHistorialImpuesto = async (data) => {
  return authFetch(`${base}/historial`, { method: "POST", body: JSON.stringify(data) });
};

export const eliminarDatoImpuesto = async (id) => {
  return authFetch(`${base}/${id}`, { method: "DELETE" });
};
