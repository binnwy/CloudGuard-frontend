import React, { useState } from "react";

export default function PlatformCapabilities() {
  const [hoveredCard, setHoveredCard] = useState(null);

  const capabilities = [
    {
      title: "Real-Time Detection",
      description: "Continuous monitoring of network telemetry streams using supervised and anomaly-based ML models.",
    },
    {
      title: "Adaptive Threat Classification",
      description: "Dynamic classification of malicious patterns with severity tagging and attack-type inference.",
    },
    {
      title: "Automated Intelligence Output",
      description: "Attack timeline visualization, malicious IP aggregation, and structured dashboard reporting.",
    },
  ];

  return (
    <section className="relative overflow-hidden py-20 md:py-32 px-4 md:px-6">
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Section Label */}
        <div className="text-center mb-12">
          <p className="text-xs md:text-sm font-thin tracking-[0.15em] text-blue-400 uppercase" style={{ letterSpacing: '0.15em' }}>
            CAPABILITIES
          </p>
        </div>

        {/* Main Headline */}
        <div className="text-center mb-8">
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-tight text-white" style={{ letterSpacing: '-0.02em' }}>
            Intelligent Defense<br />Infrastructure
          </h2>
        </div>

        {/* Supporting Paragraph */}
        <div className="text-center mb-16 md:mb-24">
          <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed" style={{ color: '#cbd5e1' }}>
            CloudGuard operates as a real-time AI security layer that ingests telemetry, detects anomalies, classifies threats, and enables actionable response across distributed environments.
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
          {/* Left Column - Glass Cards */}
          <div className="space-y-6">
            {capabilities.map((cap, idx) => (
              <div
                key={idx}
                onMouseEnter={() => setHoveredCard(idx)}
                onMouseLeave={() => setHoveredCard(null)}
                className="relative p-6 md:p-8 rounded-lg transition-all duration-300 ease-out cursor-default group"
                style={{
                  backgroundColor: 'rgba(12, 17, 35, 0.4)',
                  backdropFilter: 'blur(10px)',
                  borderColor: hoveredCard === idx ? 'rgba(59, 130, 246, 0.6)' : 'rgba(59, 130, 246, 0.2)',
                  borderWidth: '1px',
                  transform: hoveredCard === idx ? 'translateY(-8px)' : 'translateY(0)',
                  boxShadow: hoveredCard === idx ? '0 8px 32px rgba(59, 130, 246, 0.2)' : '0 0 0 rgba(59, 130, 246, 0)',
                }}
              >
                {/* Hover Glow */}
                {hoveredCard === idx && (
                  <div className="absolute inset-0 rounded-lg pointer-events-none" style={{
                    background: 'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
                  }}></div>
                )}

                <div className="relative z-10">
                  <h3 className="text-lg md:text-xl font-bold text-white mb-3 tracking-tight">
                    {cap.title}
                  </h3>
                  <p className="text-sm md:text-base text-slate-400 leading-relaxed" style={{ color: '#94a3b8' }}>
                    {cap.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column - Security Intelligence Panel */}
          <div className="flex items-center justify-center">
            <div
              className="relative w-full h-64 md:h-80 rounded-2xl transition-all duration-500 ease-out overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
                border: '1px solid rgba(79, 175, 255, 0.2)',
                boxShadow: '0 20px 60px rgba(79, 175, 255, 0.1), inset 0 1px 0 rgba(79, 175, 255, 0.08)',
              }}
            >
              {/* Faint glow behind */}
              <div
                className="absolute -inset-4 rounded-2xl pointer-events-none blur-3xl"
                style={{
                  background: 'radial-gradient(circle at center, rgba(79, 175, 255, 0.08), transparent)',
                  zIndex: -1,
                }}
              ></div>

              {/* Faint internal grid overlay */}
              <div className="absolute inset-8 rounded-xl pointer-events-none overflow-hidden opacity-30">
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage: 'linear-gradient(rgba(79, 175, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(79, 175, 255, 0.05) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                  }}
                ></div>
              </div>

              {/* Intelligence Network Visualization */}
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 400 320"
                preserveAspectRatio="xMidYMid meet"
                style={{ pointerEvents: 'none' }}
              >
                {/* Connecting lines from center to outer nodes */}
                {[0, 1, 2, 3, 4, 5].map((idx) => {
                  const angle = (idx * 360) / 6;
                  const rad = (angle * Math.PI) / 180;
                  const x2 = 200 + 70 * Math.cos(rad);
                  const y2 = 160 + 70 * Math.sin(rad);
                  return (
                    <line
                      key={`line-${idx}`}
                      x1="200"
                      y1="160"
                      x2={x2}
                      y2={y2}
                      stroke="rgba(79, 175, 255, 0.3)"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Outer nodes */}
                {[0, 1, 2, 3, 4, 5].map((idx) => {
                  const angle = (idx * 360) / 6;
                  const rad = (angle * Math.PI) / 180;
                  const x = 200 + 70 * Math.cos(rad);
                  const y = 160 + 70 * Math.sin(rad);
                  return (
                    <g key={`node-${idx}`}>
                      <circle
                        cx={x}
                        cy={y}
                        r="6"
                        fill="rgba(79, 175, 255, 0.4)"
                        style={{
                          filter: 'drop-shadow(0 0 6px rgba(79, 175, 255, 0.3))',
                        }}
                      />
                    </g>
                  );
                })}

                {/* Central glowing node */}
                <defs>
                  <style>{`
                    @keyframes centralPulse {
                      0%, 100% { r: 10; opacity: 0.8; }
                      50% { r: 13; opacity: 1; }
                    }
                    .central-node {
                      animation: centralPulse 3s ease-in-out infinite;
                    }
                  `}</style>
                </defs>
                <circle
                  cx="200"
                  cy="160"
                  r="10"
                  fill="rgba(79, 175, 255, 0.6)"
                  className="central-node"
                  style={{
                    filter: 'drop-shadow(0 0 12px rgba(79, 175, 255, 0.6))',
                  }}
                />
              </svg>

              {/* Subtle floating particles effect */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(4)].map((_, idx) => (
                  <div
                    key={`particle-${idx}`}
                    className="absolute rounded-full"
                    style={{
                      width: '2px',
                      height: '2px',
                      backgroundColor: 'rgba(79, 175, 255, 0.3)',
                      left: `${20 + idx * 20}%`,
                      top: `${30 + idx * 15}%`,
                      animation: `floatParticle${idx} ${4 + idx}s ease-in-out infinite`,
                    }}
                  />
                ))}
              </div>

              {/* Floating particles animation in style */}
              <style>{`
                @keyframes floatParticle0 {
                  0%, 100% { transform: translate(0, 0); opacity: 0.3; }
                  50% { transform: translate(8px, -12px); opacity: 0.6; }
                }
                @keyframes floatParticle1 {
                  0%, 100% { transform: translate(0, 0); opacity: 0.3; }
                  50% { transform: translate(-10px, 8px); opacity: 0.5; }
                }
                @keyframes floatParticle2 {
                  0%, 100% { transform: translate(0, 0); opacity: 0.2; }
                  50% { transform: translate(6px, 10px); opacity: 0.5; }
                }
                @keyframes floatParticle3 {
                  0%, 100% { transform: translate(0, 0); opacity: 0.3; }
                  50% { transform: translate(-8px, -6px); opacity: 0.6; }
                }
              `}</style>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
