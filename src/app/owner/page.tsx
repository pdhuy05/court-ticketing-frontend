"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PASSPHRASE = "000000000";

const TECH_STACK = [
  { name: "Next.js", icon: "▲" },
  { name: "TypeScript", icon: "TS" },
  { name: "Node.js", icon: "⬢" },
  { name: "MongoDB", icon: "◈" },
  { name: "Socket.IO", icon: "⚡" },
  { name: "Tailwind", icon: "✦" },
  { name: "Redis", icon: "◉" },
  { name: "Docker", icon: "⬛" },
];

const TIMELINE = [
  { year: "2023", title: "Khởi đầu", desc: "HTML · CSS · JavaScript cơ bản" },
  { year: "2024", title: "Full-stack Dev", desc: "Next.js · Node.js · MongoDB · REST APIs" },
  { year: "2025", title: "Kiến trúc hệ thống", desc: "Real-time · WebSocket · Microservices" },
  { year: "2026", title: "Court Ticket System", desc: "Production · ~1000 users · 99.9% uptime" },
];

const STATS = [
  { label: "Dự án", value: "12+", icon: "⬡" },
  { label: "Dòng code", value: "80K+", icon: "◇" },
  { label: "Uptime", value: "99.9%", icon: "◆" },
  { label: "Năm", value: "2026", icon: "▣" },
];

const FULL_NAME = "5Ys";

