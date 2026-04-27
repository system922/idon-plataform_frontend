import { FiCreditCard } from 'react-icons/fi';
import UnderConstructionPage from './UnderConstructionPage';

export default function AccountingExpensesPage() {
  return (
    <UnderConstructionPage
      title="Gastos"
      subtitle="Registro y categorización de gastos operativos del negocio"
      icon={<FiCreditCard size={30} />}
      accentColor="#10b981"
    />
  );
}
