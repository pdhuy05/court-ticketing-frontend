"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PASSPHRASE = "00000000";

const TECH_STACK = [
  { name: "Next.js", icon: "▲", color: "#ffffff", glow: "rgba(255,255,255,0.15)" },
  { name: "TypeScript", icon: "TS", color: "#3178c6", glow: "rgba(49,120,198,0.2)" },
  { name: "Node.js", icon: "⬢", color: "#68a063", glow: "rgba(104,160,99,0.2)" },
  { name: "MongoDB", icon: "◈", color: "#4db33d", glow: "rgba(77,179,61,0.2)" },
  { name: "Socket.IO", icon: "⚡", color: "#e8e8e8", glow: "rgba(232,232,232,0.15)" },
  { name: "Tailwind CSS", icon: "✦", color: "#38bdf8", glow: "rgba(56,189,248,0.2)" },
  { name: "Redis", icon: "◉", color: "#d82c20", glow: "rgba(216,44,32,0.2)" },
  { name: "Docker", icon: "🐳", color: "#2496ed", glow: "rgba(36,150,237,0.2)" },
];

const TIMELINE = [
  {
    year: "2023",
    title: "Bắt đầu lập trình",
    desc: "Học HTML, CSS, JavaScript cơ bản",
    accent: "#6366f1",
  },
  {
    year: "2024",
    title: "Full-stack Development",
    desc: "Next.js · Node.js · MongoDB · REST APIs",
    accent: "#8b5cf6",
  },
  {
    year: "2025",
    title: "System Architecture",
    desc: "Real-time systems, WebSocket, microservices",
    accent: "#a78bfa",
  },
  {
    year: "2026",
    title: "Court Ticket System",
    desc: "Production · ~1000 users · 99.9% uptime",
    accent: "#c4b5fd",
  },
];

const STATS = [
  { label: "Projects Shipped", value: 12, suffix: "+" },
  { label: "Lines of Code", value: 80, suffix: "K+" },
  { label: "Uptime SLA", value: 99.9, suffix: "%", decimals: 1 },
  { label: "Build Year", value: 2026, suffix: "" },
];

const BUILD_YEAR = 2026;
const FULL_NAME = "5Ys";

