import Swal from "sweetalert2";

// Una máquina no puede sumar más de 24 hs de uso por día calendario. El límite
// se mide contra la ÚLTIMA lectura y su fecha: si hace 10 días que no se carga
// el horómetro, un salto de 200 hs es normal y no debe avisar. Cuando el salto
// supera lo que dan los días transcurridos casi siempre es un error de tipeo,
// así que se avisa y se pide confirmar en vez de bloquear.
export const LIMITE_SALTO_HS_POR_DIA = 24;

const MS_DIA = 86400000;

const fmt = (n) => Number(n).toLocaleString("es-AR");

// Días calendario entre dos fechas "YYYY-MM-DD". null si falta alguna o no parsea.
const diasEntre = (desde, hasta) => {
  if (!desde || !hasta) return null;
  const a = Date.parse(`${String(desde).slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${String(hasta).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / MS_DIA);
};

// Recibe [{ maquina, anterior, nuevo, dias, limite }] y devuelve true si se
// puede continuar.
export const confirmarSaltoHorometro = async (saltos) => {
  if (!saltos || saltos.length === 0) return true;

  const detalle = saltos
    .map(
      (s) =>
        `• ${s.maquina}: ${fmt(s.anterior)} → ${fmt(s.nuevo)} (+${fmt(
          Number(s.nuevo) - Number(s.anterior)
        )} hs en ${s.dias} ${s.dias === 1 ? "día" : "días"}, máx. ${fmt(s.limite)} hs)`
    )
    .join("\n");

  const { isConfirmed } = await Swal.fire({
    icon: "warning",
    title: "Salto de horómetro",
    text: `La carga supera las ${LIMITE_SALTO_HS_POR_DIA} hs por día desde la última lectura:\n${detalle}\n\n¿Confirmás la carga?`,
    showCancelButton: true,
    confirmButtonText: "Sí, cargar",
    cancelButtonText: "Cancelar",
  });
  return isConfirmed;
};

// Arma el salto de una sola carga, o null si no supera el límite.
// `referencia` es la última lectura conocida: { valor, fecha } en "YYYY-MM-DD".
// `fechaCarga` es la fecha del valor que se está cargando.
export const saltoDe = (maquina, referencia, nuevo, fechaCarga) => {
  if (referencia == null || nuevo == null || nuevo === "") return null;
  const prev = Number(referencia.valor);
  const val = Number(nuevo);
  if (Number.isNaN(prev) || Number.isNaN(val)) return null;

  // Sin fecha de la lectura anterior no se sabe cuántos días abarca la
  // diferencia, y una referencia posterior a la carga no es "la anterior":
  // en ambos casos avisar sería un falso positivo, así que no se avisa.
  const dias = diasEntre(referencia.fecha, fechaCarga);
  if (dias == null || dias < 0) return null;

  // Cargar dos veces el mismo día sigue teniendo el tope de un día.
  const diasEfectivos = Math.max(1, dias);
  const limite = LIMITE_SALTO_HS_POR_DIA * diasEfectivos;

  return val - prev > limite
    ? { maquina, anterior: prev, nuevo: val, dias: diasEfectivos, limite }
    : null;
};
