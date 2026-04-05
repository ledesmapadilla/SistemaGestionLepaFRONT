const getToken = () => {
  const usuario = localStorage.getItem("sgl_usuario");
  if (!usuario) return null;
  return JSON.parse(usuario).token || null;
};

const authFetch = async (url, options = {}) => {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const resp = await fetch(url, { ...options, headers });

  if (resp.status === 401) {
    localStorage.removeItem("sgl_usuario");
    window.location.href = "/login";
    return null;
  }

  return resp;
};

export default authFetch;
