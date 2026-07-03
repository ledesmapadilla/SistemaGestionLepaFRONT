import { createContext, useContext, useState } from "react";

const PendientesModalContext = createContext(null);

export function PendientesModalProvider({ children }) {
  const [abierto, setAbierto] = useState(false);
  const abrir = () => setAbierto(true);
  const cerrar = () => setAbierto(false);
  return (
    <PendientesModalContext.Provider value={{ abierto, abrir, cerrar }}>
      {children}
    </PendientesModalContext.Provider>
  );
}

// Devuelve null si se usa fuera del provider (para que sea seguro).
export const usePendientesModal = () => useContext(PendientesModalContext);
