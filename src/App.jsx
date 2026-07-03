import { lazy, Suspense, Component } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Spinner } from "react-bootstrap";

class ChunkErrorBoundary extends Component {
  componentDidCatch(error) {
    if (
      error?.message?.includes("Failed to fetch dynamically imported module") ||
      error?.message?.includes("Importing a module script failed") ||
      error?.name === "ChunkLoadError"
    ) {
      window.location.reload();
    }
  }
  render() { return this.props.children; }
}

import { AuthProvider } from "./context/AuthContext";
import RutaProtegida from "./components/shared/RutaProtegida";
import Login from "./components/pages/Login";
import Footer from "./components/shared/Footer";
import Menu from "./components/shared/Menu";
import BotonAnteojos from "./components/shared/BotonAnteojos";
import BotonFoco from "./components/shared/BotonFoco";
import PendientesModalHost from "./components/shared/PendientesModalHost";
import ResumenModal from "./components/shared/ResumenModal";
import { PendientesModalProvider } from "./context/PendientesModalContext";

const Inicio = lazy(() => import("./components/pages/Inicio"));
const Error404 = lazy(() => import("./components/pages/Error404"));
const Clientes = lazy(() => import("./components/pages/secciones/ALTAS/Clientes/Clientes.jsx"));
const Proveedores = lazy(() => import("./components/pages/secciones/ALTAS/Proveedores/Proveedores.jsx"));
const Obras = lazy(() => import("./components/pages/secciones/OPERACIONES/Obras/Obras.jsx"));
const VerRemitos = lazy(() => import("./components/pages/secciones/OPERACIONES/Remitos/VerRemitos.jsx"));
const PersonalCrud = lazy(() => import("./components/pages/secciones/ALTAS/Personal/PersonalCrud.jsx"));
const RemitosXClientes = lazy(() => import("./components/pages/secciones/OPERACIONES/Remitos/RemitosXClientes.jsx"));
const RemitosXClientesObras = lazy(() => import("./components/pages/secciones/OPERACIONES/Remitos/RemitoXClientesObras.jsx"));
const RemitosXClientesFinal = lazy(() => import("./components/pages/secciones/OPERACIONES/Remitos/RemitosXClientesFinal"));
const MaquinaTabla = lazy(() => import("./components/pages/secciones/ALTAS/Maquinas/MaquinaTabla.jsx"));
const GastoTabla = lazy(() => import("./components/pages/secciones/OPERACIONES/Gastos/GastoTabla.jsx"));
const TodosLosRemitos = lazy(() => import("./components/pages/secciones/OPERACIONES/Remitos/TodosLosRemitos.jsx"));
const CostosObra = lazy(() => import("./components/pages/secciones/OPERACIONES/Informes/CostosObra.jsx"));
const AceiteTabla = lazy(() => import("./components/pages/secciones/MANTENIMIENTO/aceites/AceiteTabla.jsx"));
const AceiteTablaCompra = lazy(() => import("./components/pages/secciones/MANTENIMIENTO/aceites/AceiteTablaCompra.jsx"));
const AceiteCrud = lazy(() => import("./components/pages/secciones/ALTAS/Aceites/AceiteCrud.jsx"));
const UsuariosCrud = lazy(() => import("./components/pages/secciones/ALTAS/Usuarios/UsuariosCrud.jsx"));
const Variables = lazy(() => import("./components/pages/secciones/OPERACIONES/Variables/Variables.jsx"));
const Precios = lazy(() => import("./components/pages/secciones/OPERACIONES/PreciosMaquinas/Precios.jsx"));
const FacturacionCliente = lazy(() => import("./components/pages/secciones/CLIENTES/Facturacion/FacturacionCliente.jsx"));
const NuevaFactura = lazy(() => import("./components/pages/secciones/CLIENTES/Facturacion/NuevaFactura.jsx"));
const CobrosTabla = lazy(() => import("./components/pages/secciones/CLIENTES/Cobros/CobrosTabla.jsx"));
const NuevoCobro = lazy(() => import("./components/pages/secciones/CLIENTES/Cobros/NuevoCobro.jsx"));
const EditarCobro = lazy(() => import("./components/pages/secciones/CLIENTES/Cobros/EditarCobro.jsx"));
const CuentaCorriente = lazy(() => import("./components/pages/secciones/CLIENTES/CuentaCorriente/CuentaCorriente.jsx"));
const Cheques = lazy(() => import("./components/pages/secciones/CONTABLE/Cheques/Cheques.jsx"));
const ChequesPropio = lazy(() => import("./components/pages/secciones/CONTABLE/ChequesPropio/ChequesPropio.jsx"));
const Impuestos = lazy(() => import("./components/pages/secciones/CONTABLE/Impuestos/Impuestos.jsx"));
const ImpuestosMes = lazy(() => import("./components/pages/secciones/CONTABLE/Impuestos/ImpuestosMes.jsx"));
const Impuesto931Cargar = lazy(() => import("./components/pages/secciones/CONTABLE/Impuestos/Impuesto931Cargar.jsx"));
const ImpuestoIVACargar = lazy(() => import("./components/pages/secciones/CONTABLE/Impuestos/ImpuestoIVACargar.jsx"));
const ImpuestoAutonomosCargar = lazy(() => import("./components/pages/secciones/CONTABLE/Impuestos/ImpuestoAutonomosCargar.jsx"));
const ImpuestoSaludPublicaCargar = lazy(() => import("./components/pages/secciones/CONTABLE/Impuestos/ImpuestoSaludPublicaCargar.jsx"));
const ImpuestosResumen = lazy(() => import("./components/pages/secciones/CONTABLE/Impuestos/ImpuestosResumen.jsx"));
const ImpuestosResumenAnual = lazy(() => import("./components/pages/secciones/CONTABLE/Impuestos/ImpuestosResumenAnual.jsx"));
const Asistencia = lazy(() => import("./components/pages/secciones/PERSONAL/Asistencia/Asistencia.jsx"));
const ResumenMes = lazy(() => import("./components/pages/secciones/PERSONAL/Asistencia/ResumenMes.jsx"));
const DiaAsistencia = lazy(() => import("./components/pages/secciones/PERSONAL/Asistencia/DiaAsistencia.jsx"));
const GastosSemanales = lazy(() => import("./components/pages/secciones/PERSONAL/GastosSemanales/GastosSemanales.jsx"));
const ServiceMaquinas = lazy(() => import("./components/pages/secciones/MANTENIMIENTO/ServiceMaquinas/ServiceMaquinas.jsx"));
const TableroControl = lazy(() => import("./components/pages/secciones/MANTENIMIENTO/TableroControl/TableroControl.jsx"));
const MantenimientoDashboard = lazy(() => import("./components/pages/secciones/MANTENIMIENTO/MantenimientoDashboard.jsx"));
const Baterias = lazy(() => import("./components/pages/secciones/MANTENIMIENTO/Baterias/Baterias.jsx"));
const CubiertasDashboard = lazy(() => import("./components/pages/secciones/MANTENIMIENTO/Cubiertas/CubiertasDashboard.jsx"));
const Cubiertas = lazy(() => import("./components/pages/secciones/MANTENIMIENTO/Cubiertas/Cubiertas.jsx"));
const MantenimientoPreventivo = lazy(() => import("./components/pages/secciones/MANTENIMIENTO/Preventivo/MantenimientoPreventivo.jsx"));
const Reparaciones = lazy(() => import("./components/pages/secciones/MANTENIMIENTO/Reparaciones/Reparaciones.jsx"));
const Otra = lazy(() => import("./components/pages/secciones/MANTENIMIENTO/Otra/Otra.jsx"));
const FacturacionProveedor = lazy(() => import("./components/pages/secciones/PROVEEDORES/Facturacion/FacturacionProveedor.jsx"));
const NuevaFacturaProveedor = lazy(() => import("./components/pages/secciones/PROVEEDORES/Facturacion/NuevaFacturaProveedor.jsx"));
const PagosProveedoresTabla = lazy(() => import("./components/pages/secciones/PROVEEDORES/Pagos/PagosProveedoresTabla.jsx"));
const NuevoPagoProveedor = lazy(() => import("./components/pages/secciones/PROVEEDORES/Pagos/NuevoPagoProveedor.jsx"));
const CuentaCorrienteProveedor = lazy(() => import("./components/pages/secciones/PROVEEDORES/CuentaCorriente/CuentaCorrienteProveedor.jsx"));

