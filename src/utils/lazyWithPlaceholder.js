import React, { lazy, Suspense } from 'react';
import LoadingOverlay from '../components/General/LoadingOverlay';

class LazyErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="route-loading-placeholder">
          <h3>Error al cargar {this.props.moduleName}</h3>
          <button type="button" onClick={() => window.location.reload()}>
            Recargar página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function lazyWithPlaceholder(importFn, moduleName = '') {
  const LazyComponent = lazy(importFn);

  return function LazyWrapper(props) {
    return (
      <LazyErrorBoundary moduleName={moduleName}>
        <Suspense
          fallback={
            <div className="route-loading-placeholder">
              <LoadingOverlay message={`Cargando ${moduleName}...`} />
            </div>
          }
        >
          <LazyComponent {...props} />
        </Suspense>
      </LazyErrorBoundary>
    );
  };
}