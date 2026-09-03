import { Route, Navigate } from 'react-router-dom';
import RouteGuard from '../components/RouteGuard';
import BusinessHome from '../pages/business/BusinessHome';
import Settings from '../pages/business/CoreSettingsPage';
import Dashboard from '../pages/business/CoreDashboardPage';
import DashboardRetail from '../pages/business/CoreRetailDashboardPage';
import CoreUsersPage from '../pages/business/CoreUsersPage';
import CoreRolesPage from '../pages/business/CoreRolesPage';
import AuditLogs from '../pages/business/CoreAuditPage';
import HistoryCajaPage from '../pages/business/PosCashRegisterHistoryPage';
import ReceiptPrint from '../pages/business/ReceiptPrintPage';
import Checkout from '../pages/business/PosCheckoutPage';
import PosRetail from '../pages/business/PosRetailPage';
import PosDiscounts from '../pages/business/PosDiscounts.jsx';
import Inventory from '../pages/business/InventoryAdjustmentsPage';
import InventoryCategories from '../pages/business/InventoryCategoriesPage';
import InventoryProducts from '../pages/business/InventoryProductsPage';
import InventoryPhysical from '../pages/business/InventoryPhysicalPage';
import InventoryRecipes from '../pages/business/InventoryRecipesPage';
import Order from '../pages/business/OrderPage';
import OrderTable from '../pages/business/OrdersTablesPage';
import OrderHistory from '../pages/business/OrdersHistoryPage';
import OrdersKitchenScreenPage from '../pages/business/OrdersKitchenScreenPage';
import OrdersQrPage from '../pages/business/OrdersQrPage';
import SuppliersManagePage from '../pages/business/SuppliersManagePage';
import SuppliersPricesPage from '../pages/business/SupplierPriceHistoryPage';
import SuppliersReceiving from '../pages/business/SuppliersReceiving';
import SuppliersOrders from '../pages/business/SuppliersOrders';
import ExpensesCategory from '../pages/business/ExpensesCategories';
import ExpensesHistory from '../pages/business/ExpensesHistory';
import Attendance from '../pages/business/EmployeesAttendancePage';
import Employees from '../pages/business/EmployeesPage';
import EmployeesPayRoll from '../pages/business/EmployeesPayRoll';
import Schedules from '../pages/business/SchedulesPage';
import EmployeesLeaves from '../pages/business/EmployeesLeaves';
import GenericFeaturePage from '../pages/business/GenericFeaturePage';
import ProfilePage from '../pages/business/ProfilePage.jsx';
import ReportsAdvancedPage from '../pages/business/ReportsAdvancedPage';
import ReportsCustomersPage from '../pages/business/ReportsCustomersPage';
import ReportsInventoryPage from '../pages/business/ReportsInventoryPage';
import ReportProducts from '../pages/business/ReportsProductsPage';
import ReportProfitPage from '../pages/business/ReportsProfitPage';
import ReportsSales from '../pages/business/ReportsSalesPage';
import CRMCustomers from '../pages/business/CRMCustomersPage';
import CRMEmail from '../pages/business/CRMEmailPage';
import CRMAnalytics from '../pages/business/CRMAnalyticsPage';
import CrmSegments from '../pages/business/CrmSegments';
import AccountingBalancePage from '../pages/business/AccountingBalancePage';
import AccountingClosingPage from '../pages/business/AccountingClosingPage';
import AccountingReceivablePage from '../pages/business/AccountingReceivablePage';
import AccountingPayablePage from '../pages/business/AccountingPayablePage';
import AccountingTaxPage from '../pages/business/AccountingTaxPage';
import AccountingSriPage from '../pages/business/AccountingSriPage';
import NotificationsPush from '../pages/business/NotificationsPush';
import NotificationsScheduled from '../pages/business/NotificationsSchedulesPage';
import NotificationsEmail from '../pages/business/NotificationsEmailPage';
import EinvoicingInvoicesPage from '../pages/business/EinvoicingInvoicesPage';
import CreditNotes from '../pages/business/EinvoicingCreditNotesPage';
import DebitNotes from '../pages/business/EinvoicingDebitNotesPage';
import EinvoicingVoidPage from '../pages/business/EinvoicingVoidPage';
import EinvoicingRemissionsPage from '../pages/business/EinvoicingRemissionsPage';
import EinvoicingReportsPage from '../pages/business/EinvoicingReportsPage';
import EinvoicingRetentionsPage from '../pages/business/EinvoicingRetentionsPage';
import OdontologiaPacientes from '../pages/business/Odontologia/OdontologiaPacientes';
import OdontologiaTratamientos from '../pages/business/Odontologia/OdontologiaTratamientos';
import OdontologiaPlanes from '../pages/business/Odontologia/OdontologiaPlanes';
import OdontologiaAgenda from '../pages/business/Odontologia/OdontologiaAgenda';
import AtencionPacientePage from '../pages/business/Odontologia/OdontologiaAtender';
import OdontologiaPlantRecetas from '../pages/business/Odontologia/OdontologiaPlantRecetas';
import OdontologiaHistorias from '../pages/business/Odontologia/OdontologiaHistorias';
import OdontologiaConfiguracion from '../pages/business/Odontologia/OdontologiaConfiguracion';
import OdontologiaReportes from '../pages/business/Odontologia/OdontologiaReportes';

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