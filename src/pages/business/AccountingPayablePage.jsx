import { FiFileText } from 'react-icons/fi';
import UnderConstructionPage from './UnderConstructionPage';

export default function AccountingPayablePage() {
  return (
    <UnderConstructionPage
      title="Cuentas por Pagar"
      subtitle="Gestión de obligaciones y pagos pendientes a proveedores"
      icon={<FiFileText size={30} />}
      accentColor="#10b981"
    />
  );
}
