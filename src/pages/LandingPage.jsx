import React, { useCallback } from "react";
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

// Particle configuration for the minimal, passive background
const particlesConfig = {
  background: {
    color: {
      value: "#010B22", // A deep, slightly vibrant blue
    },
  },
  particles: {
    number: {
      value: 60,
      density: {
        enable: true,
        value_area: 800,
      },
    },
    color: {
      value: "#ffffff",
    },
    shape: {
      type: "circle",
    },
    opacity: {
      value: 0.5,
      random: true,
      anim: {
        enable: true,
        speed: 1,
        opacity_min: 0.2,
        sync: false,
      },
    },
    size: {
      value: 2,
      random: true,
      anim: {
        enable: true,
        speed: 2,
        size_min: 0.1,
        sync: false,
      },
    },
    links: {
      enable: false,
    },
    move: {
      enable: true,
      speed: 0.2,
      direction: "none",
      random: true,
      straight: false,
      out_mode: "out",
      bounce: false,
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

// Common styles for the glassmorphic frames
const frameStyle = {
  backgroundColor: 'hsl(var(--card) / 0.7)',
  backdropFilter: 'blur(10px)',
  border: '2px solid hsl(var(--primary) / 0.5)',
  boxShadow: 'var(--glow-accent), inset 0 0 20px hsl(var(--primary) / 0.1)',
};

export default function LandingPage() {
  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  const handleNavigation = () => {
    window.location.href = '/dashboard';
  };

  return (
    <div className="relative overflow-x-hidden min-h-screen">
      {/* Particle Background */}
      <Particles
        id="tsparticles"
        init={particlesInit}
        options={particlesConfig}
        className="absolute inset-0 z-0"
      />

      {/* Grid Pattern */}
      <div className="absolute inset-0 z-0 opacity-20 grid-pattern"></div>

      {/* Container 1: Hero Section */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 text-center">
        {/* Top-right "Subnet 66" tag - REMOVED */}
        {/* <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full border border-primary/30 bg-primary/10 backdrop-blur-sm">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse-glow" />
          <span className="text-sm font-medium text-primary-foreground">Subnet 66</span>
        </div> */}
        
        {/* Added a margin to compensate for the removed element */}
        <div className="mb-20" /> 


        {/* Main Title */}
        <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold mb-4 tracking-tight">
          <span className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">Cloud</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1E5DDE] to-[#00FFFF] drop-shadow-[0_0_10px_rgba(0,255,255,0.6)]">Guard</span>
        </h1>

        {/* Subtitle - MODIFIED (Using 'Securing' as the replacement word for 'Incentivizing') */}
        <p className="text-xl md:text-2xl font-light mb-6 max-w-5xl mx-auto text-muted-foreground">
          Securing{" "}
          <span className="gradient-text font-medium">with real-time intrusion detection</span>
          {/* Removed "in Bittensor Pools" */}
        </p>

        {/* Description */}
        <p className="text-md md:text-lg text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed">
          CloudGuard delivers advanced network security through intelligent
          <br className="hidden md:block" />
          monitoring and real-time threat analysis
        </p>

        {/* CTA Button */}
        <a href="/dashboard">
          <Button
            variant="ghost" // Use ghost or base variant if you want to completely override styles
            size="lg"
            className="text-lg px-10 py-6 h-auto rounded-xl text-white font-bold
                       bg-gradient-to-r from-[#2050B7] to-[#00A1C7] // Custom gradient for the button
                       hover:from-[#2050B7]/90 hover:to-[#00A1C7]/90 // Slightly darker on hover
                       shadow-lg shadow-blue-500/50 transition-all duration-300 ease-in-out
                       border-none // Remove any default borders from the variant
                       "
          >
            DASHBOARD
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </a>
      </div>

      {/* Container 2: Features Section */}
      <div className="relative z-10 flex items-center justify-center py-20 px-4 text-white min-h-screen">
        <div
          className="relative z-20 max-w-5xl mx-auto p-8 md:p-16 rounded-[4rem] text-center"
          style={frameStyle}
        >
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tighter mb-6" style={{ color: 'hsl(var(--text-white))' }}>
            Key Features
          </h2>
          <p className="text-lg md:text-xl leading-relaxed text-left md:px-12" style={{ color: 'hsl(var(--text-muted))' }}>
            CloudGuard is an AI-powered Intrusion Detection System designed to safeguard cloud environments from both known and unknown cyber threats.
Using advanced supervised and unsupervised learning models, CloudGuard ensures smarter, faster, and more accurate attack detection.
          </p>
        </div>
      </div>

      {/* Container 3: Team Section (Placeholder) */}
      <div className="relative z-10 flex items-center justify-center py-20 px-4 text-white min-h-screen">
        <div
          className="relative z-20 max-w-5xl mx-auto p-8 md:p-16 rounded-[4rem] text-center"
          style={frameStyle}
        >
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tighter mb-6" style={{ color: 'hsl(var(--text-white))' }}>
            Meet the Team
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-6 rounded-2xl transition-all duration-300 hover:scale-105" style={{ backgroundColor: 'hsl(var(--card-foreground) / 0.05)', boxShadow: '0 0 10px hsl(var(--primary) / 0.1)' }}>
              <div className="text-4xl mb-4" role="img" aria-label="Team Member Icon">
                
              </div>
              <h3 className="text-xl font-bold" style={{ color: 'hsl(var(--primary))' }}>
                Hisana Saji
              </h3>
            </div>
            <div className="p-6 rounded-2xl transition-all duration-300 hover:scale-105" style={{ backgroundColor: 'hsl(var(--card-foreground) / 0.05)', boxShadow: '0 0 10px hsl(var(--primary) / 0.1)' }}>
              <div className="text-4xl mb-4" role="img" aria-label="Team Member Icon">
                
              </div>
              <h3 className="text-xl font-bold" style={{ color: 'hsl(var(--primary))' }}>
                Binny Thomas
              </h3>
            </div>
            <div className="p-6 rounded-2xl transition-all duration-300 hover:scale-105" style={{ backgroundColor: 'hsl(var(--card-foreground) / 0.05)', boxShadow: '0 0 10px hsl(var(--primary) / 0.1)' }}>
              <div className="text-4xl mb-4" role="img" aria-label="Team Member Icon">
                
              </div>
              <h3 className="text-xl font-bold" style={{ color: 'hsl(var(--primary))' }}>
                Bhavya Shivani H
              </h3>
            </div>
            <div className="p-6 rounded-2xl transition-all duration-300 hover:scale-105" style={{ backgroundColor: 'hsl(var(--card-foreground) / 0.05)', boxShadow: '0 0 10px hsl(var(--primary) / 0.1)' }}>
              <div className="text-4xl mb-4" role="img" aria-label="Team Member Icon">
                
              </div>
              <h3 className="text-xl font-bold" style={{ color: 'hsl(var(--primary))' }}>
                Siva H S
              </h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}