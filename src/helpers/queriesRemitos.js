const remitosBackend = import.meta.env.VITE_API_REMITOS;

// LISTAR TODOS (opcional, para debug)
export const listarRemitos = async () => {
  const res = await fetch(`${remitosBackend}?t=${Date.now()}`);
  if (!res.ok) throw new Error("Error al listar remitos");
  return res.json();
};

// LISTAR POR OBRA
export const listarRemitosPorObra = async (idObra) => {
  try {
    const res = await fetch(`${remitosBackend}?obra=${idObra}&t=${Date.now()}`);
    if (!res.ok) throw new Error("Error al listar remitos por obra");
    return res.json();
  } catch (error) {
    console.error(error);
    return [];
  }
};

// CREAR
export const crearRemito = async (remito) => {
  const res = await fetch(remitosBackend, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(remito),
  });

  const data = await res.json();

  if (!res.ok) {
    //  propagamos el error real del backend
    throw new Error(data.msg || "Error al crear remito");
  }

  return data;
};


// EDITAR REMITO COMPLETO
export const editarRemito = async (id, remito) => {
  const res = await fetch(`${remitosBackend}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(remito),
  });
  return res.json();
};

// ELIMINAR REMITO COMPLETO
export const eliminarRemito = async (id) => {
  return fetch(`${remitosBackend}/${id}`, {
    method: "DELETE",
  });
};

// ELIMINAR UN ITEM DEL REMITO
export const eliminarItemRemito = async (remitoId, itemId) => {
  const response = await fetch(
    `${remitosBackend}/${remitoId}/items/${itemId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error("Error al eliminar item");
  }

  return response.json();
};

// EDITAR UN ITEM DEL REMITO
export const editarItemRemito = async (remitoId, itemId, datosItem) => {
  try {
    const urlCompleta = `${remitosBackend}/${remitoId}/items/${itemId}`;
    console.log(" Editando item - URL:", urlCompleta);
    console.log(" Datos enviados:", datosItem);

    const respuesta = await fetch(urlCompleta, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datosItem),
    });

    if (!respuesta.ok) {
      const error = await respuesta.json();
      console.error(" Error del servidor:", error);
      throw new Error(error.msg || "Error al editar ítem");
    }

    const resultado = await respuesta.json();
    console.log(" Item editado correctamente:", resultado);
    return resultado;
  } catch (error) {
    console.error(" Error en editarItemRemito:", error);
    throw error;
  }
};