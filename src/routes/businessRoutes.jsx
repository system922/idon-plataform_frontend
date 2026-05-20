/**
 * businessRoutes.jsx
 * Ubicación: src/routes/businessRoutes.jsx
 */

import { Route, Navigate } from 'react-router-dom';

import Settings            from '../pages/business/SettingsPage';
import BusinessHome        from '../pages/business/BusinessHome';
import Dashboard           from '../pages/business/DashboardPage';
import DashboardRetail      from '../pages/business/RetailDashboardPage';
import CoreUsersPage       from '../pages/business/UsersPage';
import CoreRolesPage       from '../pages/business/RolesPage';
import AuditLogs           from '../pages/business/AuditPage';


import AperturaCajaPage    from '../pages/business/PosAperturaCajaPage.jsx';
import ReceiptPrint        from '../pages/business/ReceiptPrintPage';
import Checkout            from '../pages/business/PosCheckoutPage';
import PosRetail           from '../pages/business/PosRetailPage';
import PosDiscounts from '../pages/business/PosDiscounts.jsx';


import Inventory           from '../pages/business/InventoryAdjustmentsPage';
import InventoryCategories from '../pages/business/InventoryCategoriesPage';
import InventoryProducts   from '../pages/business/InventoryProductsPage';
import InventoryPhysical   from '../pages/business/InventoryPhysicalPage';
import InventorySuppliers  from '../pages/business/InventorySuppliersPage';
import InventoryRecipes    from '../pages/business/InventoryRecipesPage';

import Order               from '../pages/business/OrderPage';
import OrderTable          from '../pages/business/OrdersTablesPage';
import OrderHistory        from '../pages/business/OrdersHistoryPage';
import OrdersKitchenScreenPage from '../pages/business/OrdersKitchenScreenPage';

import ExpensesCategory from '../pages/business/ExpensesCategories.jsx';
import ExpensesHistory from '../pages/business/ExpensesHistory.jsx';


import Attendance          from '../pages/business/EmployeesAttendancePage';
import Employees           from '../pages/business/EmployeesPage';
import EmployeesPayRoll    from '../pages/business/EmployeesPayRoll';
import Schedules           from '../pages/business/SchedulesPage';
import EmployeesLeaves     from '../pages/business/EmployeesLeaves';


import GenericFeaturePage  from '../pages/business/GenericFeaturePage';
import ProfilePage         from '../pages/ProfilePage';


import ReportsAdvancedPage    from '../pages/business/ReportsAdvancedPage';
import ReportsCustomersPage   from '../pages/business/ReportsCustomersPage';
import ReportsInventoryPage   from '../pages/business/ReportsInventoryPage';
import ReportProducts      from '../pages/business/ReportsProductsPage';
import ReportsSales        from '../pages/business/ReportsSalesPage';


import CRMCustomers          from '../pages/business/CRMCustomersPage';
import CRMEmail              from '../pages/business/CRMEmailPage';
import CRMAnalytics          from '../pages/business/CRMAnalyticsPage';
import CrmSegments           from '../pages/business/CrmSegments';


import AccountingBalancePage  from '../pages/business/AccountingBalancePage';
import AccountingReceivablePage from '../pages/business/AccountingReceivablePage';
import AccountingPayablePage  from '../pages/business/AccountingPayablePage';
import AccountingSriPage      from '../pages/business/AccountingSriPage';

import NotificationsPush       from '../pages/business/NotificationsPush';
import NotificationsScheduled from '../pages/business/NotificationsSchedulesPage';
import NotificationsEmail      from '../pages/business/NotificationsEmailPage';

import EinvoicingInvoicesPage    from '../pages/business/EinvoicingInvoicesPage';
import CreditNotes               from '../pages/business/CreditNotesPage';
import DebitNotes                from '../pages/business/DebitNotesPage';
import EinvoicingVoidPage        from '../pages/business/EinvoicingVoidPage';
import EinvoicingRemissionsPage  from '../pages/business/EinvoicingRemissionsPage';
import EinvoicingReportsPage     from '../pages/business/EinvoicingReportsPage';
import EinvoicingRetentionsPage  from '../pages/business/EinvoicingRetentionsPage';


