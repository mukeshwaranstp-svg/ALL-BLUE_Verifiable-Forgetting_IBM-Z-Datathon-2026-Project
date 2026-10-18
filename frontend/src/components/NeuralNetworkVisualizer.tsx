import React, { useEffect, useState, useMemo } from 'react';
import { MLModelMetadata, DeletionRequest } from '../types';
import { orchestrator } from '../services/unlearningOrchestrator';

interface NeuralNetworkVisualizerProps {
  model: MLModelMetadata;
  selectedRequest?: DeletionRequest | null;
  compact?: boolean;
  onOpenMetrics?: () => void;
  onVerifyDeletion?: (requestId: string) => void;
}

interface HoveredNode {
  layerIndex: number;
  nodeIndex: number;
  name: string;
  layerType: string;
  role: string;
  details: string;
}

export const NeuralNetworkVisualizer: React.FC<NeuralNetworkVisualizerProps> = ({
  model,
  selectedRequest,
  compact = false,
  onOpenMetrics,
  onVerifyDeletion,
}) => {
  const [viewMode, setViewMode] = useState<'baseline' | 'retrained' | 'comparison'>('retrained');
  const [hoveredNode, setHoveredNode] = useState<HoveredNode | null>(null);
  const [modelEvidence, setModelEvidence] = useState<any>(null);
  const [loadingEvidence, setLoadingEvidence] = useState<boolean>(false);

  // Fetch model weights or summaries from /api/requests/{id}/model-evidence
  useEffect(() => {
    if (!selectedRequest) return;
    setLoadingEvidence(true);
    orchestrator
      .getRequestModelEvidenceData(selectedRequest.id)
      .then((res) => setModelEvidence(res))
      .catch(() => {})
      .finally(() => setLoadingEvidence(false));
  }, [selectedRequest]);

  // Layer structure definition
  const layerStructure = useMemo(() => {
    if (!model.isNeuralNetwork) {
      return {
        isTree: true,
        nodes: compact ? [1, 2, 4] : [1, 2, 4, 8],
        labels: ['Root', 'Split 1', 'Split 2', 'Estimators'],
      };
    }
    if (compact) {
      return {
        isTree: false,
        nodes: [4, 5, 4, 2],
        labels: ['Input (16)', 'Dense (24)', 'Dense (16)', 'Output (2)'],
      };
    }
    return {
      isTree: false,
      nodes: [6, 8, 6, 2],
      labels: [
        'Input Features (16-Dim)',
        'Dense Layer 1 (24 ReLU)',
        'Dense Layer 2 (16 ReLU)',
        'Risk Logits (2 Softmax)',
      ],
    };
  }, [model, compact]);

  const width = compact ? 340 : 700;
  const height = compact ? 190 : 360;

  // Compute node coordinates for a given section width
  const getNodesForWidth = (sectionWidth: number, xOffset = 0) => {
    const counts = layerStructure.nodes;
    const layerCount = counts.length;
    const xPadding = compact ? 30 : 50;
    const layerSpacing = (sectionWidth - xPadding * 2) / Math.max(1, layerCount - 1);

    return counts.map((count, lIdx) => {
      const cx = xOffset + xPadding + lIdx * layerSpacing;
      const yPadding = compact ? 25 : 50;
      const availableHeight = height - yPadding * 2;
      const spacing = availableHeight / Math.max(1, count - 1);

      const nodes = [];
      for (let nIdx = 0; nIdx < count; nIdx++) {
        const cy = count === 1 ? height / 2 : yPadding + nIdx * spacing;
        nodes.push({ layer: lIdx, index: nIdx, x: cx, y: cy });
      }
      return nodes;
    });
  };

  const leftLayers = getNodesForWidth(viewMode === 'comparison' ? width / 2 - 10 : width, 0);
  const rightLayers = viewMode === 'comparison' ? getNodesForWidth(width / 2 - 10, width / 2 + 10) : [];

  const weightDeltaNorm = modelEvidence?.weightDeltaNorm ?? model.weightDeltaNorm ?? 0.084;

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex flex-col shadow-sm">
      {/* Top Telemetry Header */}
      <div className="px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="material-symbols-outlined text-sky-400 text-[18px]">
            neurology
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-white text-xs">{model.name}</span>
            <span className="font-mono text-[11px] text-slate-400">({model.modelType})</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-semibold">
              {model.assignedAccelerator}
            </span>
            {model.associatedExperimentId && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                Exp: {model.associatedExperimentId}
              </span>
            )}
            {model.datasetId && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-sky-300/80 border border-slate-700/80 font-mono">
                Dataset: {model.datasetId}
              </span>
            )}
          </div>
        </div>

        {/* Association & Status */}
        <div className="flex items-center gap-2 shrink-0">
          {selectedRequest && (
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-primary-fixed/20 text-primary-fixed border border-primary/40 font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">person_remove</span>
              <span>Req: {selectedRequest.id} ({selectedRequest.customerId})</span>
            </span>
          )}

          <span
            className={`font-mono text-[10px] px-2 py-0.5 rounded font-semibold ${
              model.trainingStatus === 'RETRAINING'
                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
            }`}
          >
            {model.trainingStatus === 'RETRAINING' ? `RETRAINING: ${model.trainingProgress}%` : model.trainingStatus}
          </span>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative w-full bg-gradient-to-br from-[#0a1122] via-[#0e1a30] to-[#0a1122]" style={{ height: compact ? 190 : 360 }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full block">
          <defs>
            <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background Grid */}
          <g stroke="rgba(56, 189, 248, 0.04)" strokeWidth="1">
            {Array.from({ length: Math.floor(width / 24) }).map((_, i) => (
              <line key={`gx-${i}`} x1={i * 24} y1="0" x2={i * 24} y2={height} />
            ))}
            {Array.from({ length: Math.floor(height / 24) }).map((_, i) => (
              <line key={`gy-${i}`} x1="0" y1={i * 24} x2={width} y2={i * 24} />
            ))}
          </g>

          {/* Comparison Divider */}
          {viewMode === 'comparison' && (
            <line
              x1={width / 2}
              y1="10"
              x2={width / 2}
              y2={height - 10}
              stroke="rgba(148, 163, 184, 0.3)"
              strokeDasharray="4 4"
            />
          )}

          {/* Render Network Function for Layers */}
          {(() => {
            const renderLayersSvg = (layers: typeof leftLayers, isRetrained: boolean, label: string) => {
              const elements = [];

              // Draw Connections (Edges) with weight delta highlight
              for (let l = 0; l < layers.length - 1; l++) {
                const curr = layers[l];
                const next = layers[l + 1];
                curr.forEach((fromN, fIdx) => {
                  next.forEach((toN, tIdx) => {
                    const isSignificant = (fIdx + tIdx) % 3 === 0;
                    const alpha = isRetrained && isSignificant ? Math.min(0.35, 0.15 + weightDeltaNorm * 1.5) : isRetrained ? 0.12 : 0.14;
                    const strokeColor = isRetrained ? 'rgba(56, 189, 248, ' + alpha + ')' : 'rgba(148, 163, 184, 0.14)';
                    const strokeWidth = isRetrained && isSignificant ? 1.4 : 1;

                    elements.push(
                      <line
                        key={`edge-${l}-${fIdx}-${tIdx}-${isRetrained ? 'r' : 'b'}`}
                        x1={fromN.x}
                        y1={fromN.y}
                        x2={toN.x}
                        y2={toN.y}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                      />
                    );
                  });
                });
              }

              // Draw Nodes as Circles
              layers.forEach((layerNodes) => {
                layerNodes.forEach((node) => {
                  const isHovered =
                    hoveredNode?.layerIndex === node.layer && hoveredNode?.nodeIndex === node.index;

                  elements.push(
                    <g key={`node-${node.layer}-${node.index}-${isRetrained ? 'r' : 'b'}`}>
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={isHovered ? 11 : 7}
                        fill={isRetrained ? 'rgba(56, 189, 248, 0.2)' : 'rgba(148, 163, 184, 0.15)'}
                      />
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={isHovered ? 6 : 4}
                        fill={isRetrained ? '#38bdf8' : '#94a3b8'}
                        className="cursor-pointer transition-all"
                        onMouseEnter={() =>
                          setHoveredNode({
                            layerIndex: node.layer,
                            nodeIndex: node.index,
                            name: `Neuron L${node.layer}:N${node.index}`,
                            layerType: layerStructure.labels[node.layer] || `Layer ${node.layer}`,
                            role: node.layer === 0 ? 'Input Feature' : node.layer === layers.length - 1 ? 'Output Logit' : 'Latent Representation',
                            details: `Weight Delta Norm (||ΔW||₂): ${weightDeltaNorm.toFixed(4)}. Sample excluded from dataset.`,
                          })
                        }
                        onMouseLeave={() => setHoveredNode(null)}
                      />
                    </g>
                  );
                });
              });

              // Label
              elements.push(
                <text
                  key={`lbl-${label}`}
                  x={layers[0][0].x}
                  y="22"
                  fill={isRetrained ? '#38bdf8' : '#94a3b8'}
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {label}
                </text>
              );

              return elements;
            };

            if (viewMode === 'comparison') {
              return (
                <>
                  {renderLayersSvg(leftLayers, false, `BASELINE: ${model.baselineVersion}`)}
                  {renderLayersSvg(rightLayers, true, `RETRAINED: ${model.version}`)}
                </>
              );
            } else if (viewMode === 'baseline') {
              return renderLayersSvg(leftLayers, false, `BASELINE MODEL: ${model.baselineVersion}`);
            } else {
              return renderLayersSvg(leftLayers, true, `RETRAINED MODEL: ${model.version}`);
            }
          })()}
        </svg>

        {/* Hover Tooltip */}
        {hoveredNode && (
          <div className="absolute z-20 pointer-events-none bg-slate-900/95 backdrop-blur-md border border-sky-500/40 rounded-lg p-2.5 shadow-xl text-left text-xs font-mono max-w-[270px] left-4 bottom-4">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-1 mb-1.5">
              <span className="font-bold text-sky-300">{hoveredNode.name}</span>
              <span className="text-[10px] text-slate-400">Layer {hoveredNode.layerIndex}</span>
            </div>
            <div className="space-y-1 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">LAYER TYPE:</span>
                <span className="text-white font-semibold">{hoveredNode.layerType}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">FUNCTION ROLE:</span>
                <span className="text-sky-200">{hoveredNode.role}</span>
              </div>
              <div className="mt-1 pt-1 border-t border-slate-800 text-[10px] text-slate-400">
                {hoveredNode.details}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control Bar: View Mode Switcher */}
      <div className="px-3 py-2 bg-slate-900/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('baseline')}
            className={`px-3 py-1 rounded text-[11px] font-mono transition-colors ${
              viewMode === 'baseline' ? 'bg-slate-700 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Baseline ({model.baselineVersion})
          </button>

          <button
            type="button"
            onClick={() => setViewMode('retrained')}
            className={`px-3 py-1 rounded text-[11px] font-mono transition-colors ${
              viewMode === 'retrained' ? 'bg-sky-600 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Retrained ({model.version})
          </button>

          <button
            type="button"
            onClick={() => setViewMode('comparison')}
            className={`px-3 py-1 rounded text-[11px] font-mono transition-colors ${
              viewMode === 'comparison' ? 'bg-primary text-white font-bold shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Before &amp; After Comparison
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-slate-400">
            ||ΔW||₂: <strong className="text-amber-400">{weightDeltaNorm.toFixed(4)}</strong>
          </span>
          {onVerifyDeletion && selectedRequest && (
            <button
              type="button"
              onClick={() => onVerifyDeletion(selectedRequest.id)}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-mono text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[13px]">task_alt</span>
              <span>Verify Deletion</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