// ────────────────────────────────────────────────────────────────────────────────
// Animated counter component
// ────────────────────────────────────────────────────────────────────────────────
function AnimatedCounter({
  value,
  suffix,
  decimals = 0,
  duration = 2,
}: {
  value: number;
  suffix: string;
  decimals?: number;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setStarted(true);
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, (duration * 1000) / steps);
    return () => clearInterval(timer);
  }, [started, value, duration]);

  return (
    <div ref={ref}>
      {decimals > 0 ? count.toFixed(decimals) : Math.floor(count)}
      {suffix}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Particle background canvas
// ────────────────────────────────────────────────────────────────────────────────
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let W = 0;
    let H = 0;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      pulse: number;
      pulseSpeed: number;
    }

    const particles: Particle[] = [];

    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };

    const init = () => {
      resize();
      const count = Math.floor((W * H) / 18000);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 1.5 + 0.5,
          alpha: Math.random() * 0.4 + 0.1,
          pulse: Math.random() * Math.PI * 2,
          pulseSpeed: 0.01 + Math.random() * 0.02,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += p.pulseSpeed;

        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;

        const a = p.alpha * (0.5 + 0.5 * Math.sin(p.pulse));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 92, 246, ${a})`;
        ctx.fill();
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(139, 92, 246, ${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };

    init();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1,
        pointerEvents: "none",
        opacity: 0.7,
      }}
    />
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Floating orbs for login page
// ────────────────────────────────────────────────────────────────────────────────
function FloatingOrbs() {
  return (
    <>
      {/* Main purple orb */}
      <div
        style={{
          position: "fixed",
          top: "20%",
          left: "15%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0) 70%)",
          filter: "blur(60px)",
          animation: "floatOrb1 12s ease-in-out infinite",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      {/* Secondary blue orb */}
      <div
        style={{
          position: "fixed",
          bottom: "10%",
          right: "10%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(56,189,248,0.08) 0%, rgba(56,189,248,0) 70%)",
          filter: "blur(60px)",
          animation: "floatOrb2 15s ease-in-out infinite",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      {/* Accent pink orb */}
      <div
        style={{
          position: "fixed",
          top: "60%",
          left: "60%",
          width: 350,
          height: 350,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(168,85,247,0.08) 0%, rgba(168,85,247,0) 70%)",
          filter: "blur(50px)",
          animation: "floatOrb3 18s ease-in-out infinite",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Tech stack card
// ────────────────────────────────────────────────────────────────────────────────
function TechCard({
  name,
  icon,
  color,
  glow,
  index,
}: {
  name: string;
  icon: string;
  color: string;
  glow: string;
  index: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06, duration: 0.5 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        padding: "14px 20px",
        borderRadius: 12,
        background: hovered
          ? "rgba(255,255,255,0.06)"
          : "rgba(255,255,255,0.025)",
        border: `1px solid ${hovered ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)"}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "default",
        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
        backdropFilter: "blur(12px)",
        boxShadow: hovered ? `0 0 30px ${glow}, 0 4px 20px rgba(0,0,0,0.3)` : "none",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        overflow: "hidden",
      }}
    >
      {/* Glow effect behind icon */}
      {hovered && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 20,
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: glow,
            filter: "blur(12px)",
            transform: "translateY(-50%)",
            pointerEvents: "none",
          }}
        />
      )}
      <span
        style={{
          fontSize: 14,
          color: hovered ? color : "rgba(255,255,255,0.4)",
          transition: "color 0.3s",
          position: "relative",
          zIndex: 1,
        }}
      >
        {icon}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: hovered ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.45)",
          transition: "color 0.3s",
          fontFamily: "'Inter', sans-serif",
          position: "relative",
          zIndex: 1,
        }}
      >
        {name}
      </span>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Section label
// ────────────────────────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        marginBottom: 32,
      }}
    >
      <div
        style={{
          width: 3,
          height: 16,
          borderRadius: 2,
          background: "linear-gradient(180deg, #8b5cf6, #6366f1)",
        }}
      />
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.2em",
          color: "rgba(255,255,255,0.35)",
          textTransform: "uppercase",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {children}
      </span>
      <div
        style={{
          flex: 1,
          height: 1,
          background:
            "linear-gradient(90deg, rgba(139,92,246,0.2), transparent)",
        }}
      />
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// MetaBlock for profile info
// ────────────────────────────────────────────────────────────────────────────────
function MetaBlock({
  label,
  value,
  accent,
  index,
}: {
  label: string;
  value: string;
  accent?: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.5 }}
      style={{
        padding: "16px 20px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.04)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.25em",
          color: "rgba(255,255,255,0.2)",
          textTransform: "uppercase",
          marginBottom: 8,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: accent || "rgba(255,255,255,0.7)",
          fontFamily: "'JetBrains Mono', 'Courier New', monospace",
          letterSpacing: "0.02em",
        }}
      >
        {value}
      </div>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Hacker code rain (login background)