function OwnerRoute({ children }) {
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('idonUser') || 'null'); }
    catch { return null; }
  })();
  if (user?.userType === 'schema_employee') {
    return <Navigate to="/app/pos/pos.sales" replace />;
  }
  return children;
}

export const businessRoutes = (
  <>
    {/* ── Home del panel ── */}
    <Route index element={<OwnerRoute><BusinessHome /></OwnerRoute>} />
    <Route path="dashboard" element={<OwnerRoute><Dashboard /></OwnerRoute>} />

    <Route path="profile"   element={<ProfilePage />} />

    {/* ────────────────────────────────────────────────
        NÚCLEO  /app/core
    ──────────────────────────────────────────────── */}
    <Route path="core"                          element={<GenericFeaturePage moduleName="Núcleo" />} />
    <Route path="core/core.settings"            element={<Settings />} />
    <Route path="core/core.dashboard"           element={<OwnerRoute><Dashboard /></OwnerRoute>} />
    <Route path="core/core.retail_dashboard"    element={<OwnerRoute><DashboardRetail /></OwnerRoute>} />
    <Route path="core/core.users"               element={<CoreUsersPage />} />
    <Route path="core/core.roles"               element={<CoreRolesPage />} />
    <Route path="core/gestion-de-sucursales"    element={<GenericFeaturePage moduleName="Núcleo" featureName="Gestión de sucursales" />} />
    <Route path="core/core.audit_log"           element={<AuditLogs />} />
    <Route path="core/:feature"                 element={<GenericFeaturePage moduleName="Núcleo" />} />

    {/* ────────────────────────────────────────────────
        PUNTO DE VENTA  /app/pos
    ──────────────────────────────────────────────── */}
    
    <Route path="pos/apertura-caja"              element={<AperturaCajaPage onAperturaCompleta={() => {}} />} />
    <Route path="pos/pos.einvoicing"             element={<EinvoicingInvoicesPage />} />
    <Route path="pos/pos.receipt_print"          element={<ReceiptPrint />} />
    <Route path="pos/pos.sales"                  element={<Checkout />} />
    <Route path="pos/pos.retail"                 element={<PosRetail />} />
    <Route path="pos/cotizaciones"               element={<GenericFeaturePage moduleName="Punto de Venta" featureName="Cotizaciones" />} />
    <Route path="pos/pos.discounts"              element={<PosDiscounts/>} />
    <Route path="pos/devoluciones-y-cambios"     element={<GenericFeaturePage moduleName="Punto de Venta" featureName="Devoluciones y cambios" />} />
    <Route path="pos/:feature"                   element={<GenericFeaturePage moduleName="Punto de Venta" />} />

    {/* ────────────────────────────────────────────────
        INVENTARIO  /app/inventory
    ──────────────────────────────────────────────── */}
    <Route path="inventory"                              element={<GenericFeaturePage moduleName="Inventario" />} />
    <Route path="inventory/inventory.adjustments"        element={<Inventory />} />
    <Route path="inventory/inventory.categories"         element={<InventoryCategories />} />
    <Route path="inventory/inventory.products"           element={<InventoryProducts />} />
    <Route path="inventory/inventory.physical"           element={<InventoryPhysical />} />
    <Route path="inventory/inventory.suppliers"          element={<InventorySuppliers />} />
    <Route path="inventory/inventory.recipes"            element={<InventoryRecipes />} />
    <Route path="inventory/:feature"                     element={<GenericFeaturePage moduleName="Inventario" />} />

    {/* ────────────────────────────────────────────────
        REPORTES  /app/reports
    ──────────────────────────────────────────────── */}
    <Route path="reports"                            element={<GenericFeaturePage moduleName="Reportes" />} />
    <Route path="reports/reports.advanced"           element={<ReportsAdvancedPage />} />
    <Route path="reports/reports.customers"          element={<ReportsCustomersPage />} />
    <Route path="reports/reports.inventory"          element={<ReportsInventoryPage />} />
    <Route path="reports/reports.products"           element={<ReportProducts />} />
    <Route path="reports/reports.sales"              element={<ReportsSales />} />
    <Route path="reports/reporte-de-ganancias"       element={<GenericFeaturePage moduleName="Reportes" featureName="Reporte de ganancias" />} />
    <Route path="reports/reporte-de-turnos"          element={<GenericFeaturePage moduleName="Reportes" featureName="Reporte de turnos" />} />
    <Route path="reports/reporte-por-cajero"         element={<GenericFeaturePage moduleName="Reportes" featureName="Reporte por cajero" />} />
    <Route path="reports/:feature"                   element={<GenericFeaturePage moduleName="Reportes" />} />

    {/* ────────────────────────────────────────────────
        PAGOS  /app/payments
    ──────────────────────────────────────────────── */}
    <Route path="payments"                    element={<GenericFeaturePage moduleName="Pagos" />} />
    <Route path="payments/:feature"           element={<GenericFeaturePage moduleName="Pagos" />} />

    {/* ────────────────────────────────────────────────
        CONTABILIDAD  /app/accounting
    ──────────────────────────────────────────────── */}
    <Route path="accounting"                          element={<GenericFeaturePage moduleName="Contabilidad" />} />
    <Route path="accounting/accounting.balance"       element={<AccountingBalancePage />} />
    <Route path="accounting/accounting.receivable"    element={<AccountingReceivablePage />} />
    <Route path="accounting/accounting.payable"       element={<AccountingPayablePage />} />
    <Route path="accounting/accounting.sri"           element={<AccountingSriPage />} />
    <Route path="accounting/:feature"                 element={<GenericFeaturePage moduleName="Contabilidad" />} />

    {/* ────────────────────────────────────────────────
        GESTIÓN DE ÓRDENES  /app/orders
    ──────────────────────────────────────────────── */}
    <Route path="orders/orders.create"        element={<Order />} />
    <Route path="orders/orders.table"         element={<OrderTable />} />
    <Route path="orders/orders.tables"        element={<OrderTable />} />
    <Route path="orders/orders.history"       element={<OrderHistory />} />
    <Route path="orders/orders.kitchen_screen" element={<OrdersKitchenScreenPage />} />
    <Route path="orders/:feature"             element={<GenericFeaturePage moduleName="Gestión de Órdenes" />} />

    {/* ────────────────────────────────────────────────
        COCINA  /app/kitchen
    ──────────────────────────────────────────────── */}
    <Route path="kitchen"                     element={<GenericFeaturePage moduleName="Cocina" />} />
    <Route path="kitchen/kitchen.kds"         element={<OrdersKitchenScreenPage />} />
    <Route path="kitchen/:feature"            element={<GenericFeaturePage moduleName="Cocina" />} />

    {/* ────────────────────────────────────────────────
        DELIVERY  /app/delivery
    ──────────────────────────────────────────────── */}
    <Route path="delivery"                    element={<GenericFeaturePage moduleName="Delivery" />} />
    <Route path="delivery/:feature"           element={<GenericFeaturePage moduleName="Delivery" />} />

    {/* ────────────────────────────────────────────────
        MESAS  /app/tables
    ──────────────────────────────────────────────── */}
    <Route path="tables"                      element={<GenericFeaturePage moduleName="Mesas" />} />
    <Route path="tables/:feature"             element={<GenericFeaturePage moduleName="Mesas" />} />

    {/* ────────────────────────────────────────────────
        RESERVAS  /app/reservations
    ──────────────────────────────────────────────── */}
    <Route path="reservations"                element={<GenericFeaturePage moduleName="Reservas" />} />
    <Route path="reservations/:feature"       element={<GenericFeaturePage moduleName="Reservas" />} />

    {/* ────────────────────────────────────────────────
        FIDELIZACIÓN  /app/loyalty
    ──────────────────────────────────────────────── */}
    <Route path="loyalty"                     element={<GenericFeaturePage moduleName="Fidelización" />} />
    <Route path="loyalty/:feature"            element={<GenericFeaturePage moduleName="Fidelización" />} />

    {/* ────────────────────────────────────────────────
        PROVEEDORES  /app/suppliers
    ──────────────────────────────────────────────── */}
    <Route path="suppliers"                   element={<GenericFeaturePage moduleName="Proveedores" />} />
    <Route path="suppliers/:feature"          element={<GenericFeaturePage moduleName="Proveedores" />} />

    {/* ────────────────────────────────────────────────
        COMPRAS-GASTOS  /app/purchases
    ──────────────────────────────────────────────── */}
    <Route path="purchases/purchases.categories" element={<ExpensesCategory/>} />
    <Route path="purchases/purchases.history" element={<ExpensesHistory />} />
    <Route path="purchases/:feature"          element={<GenericFeaturePage moduleName="Compras" />} />

    {/* ────────────────────────────────────────────────
        CITAS  /app/appointments
    ──────────────────────────────────────────────── */}
    <Route path="appointments"                element={<GenericFeaturePage moduleName="Citas" />} />
    <Route path="appointments/:feature"       element={<GenericFeaturePage moduleName="Citas" />} />

    {/* ────────────────────────────────────────────────
        EMPLEADOS  /app/employees
    ──────────────────────────────────────────────── */}
    <Route path="employees/employees.payroll"     element={<EmployeesPayRoll />} />
    <Route path="employees/employees.manage"     element={<Employees />} />
    <Route path="employees/employees.attendance" element={<Attendance />} />
    <Route path="employees/employees.schedules"  element={<Schedules />} />
    <Route path="employees/employees.leaves"     element={<EmployeesLeaves />} />
    <Route path="employees/:feature"             element={<GenericFeaturePage moduleName="Empleados" />} />

    {/* ────────────────────────────────────────────────
        CRM  /app/crm
    ──────────────────────────────────────────────── */}
    <Route path="crm/crm.customers"           element={<CRMCustomers />} />
    <Route path="crm/crm.email"               element={<CRMEmail />} />
    <Route path="crm/crm.analytics"           element={<CRMAnalytics />} />
    <Route path="crm/crm.segments"            element={<CrmSegments />} />


    {/* ────────────────────────────────────────────────
        RUTAS  /app/routes
    ──────────────────────────────────────────────── */}
    <Route path="routes"                      element={<GenericFeaturePage moduleName="Rutas" />} />
    <Route path="routes/:feature"             element={<GenericFeaturePage moduleName="Rutas" />} />

    {/* ────────────────────────────────────────────────
        TRACKING  /app/tracking
    ──────────────────────────────────────────────── */}
    <Route path="tracking"                    element={<GenericFeaturePage moduleName="Tracking" />} />
    <Route path="tracking/:feature"           element={<GenericFeaturePage moduleName="Tracking" />} />

    {/* ────────────────────────────────────────────────
        COLA  /app/queue
    ──────────────────────────────────────────────── */}
    <Route path="queue"                       element={<GenericFeaturePage moduleName="Cola de Atención" />} />
    <Route path="queue/:feature"              element={<GenericFeaturePage moduleName="Cola de Atención" />} />

    {/* ────────────────────────────────────────────────
        E-COMMERCE  /app/ecommerce
    ──────────────────────────────────────────────── */}
    <Route path="ecommerce"                   element={<GenericFeaturePage moduleName="E-commerce" />} />
    <Route path="ecommerce/:feature"          element={<GenericFeaturePage moduleName="E-commerce" />} />

    {/* ────────────────────────────────────────────────
        NOTIFICACIONES  /app/notifications
    ──────────────────────────────────────────────── */}
    <Route path="notifications/notifications.push" element={<NotificationsPush />} />
    <Route path="notifications/notifications.scheduled" element={<NotificationsScheduled />} />
    <Route path="notifications/notifications.email"      element={<NotificationsEmail />} />

    {/* ────────────────────────────────────────────────
        FACTURACIÓN ELECTRÓNICA  /app/einvoicing
    ──────────────────────────────────────────────── */}
    <Route path="einvoicing/einvoicing.status"          element={<EinvoicingInvoicesPage />} />
    <Route path="einvoicing/einvoicing.credit_notes"    element={<CreditNotes />} />
    <Route path="einvoicing/einvoicing.debit_notes"     element={<DebitNotes />} />
    <Route path="einvoicing/einvoicing.void"            element={<EinvoicingVoidPage />} />
    <Route path="einvoicing/einvoicing.remissions"      element={<EinvoicingRemissionsPage />} />
    <Route path="einvoicing/einvoicing.reports"         element={<EinvoicingReportsPage />} />
    <Route path="einvoicing/einvoicing.retentions"      element={<EinvoicingRetentionsPage />} />


    {/* ── Catch-all ── */}
    <Route path=":module"          element={<GenericFeaturePage />} />
    <Route path=":module/:feature" element={<GenericFeaturePage />} />
  </>
);