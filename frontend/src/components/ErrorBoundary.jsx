import React from 'react';

class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-main">
          <div className="alert alert-error">
            <h2>Something went wrong</h2>
            <p>{this.state.error.message || 'The page could not be displayed.'}</p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload page</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
