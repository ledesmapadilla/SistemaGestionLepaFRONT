
import '../../styles/footer.css';
const Footer = () => {
    // Obtenemos el año actual
    const anioActual = new Date().getFullYear();

    return (
        <footer className="fondoFooter text-white text-center p-3 mt-4">
            <div className="container ">
                Copyright @ {anioActual} LEPA Construcciones Srl - L.Padilla
            </div>
        </footer>
    );
};
export default Footer;