import React, { useCallback, useEffect, useState } from "react";
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import PlatformCapabilities from "@/components/PlatformCapabilities";
import OperationalApproach from "@/components/OperationalApproach";
import "./LandingPage.css";

// Enhanced particle configuration - dusty light blue with calm floating motion and opacity pulsing
const particlesConfig = {
  background: {
    color: {
      value: "transparent",
    },
  },
  particles: {
    number: {
      value: 60,
      density: {
        enable: true,
        value_area: 1200,
      },
    },
    color: {
      value: ["#4FAFFF", "#7DD3FC", "#5DBAFF"],
    },
    shape: {
      type: "circle",
    },
    opacity: {
      value: 0.17,
      random: false,
      anim: {
        enable: true,
        speed: 0.4,
        opacity_min: 0.08,
        sync: false,
      },
    },
    size: {
      value: 1.8,
      random: true,
      anim: {
        enable: true,
        speed: 0.2,
        size_min: 1,
        sync: false,
      },
    },
    links: {
      enable: false,
    },
    move: {
      enable: true,
      speed: 0.15,
      direction: "top",
      random: false,
      straight: false,
      out_mode: "out",
      bounce: false,
      angle: 90,
      drift: 0.05,
    },
  },
  interactivity: {
    events: {
      onhover: {
        enable: false,
        mode: [],
      },
      onclick: {
        enable: false,
        mode: [],
      },
    },
    modes: {},
  },
  detectRetina: true,
};

