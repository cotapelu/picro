import { jsx, jsxs } from "react/jsx-runtime";
import React, { Component } from "react";
import { Box, Text } from "ink";
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    console.error("ErrorBoundary caught an error:", error);
    console.error("Component stack:", errorInfo.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", padding: 1, children: [
        /* @__PURE__ */ jsx(Text, { bold: true, color: "red", children: "\u26A0\uFE0F Application Error" }),
        /* @__PURE__ */ jsx(Text, { color: "red", children: this.state.error?.message }),
        /* @__PURE__ */ jsx(Text, { dim: true, children: "Press any key to exit..." })
      ] });
    }
    return this.props.children;
  }
}
function useGlobalErrorHandler() {
  React.useEffect(() => {
    const handleError = (event) => {
      console.error("Global error:", event.error);
    };
    const handleUnhandledRejection = (event) => {
      console.error("Unhandled promise rejection:", event.reason);
    };
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);
}
export {
  ErrorBoundary,
  useGlobalErrorHandler
};
