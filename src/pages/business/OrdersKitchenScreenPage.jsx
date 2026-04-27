import { FiMonitor } from 'react-icons/fi';
import UnderConstructionPage from './UnderConstructionPage';

export default function OrdersKitchenScreenPage() {
  return (
    <UnderConstructionPage
      title="Pantalla de Cocina"
      subtitle="Visualización en tiempo real de órdenes pendientes de preparación"
      icon={<FiMonitor size={30} />}
      accentColor="#f59e0b"
    />
  );
}