const PageSpinner = () => (
  <div className="d-flex justify-content-center mt-5">
    <Spinner animation="border" />
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Login sin Menu ni Footer */}
          <Route path="/login" element={<Login />} />

          {/* Inicio sin Menu, con Footer */}
          <Route element={<RutaProtegida />}>
            <Route path="/" element={
              <ChunkErrorBoundary>
                <Suspense fallback={<PageSpinner />}>
                  <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
                    <Inicio />
                    <Footer style={{ backgroundColor: "#000", marginTop: 0 }} />
                  </div>
                </Suspense>
              </ChunkErrorBoundary>
            } />
          </Route>

          {/* Rutas protegidas con Menu y Footer */}
          <Route element={<RutaProtegida />}>
            <Route
              path="*"
              element={
                <PendientesModalProvider>
                  <Menu />
                  <main className="container-fluid px-0 pt-5 mt-5">
                    <ChunkErrorBoundary>
                    <Suspense fallback={<PageSpinner />}>
                    <Routes>
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
                      <Route path="/service-maquinas" element={<ServiceMaquinas />} />
                      <Route path="/tablero-control" element={<TableroControl />} />
                      <Route path="/departamento-mantenimiento" element={<MantenimientoDashboard />} />
                      <Route path="/mantenimiento/baterias" element={<Baterias />} />
                      <Route path="/mantenimiento/cubiertas" element={<CubiertasDashboard />} />
                      <Route path="/mantenimiento/cubiertas/camiones" element={<Cubiertas categoria="camiones" titulo="Cubiertas camiones" />} />
                      <Route path="/mantenimiento/cubiertas/palas" element={<Cubiertas categoria="palas" titulo="Cubiertas palas cargadoras" />} />
                      <Route path="/mantenimiento/cubiertas/retropalas" element={<Cubiertas categoria="retropalas" titulo="Cubiertas retropalas" />} />
                      <Route path="/mantenimiento/cubiertas/motoniveladora" element={<Cubiertas categoria="motoniveladora" titulo="Cubiertas motoniveladora" />} />
                      <Route path="/mantenimiento/preventivo" element={<MantenimientoPreventivo />} />
                      <Route path="/mantenimiento/reparaciones" element={<Reparaciones />} />
                      <Route path="/mantenimiento/otra" element={<Otra />} />
                      <Route path="/usuarios" element={<UsuariosCrud />} />
                      <Route path="/variables" element={<Variables />} />
                      <Route path="/precios" element={<Precios />} />
                      <Route path="/facturacion" element={<FacturacionCliente />} />
                      <Route path="/facturacion/nueva" element={<NuevaFactura />} />
                      <Route path="/cobro-factura" element={<CobrosTabla />} />
                      <Route path="/cobro-factura/nuevo" element={<NuevoCobro />} />
                      <Route path="/cobro-factura/editar/:id" element={<EditarCobro />} />
                      <Route path="/cuenta-corriente" element={<CuentaCorriente />} />
                      <Route path="/cheques" element={<Cheques />} />
                      <Route path="/cheques-propios" element={<ChequesPropio />} />
                      <Route path="/impuestos" element={<Impuestos />} />
                      <Route path="/impuestos/:anio/:mes" element={<ImpuestosMes />} />
                      <Route path="/impuestos/:anio/:mes/931/cargar" element={<Impuesto931Cargar />} />
                      <Route path="/impuestos/:anio/:mes/iva/cargar" element={<ImpuestoIVACargar />} />
                      <Route path="/impuestos/:anio/:mes/autonomos/cargar" element={<ImpuestoAutonomosCargar />} />
                      <Route path="/impuestos/:anio/:mes/salud-publica/cargar" element={<ImpuestoSaludPublicaCargar />} />
                      <Route path="/impuestos/:anio/:mes/resumen" element={<ImpuestosResumen />} />
                      <Route path="/impuestos/:anio/resumen-anual" element={<ImpuestosResumenAnual />} />
                      <Route path="/personal/asistencia" element={<Asistencia />} />
                      <Route path="/personal/resumen-mes" element={<ResumenMes />} />
                      <Route path="/personal/asistencia-dia" element={<DiaAsistencia />} />
                      <Route path="/personal/gastos-semanales" element={<GastosSemanales />} />
                      <Route path="/facturacion-proveedores" element={<FacturacionProveedor />} />
                      <Route path="/facturacion-proveedores/nueva" element={<NuevaFacturaProveedor />} />
                      <Route path="/pago-proveedores" element={<PagosProveedoresTabla />} />
                      <Route path="/pago-proveedores/nuevo" element={<NuevoPagoProveedor />} />
                      <Route path="/cuenta-corriente-proveedores" element={<CuentaCorrienteProveedor />} />
                      <Route path="*" element={<Error404 />} />
                    </Routes>
                    </Suspense>
                    </ChunkErrorBoundary>
                  </main>
                  <Footer />
                  <BotonAnteojos />
                  <BotonFoco />
                  <PendientesModalHost />
                  <ResumenModal />
                </PendientesModalProvider>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
