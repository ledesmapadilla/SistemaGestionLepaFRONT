const BASE = import.meta.env.VITE_API_URL;

export const API = {
  clientes: `${BASE}/api/clientes`,
  proveedores: `${BASE}/api/proveedores`,
  obras: `${BASE}/api/obras`,
  remitos: `${BASE}/api/remitos`,
  personal: `${BASE}/api/personal`,
  maquinas: `${BASE}/api/maquina`,
  gastos: `${BASE}/api/gastos`,
  aceites: `${BASE}/api/aceites`,
  usuarios: `${BASE}/api/usuarios`,
  variables: `${BASE}/api/variables`,
  precios: `${BASE}/api/precios`,
  consumoGasoil: `${BASE}/api/consumo-gasoil`,
  facturas: `${BASE}/api/facturas`,
};
