const usuariosBackend = import.meta.env.VITE_API_USUARIOS;

export const loginUsuario = async (datos) => {
  try {
    const respuesta = await fetch(`${usuariosBackend}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
    return respuesta;
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    return null;
  }
};

export const verificarAcceso = async (contrasena) => {
  try {
    const respuesta = await fetch(`${usuariosBackend}/verificar-acceso`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contrasena }),
    });
    return respuesta;
  } catch (error) {
    console.error("Error al verificar acceso:", error);
    return null;
  }
};

export const listarUsuarios = async (query = "") => {
  return fetch(`${usuariosBackend}${query}`);
};

export const crearUsuario = async (usuario) => {
  try {
    const respuesta = await fetch(usuariosBackend, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(usuario),
    });
    return respuesta;
  } catch (error) {
    console.error("Error al crear usuario:", error);
    return null;
  }
};

export const editarUsuario = async (id, usuario) => {
  try {
    const respuesta = await fetch(`${usuariosBackend}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(usuario),
    });
    return respuesta;
  } catch (error) {
    console.error("Error al editar usuario:", error);
    return null;
  }
};

export const borrarUsuario = async (id) => {
  try {
    const respuesta = await fetch(`${usuariosBackend}/${id}`, {
      method: "DELETE",
    });
    return respuesta;
  } catch (error) {
    console.error("Error al borrar usuario:", error);
    return null;
  }
};
