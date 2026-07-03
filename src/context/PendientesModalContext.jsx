import { createContext, useContext, useState } from "react";

const PendientesModalContext = createContext(null);

export function PendientesModalProvider({ children }) {
  const [abierto, setAbierto] = useState(false);
  // Cuando se pide abrir directo en el resumen (botón de anteojos).
  const [resumenPendiente, setResumenPendiente] = useState(false);

  const abrir = () => { setResumenPendiente(false); setAbierto(true); };
  const abrirResumen = () => { setResumenPendiente(true); setAbierto(true); };
  const cerrar = () => setAbierto(false);
  const consumirResumen = () => setResumenPendiente(false);

  return (
    <PendientesModalContext.Provider
      value={{ abierto, abrir, abrirResumen, cerrar, resumenPendiente, consumirResumen }}
    >
      {children}
    </PendientesModalContext.Provider>
  );
}

// Devuelve null si se usa fuera del provider (para que sea seguro).
export const usePendientesModal = () => useContext(PendientesModalContext);