// ────────────────────────────────────────────────────────────────────────────────
function HackerCodePanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = (canvas.width = canvas.offsetWidth * 2);
    const H = (canvas.height = canvas.offsetHeight * 2);
    ctx.scale(2, 2);
    const displayW = canvas.offsetWidth;
    const displayH = canvas.offsetHeight;

    const FONT_SIZE = 14;
    const cols = Math.floor(displayW / FONT_SIZE);
    const drops: number[] = Array(cols)
      .fill(0)
      .map(() => Math.random() * -80);

    const CHARS =
      "アイウエオカキクケコサシスセソタチツテトナニヌネノ" +
      "ハヒフヘホマミムメモヤユヨラリルレロワヲン" +
      "0123456789ABCDEF<>{}[]|/\\=+-*&^%$#@!~";

    const CHARS_ARR = CHARS.split("");
    const speeds: number[] = Array(cols)
      .fill(0)
      .map(() => 0.3 + Math.random() * 0.7);
    const brightHead: number[] = Array(cols)
      .fill(0)
      .map(() => Math.random());

    let animId: number;

    const draw = () => {
      ctx.fillStyle = "rgba(8,8,16,0.06)";
      ctx.fillRect(0, 0, displayW, displayH);

      for (let i = 0; i < cols; i++) {
        const y = drops[i] * FONT_SIZE;
        const char = CHARS_ARR[Math.floor(Math.random() * CHARS_ARR.length)];

        const isHead = brightHead[i] > 0.5;
        if (isHead && drops[i] > 0) {
          ctx.fillStyle = `rgba(167,139,250,${0.5 + Math.random() * 0.5})`;
        } else {
          const alpha = 0.03 + Math.random() * 0.12;
          ctx.fillStyle = `rgba(99,102,241,${alpha})`;
        }

        ctx.font = `${FONT_SIZE}px 'JetBrains Mono', 'Courier New', monospace`;
        ctx.fillText(char, i * FONT_SIZE, y);

        drops[i] += speeds[i];
        if (y > displayH && Math.random() > 0.975) {
          drops[i] = -Math.floor(Math.random() * 20);
          brightHead[i] = Math.random();
        }
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
      {/* Radial fade from center */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, rgba(8,8,16,0.85) 0%, rgba(8,8,16,0.4) 50%, rgba(8,8,16,0.95) 100%)",
        }}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════════
