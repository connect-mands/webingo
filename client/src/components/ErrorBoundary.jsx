import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Unknown render error" };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card">
          <h1>Something went wrong</h1>
          <p>Refresh the page and try again.</p>
          {this.state.message && <pre className="error">{this.state.message}</pre>}
        </div>
      );
    }
    return this.props.children;
  }
}
