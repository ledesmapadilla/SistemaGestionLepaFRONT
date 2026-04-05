import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import RutaProtegida from "./components/shared/RutaProtegida";
import Login from "./components/pages/Login";
import Inicio from "./components/pages/Inicio";
import Footer from "./components/shared/Footer";
import Menu from "./components/shared/Menu";
import Error404 from "./components/pages/Error404";
import Clientes from "./components/pages/secciones/ALTAS/Clientes/Clientes.jsx";
import Proveedores from "./components/pages/secciones/ALTAS/Proveedores/Proveedores.jsx";
import Obras from "./components/pages/secciones/OPERACIONES/Obras/Obras.jsx";
import VerRemitos from "./components/pages/secciones/OPERACIONES/Remitos/VerRemitos.jsx";
import PersonalCrud from "./components/pages/secciones/ALTAS/Personal/PersonalCrud.jsx";
import RemitosXClientes from "./components/pages/secciones/OPERACIONES/Remitos/RemitosXClientes.jsx";
import RemitosXClientesObras from "./components/pages/secciones/OPERACIONES/Remitos/RemitoXClientesObras.jsx";
import RemitosXClientesFinal from "./components/pages/secciones/OPERACIONES/Remitos/RemitosXClientesFinal";
import MaquinaTabla from "./components/pages/secciones/ALTAS/Maquinas/MaquinaTabla.jsx";
import GastoTabla from "./components/pages/secciones/OPERACIONES/Gastos/GastoTabla.jsx";
import TodosLosRemitos from "./components/pages/secciones/OPERACIONES/Remitos/TodosLosRemitos.jsx";
import CostosObra from "./components/pages/secciones/OPERACIONES/Informes/CostosObra.jsx";
import AceiteTabla from "./components/pages/secciones/MANTENIMIENTO/aceites/AceiteTabla.jsx";
import AceiteTablaCompra from "./components/pages/secciones/MANTENIMIENTO/aceites/AceiteTablaCompra.jsx";
import AceiteCrud from "./components/pages/secciones/ALTAS/Aceites/AceiteCrud.jsx";
import UsuariosCrud from "./components/pages/secciones/ALTAS/Usuarios/UsuariosCrud.jsx";
import Variables from "./components/pages/secciones/CONTABLE/Variables/Variables.jsx";
import Precios from "./components/pages/secciones/CONTABLE/Precios/Precios.jsx";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Login sin Menu ni Footer */}
          <Route path="/login" element={<Login />} />

          {/* Rutas protegidas con Menu y Footer */}
          <Route element={<RutaProtegida />}>
            <Route
              path="*"
              element={
                <>
                  <Menu />
                  <main className="container pt-5 mt-5">
                    <Routes>
                      <Route path="/" element={<Inicio />} />
                      <Route path="/clientes" element={<Clientes />} />
                      <Route path="/proveedores" element={<Proveedores />} />
                      <Route path="/obras" element={<Obras />} />
                      <Route path="/remitos" element={<VerRemitos />} />
                      <Route path="/remitos-sinfacturar" element={<RemitosXClientes />} />
                      <Route path="/remitos-todos" element={<TodosLosRemitos />} />
                      <Route
                        path="/remitos-cliente-obras"
                        element={<RemitosXClientesObras />}
                      />
                      <Route
                        path="/remito-cliente-final"
                        element={<RemitosXClientesFinal />}
                      />
                      <Route path="/personal" element={<PersonalCrud />} />
                      <Route path="/maquina" element={<MaquinaTabla />} />
                      <Route path="/gastos" element={<GastoTabla />} />
                      <Route path="/costos-obra" element={<CostosObra />} />
                      <Route path="/aceites" element={<AceiteCrud />} />
                      <Route path="/consumo-aceites" element={<AceiteTabla />} />
                      <Route path="/compras-aceites" element={<AceiteTablaCompra />} />
                      <Route path="/usuarios" element={<UsuariosCrud />} />
                      <Route path="/variables" element={<Variables />} />
                      <Route path="/precios" element={<Precios />} />
                      <Route path="*" element={<Error404 />} />
                    </Routes>
                  </main>
                  <Footer />
                </>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