export default function OwnerPage() {
  const [input, setInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [shake, setShake] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const [typed, setTyped] = useState("");
  const [typingDone, setTypingDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cursor blink
  useEffect(() => {
    const t = setInterval(() => setShowCursor((v) => !v), 530);
    return () => clearInterval(t);
  }, []);

  // Typewriter effect for name
  useEffect(() => {
    if (!unlocked) return;
    const delay = setTimeout(() => {
      let i = 0;
      const t = setInterval(() => {
        i++;
        setTyped(FULL_NAME.slice(0, i));
        if (i >= FULL_NAME.length) {
          clearInterval(t);
          setTimeout(() => setTypingDone(true), 300);
        }
      }, 80);
      return () => clearInterval(t);
    }, 600);
    return () => clearTimeout(delay);
  }, [unlocked]);

  const tryUnlock = useCallback(() => {
    if (input === PASSPHRASE) {
      setUnlocked(true);
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      setInput("");
    }
  }, [input]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") tryUnlock();
  };

  const globalStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@300;400;500;600&display=swap');

    @keyframes floatOrb1 {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(40px, -30px) scale(1.1); }
      66% { transform: translate(-20px, 20px) scale(0.95); }
    }
    @keyframes floatOrb2 {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(-50px, 30px) scale(1.05); }
      66% { transform: translate(30px, -40px) scale(0.9); }
    }
    @keyframes floatOrb3 {
      0%, 100% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(30px, -50px) scale(1.1); }
    }
    @keyframes shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 20px rgba(139,92,246,0.15), 0 0 60px rgba(139,92,246,0.05); }
      50% { box-shadow: 0 0 30px rgba(139,92,246,0.25), 0 0 80px rgba(139,92,246,0.1); }
    }
    @keyframes breathing {
      0%, 100% { opacity: 0.4; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(1.02); }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes shake {
      10%, 90%  { transform: translateX(-3px); }
      20%, 80%  { transform: translateX(5px); }
      30%, 50%, 70% { transform: translateX(-6px); }
      40%, 60%  { transform: translateX(6px); }
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
    @keyframes borderRotate {
      0%   { --angle: 0deg; }
      100% { --angle: 360deg; }
    }
    @keyframes scanline {
      0% { transform: translateY(-100%); }
      100% { transform: translateY(100vh); }
    }

    ::selection {
      background: rgba(139,92,246,0.3);
      color: #fff;
    }

    /* Scrollbar */
    ::-webkit-scrollbar {
      width: 4px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(139,92,246,0.2);
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(139,92,246,0.4);
    }
  `;

  // ══════════════════════════════════════════════════════════════════════════════
  // LOGIN PAGE
  // ══════════════════════════════════════════════════════════════════════════════
  if (!unlocked) {
    return (
      <div
        style={{
          minHeight: "100vh",
          width: "100vw",
          background: "#080810",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Inter', sans-serif",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <style>{globalStyles}</style>

        {/* Background effects */}
        <HackerCodePanel />
        <FloatingOrbs />

        {/* Subtle noise texture */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            zIndex: 2,
            opacity: 0.03,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* System label top */}
        <div
          style={{
            position: "fixed",
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: "0.4em",
            color: "rgba(139,92,246,0.25)",
            textTransform: "uppercase",
            zIndex: 20,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          SYS · RESTRICTED · v{BUILD_YEAR}
        </div>

        {/* Bottom status */}
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 10,
            letterSpacing: "0.2em",
            color: "rgba(255,255,255,0.12)",
            zIndex: 20,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#6366f1",
              animation: "breathing 3s ease-in-out infinite",
            }}
          />
          SYSTEM ONLINE
        </div>

        {/* Login container */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "relative",
            zIndex: 20,
            width: 380,
            padding: "48px 40px",
            borderRadius: 24,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(24px)",
            boxShadow:
              "0 0 80px rgba(99,102,241,0.06), 0 32px 64px rgba(0,0,0,0.4)",
          }}
        >
          {/* Gradient border accent */}
          <div
            style={{
              position: "absolute",
              top: -1,
              left: "20%",
              right: "20%",
              height: 1,
              background:
                "linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent)",
              borderRadius: "50%",
            }}
          />

          {/* Logo */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 40,
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 20,
                background:
                  "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))",
                border: "1px solid rgba(139,92,246,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "pulse-glow 4s ease-in-out infinite",
                position: "relative",
              }}
            >
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  background:
                    "linear-gradient(135deg, #8b5cf6, #6366f1, #a78bfa)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                5Y
              </span>
            </div>
          </div>

          {/* Title */}
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "rgba(255,255,255,0.88)",
                marginBottom: 8,
                letterSpacing: "-0.02em",
              }}
            >
              Restricted Access
            </div>
            <div
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.3)",
                letterSpacing: "0.01em",
              }}
            >
              Authorization required to proceed
            </div>
          </div>

          {/* Error message */}
          <div
            style={{
              height: 20,
              marginBottom: 8,
              textAlign: "center",
              fontSize: 11,
              fontWeight: 500,
              color: shake ? "#ef4444" : "transparent",
              transition: "color 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 12 }}>⚠</span> Invalid passphrase
          </div>

          {/* Input */}
          <div
            style={{
              animation: shake
                ? "shake 0.5s cubic-bezier(0.36,0.07,0.19,0.97)"
                : "none",
              marginBottom: 16,
            }}
          >
            <input
              ref={inputRef}
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              autoFocus
              placeholder="Enter passphrase..."
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${shake ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 12,
                color: "rgba(255,255,255,0.8)",
                fontSize: 14,
                letterSpacing: "0.15em",
                padding: "14px 18px",
                outline: "none",
                textAlign: "center",
                fontFamily: "'JetBrains Mono', monospace",
                caretColor: "#8b5cf6",
                transition: "border-color 0.3s, box-shadow 0.3s",
              }}
              onFocus={(e) => {
                if (!shake) {
                  e.currentTarget.style.borderColor =
                    "rgba(139,92,246,0.4)";
                  e.currentTarget.style.boxShadow =
                    "0 0 20px rgba(139,92,246,0.1)";
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor =
                  "rgba(255,255,255,0.08)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Button */}
          <button
            onClick={tryUnlock}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              transition: "all 0.3s",
              boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.boxShadow = "0 6px 30px rgba(99,102,241,0.5)";
              el.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.boxShadow = "0 4px 20px rgba(99,102,241,0.3)";
              el.style.transform = "translateY(0)";
            }}
          >
            Authenticate
          </button>

          {/* Bottom accent */}
          <div
            style={{
              marginTop: 32,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                flex: 1,
                height: 1,
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.06))",
              }}
            />
            <div
              style={{
                fontSize: 9,
                letterSpacing: "0.3em",
                color: "rgba(255,255,255,0.12)",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {showCursor ? "█" : "░"} ENCRYPTED
            </div>
            <div
              style={{
                flex: 1,
                height: 1,
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0.06), transparent)",
              }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PROFILE PAGE
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: "#080810",
        fontFamily: "'Inter', sans-serif",
        color: "#e2e2e2",
        overflowX: "hidden",
        position: "relative",
      }}
    >
      <style>{globalStyles}</style>

      {/* Background effects */}
      <ParticleField />
      <FloatingOrbs />

      {/* Noise texture */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 2,
          opacity: 0.025,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Top navigation bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backdropFilter: "blur(20px)",
          background: "rgba(8,8,16,0.6)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background:
                "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))",
              border: "1px solid rgba(139,92,246,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                background:
                  "linear-gradient(135deg, #8b5cf6, #a78bfa)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              5Y
            </span>
          </div>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "rgba(255,255,255,0.6)",
              letterSpacing: "0.05em",
            }}
          >
            Owner Profile
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#22c55e",
              boxShadow: "0 0 8px rgba(34,197,94,0.5)",
            }}
          />
          <span
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.35)",
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.1em",
            }}
          >
            PRODUCTION
          </span>
        </div>
      </motion.div>

      {/* Main content */}
      <div
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: "100px 32px 80px",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* ── HERO SECTION ── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginBottom: 40, paddingTop: 24 }}
        >
          {/* Greeting */}
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "rgba(139,92,246,0.7)",
              letterSpacing: "0.05em",
              marginBottom: 16,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            HELLO, I AM
          </div>

          {/* Name */}
          <h1
            style={{
              fontSize: "clamp(56px, 10vw, 96px)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              margin: 0,
              display: "flex",
              alignItems: "baseline",
              gap: 4,
              background:
                "linear-gradient(135deg, #ffffff 0%, #e2e2e2 40%, #a78bfa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundSize: "200% auto",
            }}
          >
            {typed}
            <span
              style={{
                display: "inline-block",
                width: 4,
                height: "0.75em",
                background: "#8b5cf6",
                marginLeft: 4,
                animation: "blink 1.1s step-end infinite",
                opacity: typed.length < FULL_NAME.length ? 1 : 0,
                borderRadius: 1,
              }}
            />
          </h1>
        </motion.div>

        {/* ── Subtitle ── */}
        <AnimatePresence>
          {typingDone && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 400,
                  color: "rgba(255,255,255,0.45)",
                  letterSpacing: "0.02em",
                }}
              >
                System Architect
              </span>
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.15)",
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 400,
                  color: "rgba(255,255,255,0.45)",
                }}
              >
                Ho Chi Minh City, VN
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Quote ── */}
        <AnimatePresence>
          {typingDone && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              style={{
                marginBottom: 64,
                paddingLeft: 20,
                borderLeft: "2px solid rgba(139,92,246,0.3)",
                position: "relative",
              }}
            >
              {/* Glow on border */}
              <div
                style={{
                  position: "absolute",
                  left: -1,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background:
                    "linear-gradient(180deg, transparent, rgba(139,92,246,0.6), transparent)",
                  filter: "blur(4px)",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  fontSize: 16,
                  color: "rgba(255,255,255,0.35)",
                  fontStyle: "italic",
                  lineHeight: 1.8,
                  marginBottom: 8,
                  fontWeight: 300,
                }}
              >
                &ldquo;Tao mới là nhà vuaaa&rdquo;
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.18)",
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.1em",
                }}
              >
                — 5Ys, {BUILD_YEAR}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── STATS ── */}
        <AnimatePresence>
          {typingDone && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              style={{ marginBottom: 64 }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 12,
                }}
              >
                {STATS.map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    style={{
                      padding: "24px 16px",
                      borderRadius: 16,
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      textAlign: "center",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 800,
                        letterSpacing: "-0.02em",
                        marginBottom: 8,
                        background:
                          "linear-gradient(135deg, #fff, #a78bfa)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      <AnimatedCounter
                        value={s.value}
                        suffix={s.suffix}
                        decimals={s.decimals || 0}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 600,
                        letterSpacing: "0.2em",
                        color: "rgba(255,255,255,0.2)",
                        textTransform: "uppercase",
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      {s.label}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── META / DETAILS ── */}
        <AnimatePresence>
          {typingDone && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              style={{ marginBottom: 64 }}
            >
              <SectionLabel>Details</SectionLabel>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 12,
                }}
              >
                <MetaBlock
                  label="ROLE"
                  value="System Architect"
                  index={0}
                />
                <MetaBlock
                  label="PROJECT"
                  value="Court Ticket System"
                  index={1}
                />
                <MetaBlock
                  label="STATUS"
                  value="Production ✓"
                  accent="#4ade80"
                  index={2}
                />
                <MetaBlock
                  label="LOCATION"
                  value="HCMC, Việt Nam"
                  index={3}
                />
                <MetaBlock
                  label="AVAILABILITY"
                  value="Open to collab"
                  accent="#818cf8"
                  index={4}
                />
                <MetaBlock
                  label="CONTACT"
                  value="5ys@system.dev"
                  accent="#a78bfa"
                  index={5}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── TECH STACK ── */}
        <AnimatePresence>
          {typingDone && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              style={{ marginBottom: 64 }}
            >
              <SectionLabel>Tech Stack</SectionLabel>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                {TECH_STACK.map((t, i) => (
                  <TechCard
                    key={t.name}
                    name={t.name}
                    icon={t.icon}
                    color={t.color}
                    glow={t.glow}
                    index={i}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── TIMELINE ── */}
        <AnimatePresence>
          {typingDone && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              style={{ marginBottom: 80 }}
            >
              <SectionLabel>Timeline</SectionLabel>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 0,
                  position: "relative",
                }}
              >
                {TIMELINE.map((item, i) => (
                  <motion.div
                    key={item.year}
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.12, duration: 0.5 }}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "64px 24px 1fr",
                      gap: "0 16px",
                      paddingBottom: i < TIMELINE.length - 1 ? 32 : 0,
                    }}
                  >
                    {/* Year */}
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: item.accent,
                        paddingTop: 2,
                        textAlign: "right",
                        fontFamily:
                          "'JetBrains Mono', monospace",
                      }}
                    >
                      {item.year}
                    </div>

                    {/* Line + dot */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: item.accent,
                          boxShadow: `0 0 12px ${item.accent}40`,
                          flexShrink: 0,
                        }}
                      />
                      {i < TIMELINE.length - 1 && (
                        <div
                          style={{
                            flex: 1,
                            width: 1,
                            background: `linear-gradient(180deg, ${item.accent}40, rgba(255,255,255,0.04))`,
                            marginTop: 6,
                          }}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ paddingTop: 0 }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: "rgba(255,255,255,0.75)",
                          marginBottom: 4,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {item.title}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "rgba(255,255,255,0.3)",
                          lineHeight: 1.6,
                          fontWeight: 400,
                        }}
                      >
                        {item.desc}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── FOOTER / SIGNATURE ── */}
        <AnimatePresence>
          {typingDone && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.6 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "24px 0",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    background:
                      "linear-gradient(90deg, transparent, rgba(139,92,246,0.15))",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: "0.2em",
                    color: "rgba(255,255,255,0.15)",
                    fontFamily: "'JetBrains Mono', monospace",
                    textTransform: "uppercase",
                  }}
                >
                  <span
                    style={{
                      background:
                        "linear-gradient(135deg, #8b5cf6, #6366f1)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      fontWeight: 700,
                    }}
                  >
                    5Ys
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.08)" }}>
                    ·
                  </span>
                  {BUILD_YEAR}
                  <span style={{ color: "rgba(255,255,255,0.08)" }}>
                    ·
                  </span>
                  Built with 🖤
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    background:
                      "linear-gradient(90deg, rgba(139,92,246,0.15), transparent)",
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}