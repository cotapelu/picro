"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorBoundary = void 0;
exports.useGlobalErrorHandler = useGlobalErrorHandler;
const jsx_runtime_1 = require("react/jsx-runtime");
/** @jsxImportSource react */
const react_1 = __importStar(require("react"));
const ink_1 = require("ink");
/**
 * ErrorBoundary - Catches JavaScript errors anywhere in the child component tree
 * and displays a fallback UI instead of crashing the app.
 */
class ErrorBoundary extends react_1.Component {
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
        // Log to stderr for debugging
        console.error('ErrorBoundary caught an error:', error);
        console.error('Component stack:', errorInfo.componentStack);
    }
    render() {
        if (this.state.hasError) {
            return ((0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", padding: 1, children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { bold: true, color: "red", children: "\u26A0\uFE0F Application Error" }), (0, jsx_runtime_1.jsx)(ink_1.Text, { color: "red", children: this.state.error?.message }), (0, jsx_runtime_1.jsx)(ink_1.Text, { dim: true, children: "Press any key to exit..." })] }));
        }
        return this.props.children;
    }
}
exports.ErrorBoundary = ErrorBoundary;
/**
 * Hook for handling global unhandled errors and unhandled rejections
 * Call this early in your app startup
 */
function useGlobalErrorHandler() {
    react_1.default.useEffect(() => {
        const handleError = (event) => {
            console.error('Global error:', event.error);
            // Optionally report to telemetry here
        };
        const handleUnhandledRejection = (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            // Optionally report to telemetry here
        };
        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, []);
}
//# sourceMappingURL=ErrorBoundary.js.map