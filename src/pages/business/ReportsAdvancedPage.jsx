import { FiBarChart2 } from 'react-icons/fi';
import UnderConstructionPage from './UnderConstructionPage';

export default function ReportsAdvancedPage() {
  return (
    <UnderConstructionPage
      title="Reportes Avanzados"
      subtitle="Analytics avanzado, tendencias y exportación de datos"
      icon={<FiBarChart2 size={30} />}
      accentColor="#3b82f6"
    />
  );
}
