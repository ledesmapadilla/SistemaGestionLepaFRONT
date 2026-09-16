import authFetch from "./authFetch";
import { API } from "./api";

const base = API.filtrosMaquina;

export const listarFiltrosMaquina = async () => {
  const res = await authFetch(base);
  if (!res?.ok) throw new Error("Error al listar filtros");
  return res.json();
};

// Alta y edición usan el mismo POST: el backend hace upsert por máquina y solo
// pisa el tipo de filtro enviado.
export const guardarFiltroMaquina = async (data) => {
  return authFetch(base, { method: "POST", body: JSON.stringify(data) });
};

export const borrarTipoFiltroMaquina = async (id, tipo) => {
  return authFetch(`${base}/${id}/${tipo}`, { method: "DELETE" });
};

export const borrarFiltroMaquina = async (id) => {
  return authFetch(`${base}/${id}`, { method: "DELETE" });
};
