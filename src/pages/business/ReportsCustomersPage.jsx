import { FiUsers } from 'react-icons/fi';
import UnderConstructionPage from './UnderConstructionPage';

export default function ReportsCustomersPage() {
  return (
    <UnderConstructionPage
      title="Reporte de Clientes"
      subtitle="Historial de compras, frecuencia y valor de clientes"
      icon={<FiUsers size={30} />}
      accentColor="#3b82f6"
    />
  );
}
