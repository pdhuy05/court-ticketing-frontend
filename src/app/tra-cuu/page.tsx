"use client";

import { useEffect, useRef, useState } from "react";
import { FiSend, FiRefreshCw, FiUser, FiAlertCircle } from "react-icons/fi";
import { askPublicAi, getPublicAiTopics, type ChatMessage } from "@/services/publicAi.service";

// Dùng khi admin chưa thêm mục nào, hoặc API tiêu đề bị lỗi.
const DEFAULT_QUESTIONS = [
  "Giờ làm việc của tòa án?",
  "Nộp đơn ly hôn cần giấy tờ gì?",
  "Tôi muốn nhận kết quả thì đến quầy nào?",
  "Tôi cần khiếu nại thì làm sao?",
];

function useClock() {
  const [now, setNow] = useState<Date | null>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function CourtLogo({ size = 56 }: { size?: number }) {
  return (
    <img
      src="/assets/logotoaan.png"
      alt="Logo Tòa án"
      className="kiosk-logo"
      style={{ width: size, height: size }}
    />
  );
}

export default function PublicAiKioskPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef(false);
  const now = useClock();
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>(DEFAULT_QUESTIONS);

  useEffect(() => {
    // Kích hoạt chuỗi hiệu ứng vào trang sau khi component đã mount, tránh
    // hiệu ứng chạy trước khi hydrate xong.
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    let active = true;
    getPublicAiTopics()
      .then((topics) => {
        if (active && topics.length > 0) setSuggestedQuestions(topics);
      })
      .catch(() => {
        // API lỗi hoặc chưa có -> giữ nguyên danh sách mặc định.
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setError(null);
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const result = await askPublicAi(trimmed, messages);
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không gửi được câu hỏi, vui lòng thử lại");
      setMessages((prev) => prev.slice(0, -1));
      setInput(trimmed);
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => sendMessage(input);
  const handleClearChat = () => {
    setMessages([]);
    setError(null);
  };

  const timeLabel = now
    ? `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`
    : "--:--";
  const dateLabel = now
    ? now.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })
    : "";
  const secondsTick = now ? now.getSeconds() % 2 === 0 : true;

  return (
    <div className={`kiosk-root ${mounted ? "is-mounted" : ""}`}>
      {/* ══════════════ DẢI RIBBON QUỐC HUY (TRÊN CÙNG) ══════════════ */}
      <div className="kiosk-ribbon" />

      {/* ══════════════ THANH TIÊU ĐỀ SÁNG, ĐẶT LOGO NGANG HÀNG ══════════════ */}
      <header className="kiosk-topbar">
        <div className="kiosk-topbar__inner">
          <div className="kiosk-topbar__identity">
            <div className="kiosk-seal">
              <span className="kiosk-seal__halo" />
              <span className="kiosk-seal__ring" />
              <span className="kiosk-seal__ring kiosk-seal__ring--reverse" />
              <CourtLogo size={40} />
            </div>
            <div className="kiosk-topbar__text">
              <span className="kiosk-topbar__eyebrow">Cổng tra cứu thông tin</span>
              <h1 className="kiosk-topbar__title">Tòa Án Nhân Dân Khu Vực 1 · TP. Hồ Chí Minh</h1>
            </div>
          </div>

          <div className="kiosk-topbar__right">
            <div className="kiosk-clock">
              <span className="kiosk-clock__time">
                {timeLabel.split(":")[0]}
                <span className={`kiosk-clock__colon ${secondsTick ? "is-on" : ""}`}>:</span>
                {timeLabel.split(":")[1]}
              </span>
              <span className="kiosk-clock__date">{dateLabel}</span>
            </div>
            <button onClick={handleClearChat} disabled={messages.length === 0} className="kiosk-reset">
              <FiRefreshCw size={14} className="kiosk-reset__icon" /> Hỏi lại từ đầu
            </button>
          </div>
        </div>
      </header>

      {/* ══════════════ KHUNG HỎI ĐÁP CHÍNH, NỀN SÁNG ══════════════ */}
      <main className="kiosk-chat">
        <div className="kiosk-chat__scroll">
          <div className="kiosk-chat__body">
            {messages.length === 0 && (
              <div className="kiosk-empty">
                <div className="kiosk-empty__logo">
                  <span className="kiosk-empty__glow" />
                  <CourtLogo size={128} />
                </div>
                <span className="kiosk-empty__eyebrow">Xin chào</span>
                <h2>Bạn cần tra cứu điều gì hôm nay?</h2>
                <p>Chạm vào một câu hỏi gợi ý bên dưới, hoặc gõ câu hỏi của riêng bạn.</p>
                <div className="kiosk-suggestions">
                  {suggestedQuestions.map((q, i) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="kiosk-chip"
                      style={{ animationDelay: `${220 + i * 70}ms` }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`kiosk-row ${m.role === "user" ? "is-user" : "is-assistant"}`}>
                {m.role === "assistant" && (
                  <div className="kiosk-avatar">
                    <CourtLogo size={34} />
                  </div>
                )}
                <div className="kiosk-bubble">{m.content}</div>
                {m.role === "user" && (
                  <div className="kiosk-avatar kiosk-avatar--user">
                    <FiUser size={15} />
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div className="kiosk-row is-assistant">
                <div className="kiosk-avatar kiosk-avatar--thinking">
                  <CourtLogo size={34} />
                </div>
                <div className="kiosk-bubble kiosk-bubble--typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            {error && (
              <div className="kiosk-error">
                <FiAlertCircle size={16} /> {error}
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>
        </div>

        <div className="kiosk-chat__footer">
          <div className={`kiosk-input ${input.trim() ? "has-value" : ""}`}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onCompositionStart={() => {
                isComposingRef.current = true;
              }}
              onCompositionEnd={() => {
                isComposingRef.current = false;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  if (isComposingRef.current || e.nativeEvent.isComposing) return;
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Nhập câu hỏi của bạn..."
              maxLength={1000}
            />
            <button onClick={handleSend} disabled={sending || !input.trim()} className="kiosk-send">
              <FiSend size={19} className="kiosk-send__icon" />
            </button>
          </div>

          <p className="kiosk-disclaimer">
            Thông tin do AI tổng hợp chỉ mang tính tham khảo. Vui lòng liên hệ trực tiếp nhân viên tại
            quầy để được hỗ trợ chính xác nhất.
          </p>
        </div>
      </main>

      <style>{`
        * { box-sizing: border-box; }

        :root {
          --kiosk-navy: #123262;
          --kiosk-navy-soft: #2C4E80;
          --kiosk-gold: #C9A24B;
          --kiosk-gold-light: #F2DFAE;
          --kiosk-bg: #F6F9FC;
          --kiosk-surface: #FFFFFF;
          --kiosk-line: #E4EAF2;
          --kiosk-text: #16233D;
          --kiosk-text-soft: #66738C;
        }

        .kiosk-root {
          display: flex;
          flex-direction: column;
          width: 100vw;
          height: 100dvh;
          overflow: hidden;
          background:
            radial-gradient(1100px 500px at 15% -10%, rgba(201,162,75,0.10), transparent 60%),
            radial-gradient(900px 600px at 100% 0%, rgba(18,50,98,0.06), transparent 55%),
            var(--kiosk-bg);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Be Vietnam Pro", Inter, sans-serif;
          color: var(--kiosk-text);
        }

        .kiosk-logo {
          display: block;
          object-fit: contain;
        }

        /* ── DẢI RIBBON QUỐC HUY ─────────────────────────────────── */
        .kiosk-ribbon {
          height: 5px;
          width: 100%;
          flex-shrink: 0;
          background: linear-gradient(90deg, var(--kiosk-navy) 0%, var(--kiosk-gold) 50%, var(--kiosk-navy) 100%);
          background-size: 200% 100%;
          animation: kiosk-ribbon-shift 6s ease-in-out infinite;
        }

        /* ── THANH TIÊU ĐỀ ───────────────────────────────────────── */
        .kiosk-topbar {
          flex-shrink: 0;
          width: 100%;
          background: rgba(255,255,255,0.86);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--kiosk-line);
          opacity: 0;
          transform: translateY(-10px);
          transition: opacity 0.55s ease, transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .is-mounted .kiosk-topbar { opacity: 1; transform: translateY(0); }

        .kiosk-topbar__inner {
          max-width: 1180px;
          margin: 0 auto;
          padding: 14px clamp(16px, 3vw, 32px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .kiosk-topbar__identity {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }

        .kiosk-seal {
          position: relative;
          width: 52px;
          height: 52px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .kiosk-seal__halo {
          position: absolute;
          inset: -10px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(201,162,75,0.30) 0%, rgba(201,162,75,0) 72%);
          animation: kiosk-glow-breathe 5s ease-in-out infinite;
        }
        .kiosk-seal__ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 1px dashed rgba(201,162,75,0.65);
          animation: kiosk-seal-spin 34s linear infinite;
        }
        .kiosk-seal__ring--reverse {
          inset: -6px;
          border: 1px solid rgba(18,50,98,0.14);
          animation: kiosk-seal-spin 22s linear infinite reverse;
        }

        .kiosk-topbar__text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .kiosk-topbar__eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--kiosk-gold);
        }
        .kiosk-topbar__title {
          font-size: clamp(15px, 1.6vw, 19px);
          font-weight: 800;
          letter-spacing: 0.01em;
          color: var(--kiosk-navy);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin: 0;
        }

        .kiosk-topbar__right {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-shrink: 0;
        }

        .kiosk-clock {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          line-height: 1.15;
        }
        .kiosk-clock__time {
          font-family: "Courier New", monospace;
          font-weight: 700;
          color: var(--kiosk-navy);
          font-size: 18px;
          letter-spacing: 0.04em;
        }
        .kiosk-clock__colon { opacity: 0.3; transition: opacity 0.25s ease; }
        .kiosk-clock__colon.is-on { opacity: 1; }
        .kiosk-clock__date {
          font-size: 11px;
          color: var(--kiosk-text-soft);
          text-transform: capitalize;
        }

        .kiosk-reset {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--kiosk-surface);
          border: 1px solid var(--kiosk-line);
          border-radius: 999px;
          padding: 9px 16px;
          font-size: 13px;
          font-weight: 600;
          color: var(--kiosk-navy-soft);
          cursor: pointer;
          transition: color 0.2s ease, transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }
        .kiosk-reset:disabled { opacity: 0.4; cursor: default; }
        .kiosk-reset:not(:disabled):hover {
          color: var(--kiosk-navy);
          border-color: var(--kiosk-gold);
          background: #FFFBF0;
          transform: translateY(-1px);
        }
        .kiosk-reset:not(:disabled):active { transform: translateY(0) scale(0.96); }
        .kiosk-reset:not(:disabled):hover .kiosk-reset__icon { transform: rotate(-90deg); }
        .kiosk-reset__icon { transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1); }

        /* ── VÙNG CHAT CHÍNH ─────────────────────────────────────── */
        .kiosk-chat {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.6s ease 0.12s, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.12s;
        }
        .is-mounted .kiosk-chat { opacity: 1; transform: translateY(0); }

        .kiosk-chat__scroll {
          flex: 1;
          min-height: 0;
          width: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          scroll-behavior: smooth;
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
        }
        .kiosk-chat__scroll:hover,
        .kiosk-chat__scroll:focus-within {
          scrollbar-color: rgba(18,50,98,0.22) transparent;
        }
        .kiosk-chat__scroll::-webkit-scrollbar { width: 6px; }
        .kiosk-chat__scroll::-webkit-scrollbar-track { background: transparent; }
        .kiosk-chat__scroll::-webkit-scrollbar-thumb {
          background-color: transparent;
          border-radius: 999px;
          transition: background-color 0.25s ease;
        }
        .kiosk-chat__scroll:hover::-webkit-scrollbar-thumb { background-color: rgba(18,50,98,0.18); }
        .kiosk-chat__scroll::-webkit-scrollbar-thumb:hover { background-color: rgba(18,50,98,0.32); }

        .kiosk-chat__body {
          width: 100%;
          max-width: 880px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 18px;
          padding: clamp(18px, 3vw, 36px) clamp(14px, 2vw, 20px) 32px;
        }

        .kiosk-empty {
          margin: auto;
          text-align: center;
          max-width: 560px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          color: var(--kiosk-text-soft);
        }
        .kiosk-empty__logo {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: kiosk-fade-scale-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .kiosk-empty__glow {
          position: absolute;
          inset: -30px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(201,162,75,0.26) 0%, rgba(201,162,75,0) 70%);
          animation: kiosk-glow-breathe 5s ease-in-out infinite;
        }
        .kiosk-empty__eyebrow {
          margin-top: 18px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--kiosk-gold);
          animation: kiosk-fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both;
        }
        .kiosk-empty h2 {
          font-family: "Georgia", "Noto Serif", serif;
          font-size: clamp(24px, 2.8vw, 32px);
          color: var(--kiosk-navy);
          margin: 6px 0 2px;
          animation: kiosk-fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both;
        }
        .kiosk-empty p {
          font-size: 14.5px;
          margin: 0 0 20px;
          animation: kiosk-fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.22s both;
        }

        .kiosk-suggestions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
        }

        .kiosk-chip {
          position: relative;
          overflow: hidden;
          border: 1px solid var(--kiosk-line);
          background: var(--kiosk-surface);
          color: var(--kiosk-navy-soft);
          padding: 11px 18px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          box-shadow: 0 2px 10px rgba(18,50,98,0.05);
          transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
          animation: kiosk-chip-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .kiosk-chip::after {
          content: "";
          position: absolute;
          top: 0;
          left: -60%;
          width: 40%;
          height: 100%;
          background: linear-gradient(115deg, transparent, rgba(201,162,75,0.30), transparent);
          transform: skewX(-18deg);
          transition: left 0.6s ease;
        }
        .kiosk-chip:hover {
          border-color: var(--kiosk-gold);
          color: #8A6A1F;
          background: #FFFBF0;
          transform: translateY(-2px);
          box-shadow: 0 10px 22px rgba(201,162,75,0.20);
        }
        .kiosk-chip:hover::after { left: 130%; }
        .kiosk-chip:active { transform: translateY(0) scale(0.98); }

        .kiosk-row {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          max-width: 88%;
          animation: kiosk-bubble-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .kiosk-row.is-user { align-self: flex-end; }
        .kiosk-row.is-assistant { align-self: flex-start; }

        .kiosk-avatar {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: var(--kiosk-surface);
          border: 1px solid var(--kiosk-line);
          box-shadow: 0 2px 8px rgba(18,50,98,0.06);
          transition: box-shadow 0.3s ease;
        }
        .kiosk-avatar--thinking { animation: kiosk-avatar-pulse 1.6s ease-in-out infinite; }
        .kiosk-avatar--user {
          width: 30px;
          height: 30px;
          background: var(--kiosk-navy);
          color: #fff;
          border: none;
        }

        .kiosk-bubble {
          padding: 13px 18px;
          border-radius: 16px;
          font-size: 15.5px;
          line-height: 1.65;
          white-space: pre-wrap;
          max-width: 100%;
        }
        .is-assistant .kiosk-bubble {
          background: var(--kiosk-surface);
          color: var(--kiosk-text);
          border: 1px solid var(--kiosk-line);
          box-shadow: 0 2px 10px rgba(18,50,98,0.05);
          border-bottom-left-radius: 4px;
        }
        .is-user .kiosk-bubble {
          background: linear-gradient(135deg, var(--kiosk-navy) 0%, var(--kiosk-navy-soft) 100%);
          color: #fff;
          box-shadow: 0 4px 14px rgba(18,50,98,0.22);
          border-bottom-right-radius: 4px;
        }

        .kiosk-bubble--typing { display: flex; gap: 5px; padding: 16px 18px; }
        .kiosk-bubble--typing span {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--kiosk-gold);
          animation: kiosk-bounce 1.2s infinite ease-in-out;
        }
        .kiosk-bubble--typing span:nth-child(2) { animation-delay: 0.15s; }
        .kiosk-bubble--typing span:nth-child(3) { animation-delay: 0.3s; }

        .kiosk-error {
          align-self: center;
          display: flex;
          align-items: center;
          gap: 8px;
          background: #FCEAEA;
          color: #B23B3B;
          padding: 10px 16px;
          border-radius: 12px;
          font-size: 13.5px;
          animation: kiosk-shake-in 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }

        /* ── VÙNG CỐ ĐỊNH DƯỚI ───────────────────────────────────── */
        .kiosk-chat__footer {
          flex-shrink: 0;
          width: 100%;
          max-width: 880px;
          margin: 0 auto;
          padding: 0 clamp(14px, 2vw, 20px) clamp(14px, 2vw, 22px);
        }

        .kiosk-input {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--kiosk-surface);
          border-radius: 999px;
          padding: 6px 6px 6px 22px;
          box-shadow: 0 10px 30px rgba(18,50,98,0.10);
          border: 1px solid var(--kiosk-line);
          transition: border-color 0.25s ease, box-shadow 0.25s ease;
        }
        .kiosk-input::before {
          content: "";
          position: absolute;
          inset: -2px;
          border-radius: 999px;
          padding: 2px;
          background: conic-gradient(from var(--kiosk-angle, 0deg), var(--kiosk-gold), var(--kiosk-gold-light), var(--kiosk-gold), var(--kiosk-navy), var(--kiosk-gold));
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0;
          transition: opacity 0.25s ease;
          animation: kiosk-rotate-gradient 3.5s linear infinite;
          pointer-events: none;
        }
        .kiosk-input:focus-within::before { opacity: 1; }
        .kiosk-input:focus-within { box-shadow: 0 12px 34px rgba(201,162,75,0.20); }

        .kiosk-input input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 15.5px;
          background: transparent;
          color: var(--kiosk-text);
          padding: 12px 0;
        }
        .kiosk-input input::placeholder { color: #A8AEBC; }
        .kiosk-send {
          flex-shrink: 0;
          width: 46px;
          height: 46px;
          border-radius: 50%;
          border: none;
          background: var(--kiosk-gold);
          color: var(--kiosk-navy);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
        }
        .kiosk-send:disabled { background: #ECE4CC; color: #B7AD92; cursor: default; }
        .kiosk-input.has-value .kiosk-send:not(:disabled) {
          box-shadow: 0 0 0 6px rgba(201,162,75,0.16);
        }
        .kiosk-send:not(:disabled):hover { background: #D9B45F; transform: scale(1.06); }
        .kiosk-send:not(:disabled):active { transform: scale(0.92); }
        .kiosk-send:not(:disabled):hover .kiosk-send__icon { transform: translate(2px, -2px); }
        .kiosk-send__icon { transition: transform 0.2s ease; }

        .kiosk-disclaimer {
          text-align: center;
          font-size: 12px;
          color: #9098A8;
          margin: 12px 0 0;
        }

        /* ── KEYFRAMES ────────────────────────────────────────────── */
        @keyframes kiosk-ribbon-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes kiosk-glow-breathe {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes kiosk-seal-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes kiosk-fade-scale-in {
          from { opacity: 0; transform: scale(0.85) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes kiosk-fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes kiosk-chip-in {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes kiosk-bubble-in {
          from { opacity: 0; transform: translateY(14px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes kiosk-avatar-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(201,162,75,0.35); }
          50% { box-shadow: 0 0 0 8px rgba(201,162,75,0); }
        }
        @keyframes kiosk-bounce {
          0%, 60%, 100% { transform: translateY(0) scale(1); opacity: 0.55; }
          30% { transform: translateY(-4px) scale(1.15); opacity: 1; }
        }
        @keyframes kiosk-shake-in {
          0% { opacity: 0; transform: translateY(-4px); }
          40% { opacity: 1; transform: translateX(-3px); }
          60% { transform: translateX(3px); }
          80% { transform: translateX(-2px); }
          100% { transform: translateX(0); }
        }
        @keyframes kiosk-rotate-gradient {
          to { --kiosk-angle: 360deg; }
        }
        @property --kiosk-angle {
          syntax: "<angle>";
          inherits: false;
          initial-value: 0deg;
        }

        /* ── RESPONSIVE ───────────────────────────────────────────── */
        @media (max-width: 720px) {
          .kiosk-topbar__inner { flex-wrap: wrap; gap: 10px; padding: 12px 16px; }
          .kiosk-topbar__title { white-space: normal; }
          .kiosk-topbar__right { gap: 12px; }
          .kiosk-clock__time { font-size: 15px; }
          .kiosk-row { max-width: 96%; }
        }

        /* ── TÔN TRỌNG NGƯỜI DÙNG GIẢM CHUYỂN ĐỘNG ───────────────── */
        @media (prefers-reduced-motion: reduce) {
          .kiosk-topbar, .kiosk-chat { transition: none; opacity: 1; transform: none; }
          .kiosk-ribbon, .kiosk-seal__ring, .kiosk-seal__halo,
          .kiosk-input::before, .kiosk-avatar--thinking, .kiosk-empty__glow {
            animation: none !important;
          }
          .kiosk-empty__logo, .kiosk-empty h2, .kiosk-empty p, .kiosk-empty__eyebrow, .kiosk-chip, .kiosk-row, .kiosk-error {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}