import authFetch from "./authFetch";

const usuariosBackend = import.meta.env.VITE_API_USUARIOS;

export const loginUsuario = async (datos) => {
  try {
    return await fetch(`${usuariosBackend}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    return null;
  }
};

export const verificarAcceso = async (contrasena) => {
  try {
    return await authFetch(`${usuariosBackend}/verificar-acceso`, {
      method: "POST",
      body: JSON.stringify({ contrasena }),
    });
  } catch (error) {
    console.error("Error al verificar acceso:", error);
    return null;
  }
};

export const listarUsuarios = async (query = "") => {
  return authFetch(`${usuariosBackend}${query}`);
};

export const crearUsuario = async (usuario) => {
  try {
    return await authFetch(usuariosBackend, {
      method: "POST",
      body: JSON.stringify(usuario),
    });
  } catch (error) {
    console.error("Error al crear usuario:", error);
    return null;
  }
};

export const editarUsuario = async (id, usuario) => {
  try {
    return await authFetch(`${usuariosBackend}/${id}`, {
      method: "PUT",
      body: JSON.stringify(usuario),
    });
  } catch (error) {
    console.error("Error al editar usuario:", error);
    return null;
  }
};

export const borrarUsuario = async (id) => {
  try {
    return await authFetch(`${usuariosBackend}/${id}`, { method: "DELETE" });
  } catch (error) {
    console.error("Error al borrar usuario:", error);
    return null;
  }
};
