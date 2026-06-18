import { useRef, useState } from "react";
import { Button, Spinner } from "react-bootstrap";

/**
 * Botón que se bloquea solo mientras su acción está en curso, para evitar
 * el doble click que registra la acción dos veces.
 *
 * Uso para acciones con onClick async (borrar, agregar, guardar en modal):
 *   <AsyncButton variant="outline-danger" onClick={async () => { await borrar(id); }}>
 *     Borrar
 *   </AsyncButton>
 *
 * Uso para formularios react-hook-form (botón type="submit"):
 *   const { formState: { isSubmitting } } = useForm();
 *   <AsyncButton type="submit" loading={isSubmitting}>Guardar</AsyncButton>
 *   (asegurate de que el onSubmit sea async / devuelva la promesa)
 */
const AsyncButton = ({
  onClick,
  loading: loadingProp,
  disabled,
  spinner = true,
  children,
  ...props
}) => {
  const [loadingInterno, setLoadingInterno] = useState(false);
  const corriendoRef = useRef(false);
  const loading = loadingProp != null ? loadingProp : loadingInterno;

  const handleClick = async (e) => {
    // Ignora clicks mientras la acción anterior sigue en curso
    if (corriendoRef.current || loadingProp) return;
    corriendoRef.current = true;
    setLoadingInterno(true);
    try {
      await onClick(e);
    } finally {
      corriendoRef.current = false;
      setLoadingInterno(false);
    }
  };

  return (
    <Button
      {...props}
      disabled={disabled || loading}
      onClick={onClick ? handleClick : undefined}
    >
      {loading && spinner && (
        <Spinner as="span" animation="border" size="sm" className="me-2" />
      )}
      {children}
    </Button>
  );
};

export default AsyncButton;
