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
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef(false);
  const now = useClock();
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>(DEFAULT_QUESTIONS);

  useEffect(() => {
    let mounted = true;
    getPublicAiTopics()
      .then((topics) => {
        if (mounted && topics.length > 0) setSuggestedQuestions(topics);
      })
      .catch(() => {
        // API lỗi hoặc chưa có -> giữ nguyên danh sách mặc định.
      });
    return () => {
      mounted = false;
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

  return (
    <div className="kiosk-root">
      {/* ══════════════ CỘT TRÁI — THƯƠNG HIỆU / CON DẤU (THU GỌN) ══════════════ */}
      <aside className="kiosk-brand">
        <div className="kiosk-brand__pattern" />

        <div className="kiosk-brand__identity">
          <CourtLogo size={44} />
        </div>

        <div className="kiosk-clock kiosk-clock--mini">
          <span className="kiosk-clock__time">{timeLabel}</span>
        </div>
      </aside>

      {/* ══════════════ CỘT PHẢI — KHUNG HỎI ĐÁP ══════════════ */}
      <main className="kiosk-chat">
        <header className="kiosk-chat__header">
          <div className="kiosk-chat__status">
            <span className="kiosk-dot" />
            TÒA ÁN NHÂN DÂN KHU VỰC 1 - THÀNH PHỐ HỒ CHÍ MINH
          </div>
          <button onClick={handleClearChat} disabled={messages.length === 0} className="kiosk-reset">
            <FiRefreshCw size={14} /> Hỏi lại từ đầu
          </button>
        </header>

        <div className="kiosk-chat__body">
          {messages.length === 0 && (
            <div className="kiosk-empty">
              <CourtLogo size={150} />
              <h2>Bạn cần tra cứu điều gì?</h2>
              <p>Chạm vào một câu hỏi gợi ý, hoặc gõ câu hỏi của riêng bạn bên dưới.</p>
              <div className="kiosk-suggestions">
                {suggestedQuestions.map((q) => (
                  <button key={q} onClick={() => sendMessage(q)} className="kiosk-chip">
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
                  <CourtLogo size={40} />
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
              <div className="kiosk-avatar">
                <CourtLogo size={40} />
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

        <div className="kiosk-input">
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
          <button onClick={handleSend} disabled={sending || !input.trim()}>
            <FiSend size={20} />
          </button>
        </div>

        <p className="kiosk-disclaimer">
          Thông tin do AI tổng hợp chỉ mang tính tham khảo. Vui lòng liên hệ trực tiếp nhân viên tại
          quầy để được hỗ trợ chính xác nhất.
        </p>
      </main>

      <style>{`
        * { box-sizing: border-box; }

        .kiosk-root {
          display: flex;
          width: 100vw;
          height: 100dvh;
          overflow: hidden;
          background: #0F2444;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Be Vietnam Pro", Inter, sans-serif;
        }

        .kiosk-logo {
          display: block;
          object-fit: contain;
        }

        /* ── CỘT THƯƠNG HIỆU (THU GỌN CỐ ĐỊNH) ───────────────────── */
        .kiosk-brand {
          position: relative;
          width: 88px;
          min-width: 88px;
          max-width: 88px;
          background: radial-gradient(120% 140% at 0% 0%, #15315C 0%, #0B1E3A 60%, #081530 100%);
          color: #EAF0FA;
          padding: 28px 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
          overflow: hidden;
        }

        .kiosk-brand__pattern {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle at 1px 1px, rgba(201,162,75,0.18) 1px, transparent 0);
          background-size: 22px 22px;
          opacity: 0.5;
          pointer-events: none;
        }

        .kiosk-brand__identity {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-bottom: 18px;
          margin-bottom: 18px;
          border-bottom: 1px solid rgba(201,162,75,0.22);
        }

        .kiosk-clock {
          display: flex;
          flex-direction: column;
        }

        .kiosk-clock--mini {
          position: relative;
          z-index: 1;
          align-items: center;
          flex: 1;
          justify-content: center;
        }
        .kiosk-clock--mini .kiosk-clock__time {
          font-family: "Courier New", monospace;
          font-weight: 700;
          color: #fff;
          font-size: 15px;
          writing-mode: vertical-rl;
          letter-spacing: 0.06em;
        }

        /* ── CỘT CHAT ─────────────────────────────────────────────── */
        .kiosk-chat {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          background: #FBF8F2;
          padding: clamp(16px, 2.4vw, 36px) clamp(16px, 4vw, 72px);
        }

        .kiosk-chat__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
          padding-bottom: 16px;
        }

        .kiosk-chat__status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #2A3B55;
        }

        .kiosk-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #3FA66A;
          box-shadow: 0 0 0 4px rgba(63,166,106,0.18);
        }

        .kiosk-reset {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          font-size: 13px;
          color: #8A93A6;
          cursor: pointer;
        }
        .kiosk-reset:disabled { opacity: 0.4; cursor: default; }
        .kiosk-reset:not(:disabled):hover { color: #15315C; }

        .kiosk-chat__body {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 18px;
          padding: 8px 4px 24px;
        }

        .kiosk-empty {
          margin: auto;
          text-align: center;
          max-width: 560px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          color: #5B6478;
        }
        .kiosk-empty h2 {
          font-family: "Georgia", "Noto Serif", serif;
          font-size: clamp(22px, 2.6vw, 30px);
          color: #1C2B45;
          margin: 14px 0 2px;
        }
        .kiosk-empty p { font-size: 14.5px; margin: 0 0 18px; }

        .kiosk-suggestions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
        }

        .kiosk-chip {
          border: 1px solid #DCD2B8;
          background: #fff;
          color: #2A3B55;
          padding: 11px 18px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .kiosk-chip:hover {
          border-color: #C9A24B;
          color: #8A6A1F;
          background: #FFFBF0;
        }

        .kiosk-row {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          max-width: 760px;
        }
        .kiosk-row.is-user { align-self: flex-end; }
        .kiosk-row.is-assistant { align-self: flex-start; }

        .kiosk-avatar {
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .kiosk-avatar--user {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #D9DEE8;
          color: #4A5468;
        }

        .kiosk-bubble {
          padding: 14px 18px;
          border-radius: 16px;
          font-size: 15.5px;
          line-height: 1.65;
          white-space: pre-wrap;
          max-width: 100%;
        }
        .is-assistant .kiosk-bubble {
          background: #fff;
          color: #28324A;
          border: 1px solid #ECE6D6;
          border-bottom-left-radius: 4px;
        }
        .is-user .kiosk-bubble {
          background: #15315C;
          color: #fff;
          border-bottom-right-radius: 4px;
        }

        .kiosk-bubble--typing { display: flex; gap: 5px; padding: 16px 18px; }
        .kiosk-bubble--typing span {
          width: 6px; height: 6px; border-radius: 50%;
          background: #B9BFCB;
          animation: kiosk-bounce 1.2s infinite ease-in-out;
        }
        .kiosk-bubble--typing span:nth-child(2) { animation-delay: 0.15s; }
        .kiosk-bubble--typing span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes kiosk-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-4px); opacity: 1; }
        }

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
        }

        .kiosk-input {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fff;
          border: 1px solid #E5DEC9;
          border-radius: 999px;
          padding: 6px 6px 6px 22px;
          box-shadow: 0 8px 24px rgba(15,36,68,0.08);
        }
        .kiosk-input input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 15.5px;
          background: transparent;
          color: #1C2B45;
          padding: 12px 0;
        }
        .kiosk-input input::placeholder { color: #A8AEBC; }
        .kiosk-input button {
          flex-shrink: 0;
          width: 46px;
          height: 46px;
          border-radius: 50%;
          border: none;
          background: #C9A24B;
          color: #15315C;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .kiosk-input button:disabled { background: #E7DEC6; color: #B7AD92; cursor: default; }
        .kiosk-input button:not(:disabled):hover { background: #D9B45F; }

        .kiosk-disclaimer {
          flex-shrink: 0;
          text-align: center;
          font-size: 12px;
          color: #9098A8;
          margin: 12px 0 0;
        }

        /* ── RESPONSIVE: chuyển sidebar thành thanh ngang trên màn nhỏ ── */
        @media (max-width: 860px) {
          .kiosk-root { flex-direction: column; }
          .kiosk-brand {
            width: 100%;
            min-width: 0;
            max-width: none;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            padding: 10px 18px;
            flex-shrink: 0;
          }
          .kiosk-brand__identity {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
          }
          .kiosk-clock--mini {
            flex: none;
          }
          .kiosk-clock--mini .kiosk-clock__time {
            writing-mode: horizontal-tb;
            font-size: 16px;
          }
          .kiosk-chat { padding: 14px; }
        }
      `}</style>
    </div>
  );
}