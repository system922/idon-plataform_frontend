import { FiPackage } from 'react-icons/fi';
import UnderConstructionPage from './UnderConstructionPage';

export default function ReportsInventoryPage() {
  return (
    <UnderConstructionPage
      title="Reporte de Inventario"
      subtitle="Valoración de stock, movimientos y rotación de productos"
      icon={<FiPackage size={30} />}
      accentColor="#3b82f6"
    />
  );
}
