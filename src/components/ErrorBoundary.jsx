import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">Terjadi Kesalahan Tampilan</h2>
            <p className="text-xs text-gray-500 mb-4">
              {this.state.error?.message || "Halaman mengalami kendala saat memuat data."}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0D1B4A] text-white rounded-xl text-xs font-semibold hover:bg-[#0D1B4A]/90 transition-all shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Muat Ulang
              </button>
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-all"
              >
                <Home className="w-3.5 h-3.5" /> Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
