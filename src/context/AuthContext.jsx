import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(() => {
    const guardado = localStorage.getItem("sgl_usuario");
    if (!guardado) return null;
    const parsed = JSON.parse(guardado);
    if (!parsed?.token) {
      localStorage.removeItem("sgl_usuario");
      return null;
    }
    return parsed;
  });

  const login = (datosUsuario) => {
    setUsuario(datosUsuario);
    localStorage.setItem("sgl_usuario", JSON.stringify(datosUsuario));
  };

  const logout = () => {
    setUsuario(null);
    localStorage.removeItem("sgl_usuario");
  };

  return (
    <AuthContext.Provider value={{ usuario, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
