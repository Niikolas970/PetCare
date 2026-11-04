import EmptyState from '../components/EmptyState.jsx';
import PageHeader from '../components/PageHeader.jsx';

export default function ComingSoonPage({ title }) {
  return (
    <div className="page">
      <PageHeader title={title} />
      <EmptyState art="paw" title="Próximamente">
        Estamos preparando esta sección. Muy pronto podrás usarla desde aquí.
      </EmptyState>
    </div>
  );
}
