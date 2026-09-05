import { Route, Navigate } from 'react-router-dom';
import RouteGuard from '../components/RouteGuard';
import { lazyWithPlaceholder } from '../utils/lazyWithPlaceholder';

const BusinessHome = lazyWithPlaceholder(() => import('../pages/business/BusinessHome'), 'Inicio');
const Settings = lazyWithPlaceholder(() => import('../pages/business/CoreSettingsPage'), 'Configuración');
const Dashboard = lazyWithPlaceholder(() => import('../pages/business/CoreDashboardPage'), 'Dashboard');
const DashboardRetail = lazyWithPlaceholder(() => import('../pages/business/CoreRetailDashboardPage'), 'Dashboard');
const CoreUsersPage = lazyWithPlaceholder(() => import('../pages/business/CoreUsersPage'), 'Usuarios');
const CoreRolesPage = lazyWithPlaceholder(() => import('../pages/business/CoreRolesPage'), 'Roles');
const AuditLogs = lazyWithPlaceholder(() => import('../pages/business/CoreAuditPage'), 'Auditoría');
const HistoryCajaPage = lazyWithPlaceholder(() => import('../pages/business/PosCashRegisterHistoryPage'), 'Caja');
const ReceiptPrint = lazyWithPlaceholder(() => import('../pages/business/ReceiptPrintPage'), 'Impresión');
const Checkout = lazyWithPlaceholder(() => import('../pages/business/PosCheckoutPage'), 'Punto de Venta');
const PosRetail = lazyWithPlaceholder(() => import('../pages/business/PosRetailPage'), 'Punto de Venta');
const PosDiscounts = lazyWithPlaceholder(() => import('../pages/business/PosDiscounts.jsx'), 'Descuentos');
const Inventory = lazyWithPlaceholder(() => import('../pages/business/InventoryAdjustmentsPage'), 'Inventario');
const InventoryCategories = lazyWithPlaceholder(() => import('../pages/business/InventoryCategoriesPage'), 'Categorías');
const InventoryProducts = lazyWithPlaceholder(() => import('../pages/business/InventoryProductsPage'), 'Productos');
const InventoryPhysical = lazyWithPlaceholder(() => import('../pages/business/InventoryPhysicalPage'), 'Inventario físico');
const InventoryRecipes = lazyWithPlaceholder(() => import('../pages/business/InventoryRecipesPage'), 'Recetas');
const Order = lazyWithPlaceholder(() => import('../pages/business/OrderPage'), 'Pedidos');
const OrderTable = lazyWithPlaceholder(() => import('../pages/business/OrdersTablesPage'), 'Mesas');
const OrderHistory = lazyWithPlaceholder(() => import('../pages/business/OrdersHistoryPage'), 'Historial de pedidos');
const OrdersKitchenScreenPage = lazyWithPlaceholder(() => import('../pages/business/OrdersKitchenScreenPage'), 'Cocina');
const OrdersQrPage = lazyWithPlaceholder(() => import('../pages/business/OrdersQrPage'), 'Pedidos QR');
const SuppliersManagePage = lazyWithPlaceholder(() => import('../pages/business/SuppliersManagePage'), 'Proveedores');
const SuppliersPricesPage = lazyWithPlaceholder(() => import('../pages/business/SupplierPriceHistoryPage'), 'Precios de proveedores');
const SuppliersReceiving = lazyWithPlaceholder(() => import('../pages/business/SuppliersReceiving'), 'Recepción');
const SuppliersOrders = lazyWithPlaceholder(() => import('../pages/business/SuppliersOrders'), 'Órdenes de compra');
const ExpensesCategory = lazyWithPlaceholder(() => import('../pages/business/ExpensesCategories'), 'Categorías de gastos');
const ExpensesHistory = lazyWithPlaceholder(() => import('../pages/business/ExpensesHistory'), 'Historial de gastos');
const Attendance = lazyWithPlaceholder(() => import('../pages/business/EmployeesAttendancePage'), 'Asistencia');
const Employees = lazyWithPlaceholder(() => import('../pages/business/EmployeesPage'), 'Empleados');
const EmployeesPayRoll = lazyWithPlaceholder(() => import('../pages/business/EmployeesPayRoll'), 'Nómina');
const Schedules = lazyWithPlaceholder(() => import('../pages/business/SchedulesPage'), 'Horarios');
const EmployeesLeaves = lazyWithPlaceholder(() => import('../pages/business/EmployeesLeaves'), 'Permisos');
const GenericFeaturePage = lazyWithPlaceholder(() => import('../pages/business/GenericFeaturePage'), 'Módulo');
const ProfilePage = lazyWithPlaceholder(() => import('../pages/business/ProfilePage.jsx'), 'Perfil');
const ReportsAdvancedPage = lazyWithPlaceholder(() => import('../pages/business/ReportsAdvancedPage'), 'Reportes');
const ReportsCustomersPage = lazyWithPlaceholder(() => import('../pages/business/ReportsCustomersPage'), 'Clientes');
const ReportsInventoryPage = lazyWithPlaceholder(() => import('../pages/business/ReportsInventoryPage'), 'Inventario');
const ReportProducts = lazyWithPlaceholder(() => import('../pages/business/ReportsProductsPage'), 'Productos');
const ReportProfitPage = lazyWithPlaceholder(() => import('../pages/business/ReportsProfitPage'), 'Ganancias');
const ReportsSales = lazyWithPlaceholder(() => import('../pages/business/ReportsSalesPage'), 'Ventas');
const CRMCustomers = lazyWithPlaceholder(() => import('../pages/business/CRMCustomersPage'), 'Clientes');
const CRMEmail = lazyWithPlaceholder(() => import('../pages/business/CRMEmailPage'), 'Correo');
const CRMAnalytics = lazyWithPlaceholder(() => import('../pages/business/CRMAnalyticsPage'), 'Analítica');
const CrmSegments = lazyWithPlaceholder(() => import('../pages/business/CrmSegments'), 'Segmentos');
const AccountingBalancePage = lazyWithPlaceholder(() => import('../pages/business/AccountingBalancePage'), 'Balances');
const AccountingClosingPage = lazyWithPlaceholder(() => import('../pages/business/AccountingClosingPage'), 'Cierres');
const AccountingReceivablePage = lazyWithPlaceholder(() => import('../pages/business/AccountingReceivablePage'), 'Cuentas por cobrar');
const AccountingPayablePage = lazyWithPlaceholder(() => import('../pages/business/AccountingPayablePage'), 'Cuentas por pagar');
const AccountingTaxPage = lazyWithPlaceholder(() => import('../pages/business/AccountingTaxPage'), 'Impuestos');
const AccountingSriPage = lazyWithPlaceholder(() => import('../pages/business/AccountingSriPage'), 'SRI');
const NotificationsPush = lazyWithPlaceholder(() => import('../pages/business/NotificationsPush'), 'Notificaciones');
const NotificationsScheduled = lazyWithPlaceholder(() => import('../pages/business/NotificationsSchedulesPage'), 'Notificaciones programadas');
const NotificationsEmail = lazyWithPlaceholder(() => import('../pages/business/NotificationsEmailPage'), 'Notificaciones por correo');
const EinvoicingInvoicesPage = lazyWithPlaceholder(() => import('../pages/business/EinvoicingInvoicesPage'), 'Facturación');
const CreditNotes = lazyWithPlaceholder(() => import('../pages/business/EinvoicingCreditNotesPage'), 'Notas de crédito');
const DebitNotes = lazyWithPlaceholder(() => import('../pages/business/EinvoicingDebitNotesPage'), 'Notas de débito');
const EinvoicingVoidPage = lazyWithPlaceholder(() => import('../pages/business/EinvoicingVoidPage'), 'Anulación');
const EinvoicingRemissionsPage = lazyWithPlaceholder(() => import('../pages/business/EinvoicingRemissionsPage'), 'Remisiones');
const EinvoicingReportsPage = lazyWithPlaceholder(() => import('../pages/business/EinvoicingReportsPage'), 'Reportes de facturación');
const EinvoicingRetentionsPage = lazyWithPlaceholder(() => import('../pages/business/EinvoicingRetentionsPage'), 'Retenciones');
const OdontologiaPacientes = lazyWithPlaceholder(() => import('../pages/business/Odontologia/OdontologiaPacientes'), 'Pacientes');
const OdontologiaTratamientos = lazyWithPlaceholder(() => import('../pages/business/Odontologia/OdontologiaTratamientos'), 'Tratamientos');
const OdontologiaPlanes = lazyWithPlaceholder(() => import('../pages/business/Odontologia/OdontologiaPlanes'), 'Planes');
const OdontologiaAgenda = lazyWithPlaceholder(() => import('../pages/business/Odontologia/OdontologiaAgenda'), 'Agenda');
const AtencionPacientePage = lazyWithPlaceholder(() => import('../pages/business/Odontologia/OdontologiaAtender'), 'Atención al paciente');
const OdontologiaPlantRecetas = lazyWithPlaceholder(() => import('../pages/business/Odontologia/OdontologiaPlantRecetas'), 'Recetas');
const OdontologiaHistorias = lazyWithPlaceholder(() => import('../pages/business/Odontologia/OdontologiaHistorias'), 'Historias clínicas');
const OdontologiaConfiguracion = lazyWithPlaceholder(() => import('../pages/business/Odontologia/OdontologiaConfiguracion'), 'Configuración');
const OdontologiaReportes = lazyWithPlaceholder(() => import('../pages/business/Odontologia/OdontologiaReportes'), 'Reportes');

