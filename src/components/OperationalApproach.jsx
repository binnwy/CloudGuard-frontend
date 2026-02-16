import React, { useState, useEffect } from "react";

export default function OperationalApproach() {
  const [visibleSteps, setVisibleSteps] = useState(new Set());
  const [hoveredStep, setHoveredStep] = useState(null);

  const steps = [
    {
      title: "INGEST",
      description: "Collect network logs and system telemetry in real-time.",
    },
    {
      title: "ANALYZE",
      description: "Apply machine learning models to identify behavioral anomalies.",
    },
    {
      title: "CLASSIFY",
      description: "Determine threat severity and attack category.",
    },
    {
      title: "ACT",
      description: "Generate alerts and enable structured dashboard response.",
    },
  ];

  useEffect(() => {
    // Scroll observer for reveal animation
    const handleScroll = () => {
      const section = document.querySelector('[data-operational-approach]');
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight * 0.8;

      if (isVisible) {
        const newVisible = new Set(visibleSteps);
        steps.forEach((_, idx) => {
          newVisible.add(idx);
        });
        setVisibleSteps(newVisible);
        window.removeEventListener('scroll', handleScroll);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check on mount

    return () => window.removeEventListener('scroll', handleScroll);
  }, [visibleSteps]);

  return (
    <section className="relative overflow-hidden py-20 md:py-32 px-4 md:px-6" data-operational-approach>
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Section Label */}
        <div className="text-center mb-12">
          <p className="text-xs md:text-sm font-thin tracking-[0.15em] text-blue-400 uppercase" style={{ letterSpacing: '0.15em' }}>
            ARCHITECTURE
          </p>
        </div>

        {/* Main Headline */}
        <div className="text-center mb-8">
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-tight text-white" style={{ letterSpacing: '-0.02em' }}>
            From Signal to Secure
          </h2>
        </div>

        {/* Supporting Paragraph */}
        <div className="text-center mb-16 md:mb-24">
          <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed" style={{ color: '#cbd5e1' }}>
            CloudGuard transforms raw telemetry into structured defense insights through a layered AI security pipeline.
          </p>
        </div>

        {/* 4-Step Flow */}
        <div className="relative">
          {/* Connecting Line Container */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-px pointer-events-none" style={{ marginTop: '-2px' }}>
            <div
              className="absolute top-0 left-0 h-full transition-all duration-1000 ease-out"
              style={{
                background: 'linear-gradient(to right, transparent, rgba(59, 130, 246, 0.3), transparent)',
                width: visibleSteps.size > 0 ? '100%' : '0%',
              }}
            ></div>
          </div>

          {/* Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-4">
            {steps.map((step, idx) => (
              <div
                key={idx}
                onMouseEnter={() => setHoveredStep(idx)}
                onMouseLeave={() => setHoveredStep(null)}
                className="relative"
              >
                {/* Connector Lines (visible on hover) */}
                {idx < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 left-full w-4 h-px" style={{ marginTop: '-2px' }}>
                    <div
                      className="w-full h-full transition-all duration-300"
                      style={{
                        background: hoveredStep === idx || hoveredStep === idx + 1 
                          ? 'rgba(59, 130, 246, 0.6)' 
                          : 'rgba(59, 130, 246, 0.2)',
                      }}
                    ></div>
                  </div>
                )}

                {/* Step Card */}
                <div
                  className="p-6 md:p-8 rounded-lg transition-all duration-300 ease-out cursor-default group relative"
                  style={{
                    backgroundColor: 'rgba(12, 17, 35, 0.4)',
                    backdropFilter: 'blur(10px)',
                    borderColor: hoveredStep === idx ? 'rgba(59, 130, 246, 0.6)' : 'rgba(59, 130, 246, 0.2)',
                    borderWidth: '1px',
                    transform: hoveredStep === idx ? 'translateY(-6px) scale(1.05)' : 'translateY(0) scale(1)',
                    boxShadow: hoveredStep === idx ? '0 8px 24px rgba(59, 130, 246, 0.25)' : '0 0 0 rgba(59, 130, 246, 0)',
                    opacity: visibleSteps.has(idx) ? 1 : 0.5,
                  }}
                >
                  {/* Hover Glow */}
                  {hoveredStep === idx && (
                    <div className="absolute inset-0 rounded-lg pointer-events-none" style={{
                      background: 'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
                    }}></div>
                  )}

                  <div className="relative z-10">
                    {/* Step Number Indicator */}
                    <div className="mb-4 flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                        style={{
                          backgroundColor: hoveredStep === idx ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.15)',
                          borderColor: hoveredStep === idx ? 'rgba(59, 130, 246, 0.8)' : 'rgba(59, 130, 246, 0.3)',
                          borderWidth: '1px',
                          color: '#3b82f6',
                        }}
                      >
                        {String.fromCharCode(65 + idx)}
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg md:text-xl font-bold text-white mb-3 tracking-wide uppercase" style={{ letterSpacing: '0.05em' }}>
                      {step.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs md:text-sm text-slate-400 leading-relaxed" style={{ color: '#94a3b8' }}>
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
