import { useEffect } from "react";

/**
 * Publica el alto real de la ventana en la variable CSS --alto-vista.
 *
 * En el celular no alcanza con 100vh ni con 100dvh: vh incluye la franja que
 * ocupa la barra de direcciones (el contenido queda más alto que lo visible y
 * aparece scroll) y dvh no existe en los navegadores viejos. window.innerHeight
 * es el alto visible de verdad, en todos. Se recalcula al rotar el teléfono y
 * cuando se abre el teclado, que también achica la ventana.
 */
const useAltoVista = () => {
  useEffect(() => {
    const aplicar = () => {
      document.documentElement.style.setProperty("--alto-vista", `${window.innerHeight}px`);
    };

    aplicar();
    window.addEventListener("resize", aplicar);
    window.addEventListener("orientationchange", aplicar);

    return () => {
      window.removeEventListener("resize", aplicar);
      window.removeEventListener("orientationchange", aplicar);
    };
  }, []);
};

export default useAltoVista;