export const businessRoutes = (
  <>
    {/* ── Home del panel ── */}
    <Route index element={<BusinessHome />} />
    <Route path="home" element={<BusinessHome />} />
    <Route path="dashboard" element={<Dashboard />} />
    <Route path="profile" element={<ProfilePage />} />

    {/* ────────────────────────────────────────────────
        NÚCLEO  /app/core
    ──────────────────────────────────────────────── */}
    <Route path="core" element={<GenericFeaturePage moduleName="Núcleo" />} />
    <Route
      path="core/core.settings"
      element={
        <RouteGuard moduleCode="core" pageCode="core.settings">
          <Settings />
        </RouteGuard>
      }
    />
    <Route
      path="core/core.dashboard"
      element={
        <RouteGuard moduleCode="core" pageCode="core.dashboard">
          <Dashboard />
        </RouteGuard>
      }
    />
    <Route
      path="core/core.retail_dashboard"
      element={
        <RouteGuard moduleCode="core" pageCode="core.retail_dashboard">
          <DashboardRetail />
        </RouteGuard>
      }
    />
    <Route
      path="core/core.users"
      element={
        <RouteGuard moduleCode="core" pageCode="core.users">
          <CoreUsersPage />
        </RouteGuard>
      }
    />
    <Route
      path="core/core.roles"
      element={
        <RouteGuard moduleCode="core" pageCode="core.roles">
          <CoreRolesPage />
        </RouteGuard>
      }
    />
    <Route
      path="core/core.audit_log"
      element={
        <RouteGuard moduleCode="core" pageCode="core.audit_log">
          <AuditLogs />
        </RouteGuard>
      }
    />
    <Route
      path="core/gestion-de-sucursales"
      element={
        <RouteGuard moduleCode="core">
          <GenericFeaturePage moduleName="Núcleo" featureName="Gestión de sucursales" />
        </RouteGuard>
      }
    />
    <Route
      path="core/:feature"
      element={
        <RouteGuard moduleCode="core">
          <GenericFeaturePage moduleName="Núcleo" />
        </RouteGuard>
      }
    />

    {/* ────────────────────────────────────────────────
        PUNTO DE VENTA  /app/pos
    ──────────────────────────────────────────────── */}
    <Route
      path="pos/pos.cash_register"
      element={
        <RouteGuard moduleCode="pos" pageCode="pos.cash_register">
          <HistoryCajaPage />
        </RouteGuard>
      }
    />
    <Route
      path="pos/pos.einvoicing"
      element={
        <RouteGuard moduleCode="pos" pageCode="pos.einvoicing">
          <EinvoicingInvoicesPage />
        </RouteGuard>
      }
    />
    <Route
      path="pos/pos.receipt_print"
      element={
        <RouteGuard moduleCode="pos" pageCode="pos.receipt_print">
          <ReceiptPrint />
        </RouteGuard>
      }
    />
    <Route
      path="pos/pos.sales"
      element={
        <RouteGuard moduleCode="pos" pageCode="pos.sales">
          <Checkout />
        </RouteGuard>
      }
    />
    <Route
      path="pos/pos.retail"
      element={
        <RouteGuard moduleCode="pos" pageCode="pos.retail">
          <PosRetail />
        </RouteGuard>
      }
    />
    <Route
      path="pos/cotizaciones"
      element={
        <RouteGuard moduleCode="pos">
          <GenericFeaturePage moduleName="Punto de Venta" featureName="Cotizaciones" />
        </RouteGuard>
      }
    />
    <Route
      path="pos/pos.discounts"
      element={
        <RouteGuard moduleCode="pos" pageCode="pos.discounts">
          <PosDiscounts />
        </RouteGuard>
      }
    />
    <Route
      path="pos/devoluciones-y-cambios"
      element={
        <RouteGuard moduleCode="pos">
          <GenericFeaturePage moduleName="Punto de Venta" featureName="Devoluciones y cambios" />
        </RouteGuard>
      }
    />
    <Route
      path="pos/:feature"
      element={
        <RouteGuard moduleCode="pos">
          <GenericFeaturePage moduleName="Punto de Venta" />
        </RouteGuard>
      }
    />

    {/* ────────────────────────────────────────────────
        INVENTARIO  /app/inventory
    ──────────────────────────────────────────────── */}
    <Route path="inventory" element={<GenericFeaturePage moduleName="Inventario" />} />
    <Route
      path="inventory/inventory.adjustments"
      element={
        <RouteGuard moduleCode="inventory" pageCode="inventory.adjustments">
          <Inventory />
        </RouteGuard>
      }
    />
    <Route
      path="inventory/inventory.categories"
      element={
        <RouteGuard moduleCode="inventory" pageCode="inventory.categories">
          <InventoryCategories />
        </RouteGuard>
      }
    />
    <Route
      path="inventory/inventory.products"
      element={
        <RouteGuard moduleCode="inventory" pageCode="inventory.products">
          <InventoryProducts />
        </RouteGuard>
      }
    />
    <Route
      path="inventory/inventory.physical"
      element={
        <RouteGuard moduleCode="inventory" pageCode="inventory.physical">
          <InventoryPhysical />
        </RouteGuard>
      }
    />
    <Route
      path="inventory/inventory.recipes"
      element={
        <RouteGuard moduleCode="inventory" pageCode="inventory.recipes">
          <InventoryRecipes />
        </RouteGuard>
      }
    />
    <Route
      path="inventory/:feature"
      element={
        <RouteGuard moduleCode="inventory">
          <GenericFeaturePage moduleName="Inventario" />
        </RouteGuard>
      }
    />

    {/* ────────────────────────────────────────────────
        REPORTES  /app/reports
    ──────────────────────────────────────────────── */}
    <Route path="reports" element={<GenericFeaturePage moduleName="Reportes" />} />
    <Route
      path="reports/reports.advanced"
      element={
        <RouteGuard moduleCode="reports" pageCode="reports.advanced">
          <ReportsAdvancedPage />
        </RouteGuard>
      }
    />
    <Route
      path="reports/reports.customers"
      element={
        <RouteGuard moduleCode="reports" pageCode="reports.customers">
          <ReportsCustomersPage />
        </RouteGuard>
      }
    />
    <Route
      path="reports/reports.inventory"
      element={
        <RouteGuard moduleCode="reports" pageCode="reports.inventory">
          <ReportsInventoryPage />
        </RouteGuard>
      }
    />
    <Route
      path="reports/reports.products"
      element={
        <RouteGuard moduleCode="reports" pageCode="reports.products">
          <ReportProducts />
        </RouteGuard>
      }
    />
    <Route
      path="reports/reports.profit"
      element={
        <RouteGuard moduleCode="reports" pageCode="reports.profit">
          <ReportProfitPage />
        </RouteGuard>
      }
    />
    <Route
      path="reports/reports.sales"
      element={
        <RouteGuard moduleCode="reports" pageCode="reports.sales">
          <ReportsSales />
        </RouteGuard>
      }
    />
    <Route
      path="reports/reporte-de-ganancias"
      element={
        <RouteGuard moduleCode="reports">
          <GenericFeaturePage moduleName="Reportes" featureName="Reporte de ganancias" />
        </RouteGuard>
      }
    />
    <Route
      path="reports/reporte-de-turnos"
      element={
        <RouteGuard moduleCode="reports">
          <GenericFeaturePage moduleName="Reportes" featureName="Reporte de turnos" />
        </RouteGuard>
      }
    />
    <Route
      path="reports/reporte-por-cajero"
      element={
        <RouteGuard moduleCode="reports">
          <GenericFeaturePage moduleName="Reportes" featureName="Reporte por cajero" />
        </RouteGuard>
      }
    />
    <Route
      path="reports/:feature"
      element={
        <RouteGuard moduleCode="reports">
          <GenericFeaturePage moduleName="Reportes" />
        </RouteGuard>
      }
    />

    {/* ────────────────────────────────────────────────
        PAGOS  /app/payments
    ──────────────────────────────────────────────── */}
    <Route path="payments" element={<GenericFeaturePage moduleName="Pagos" />} />
    <Route
      path="payments/:feature"
      element={
        <RouteGuard moduleCode="payments">
          <GenericFeaturePage moduleName="Pagos" />
        </RouteGuard>
      }
    />

    {/* ────────────────────────────────────────────────
        CONTABILIDAD  /app/accounting
    ──────────────────────────────────────────────── */}
    <Route path="accounting" element={<GenericFeaturePage moduleName="Contabilidad" />} />
    <Route
      path="accounting/accounting.balance"
      element={
        <RouteGuard moduleCode="accounting" pageCode="accounting.balance">
          <AccountingBalancePage />
        </RouteGuard>
      }
    />
    <Route
      path="accounting/accounting.close"
      element={
        <RouteGuard moduleCode="accounting" pageCode="accounting.close">
          <AccountingClosingPage />
        </RouteGuard>
      }
    />
    <Route
      path="accounting/accounting.receivable"
      element={
        <RouteGuard moduleCode="accounting" pageCode="accounting.receivable">
          <AccountingReceivablePage />
        </RouteGuard>
      }
    />
    <Route
      path="accounting/accounting.payable"
      element={
        <RouteGuard moduleCode="accounting" pageCode="accounting.payable">
          <AccountingPayablePage />
        </RouteGuard>
      }
    />
    <Route
      path="accounting/accounting.tax"
      element={
        <RouteGuard moduleCode="accounting" pageCode="accounting.tax">
          <AccountingTaxPage />
        </RouteGuard>
      }
    />
    <Route
      path="accounting/accounting.sri"
      element={
        <RouteGuard moduleCode="accounting" pageCode="accounting.sri">
          <AccountingSriPage />
        </RouteGuard>
      }
    />
    <Route
      path="accounting/:feature"
      element={
        <RouteGuard moduleCode="accounting">
          <GenericFeaturePage moduleName="Contabilidad" />
        </RouteGuard>
      }
    />

    {/* ────────────────────────────────────────────────
        GESTIÓN DE ÓRDENES  /app/orders
    ──────────────────────────────────────────────── */}
    <Route
      path="orders/orders.create"
      element={
        <RouteGuard moduleCode="orders" pageCode="orders.create">
          <Order />
        </RouteGuard>
      }
    />
    <Route
      path="orders/orders.table"
      element={
        <RouteGuard moduleCode="orders" pageCode="orders.table">
          <OrderTable />
        </RouteGuard>
      }
    />
    <Route
      path="orders/orders.tables"
      element={
        <RouteGuard moduleCode="orders" pageCode="orders.tables">
          <OrderTable />
        </RouteGuard>
      }
    />
    <Route
      path="orders/orders.history"
      element={
        <RouteGuard moduleCode="orders" pageCode="orders.history">
          <OrderHistory />
        </RouteGuard>
      }
    />
    <Route
      path="orders/orders.kitchen_screen"
      element={
        <RouteGuard moduleCode="orders" pageCode="orders.kitchen_screen">
          <OrdersKitchenScreenPage />
        </RouteGuard>
      }
    />
    <Route
      path="orders/orders.qr"
      element={
        <RouteGuard moduleCode="orders" pageCode="orders.qr">
          <OrdersQrPage />
        </RouteGuard>
      }
    />
    <Route
      path="orders/:feature"
      element={
        <RouteGuard moduleCode="orders">
          <GenericFeaturePage moduleName="Gestión de Órdenes" />
        </RouteGuard>
      }
    />

    {/* ────────────────────────────────────────────────
        COCINA  /app/kitchen
    ──────────────────────────────────────────────── */}
    <Route path="kitchen" element={<GenericFeaturePage moduleName="Cocina" />} />
    <Route
      path="kitchen/kitchen.kds"
      element={
        <RouteGuard moduleCode="kitchen" pageCode="kitchen.kds">
          <OrdersKitchenScreenPage />
        </RouteGuard>
      }
    />
    <Route
      path="kitchen/:feature"
      element={
        <RouteGuard moduleCode="kitchen">
          <GenericFeaturePage moduleName="Cocina" />
        </RouteGuard>
      }
    />

    {/* ────────────────────────────────────────────────
        DELIVERY  /app/delivery
    ──────────────────────────────────────────────── */}
    <Route path="delivery" element={<GenericFeaturePage moduleName="Delivery" />} />
    <Route
      path="delivery/:feature"
      element={
        <RouteGuard moduleCode="delivery">
          <GenericFeaturePage moduleName="Delivery" />
        </RouteGuard>
      }
    />

    {/* ────────────────────────────────────────────────
        MESAS  /app/tables
    ──────────────────────────────────────────────── */}
    <Route path="tables" element={<GenericFeaturePage moduleName="Mesas" />} />
    <Route
      path="tables/:feature"
      element={
        <RouteGuard moduleCode="tables">
          <GenericFeaturePage moduleName="Mesas" />
        </RouteGuard>
      }
    />

    {/* ────────────────────────────────────────────────
        RESERVAS  /app/reservations
    ──────────────────────────────────────────────── */}
    <Route path="reservations" element={<GenericFeaturePage moduleName="Reservas" />} />
    <Route
      path="reservations/:feature"
      element={
        <RouteGuard moduleCode="reservations">
          <GenericFeaturePage moduleName="Reservas" />
        </RouteGuard>
      }
    />

    {/* ────────────────────────────────────────────────
        FIDELIZACIÓN  /app/loyalty
    ──────────────────────────────────────────────── */}
    <Route path="loyalty" element={<GenericFeaturePage moduleName="Fidelización" />} />
    <Route
      path="loyalty/:feature"
      element={
        <RouteGuard moduleCode="loyalty">
          <GenericFeaturePage moduleName="Fidelización" />
        </RouteGuard>
      }
    />

    {/* ────────────────────────────────────────────────
        PROVEEDORES  /app/suppliers
    ──────────────────────────────────────────────── */}
    <Route path="suppliers" element={<GenericFeaturePage moduleName="Proveedores" />} />
    <Route
      path="suppliers/suppliers.manage"
      element={
        <RouteGuard moduleCode="suppliers" pageCode="suppliers.manage">
          <SuppliersManagePage />
        </RouteGuard>
      }
    />
    <Route
      path="suppliers/suppliers.prices"
      element={
        <RouteGuard moduleCode="suppliers" pageCode="suppliers.prices">
          <SuppliersPricesPage />
        </RouteGuard>
      }
    />
    <Route
      path="suppliers/suppliers.receiving"
      element={
        <RouteGuard moduleCode="suppliers" pageCode="suppliers.receiving">
          <SuppliersReceiving />
        </RouteGuard>
      }
    />
    <Route
      path="suppliers/suppliers.orders"
      element={
        <RouteGuard moduleCode="suppliers" pageCode="suppliers.orders">
          <SuppliersOrders />
        </RouteGuard>
      }
    />
    <Route
      path="suppliers/:feature"
      element={
        <RouteGuard moduleCode="suppliers">
          <GenericFeaturePage moduleName="Gestión de Proveedores" />
        </RouteGuard>
      }
    />

    {/* ────────────────────────────────────────────────
        COMPRAS-GASTOS  /app/purchases
    ──────────────────────────────────────────────── */}
    <Route
      path="purchases/purchases.categories"
      element={
        <RouteGuard moduleCode="purchases" pageCode="purchases.categories">
          <ExpensesCategory />
        </RouteGuard>
      }
    />
    <Route
      path="purchases/purchases.history"
      element={
        <RouteGuard moduleCode="purchases" pageCode="purchases.history">
          <ExpensesHistory />
        </RouteGuard>
      }
    />
    <Route
      path="purchases/:feature"
      element={
        <RouteGuard moduleCode="purchases">
          <GenericFeaturePage moduleName="Compras" />
        </RouteGuard>
      }
    />

    {/* ────────────────────────────────────────────────
        CITAS  /app/appointments
    ──────────────────────────────────────────────── */}
    <Route path="appointments" element={<GenericFeaturePage moduleName="Citas" />} />
    <Route
      path="appointments/:feature"
      element={
        <RouteGuard moduleCode="appointments">
          <GenericFeaturePage moduleName="Citas" />
        </RouteGuard>
      }
    />

    {/* ────────────────────────────────────────────────
        EMPLEADOS  /app/employees
    ──────────────────────────────────────────────── */}
    <Route
      path="employees/employees.payroll"
      element={
        <RouteGuard moduleCode="employees" pageCode="employees.payroll">
          <EmployeesPayRoll />
        </RouteGuard>
      }
    />
    <Route
      path="employees/employees.manage"
      element={
        <RouteGuard moduleCode="employees" pageCode="employees.manage">
          <Employees />
        </RouteGuard>
      }
    />
    <Route
      path="employees/employees.attendance"
      element={
        <RouteGuard moduleCode="employees" pageCode="employees.attendance">
          <Attendance />
        </RouteGuard>
      }
    />
    <Route
      path="employees/employees.schedules"
      element={
        <RouteGuard moduleCode="employees" pageCode="employees.schedules">
          <Schedules />
        </RouteGuard>
      }
    />
    <Route
      path="employees/employees.leaves"
      element={
        <RouteGuard moduleCode="employees" pageCode="employees.leaves">
          <EmployeesLeaves />
        </RouteGuard>
      }
    />
    <Route
      path="employees/:feature"
      element={
        <RouteGuard moduleCode="employees">
          <GenericFeaturePage moduleName="Empleados" />
        </RouteGuard>
      }
    />

    {/* ────────────────────────────────────────────────
        CRM  /app/crm
    ──────────────────────────────────────────────── */}
    <Route
      path="crm/crm.customers"
      element={
        <RouteGuard moduleCode="crm" pageCode="crm.customers">
          <CRMCustomers />
        </RouteGuard>
      }
    />
    <Route
      path="crm/crm.email"
      element={
        <RouteGuard moduleCode="crm" pageCode="crm.email">
          <CRMEmail />
        </RouteGuard>
      }
    />
    <Route
      path="crm/crm.analytics"
      element={
        <RouteGuard moduleCode="crm" pageCode="crm.analytics">
          <CRMAnalytics />
        </RouteGuard>
      }
    />
    <Route
      path="crm/crm.segments"
      element={
        <RouteGuard moduleCode="crm" pageCode="crm.segments">
          <CrmSegments />
        </RouteGuard>
      }
    />

    {/* ────────────────────────────────────────────────
        RUTAS  /app/routes
    ──────────────────────────────────────────────── */}
    <Route path="routes" element={<GenericFeaturePage moduleName="Rutas" />} />
    <Route
      path="routes/:feature"
      element={
        <RouteGuard moduleCode="routes">
          <GenericFeaturePage moduleName="Rutas" />
        </RouteGuard>
      }
    />

    {/* ────────────────────────────────────────────────
        TRACKING  /app/tracking
    ──────────────────────────────────────────────── */}
    <Route path="tracking" element={<GenericFeaturePage moduleName="Tracking" />} />
    <Route
      path="tracking/:feature"
      element={
        <RouteGuard moduleCode="tracking">
          <GenericFeaturePage moduleName="Tracking" />
        </RouteGuard>
      }
    />

    {/* ────────────────────────────────────────────────
        COLA  /app/queue
    ──────────────────────────────────────────────── */}
    <Route path="queue" element={<GenericFeaturePage moduleName="Cola de Atención" />} />
    <Route
      path="queue/:feature"
      element={
        <RouteGuard moduleCode="queue">
          <GenericFeaturePage moduleName="Cola de Atención" />
        </RouteGuard>
      }
    />

    {/* ────────────────────────────────────────────────
        E-COMMERCE  /app/ecommerce
    ──────────────────────────────────────────────── */}
    <Route path="ecommerce" element={<GenericFeaturePage moduleName="E-commerce" />} />
    <Route
      path="ecommerce/:feature"
      element={
        <RouteGuard moduleCode="ecommerce">
          <GenericFeaturePage moduleName="E-commerce" />
        </RouteGuard>
      }
    />

    {/* ────────────────────────────────────────────────
        NOTIFICACIONES  /app/notifications
    ──────────────────────────────────────────────── */}
    <Route
      path="notifications/notifications.push"
      element={
        <RouteGuard moduleCode="notifications" pageCode="notifications.push">
          <NotificationsPush />
        </RouteGuard>
      }
    />
    <Route
      path="notifications/notifications.scheduled"
      element={
        <RouteGuard moduleCode="notifications" pageCode="notifications.scheduled">
          <NotificationsScheduled />
        </RouteGuard>
      }
    />
    <Route
      path="notifications/notifications.email"
      element={
        <RouteGuard moduleCode="notifications" pageCode="notifications.email">
          <NotificationsEmail />
        </RouteGuard>
      }
    />

    {/* ────────────────────────────────────────────────
        FACTURACIÓN ELECTRÓNICA  /app/einvoicing
    ──────────────────────────────────────────────── */}
    <Route
      path="einvoicing/einvoicing.status"
      element={
        <RouteGuard moduleCode="einvoicing" pageCode="einvoicing.status">
          <EinvoicingInvoicesPage />
        </RouteGuard>
      }
    />
    <Route
      path="einvoicing/einvoicing.credit_notes"
      element={
        <RouteGuard moduleCode="einvoicing" pageCode="einvoicing.credit_notes">
          <CreditNotes />
        </RouteGuard>
      }
    />
    <Route
      path="einvoicing/einvoicing.debit_notes"
      element={
        <RouteGuard moduleCode="einvoicing" pageCode="einvoicing.debit_notes">
          <DebitNotes />
        </RouteGuard>
      }
    />
    <Route
      path="einvoicing/einvoicing.void"
      element={
        <RouteGuard moduleCode="einvoicing" pageCode="einvoicing.void">
          <EinvoicingVoidPage />
        </RouteGuard>
      }
    />
    <Route
      path="einvoicing/einvoicing.remissions"
      element={
        <RouteGuard moduleCode="einvoicing" pageCode="einvoicing.remissions">
          <EinvoicingRemissionsPage />
        </RouteGuard>
      }
    />
    <Route
      path="einvoicing/einvoicing.reports"
      element={
        <RouteGuard moduleCode="einvoicing" pageCode="einvoicing.reports">
          <EinvoicingReportsPage />
        </RouteGuard>
      }
    />
    <Route
      path="einvoicing/einvoicing.retentions"
      element={
        <RouteGuard moduleCode="einvoicing" pageCode="einvoicing.retentions">
          <EinvoicingRetentionsPage />
        </RouteGuard>
      }
    />

    {/* ────────────────────────────────────────────────
        ODONTOLOGÍA  /app/odontologia
    ──────────────────────────────────────────────── */}
    <Route path="odontologia" element={<GenericFeaturePage moduleName="Odontología" />} />
    <Route
      path="odontologia/odontologia.configuracion"
      element={
        <RouteGuard moduleCode="odontologia" pageCode="odontologia.configuracion">
          <OdontologiaConfiguracion />
        </RouteGuard>
      }
    />
    <Route
      path="odontologia/odontologia.pacientes"
      element={
        <RouteGuard moduleCode="odontologia" pageCode="odontologia.pacientes">
          <OdontologiaPacientes />
        </RouteGuard>
      }
    />
    <Route
      path="odontologia/odontologia.tratamientos"
      element={
        <RouteGuard moduleCode="odontologia" pageCode="odontologia.tratamientos">
          <OdontologiaTratamientos />
        </RouteGuard>
      }
    />
    <Route
      path="odontologia/odontologia.planes"
      element={
        <RouteGuard moduleCode="odontologia" pageCode="odontologia.planes">
          <OdontologiaPlanes />
        </RouteGuard>
      }
    />
    <Route
      path="odontologia/odontologia.agenda"
      element={
        <RouteGuard moduleCode="odontologia" pageCode="odontologia.agenda">
          <OdontologiaAgenda />
        </RouteGuard>
      }
    />
    <Route
      path="odontologia/atencion/:citaId"
      element={
        <RouteGuard moduleCode="odontologia">
          <AtencionPacientePage />
        </RouteGuard>
      }
    />
    <Route
      path="odontologia/odontologia.plantilla.recetas"
      element={
        <RouteGuard moduleCode="odontologia" pageCode="odontologia.plantilla.recetas">
          <OdontologiaPlantRecetas />
        </RouteGuard>
      }
    />
    <Route
      path="odontologia/odontologia.historias"
      element={
        <RouteGuard moduleCode="odontologia" pageCode="odontologia.historias">
          <OdontologiaHistorias />
        </RouteGuard>
      }
    />
    <Route
      path="odontologia/odontologia.reportes"
      element={
        <RouteGuard moduleCode="odontologia" pageCode="odontologia.reportes">
          <OdontologiaReportes />
        </RouteGuard>
      }
    />
    <Route
      path="odontologia/:feature"
      element={
        <RouteGuard moduleCode="odontologia">
          <GenericFeaturePage moduleName="Odontología" />
        </RouteGuard>
      }
    />

    {/* ── Catch-all - Redirigir a dashboard ── */}
    <Route
      path=":module"
      element={
        <Navigate to="/app/core/dashboard" replace />
      }
    />
    <Route
      path=":module/:feature"
      element={
        <Navigate to="/app/core/dashboard" replace />
      }
    />
    <Route
      path="*"
      element={
        <Navigate to="/app/core/dashboard" replace />
      }
    />
  </>
);