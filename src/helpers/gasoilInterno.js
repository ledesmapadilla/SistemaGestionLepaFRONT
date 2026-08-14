// "Lepa" no es un cliente de la base: es la propia empresa. Se ofrece siempre
// en los selects de carga de gasoil (aunque no tenga ninguna obra en curso, ni
// obras) para poder registrar el consumo interno, y su única obra posible es
// "Uso interno", que tampoco existe como obra.
export const CLIENTE_INTERNO = "Lepa";
export const OBRA_INTERNA = "Uso interno";

// Agrega Lepa al final de la lista de clientes, sin duplicarlo si ya estuviera.
export const conClienteInterno = (clientes) =>
  clientes.includes(CLIENTE_INTERNO) ? clientes : [...clientes, CLIENTE_INTERNO];

export const esClienteInterno = (cliente) => cliente === CLIENTE_INTERNO;

// Las obras del cliente: para Lepa, siempre "Uso interno".
export const obrasDeCliente = (cliente, obrasDelCliente) =>
  esClienteInterno(cliente) ? [OBRA_INTERNA] : obrasDelCliente;
