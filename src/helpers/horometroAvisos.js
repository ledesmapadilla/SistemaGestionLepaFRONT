import Swal from "sweetalert2";

// Una máquina no puede sumar más de 24 hs de uso entre una lectura y la
// siguiente. Cuando pasa, casi siempre es un error de tipeo, así que se avisa y
// se pide confirmar en vez de bloquear (puede ser real si hace mucho que no se
// carga el horómetro).
export const LIMITE_SALTO_HS = 24;

const fmt = (n) => Number(n).toLocaleString("es-AR");

// Recibe [{ maquina, anterior, nuevo }] y devuelve true si se puede continuar.
export const confirmarSaltoHorometro = async (saltos) => {
  if (!saltos || saltos.length === 0) return true;

  const detalle = saltos
    .map(
      (s) =>
        `• ${s.maquina}: ${fmt(s.anterior)} → ${fmt(s.nuevo)} (+${fmt(
          Number(s.nuevo) - Number(s.anterior)
        )} hs)`
    )
    .join("\n");

  const { isConfirmed } = await Swal.fire({
    icon: "warning",
    title: "Salto de horómetro",
    text: `La carga supera las ${LIMITE_SALTO_HS} hs desde la última lectura:\n${detalle}\n\n¿Confirmás la carga?`,
    showCancelButton: true,
    confirmButtonText: "Sí, cargar",
    cancelButtonText: "Cancelar",
  });
  return isConfirmed;
};

// Arma el salto de una sola carga, o null si no supera el límite.
export const saltoDe = (maquina, anterior, nuevo) => {
  if (anterior == null || nuevo == null || nuevo === "") return null;
  const prev = Number(anterior);
  const val = Number(nuevo);
  if (Number.isNaN(prev) || Number.isNaN(val)) return null;
  return val - prev > LIMITE_SALTO_HS ? { maquina, anterior: prev, nuevo: val } : null;
};