export default function LandingPage() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const winScroll = document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = winScroll / docHeight;
      setScrollProgress(Math.min(scrolled, 1));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate subtle perspective tilt (2-3deg at top, reduces to 0 on scroll)
  const perspectiveAmount = 2 + (1 * (1 - scrollProgress));

  const handleNavigation = () => {
    window.location.href = '/dashboard';
  };

  return (
    <div className="relative overflow-hidden">
      {/* Unified Background Wrapper - Shared for all sections */}
      <div className="landing-page-background">
        {/* Background: Radial Gradient */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            background: 'radial-gradient(ellipse at center, #1a1f35 0%, #0a0e1a 40%, #030712 100%)',
          }}
        ></div>

        {/* Minimal Particle Background - Behind Everything */}
        <Particles
          id="landing-particles"
          init={particlesInit}
          options={particlesConfig}
          className="absolute inset-0 z-1 particles-container"
        />

        {/* Grid Overlay with Radial Fade */}
        <div className="absolute inset-0 z-2 grid-overlay-container">
          <div className="absolute inset-0 grid-overlay"></div>
        </div>

        {/* Subtle Noise Texture */}
        <div className="absolute inset-0 z-3 noise-texture pointer-events-none"></div>

        {/* Animated Radial Glow Behind Page */}
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-4 glow-pulse-page">
          <div className="w-[1200px] h-[900px] bg-gradient-radial from-blue-400/12 via-blue-500/6 to-transparent blur-3xl rounded-full"></div>
        </div>
      </div>

      {/* Section Wrapper with Subtle Perspective */}
      <div 
        className="relative z-10"
        style={{
          perspective: '1500px',
        }}
      >
        {/* Hero Section */}
        <section 
          className="relative overflow-hidden min-h-screen section-perspective hero-fade-in"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${perspectiveAmount}deg)`,
            transition: 'transform 0.3s ease-out',
          }}
        >
          <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-20">
            {/* Label: Small Uppercase */}
            <div className="mb-16">
              <p className="text-xs md:text-sm font-thin tracking-[0.15em] text-blue-400 uppercase" style={{ letterSpacing: '0.15em' }}>
                AI-First Security Infrastructure
              </p>
            </div>

            {/* Main Headline */}
            <div className="text-center max-w-6xl mb-8">
              <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-none hero-slide-up md:whitespace-nowrap" style={{ letterSpacing: '-0.02em' }}>
                <span className="text-white">Cloud</span>
                <span 
                  className="text-transparent bg-clip-text bg-gradient-to-r"
                  style={{
                    backgroundImage: 'linear-gradient(to right, #3b82f6 0%, #06b6d4 100%)',
                    filter: 'drop-shadow(0 0 30px rgba(59, 130, 246, 0.6)) drop-shadow(0 0 60px rgba(6, 182, 212, 0.4))',
                  }}
                >
                  Guard
                </span>
              </h1>
            </div>

            {/* Subheading */}
            <p className="text-lg md:text-xl text-slate-400 mb-6 max-w-2xl text-center" style={{ color: '#94a3b8' }}>
              AI-Powered Real-Time Cloud Intrusion Detection
            </p>

            {/* CTA Button */}
            <a href="/dashboard">
              <button
                className="px-10 md:px-12 py-3 h-auto rounded-xl font-semibold tracking-wide
                           bg-transparent border transition-all duration-300 ease-out
                           flex items-center gap-2 group"
                style={{
                  borderColor: 'rgba(59, 130, 246, 0.4)',
                  color: '#e2e8f0',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.backgroundImage = 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(6, 182, 212, 0.1))';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.3)';
                  e.currentTarget.style.color = '#3b82f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                  e.currentTarget.style.backgroundImage = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.color = '#e2e8f0';
                }}
              >
                ACCESS SECURITY CONSOLE
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </a>
          </div>
        </section>

        {/* Platform Capabilities Section */}
        <section 
          className="relative overflow-hidden section-perspective"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${perspectiveAmount}deg)`,
            transition: 'transform 0.3s ease-out',
          }}
        >
          <div className="relative z-10">
            <PlatformCapabilities />
          </div>
        </section>

        {/* Operational Approach Section */}
        <section 
          className="relative overflow-hidden section-perspective"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${perspectiveAmount}deg)`,
            transition: 'transform 0.3s ease-out',
          }}
        >
          <div className="relative z-10">
            <OperationalApproach />
          </div>
        </section>

        {/* Team Section */}
        <section 
          className="relative overflow-hidden section-perspective"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${perspectiveAmount}deg)`,
            transition: 'transform 0.3s ease-out',
          }}
        >
          <div className="relative z-10 py-20 md:py-32 px-4 text-white">
            <div className="relative z-20 max-w-6xl mx-auto w-full">
              {/* Heading with gradient text */}
              <div className="mt-32 mb-16 text-center">
                <h2 
                  className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-tight"
                  style={{
                    backgroundImage: 'linear-gradient(to right, #ffffff 0%, #89d4ff 50%, #3b82f6 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Meet the Team
                </h2>
              </div>

              {/* Team member cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                <div 
                  className="p-6 md:p-8 rounded-xl md:rounded-2xl transition-all duration-300 cursor-default group"
                  style={{
                    backgroundColor: 'rgba(15, 25, 45, 0.6)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(80, 120, 200, 0.2)',
                    boxShadow: '0 0 40px rgba(30, 120, 255, 0.05)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
                    e.currentTarget.style.borderColor = 'rgba(80, 120, 200, 0.5)';
                    e.currentTarget.style.boxShadow = '0 0 60px rgba(30, 120, 255, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.borderColor = 'rgba(80, 120, 200, 0.2)';
                    e.currentTarget.style.boxShadow = '0 0 40px rgba(30, 120, 255, 0.05)';
                  }}
                >
                  <div className="text-4xl md:text-5xl mb-4"></div>
                  <h3 className="text-lg md:text-xl font-semibold text-white">
                    Hisana Saji
                  </h3>
                </div>

                <div 
                  className="p-6 md:p-8 rounded-xl md:rounded-2xl transition-all duration-300 cursor-default group"
                  style={{
                    backgroundColor: 'rgba(15, 25, 45, 0.6)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(80, 120, 200, 0.2)',
                    boxShadow: '0 0 40px rgba(30, 120, 255, 0.05)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
                    e.currentTarget.style.borderColor = 'rgba(80, 120, 200, 0.5)';
                    e.currentTarget.style.boxShadow = '0 0 60px rgba(30, 120, 255, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.borderColor = 'rgba(80, 120, 200, 0.2)';
                    e.currentTarget.style.boxShadow = '0 0 40px rgba(30, 120, 255, 0.05)';
                  }}
                >
                  <div className="text-4xl md:text-5xl mb-4"></div>
                  <h3 className="text-lg md:text-xl font-semibold text-white">
                    Binny Thomas
                  </h3>
                </div>

                <div 
                  className="p-6 md:p-8 rounded-xl md:rounded-2xl transition-all duration-300 cursor-default group"
                  style={{
                    backgroundColor: 'rgba(15, 25, 45, 0.6)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(80, 120, 200, 0.2)',
                    boxShadow: '0 0 40px rgba(30, 120, 255, 0.05)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
                    e.currentTarget.style.borderColor = 'rgba(80, 120, 200, 0.5)';
                    e.currentTarget.style.boxShadow = '0 0 60px rgba(30, 120, 255, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.borderColor = 'rgba(80, 120, 200, 0.2)';
                    e.currentTarget.style.boxShadow = '0 0 40px rgba(30, 120, 255, 0.05)';
                  }}
                >
                  <div className="text-4xl md:text-5xl mb-4"></div>
                  <h3 className="text-lg md:text-xl font-semibold text-white">
                    Bhavya Shivani H
                  </h3>
                </div>

                <div 
                  className="p-6 md:p-8 rounded-xl md:rounded-2xl transition-all duration-300 cursor-default group"
                  style={{
                    backgroundColor: 'rgba(15, 25, 45, 0.6)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(80, 120, 200, 0.2)',
                    boxShadow: '0 0 40px rgba(30, 120, 255, 0.05)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
                    e.currentTarget.style.borderColor = 'rgba(80, 120, 200, 0.5)';
                    e.currentTarget.style.boxShadow = '0 0 60px rgba(30, 120, 255, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.borderColor = 'rgba(80, 120, 200, 0.2)';
                    e.currentTarget.style.boxShadow = '0 0 40px rgba(30, 120, 255, 0.05)';
                  }}
                >
                  <div className="text-4xl md:text-5xl mb-4"></div>
                  <h3 className="text-lg md:text-xl font-semibold text-white">
                    Siva H S
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
