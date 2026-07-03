import { createContext, useContext, useState } from "react";

const PendientesModalContext = createContext(null);

export function PendientesModalProvider({ children }) {
  const [abierto, setAbierto] = useState(false);          // modal Tareas Pendientes
  const [resumenAbierto, setResumenAbierto] = useState(false); // modal Resumen (independiente)
  const [respInicial, setRespInicial] = useState(null);   // responsable a abrir directo en la planilla

  const abrir = () => { setRespInicial(null); setAbierto(true); };
  const abrirResponsable = (nombre) => { setRespInicial(nombre); setAbierto(true); };
  const cerrar = () => setAbierto(false);
  const consumirResp = () => setRespInicial(null);
  const abrirResumen = () => setResumenAbierto(true);
  const cerrarResumen = () => setResumenAbierto(false);

  return (
    <PendientesModalContext.Provider
      value={{ abierto, abrir, abrirResponsable, cerrar, respInicial, consumirResp, resumenAbierto, abrirResumen, cerrarResumen }}
    >
      {children}
    </PendientesModalContext.Provider>
  );
}

// Devuelve null si se usa fuera del provider (para que sea seguro).
export const usePendientesModal = () => useContext(PendientesModalContext);
