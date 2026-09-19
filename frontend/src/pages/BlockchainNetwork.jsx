import React, { useState, useEffect, useRef } from 'react';
import { 
  Network, 
  Info, 
  ShieldAlert, 
  ShieldCheck, 
  Activity, 
  Layers,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { getNetworkGraph } from '../services/api';

export default function BlockchainNetwork({ onInspectAccount }) {
  const [networkData, setNetworkData] = useState({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        const data = await getNetworkGraph();
        setNetworkData(data);
        if (data.nodes.length > 0) {
          // Select first suspicious or high-risk node by default
          const defaultNode = data.nodes.find(n => n.type === 'high_risk') || data.nodes[0];
          setSelectedNode(defaultNode);
        }
      } catch (err) {
        console.error('Failed to load network graph', err);
      }
    };
    fetchGraph();
  }, []);

  // Force-directed / orbit canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || networkData.nodes.length === 0) return;
    const ctx = canvas.getContext('2d');

    let width = canvas.parentElement.clientWidth;
    let height = 520;
    canvas.width = width;
    canvas.height = height;

    // Layout node coordinates around center
    const centerX = width / 2;
    const centerY = height / 2;

    const nodePositions = {};
    const n = networkData.nodes.length;

    networkData.nodes.forEach((node, i) => {
      const angle = (i / n) * 2 * Math.PI;
      // High-risk nodes orbit closer to periphery or dedicated cluster
      const radius = node.type === 'high_risk' ? 180 : node.type === 'suspicious' ? 120 : 70 + (i % 3) * 35;
      nodePositions[node.id] = {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        baseAngle: angle,
        radius: radius,
        speed: 0.001 * (i % 2 === 0 ? 1 : -1)
      };
    });

    let pulseStep = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle background grid
      ctx.strokeStyle = 'rgba(35, 50, 86, 0.25)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      pulseStep += 0.02;

      // Draw Edges
      networkData.edges.forEach((edge) => {
        const p1 = nodePositions[edge.source];
        const p2 = nodePositions[edge.target];
        if (!p1 || !p2) return;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);

        if (edge.type === 'threat') {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
          ctx.lineWidth = 2;
        } else if (edge.type === 'suspicious') {
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
          ctx.lineWidth = 1.5;
        } else {
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
          ctx.lineWidth = 1;
        }
        ctx.stroke();

        // Pulsing transaction dot
        const t = (Math.sin(pulseStep + (p1.x % 10)) + 1) / 2;
        const dotX = p1.x + (p2.x - p1.x) * t;
        const dotY = p1.y + (p2.y - p1.y) * t;

        ctx.fillStyle = edge.type === 'threat' ? '#ef4444' : '#06b6d4';
        ctx.beginPath();
        ctx.arc(dotX, dotY, 2.5, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Draw Nodes
      networkData.nodes.forEach((node) => {
        const pos = nodePositions[node.id];
        if (!pos) return;

        const isSelected = selectedNode?.id === node.id;
        const isHovered = hoveredNode?.id === node.id;

        let fillColor = '#10b981'; // normal
        let glowColor = 'rgba(16, 185, 129, 0.4)';

        if (node.type === 'high_risk') {
          fillColor = '#ef4444';
          glowColor = 'rgba(239, 68, 68, 0.6)';
        } else if (node.type === 'suspicious') {
          fillColor = '#f59e0b';
          glowColor = 'rgba(245, 158, 11, 0.5)';
        }

        // Glowing outer halo
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, isSelected ? 22 : isHovered ? 18 : 14, 0, 2 * Math.PI);
        ctx.fillStyle = glowColor;
        ctx.fill();

        // Core Circle
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, isSelected ? 12 : 9, 0, 2 * Math.PI);
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Node Label
        ctx.font = isSelected ? 'bold 11px JetBrains Mono' : '10px Plus Jakarta Sans';
        ctx.fillStyle = isSelected ? '#ffffff' : '#94a3b8';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, pos.x, pos.y + (isSelected ? 28 : 22));
      });

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    // Canvas click handler
    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      let found = null;
      networkData.nodes.forEach((node) => {
        const pos = nodePositions[node.id];
        if (!pos) return;
        const dist = Math.hypot(clickX - pos.x, clickY - pos.y);
        if (dist < 20) {
          found = node;
        }
      });

      if (found) {
        setSelectedNode(found);
      }
    };

    canvas.addEventListener('click', handleClick);

    return () => {
      cancelAnimationFrame(animationRef.current);
      canvas.removeEventListener('click', handleClick);
    };
  }, [networkData, selectedNode, hoveredNode]);

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 className="page-title">
          <Network size={26} color="#06b6d4" />
          Blockchain Transaction Network Topology
        </h2>
        <p className="page-subtitle">
          Behavioral affinity clustering & decentralized counterparty flow graph
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
        {/* Canvas Visualizer Card */}
        <div className="cyber-card" style={{ padding: '1rem', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', padding: '0 0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#34d399' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                Normal Wallets
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#fbbf24' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                Suspicious Funnels
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#f87171' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                High-Risk Exploit/Sweeper Bots
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Click any node to inspect telemetry
            </div>
          </div>

          <canvas 
            ref={canvasRef} 
            style={{ width: '100%', height: '520px', background: '#090d18', borderRadius: '8px', cursor: 'pointer' }}
          />
        </div>

        {/* Node Inspector Drawer */}
        <div className="cyber-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Info size={18} color="#06b6d4" />
            Node Telemetry Inspector
          </h3>

          {selectedNode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
              <div style={{
                padding: '1rem',
                borderRadius: '8px',
                background: selectedNode.type === 'high_risk' ? 'rgba(239, 68, 68, 0.1)' : selectedNode.type === 'suspicious' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                border: `1px solid ${selectedNode.type === 'high_risk' ? 'rgba(239, 68, 68, 0.4)' : selectedNode.type === 'suspicious' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`
              }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>LABEL</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>{selectedNode.label}</div>
                <div style={{ fontSize: '0.75rem', color: '#06b6d4', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
                  {selectedNode.id}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>ANOMALY SCORE</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: selectedNode.type === 'high_risk' ? '#f87171' : '#34d399', fontFamily: 'var(--font-mono)' }}>
                    {selectedNode.score.toFixed(3)}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>PEER EDGES</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                    {selectedNode.connections}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>TOTAL TXNS</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                    {selectedNode.tx_count}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>ETHER BALANCE</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                    {selectedNode.balance} ETH
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>DETECTED BEHAVIORAL PROFILE</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', marginTop: '0.2rem' }}>
                  {selectedNode.type === 'high_risk' ? 'Fund Drain Sweeper / Flash Exploit' : selectedNode.type === 'suspicious' ? 'Mempool Surge / Volatile Fan-in' : 'Verified Normal EOA Profile'}
                </div>
              </div>

              <div style={{ marginTop: 'auto' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'var(--font-mono)', marginBottom: '0.4rem' }}>
                  RECOMMENDED MITIGATION
                </div>
                <div style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  background: 'rgba(22, 32, 58, 0.8)',
                  border: '1px solid #233256',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: selectedNode.type === 'high_risk' ? '#f87171' : '#34d399'
                }}>
                  {selectedNode.type === 'high_risk' ? 'FLAG & PAUSE SMART CONTRACT INTERACTION' : selectedNode.type === 'suspicious' ? 'ENFORCE 3-BLOCK TIMELOCK BUFFER' : 'ALLOW STANDARD PASS-THROUGH'}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#64748b', fontSize: '0.85rem' }}>
              Click any node in the topology map to inspect telemetry.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
