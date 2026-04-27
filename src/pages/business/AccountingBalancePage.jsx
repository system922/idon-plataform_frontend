import { FiTrendingUp } from 'react-icons/fi';
import UnderConstructionPage from './UnderConstructionPage';

export default function AccountingBalancePage() {
  return (
    <UnderConstructionPage
      title="Balance General"
      subtitle="Estado financiero: activos, pasivos y patrimonio del negocio"
      icon={<FiTrendingUp size={30} />}
      accentColor="#10b981"
    />
  );
}