// ═══════════════════════════════════════════════════════════════════
// SMOKE PARTICLE CANVAS
// ═══════════════════════════════════════════════════════════════════
function SmokeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0, animId = 0;

    interface Ember {
      x: number; y: number; vx: number; vy: number;
      size: number; life: number; maxLife: number; opacity: number;
    }

    const embers: Ember[] = [];

    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };

    const spawnEmber = () => {
      const maxLife = 200 + Math.random() * 300;
      embers.push({
        x: Math.random() * W,
        y: H + 10,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -(0.3 + Math.random() * 0.6),
        size: 1 + Math.random() * 2,
        life: 0,
        maxLife,
        opacity: 0.15 + Math.random() * 0.35,
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      if (Math.random() > 0.85) spawnEmber();

      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.x += e.vx + Math.sin(e.life * 0.015) * 0.3;
        e.y += e.vy;
        e.life++;

        const progress = e.life / e.maxLife;
        const fade = progress < 0.1 ? progress / 0.1 : progress > 0.7 ? (1 - progress) / 0.3 : 1;
        const alpha = e.opacity * fade;

        if (e.life > e.maxLife || alpha <= 0) {
          embers.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 30, 30, ${alpha * 0.6})`;
        ctx.fill();

        // glow
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(120, 10, 10, ${alpha * 0.08})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
    }} />
  );
}

// ═══════════════════════════════════════════════════════════════════
// GLITCH TEXT
// ═══════════════════════════════════════════════════════════════════
function GlitchText({ text, style }: { text: string; style?: React.CSSProperties }) {
  return (
    <span className="owner-glitch" data-text={text} style={{ position: "relative", ...style }}>
      {text}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CODE RAIN (login bg - dark red theme)
// ═══════════════════════════════════════════════════════════════════
function DarkCodeRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    const FONT = 13;
    let cols = Math.floor(W / FONT);
    // FIX: dùng Array.from thay Array.fill để tránh lỗi TypeScript
    let drops = Array.from({ length: cols }, () => Math.random() * -60);
    const CHARS = "アイウエオカキクケコサシスセソタチツテト0123456789{}[]<>/\\|=+-*&#@!";
    const arr = CHARS.split("");
    // FIX: let thay const để có thể reassign trong onResize
    let speeds = Array.from({ length: cols }, () => 0.25 + Math.random() * 0.55);
    let animId = 0;

    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      cols = Math.floor(W / FONT);
      // FIX: reset drops và speeds khi resize để đồng bộ với cols mới
      drops = Array.from({ length: cols }, () => Math.random() * -60);
      speeds = Array.from({ length: cols }, () => 0.25 + Math.random() * 0.55);
    };

    const draw = () => {
      ctx.fillStyle = "rgba(3,3,3,0.07)";
      ctx.fillRect(0, 0, W, H);

      for (let i = 0; i < cols; i++) {
        const y = drops[i] * FONT;
        const c = arr[Math.floor(Math.random() * arr.length)];

        if (drops[i] > 0 && Math.random() > 0.6) {
          ctx.fillStyle = `rgba(180,20,20,${0.35 + Math.random() * 0.45})`;
        } else {
          ctx.fillStyle = `rgba(100,10,10,${0.04 + Math.random() * 0.1})`;
        }

        ctx.font = `${FONT}px 'Courier New', monospace`;
        ctx.fillText(c, i * FONT, y);
        drops[i] += speeds[i];
        if (y > H && Math.random() > 0.98) drops[i] = -Math.floor(Math.random() * 15);
      }
      animId = requestAnimationFrame(draw);
    };

    draw();
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", onResize); };
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at center, rgba(3,3,3,0.7) 0%, rgba(3,3,3,0.3) 40%, rgba(3,3,3,0.92) 100%)",
      }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════
export default function OwnerPage() {
  const [input, setInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [shake, setShake] = useState(false);
  const [blink, setBlink] = useState(true);
  const [typed, setTyped] = useState("");
  const [ready, setReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setInterval(() => setBlink(v => !v), 530);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    const d = setTimeout(() => {
      let i = 0;
      const t = setInterval(() => {
        i++;
        setTyped(FULL_NAME.slice(0, i));
        if (i >= FULL_NAME.length) {
          clearInterval(t);
          setTimeout(() => setReady(true), 400);
        }
      }, 90);
    }, 500);
    return () => clearTimeout(d);
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

  // ─── STYLES ───
  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@300;400;500;600&display=swap');

    ::selection { background: rgba(180,20,20,0.35); color: #fff; }
    ::-webkit-scrollbar { width: 3px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(120,10,10,0.3); border-radius: 3px; }

    @keyframes fadeUp {
      from { opacity:0; transform:translateY(14px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes shake {
      10%,90%  { transform:translateX(-3px); }
      20%,80%  { transform:translateX(5px); }
      30%,50%,70% { transform:translateX(-6px); }
      40%,60%  { transform:translateX(6px); }
    }
    @keyframes blink {
      0%,100% { opacity:1; }
      50% { opacity:0; }
    }
    @keyframes pulseRing {
      0%,100% { box-shadow: 0 0 0 0 rgba(140,20,20,0.3); }
      50% { box-shadow: 0 0 0 8px rgba(140,20,20,0); }
    }
    @keyframes flicker {
      0%,100% { opacity:0.03; }
      50% { opacity:0.06; }
    }
    @keyframes scanMove {
      0% { top: -4px; }
      100% { top: 100%; }
    }
    @keyframes glitchShift {
      0%,100% { clip-path: inset(0 0 95% 0); transform: translate(0); }
      20% { clip-path: inset(20% 0 60% 0); transform: translate(-2px, 1px); }
      40% { clip-path: inset(60% 0 10% 0); transform: translate(2px, -1px); }
      60% { clip-path: inset(40% 0 30% 0); transform: translate(-1px, 0); }
      80% { clip-path: inset(80% 0 5% 0); transform: translate(1px, 1px); }
    }
    @keyframes glitchShift2 {
      0%,100% { clip-path: inset(95% 0 0 0); transform: translate(0); }
      20% { clip-path: inset(10% 0 70% 0); transform: translate(2px, -1px); }
      40% { clip-path: inset(50% 0 20% 0); transform: translate(-2px, 1px); }
      60% { clip-path: inset(70% 0 10% 0); transform: translate(1px, 0); }
      80% { clip-path: inset(5% 0 80% 0); transform: translate(-1px, -1px); }
    }

    .owner-glitch {
      position: relative;
    }
    .owner-glitch::before,
    .owner-glitch::after {
      content: attr(data-text);
      position: absolute;
      left: 0; top: 0;
      width: 100%; height: 100%;
      pointer-events: none;
    }
    .owner-glitch::before {
      color: rgba(180,20,20,0.7);
      animation: glitchShift 4s infinite linear;
    }
    .owner-glitch::after {
      color: rgba(60,0,0,0.5);
      animation: glitchShift2 4s infinite linear reverse;
    }
  `;

  // ═══════════════════════════════════════════════════════════════
  // LOGIN
  // ═══════════════════════════════════════════════════════════════
  if (!unlocked) {
    return (
      <div style={{
        minHeight: "100vh", width: "100vw", background: "#030303",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Inter', sans-serif", overflow: "hidden", position: "relative",
      }}>
        <style>{CSS}</style>
        <DarkCodeRain />

        {/* Scanline */}
        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 3,
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)",
          animation: "flicker 3s infinite",
        }} />

        {/* Moving scan beam */}
        <div style={{
          position: "fixed", left: 0, right: 0, height: 2, zIndex: 4,
          background: "linear-gradient(90deg, transparent 20%, rgba(140,20,20,0.15) 50%, transparent 80%)",
          animation: "scanMove 6s linear infinite",
          pointerEvents: "none",
        }} />

        {/* Top label */}
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          fontSize: 9, fontWeight: 500, letterSpacing: "0.5em",
          color: "rgba(140,20,20,0.25)", textTransform: "uppercase", zIndex: 20,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          HỆ THỐNG · BỊ HẠN CHẾ
        </div>

        {/* Bottom */}
        <div style={{
          position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
          display: "flex", alignItems: "center", gap: 8,
          fontSize: 9, color: "rgba(255,255,255,0.06)", zIndex: 20,
          fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.2em",
        }}>
          <div style={{
            width: 5, height: 5, borderRadius: "50%",
            background: "rgba(140,20,20,0.5)",
            animation: "pulseRing 2.5s infinite",
          }} />
          ĐANG HOẠT ĐỘNG
        </div>

        {/* Login card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "relative", zIndex: 20, width: 340,
            padding: "40px 32px", borderRadius: 16,
            background: "rgba(10,10,10,0.8)",
            border: "1px solid rgba(140,20,20,0.12)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 0 60px rgba(80,0,0,0.08), 0 20px 50px rgba(0,0,0,0.5)",
          }}
        >
          {/* Top accent line */}
          <div style={{
            position: "absolute", top: -1, left: "25%", right: "25%", height: 1,
            background: "linear-gradient(90deg, transparent, rgba(140,20,20,0.4), transparent)",
          }} />

          {/* Logo */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: "rgba(140,20,20,0.08)",
              border: "1px solid rgba(140,20,20,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "pulseRing 3s infinite",
            }}>
              <GlitchText text="5Y" style={{
                fontSize: 22, fontWeight: 800,
                color: "rgba(180,30,30,0.85)",
                fontFamily: "'Inter', sans-serif",
              }} />
            </div>
          </div>

          {/* Title */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{
              fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.75)",
              marginBottom: 6, letterSpacing: "-0.01em",
            }}>
              Truy cập bị hạn chế
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
              Yêu cầu xác thực để tiếp tục
            </div>
          </div>

          {/* Error */}
          <div style={{
            height: 18, marginBottom: 6, textAlign: "center",
            fontSize: 10, fontWeight: 500,
            color: shake ? "#dc2626" : "transparent",
            transition: "color 0.2s",
          }}>
            ✕ Mật khẩu không đúng
          </div>

          {/* Input */}
          <div style={{
            animation: shake ? "shake 0.5s cubic-bezier(0.36,0.07,0.19,0.97)" : "none",
            marginBottom: 14,
          }}>
            <input
              ref={inputRef} type="password" value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey} autoFocus
              placeholder="Nhập mật khẩu..."
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${shake ? "rgba(220,38,38,0.4)" : "rgba(255,255,255,0.06)"}`,
                borderRadius: 10, color: "rgba(255,255,255,0.7)",
                fontSize: 13, letterSpacing: "0.15em", padding: "13px 16px",
                outline: "none", textAlign: "center",
                fontFamily: "'JetBrains Mono', monospace",
                caretColor: "rgba(180,30,30,0.6)",
                transition: "border-color 0.3s, box-shadow 0.3s",
              }}
              onFocus={e => {
                if (!shake) {
                  e.currentTarget.style.borderColor = "rgba(140,20,20,0.35)";
                  e.currentTarget.style.boxShadow = "0 0 20px rgba(100,0,0,0.1)";
                }
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Button */}
          <button onClick={tryUnlock} style={{
            width: "100%", padding: "13px", borderRadius: 10,
            border: "1px solid rgba(140,20,20,0.3)",
            background: "linear-gradient(135deg, rgba(140,20,20,0.2), rgba(80,10,10,0.3))",
            color: "rgba(220,80,80,0.9)", fontSize: 11, fontWeight: 600,
            letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            transition: "all 0.3s",
          }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "linear-gradient(135deg, rgba(160,20,20,0.3), rgba(100,10,10,0.4))";
              e.currentTarget.style.borderColor = "rgba(180,30,30,0.5)";
              e.currentTarget.style.boxShadow = "0 0 25px rgba(120,0,0,0.2)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "linear-gradient(135deg, rgba(140,20,20,0.2), rgba(80,10,10,0.3))";
              e.currentTarget.style.borderColor = "rgba(140,20,20,0.3)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            Xác thực
          </button>

          {/* Bottom */}
          <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.04))" }} />
            <span style={{ fontSize: 8, letterSpacing: "0.3em", color: "rgba(255,255,255,0.06)", fontFamily: "'JetBrains Mono', monospace" }}>
              {blink ? "█" : "░"} MÃ HOÁ
            </span>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(255,255,255,0.04), transparent)" }} />
          </div>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // PROFILE
  // ═══════════════════════════════════════════════════════════════
  const sectionDelay = (i: number) => ({ delay: i * 0.1, duration: 0.6 });

  return (
    <div style={{
      minHeight: "100vh", width: "100vw", background: "#030303",
      fontFamily: "'Inter', sans-serif", color: "#d0d0d0",
      overflowX: "hidden", position: "relative",
    }}>
      <style>{CSS}</style>
      <SmokeCanvas />

      {/* Scanline overlay */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 50,
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.12) 3px, rgba(0,0,0,0.12) 4px)",
        opacity: 0.4,
      }} />

      {/* Ambient fog */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, height: "40vh",
        background: "linear-gradient(0deg, rgba(60,5,5,0.06), transparent)",
        pointerEvents: "none", zIndex: 2,
      }} />
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, height: "30vh",
        background: "linear-gradient(180deg, rgba(3,3,3,0.8), transparent)",
        pointerEvents: "none", zIndex: 2,
      }} />

      {/* ── NAV ── */}
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          padding: "12px 28px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          backdropFilter: "blur(16px)",
          background: "rgba(3,3,3,0.7)",
          borderBottom: "1px solid rgba(140,20,20,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: "rgba(140,20,20,0.12)",
            border: "1px solid rgba(140,20,20,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 800, color: "rgba(180,30,30,0.8)",
          }}>5Y</div>
          <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.35)", letterSpacing: "0.05em" }}>
            Hồ sơ chủ sở hữu
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{
            width: 5, height: 5, borderRadius: "50%",
            background: "#b91c1c", boxShadow: "0 0 6px rgba(185,28,28,0.5)",
          }} />
          <span style={{
            fontSize: 9, color: "rgba(255,255,255,0.2)",
            fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.12em",
          }}>SẢN XUẤT</span>
        </div>
      </motion.nav>

      {/* ── CONTENT ── */}
      <div style={{
        maxWidth: 680, margin: "0 auto", padding: "80px 24px 60px",
        position: "relative", zIndex: 10,
      }}>

        {/* HERO */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginBottom: 24, paddingTop: 20 }}
        >
          <div style={{
            fontSize: 11, fontWeight: 500, color: "rgba(180,30,30,0.5)",
            letterSpacing: "0.08em", marginBottom: 12,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
             kiến.trúc.sư.hệ.thống
          </div>

          <h1 style={{
            fontSize: "clamp(52px, 10vw, 88px)", fontWeight: 900,
            letterSpacing: "-0.045em", lineHeight: 0.95, margin: 0,
            display: "flex", alignItems: "baseline", gap: 2,
          }}>
            <GlitchText text={typed} style={{ color: "rgba(240,240,240,0.92)" }} />
            <span style={{
              display: "inline-block", width: 3, height: "0.7em",
              background: "rgba(180,30,30,0.7)", marginLeft: 3,
              animation: "blink 1.1s step-end infinite",
              opacity: typed.length < FULL_NAME.length ? 1 : 0,
            }} />
          </h1>
        </motion.div>

        {/* Subtitle + Quote */}
        <AnimatePresence>
          {ready && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={sectionDelay(0)}
                style={{
                  marginBottom: 12,
                  display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                }}
              >
                {["Kiến trúc sư hệ thống", "TP. Hồ Chí Minh, VN"].map((t, i) => (
                  <span key={t} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {i > 0 && <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(140,20,20,0.3)" }} />}
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>{t}</span>
                  </span>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                transition={sectionDelay(1)}
                style={{
                  marginBottom: 48, paddingLeft: 16,
                  borderLeft: "2px solid rgba(140,20,20,0.25)",
                  position: "relative",
                }}
              >
                <div style={{
                  position: "absolute", left: -1, top: 0, bottom: 0, width: 2,
                  background: "linear-gradient(180deg, transparent, rgba(180,30,30,0.4), transparent)",
                  filter: "blur(3px)", pointerEvents: "none",
                }} />
                <div style={{
                  fontSize: 14, color: "rgba(255,255,255,0.25)", fontStyle: "italic",
                  lineHeight: 1.8, fontWeight: 300,
                }}>
                  &ldquo;Tao mới là nhà vuaaa&rdquo;
                </div>
                <div style={{
                  fontSize: 10, color: "rgba(255,255,255,0.1)",
                  fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", marginTop: 4,
                }}>— 5Ys, 2026</div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* STATS */}
        <AnimatePresence>
          {ready && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={sectionDelay(2)}
              style={{
                display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
                gap: 8, marginBottom: 48,
              }}
            >
              {STATS.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
                  style={{
                    padding: "18px 10px", borderRadius: 12, textAlign: "center",
                    background: "rgba(255,255,255,0.015)",
                    border: "1px solid rgba(140,20,20,0.08)",
                    position: "relative", overflow: "hidden",
                  }}
                >
                  <div style={{
                    position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)",
                    width: 40, height: 40, borderRadius: "50%",
                    background: "rgba(140,20,20,0.06)", filter: "blur(15px)",
                    pointerEvents: "none",
                  }} />
                  <div style={{
                    fontSize: 9, color: "rgba(180,30,30,0.35)", marginBottom: 6,
                  }}>{s.icon}</div>
                  <div style={{
                    fontSize: 22, fontWeight: 800, color: "rgba(240,240,240,0.85)",
                    letterSpacing: "-0.02em", marginBottom: 4,
                  }}>{s.value}</div>
                  <div style={{
                    fontSize: 8, fontWeight: 600, letterSpacing: "0.15em",
                    color: "rgba(255,255,255,0.15)", textTransform: "uppercase",
                  }}>{s.label}</div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {ready && (
          <>
            {/* DETAILS */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={sectionDelay(3)}
              style={{ marginBottom: 48 }}
            >
              <SectionHead>Chi tiết</SectionHead>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { l: "VAI TRÒ", v: "Kiến trúc sư hệ thống" },
                  { l: "DỰ ÁN", v: "Court Ticket System" },
                  { l: "TRẠNG THÁI", v: "Sản xuất ✓", c: "rgba(140,60,60,0.8)" },
                  { l: "ĐỊA ĐIỂM", v: "TP.HCM, Việt Nam" },
                  { l: "HỢP TÁC", v: "Sẵn sàng", c: "rgba(140,80,80,0.7)" },
                  { l: "LIÊN HỆ", v: "5ys@system.dev" },
                ].map((item, i) => (
                  <motion.div key={item.l}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06, duration: 0.4 }}
                    style={{
                      padding: "14px 16px", borderRadius: 10,
                      background: "rgba(255,255,255,0.012)",
                      border: "1px solid rgba(255,255,255,0.025)",
                    }}
                  >
                    <div style={{
                      fontSize: 8, fontWeight: 600, letterSpacing: "0.2em",
                      color: "rgba(255,255,255,0.12)", textTransform: "uppercase",
                      marginBottom: 6, fontFamily: "'Inter', sans-serif",
                    }}>{item.l}</div>
                    <div style={{
                      fontSize: 12, fontWeight: 500,
                      color: item.c || "rgba(255,255,255,0.5)",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>{item.v}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* TECH STACK */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={sectionDelay(4)}
              style={{ marginBottom: 48 }}
            >
              <SectionHead>Công nghệ</SectionHead>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {TECH_STACK.map((t, i) => (
                  <TechTag key={t.name} name={t.name} icon={t.icon} index={i} />
                ))}
              </div>
            </motion.div>

            {/* TIMELINE */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={sectionDelay(5)}
              style={{ marginBottom: 56 }}
            >
              <SectionHead>Dòng thời gian</SectionHead>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {TIMELINE.map((item, i) => (
                  <motion.div key={item.year}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.4 }}
                    style={{
                      display: "grid", gridTemplateColumns: "52px 16px 1fr",
                      gap: "0 14px", paddingBottom: i < TIMELINE.length - 1 ? 24 : 0,
                    }}
                  >
                    <div style={{
                      fontSize: 12, fontWeight: 700, color: "rgba(180,30,30,0.55)",
                      paddingTop: 1, textAlign: "right",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>{item.year}</div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{
                        width: 7, height: 7, borderRadius: "50%",
                        background: "rgba(180,30,30,0.5)",
                        boxShadow: "0 0 8px rgba(140,20,20,0.3)",
                        flexShrink: 0,
                      }} />
                      {i < TIMELINE.length - 1 && (
                        <div style={{
                          flex: 1, width: 1, marginTop: 4,
                          background: "linear-gradient(180deg, rgba(140,20,20,0.2), rgba(255,255,255,0.02))",
                        }} />
                      )}
                    </div>

                    <div>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)",
                        marginBottom: 2, letterSpacing: "-0.01em",
                      }}>{item.title}</div>
                      <div style={{
                        fontSize: 11, color: "rgba(255,255,255,0.2)", lineHeight: 1.5,
                      }}>{item.desc}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* FOOTER */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={sectionDelay(6)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0" }}
            >
              <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(140,20,20,0.1))" }} />
              <div style={{
                fontSize: 9, fontWeight: 500, letterSpacing: "0.15em",
                color: "rgba(255,255,255,0.08)",
                fontFamily: "'JetBrains Mono', monospace",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span style={{ color: "rgba(180,30,30,0.4)", fontWeight: 700 }}>5Ys</span>
                <span>·</span> 2026 <span>·</span> 🖤
              </div>
              <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(140,20,20,0.1), transparent)" }} />
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Section heading
// ═══════════════════════════════════════════════════════════════════
function SectionHead({ children }: { children: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
    }}>
      <div style={{
        width: 2, height: 12, borderRadius: 1,
        background: "linear-gradient(180deg, rgba(180,30,30,0.5), rgba(80,10,10,0.2))",
      }} />
      <span style={{
        fontSize: 10, fontWeight: 600, letterSpacing: "0.18em",
        color: "rgba(255,255,255,0.2)", textTransform: "uppercase",
        fontFamily: "'Inter', sans-serif",
      }}>{children}</span>
      <div style={{
        flex: 1, height: 1,
        background: "linear-gradient(90deg, rgba(140,20,20,0.12), transparent)",
      }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Tech tag
// ═══════════════════════════════════════════════════════════════════
function TechTag({ name, icon, index }: { name: string; icon: string; index: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.04, duration: 0.4 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "8px 14px", borderRadius: 8,
        background: hovered ? "rgba(140,20,20,0.08)" : "rgba(255,255,255,0.015)",
        border: `1px solid ${hovered ? "rgba(140,20,20,0.2)" : "rgba(255,255,255,0.03)"}`,
        display: "flex", alignItems: "center", gap: 7,
        cursor: "default", transition: "all 0.25s ease",
        boxShadow: hovered ? "0 0 16px rgba(100,0,0,0.1)" : "none",
        transform: hovered ? "translateY(-1px)" : "none",
      }}
    >
      <span style={{
        fontSize: 10,
        color: hovered ? "rgba(220,60,60,0.7)" : "rgba(255,255,255,0.15)",
        transition: "color 0.25s",
      }}>{icon}</span>
      <span style={{
        fontSize: 11, fontWeight: 500,
        color: hovered ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)",
        transition: "color 0.25s", fontFamily: "'Inter', sans-serif",
      }}>{name}</span>
    </motion.div>
  );
}