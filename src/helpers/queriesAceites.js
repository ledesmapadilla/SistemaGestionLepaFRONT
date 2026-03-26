const URL_ACEITES = import.meta.env.VITE_API_ACEITES; 

export const listarAceites = async () => {
    try {
        const resp = await fetch(URL_ACEITES);
        return resp;
    } catch (error) { console.log(error); }
};

export const crearAceite = async (datos) => {
    try {
        const resp = await fetch(URL_ACEITES, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });
        return resp;
    } catch (error) { console.log(error); }
};

// --- OPERACIONES DE STOCK ---

export const recargarStockAPI = async (id, datos) => {
    try {
        const resp = await fetch(`${URL_ACEITES}/recarga/${id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });
        return resp;
    } catch (error) { console.log(error); }
};

export const registrarConsumoAPI = async (id, datos) => {
    try {
        const resp = await fetch(`${URL_ACEITES}/consumo/${id}`, {
            method: "POST", // POST es correcto para registrar movimientos
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos) // datos debe incluir { litros, maquina, obra... }
        });
        return resp;
    } catch (error) { console.log(error); }
};



export const registrarCompraAPI = async (id, datos) => {
    try {
        const resp = await fetch(`${URL_ACEITES}/compra/${id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });
        return resp;
    } catch (error) { console.log(error); }
};

export const editarAceite = async (id, datos) => {
    try {
        const resp = await fetch(`${URL_ACEITES}/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });
        return resp;
    } catch (error) { console.log(error); }
};

export const borrarAceite = async (id) => {
    try {
        const resp = await fetch(`${URL_ACEITES}/${id}`, {
            method: "DELETE"
        });
        return resp;
    } catch (error) { console.log(error); }
};

export const editarCompraAPI = async (aceiteId, movId, datos) => {
    try {
        const resp = await fetch(`${URL_ACEITES}/${aceiteId}/movimiento/${movId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });
        return resp;
    } catch (error) { console.log(error); }
};

export const borrarCompraAPI = async (aceiteId, movId) => {
    try {
        const resp = await fetch(`${URL_ACEITES}/${aceiteId}/movimiento/${movId}`, {
            method: "DELETE"
        });
        return resp;
    } catch (error) { console.log(error); }
};