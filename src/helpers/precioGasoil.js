import { listarVariables } from "./queriesVariables.js";

// El precio del gasoil vive en la variable "Gasoil" de Operaciones → Variables:
// es el mismo que se edita arriba de la tabla de /gasoil. Su historial
// { valor, fecha } es lo que permite valorizar cada carga al precio que regía
// el día que se hizo, y no al último cargado.
export const NOMBRE_VARIABLE_GASOIL = "Gasoil";

export const obtenerHistorialGasoil = async () => {
  try {
    const respuesta = await listarVariables();
    if (!respuesta?.ok) return [];
    const variables = await respuesta.json();
    return variables.find((v) => v.variable === NOMBRE_VARIABLE_GASOIL)?.historial || [];
  } catch (error) {
    console.error("Error al obtener el precio del gasoil:", error);
    return [];
  }
};

// Precio por litro vigente a `fecha` ("YYYY-MM-DD"): el de fecha más alta que no
// la supere. Si la carga es anterior a todos los precios cargados se usa el más
// viejo, para no valorizarla en cero.
export const precioGasoilVigente = (historial, fecha) => {
  const conFecha = (Array.isArray(historial) ? historial : []).filter((h) => h?.fecha);
  if (conFecha.length === 0) return 0;

  const ordenado = [...conFecha].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const vigente = [...ordenado].reverse().find((h) => h.fecha <= (fecha || ""));
  return Number((vigente || ordenado[0]).valor) || 0;
};

// Cargas del módulo Gasoil que corresponden a una obra, ya valorizadas.
// `cliente` es opcional: filtra además por razón social cuando se la conoce,
// por si dos clientes tuvieran una obra con el mismo nombre.
export const cargasDeObraValorizadas = (cargas, historial, obraNombre, cliente) =>
  (cargas || [])
    .filter((c) => c.obra === obraNombre)
    .filter((c) => !cliente || cliente === "-" || c.cliente === cliente)
    .map((c) => {
      const litros = Number(c.litros) || 0;
      const precio = precioGasoilVigente(historial, c.fecha);
      return {
        fecha: c.fecha,
        maquina: c.maquina || "-",
        litros,
        precio,
        total: litros * precio,
      };
    });
