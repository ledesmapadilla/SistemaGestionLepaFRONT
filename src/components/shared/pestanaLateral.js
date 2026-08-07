// Hover compartido de las pestañas laterales fijas (anteojos, foco, comenzar).
// Al pasar el mouse se despegan un poco del borde, oscurecen el fondo y
// levantan la sombra. Van con estilos inline, así que el hover no se puede
// hacer por CSS: se resuelve con handlers.

export const TRANSICION_PESTANA =
  "background-color .15s ease, transform .15s ease, box-shadow .15s ease";

// Las pestañas se centran con `translateY(-50%)`, así que el desplazamiento
// lateral tiene que conservarlo o se descolocan verticalmente.
export const hoverPestana = ({ lado, fondo, fondoHover, sombra, sombraHover }) => {
  const dx = lado === "izquierda" ? 3 : -3;
  return {
    onMouseEnter: (e) => {
      e.currentTarget.style.backgroundColor = fondoHover;
      e.currentTarget.style.transform = `translateY(-50%) translateX(${dx}px)`;
      e.currentTarget.style.boxShadow = sombraHover;
    },
    onMouseLeave: (e) => {
      e.currentTarget.style.backgroundColor = fondo;
      e.currentTarget.style.transform = "translateY(-50%)";
      e.currentTarget.style.boxShadow = sombra;
    },
  };
};
