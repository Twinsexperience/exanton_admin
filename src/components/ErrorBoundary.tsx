import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

/**
 * Global React error boundary for the SuperAdmin SOC console.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || "Error inesperado en el panel SOC.",
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="center-screen">
          <div className="login-card" style={{ textAlign: "center" }}>
            <h2 style={{ marginBottom: 10 }}>Algo salió mal</h2>
            <p className="muted" style={{ marginBottom: 18 }}>
              {this.state.message}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Recargar Consola SOC
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
