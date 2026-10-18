import React, { useState } from 'react';
import { orchestrator } from '../services/unlearningOrchestrator';
import { apiClient } from '../services/apiClient';

export const SettingsView: React.FC = () => {
  const [backendUrl, setBackendUrl] = useState<string>(apiClient.getBaseUrl() || 'http://localhost:8000');
  const [dpEpsilon, setDpEpsilon] = useState<number>(1.18);
  const [noiseMultiplier, setNoiseMultiplier] = useState<number>(1.25);
  const [isConnecting, setIsConnecting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestAndConnect = async () => {
    setIsConnecting(true);
    setTestResult(null);

    try {
      apiClient.setBaseUrl(backendUrl);
      const health = await apiClient.checkHealth();
      await orchestrator.connectBackend(backendUrl);
      setTestResult({
        success: true,
        message: `Connected successfully! Service status: ${health.status}, version: ${health.version}, target: ${health.enclaveTarget || 'FastAPI Unlearning'}.`,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Connection failed: ${err.message}. Check if your FastAPI server is running with CORS enabled.`,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSwitchToTestbed = () => {
    orchestrator.switchToFixtureMode();
    setTestResult({
      success: true,
      message: 'Switched to Datathon Synthetic Testbed Sandbox Mode.',
    });
  };

  const handleResetData = () => {
    if (window.confirm('Reset local sandbox state to default synthetic dataset?')) {
      orchestrator.resetToDefault();
      alert('Local testbed state has been reset.');
    }
  };

  const currentStatus = orchestrator.getConnectionStatus();

  return (
    <div className="flex flex-col w-full gap-space-md">
      {/* Header */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">tune</span>
            <h1 className="font-headline-md text-headline-md text-on-surface font-bold">
              Enclave &amp; Backend Configuration
            </h1>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Configure FastAPI orchestrator integration URL, connection status, and unlearning parameters.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`font-mono text-xs px-2.5 py-1 rounded font-bold ${
              currentStatus === 'CONNECTED'
                ? 'bg-emerald-100 text-emerald-800'
                : currentStatus === 'DISCONNECTED'
                ? 'bg-error-container text-on-error-container'
                : 'bg-primary-fixed text-primary'
            }`}
          >
            {currentStatus === 'CONNECTED'
              ? 'FastAPI Connected'
              : currentStatus === 'DISCONNECTED'
              ? 'Backend Disconnected'
              : 'Synthetic Testbed Mode'}
          </span>
        </div>
      </div>

      {/* Backend API Integration Section */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-outline-variant/30 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">dns</span>
            <h2 className="font-headline-sm text-on-surface font-bold">
              FastAPI Unlearning Backend Endpoint
            </h2>
          </div>
          <span className="text-[11px] font-mono text-on-surface-variant">
            Env: VITE_API_BASE_URL
          </span>
        </div>

        <p className="text-body-sm text-on-surface-variant text-xs">
          Connect this React interface to your real FastAPI backend service. The backend must expose
          the documented endpoints (<code>/health</code>, <code>/api/v1/customers</code>, <code>/api/v1/deletions</code>, etc.)
          and enable CORS for this client origin.
        </p>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-on-surface block">
            Backend Base URL:
          </label>
          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            <input
              type="text"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="http://localhost:8000 or https://your-backend.run.app"
              className="flex-1 px-3 py-2 text-xs rounded-lg bg-surface-container-low border border-outline-variant/40 text-on-surface font-mono focus:outline-none focus:border-primary"
            />
            <button
              onClick={handleTestAndConnect}
              disabled={isConnecting || !backendUrl.trim()}
              className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-container disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs shrink-0"
            >
              {isConnecting ? (
                <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-[16px]">cable</span>
              )}
              <span>Test &amp; Connect API</span>
            </button>
            <button
              onClick={handleSwitchToTestbed}
              className="px-3 py-2 bg-surface-container hover:bg-surface-container-high rounded-lg text-xs font-semibold text-on-surface transition-colors shrink-0"
            >
              Switch to Sandbox Testbed
            </button>
          </div>
        </div>

        {testResult && (
          <div
            className={`p-3 rounded-lg border text-xs ${
              testResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-900 dark:text-emerald-200'
                : 'bg-error-container/30 border-error/40 text-on-surface'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              <span className="material-symbols-outlined text-[18px]">
                {testResult.success ? 'check_circle' : 'error'}
              </span>
              <span>{testResult.message}</span>
            </div>
          </div>
        )}
      </div>

      {/* DP-SGD Parameters Section */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-outline-variant/30 space-y-4">
        <h2 className="font-headline-sm text-on-surface font-bold">
          Differential Privacy (DP-SGD) Hyperparameters (Specification)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-on-surface">
              Target Epsilon Budget (ε): {dpEpsilon}
            </label>
            <input
              type="range"
              min="0.5"
              max="4.0"
              step="0.05"
              value={dpEpsilon}
              onChange={(e) => setDpEpsilon(parseFloat(e.target.value))}
              className="w-full"
            />
            <span className="text-[11px] text-on-surface-variant block">
              Lower ε provides stronger privacy bounds during DP-SGD gradient perturbation.
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-on-surface">
              DP Noise Multiplier (σ): {noiseMultiplier}
            </label>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.05"
              value={noiseMultiplier}
              onChange={(e) => setNoiseMultiplier(parseFloat(e.target.value))}
              className="w-full"
            />
            <span className="text-[11px] text-on-surface-variant block">
              Gaussian noise multiplier calibrated for batch retraining.
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-between">
          <button
            onClick={handleResetData}
            className="px-3 py-1.5 text-xs text-error font-semibold hover:bg-error-container/30 rounded border border-error/30"
          >
            Reset Sandbox Data to Defaults
          </button>
        </div>
      </div>
    </div>
  );
};
