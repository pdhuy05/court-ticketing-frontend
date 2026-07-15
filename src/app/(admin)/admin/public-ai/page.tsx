"use client";

import { useEffect, useRef, useState } from "react";
import {
  FiGlobe, FiSave, FiSend, FiRefreshCw, FiLoader, FiUser, FiCpu, FiCheckCircle, FiLock, FiExternalLink,
  FiFileText, FiAlertCircle, FiPlus, FiTrash2,
} from "react-icons/fi";
import ToastContainer from "@/components/ToastContainer";
import { useToast } from "@/hooks/useToast";
import { getMyProfile } from "@/services/auth.service";
import type { AdminProfile } from "@/services/auth.service";
import {
  getPublicAiKnowledge,
  updatePublicAiKnowledge,
  askPublicAi,
  type ChatMessage,
} from "@/services/publicAi.service";

const getCachedAdminUser = (): AdminProfile | null => {
  if (typeof window === "undefined") return null;
  const cached = localStorage.getItem("adminUser");
  if (!cached) return null;
  try {
    return JSON.parse(cached) as AdminProfile;
  } catch {
    return null;
  }
};

// ── Các mục dữ liệu dạng box tự do, giống trang Trợ lý AI nội bộ ─────────
type KnowledgeEntry = { id: string; title: string; content: string };

let entryIdCounter = 0;
const makeEntryId = () => {
  entryIdCounter += 1;
  return `pub-entry-${Date.now()}-${entryIdCounter}`;
};
const makeEmptyEntry = (): KnowledgeEntry => ({ id: makeEntryId(), title: "", content: "" });

const buildKnowledgeText = (entries: KnowledgeEntry[]): string =>
  entries
    .map((e) => {
      const title = e.title.trim();
      const content = e.content.trim();
      if (!title && !content) return null;
      return `## ${title || "Không có tiêu đề"}\n${content}`;
    })
    .filter(Boolean)
    .join("\n\n");

const parseKnowledgeText = (text: string): KnowledgeEntry[] => {
  if (!text.trim()) return [];
  const headerPattern = /^## (.+)$/;
  const lines = text.split("\n");
  const entries: KnowledgeEntry[] = [];
  let current: KnowledgeEntry | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (current) {
      current.content = buffer.join("\n").trim();
      entries.push(current);
    }
    buffer = [];
  };

  for (const line of lines) {
    const m = line.match(headerPattern);
    if (m) {
      flush();
      current = { id: makeEntryId(), title: m[1], content: "" };
      continue;
    }
    if (current) buffer.push(line);
  }
  flush();

  if (entries.length === 0) {
    entries.push({ id: makeEntryId(), title: "", content: text.trim() });
  }
  return entries;
};

const entriesEqual = (a: KnowledgeEntry[], b: KnowledgeEntry[]) => {
  if (a.length !== b.length) return false;
  return a.every((e, i) => e.title === b[i].title && e.content === b[i].content);
};

const MAX_KNOWLEDGE_CHARS = 50000;
const MAX_ENTRY_CHARS = 20000;

export default function AdminPublicAiPage() {
  const toast = useToast();

  const [currentUser, setCurrentUser] = useState<AdminProfile | null>(getCachedAdminUser);
  const isSuperAdmin = Boolean(currentUser?.isSuperAdmin);

  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [savedEntries, setSavedEntries] = useState<KnowledgeEntry[]>([]);
  const [isDefaultKnowledge, setIsDefaultKnowledge] = useState(true);
  const [knowledgeLoading, setKnowledgeLoading] = useState(true);
  const [savingKnowledge, setSavingKnowledge] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef(false);

  const hasUnsavedChanges = !entriesEqual(entries, savedEntries);
  const totalSavedChars = savedEntries.reduce((sum, e) => sum + e.title.length + e.content.length, 0);
  const totalCurrentChars = entries.reduce((sum, e) => sum + e.title.length + e.content.length, 0);
  const isOverLimit = totalCurrentChars > MAX_KNOWLEDGE_CHARS;

  useEffect(() => {
    let mounted = true;
    getMyProfile()
      .then((profile) => { if (mounted) setCurrentUser(profile); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) {
      setKnowledgeLoading(false);
      return;
    }
    let mounted = true;
    getPublicAiKnowledge()
      .then(({ knowledge: value, isDefault }) => {
        if (mounted) {
          const parsed = parseKnowledgeText(value);
          setEntries(parsed.length > 0 ? parsed : [makeEmptyEntry()]);
          setSavedEntries(isDefault ? [] : parsed);
          setIsDefaultKnowledge(isDefault);
        }
      })
      .catch((err) => toast.error(err.message || "Không tải được dữ liệu"))
      .finally(() => { if (mounted) setKnowledgeLoading(false); });
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const handleSaveKnowledge = async () => {
    setSavingKnowledge(true);
    try {
      const combined = buildKnowledgeText(entries);
      await updatePublicAiKnowledge(combined);
      setSavedEntries(entries);
      setIsDefaultKnowledge(false);
      toast.success("Đã lưu dữ liệu cho AI tra cứu công khai");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lưu thất bại");
    } finally {
      setSavingKnowledge(false);
    }
  };

  const updateEntryTitle = (id: string, title: string) =>
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, title } : e)));
  const updateEntryContent = (id: string, content: string) =>
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, content } : e)));
  const handleAddEntry = () => setEntries((prev) => [...prev, makeEmptyEntry()]);
  const handleRemoveEntry = (id: string) => setEntries((prev) => prev.filter((e) => e.id !== id));

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    try {
      const result = await askPublicAi(trimmed, messages);
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Trợ lý AI không phản hồi được");
      setMessages((prev) => prev.slice(0, -1));
      setInput(trimmed);
    } finally {
      setSending(false);
    }
  };

  const handleClearChat = () => setMessages([]);

  if (!isSuperAdmin) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <FiLock size={28} />
        </div>
        <div>
          <p className="text-base font-medium text-gray-600">Khu vực giới hạn quyền truy cập</p>
          <p className="mt-1 text-sm text-gray-400">Chỉ admin chính mới được nạp dữ liệu cho AI tra cứu công khai.</p>
        </div>
      </div>
    );
  }

  return (
    // h-full để tràn hết khung nội dung của layout admin, w-full + bỏ max-w để chiếm toàn bộ chiều ngang
    <div className="flex h-full w-full flex-col">
      <ToastContainer toasts={toast.toasts} onRemoveToast={toast.removeToast} />

      {/* ── HEADER ──────────────────────────────────────────────── */}
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-[#123262] via-[#1B3E73] to-[#2C4E80] px-7 py-6 shadow-lg shadow-slate-900/10">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-[#C9A24B]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-white/5 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#F2DFAE] ring-1 ring-white/15 backdrop-blur">
              <FiGlobe size={26} />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#F2DFAE]/90">
                Quản trị trợ lý AI
              </span>
              <h1 className="text-2xl font-bold text-white">AI tra cứu (Công khai)</h1>
              <p className="mt-0.5 text-sm text-white/70">
                Nạp dữ liệu để trợ lý AI trả lời người dân tại trang{" "}
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-[13px] text-[#F2DFAE]">/tra-cuu</code>.
              </p>
            </div>
          </div>
          <a
            href="/tra-cuu"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl bg-white/95 px-4 py-2.5 text-sm font-semibold text-[#123262] shadow-sm transition hover:bg-white hover:shadow-md"
          >
            <FiExternalLink size={15} /> Xem trang người dân
          </a>
        </div>
      </div>

      {/* ── NỘI DUNG CHÍNH: chiếm hết phần còn lại của màn hình ──── */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* ── PANEL NẠP DỮ LIỆU ───────────────────────────────────── */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <FiFileText className="text-gray-400" size={17} />
              <span className="text-base font-semibold text-gray-800">Dữ liệu cho người dân</span>
            </div>
            {knowledgeLoading ? null : isDefaultKnowledge ? (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-600 ring-1 ring-amber-100">
                <FiAlertCircle size={13} /> Đang dùng mẫu mặc định
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-600 ring-1 ring-emerald-100">
                <FiCheckCircle size={13} /> {totalSavedChars.toLocaleString("vi-VN")} ký tự đã lưu
              </span>
            )}
          </div>

          <div className="flex flex-1 flex-col overflow-y-auto bg-slate-50/40 p-6">

            {knowledgeLoading ? (
              <div className="flex h-64 items-center justify-center text-gray-400">
                <FiLoader className="mr-2 animate-spin" size={20} /> Đang tải...
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {entries.length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-white py-12 text-center text-base text-gray-400">
                    Chưa có mục nào. Bấm &quot;Thêm mục&quot; bên dưới để bắt đầu.
                  </div>
                )}

                {entries.map((entry, idx) => (
                  <div
                    key={entry.id}
                    className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[#C9A24B]/50 hover:shadow-md"
                  >
                    <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#123262] to-[#C9A24B] opacity-70" />
                    <div className="mb-2.5 flex items-center gap-2.5 pl-2">
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#123262]/10 text-xs font-semibold text-[#123262]">
                        {idx + 1}
                      </span>
                      <input
                        value={entry.title}
                        onChange={(e) => updateEntryTitle(entry.id, e.target.value)}
                        placeholder="Tiêu đề mục (vd: Nộp đơn ly hôn, Giờ làm việc...)"
                        className="flex-1 rounded-lg border border-gray-200 bg-gray-50/70 px-3 py-2 text-base font-medium text-gray-800 outline-none transition focus:border-[#C9A24B] focus:bg-white focus:ring-2 focus:ring-[#C9A24B]/20"
                        maxLength={100}
                      />
                      <button
                        onClick={() => handleRemoveEntry(entry.id)}
                        title="Xóa mục này"
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                    <textarea
                      value={entry.content}
                      onChange={(e) => updateEntryContent(entry.id, e.target.value)}
                      placeholder="Nội dung chi tiết: giấy tờ cần mang, điều kiện, quầy cần đến..."
                      rows={6}
                      className="ml-2 min-h-[140px] w-[calc(100%-0.5rem)] resize-y rounded-lg border border-gray-200 bg-gray-50/70 p-3 text-base text-gray-800 outline-none transition focus:border-[#C9A24B] focus:bg-white focus:ring-2 focus:ring-[#C9A24B]/20"
                      maxLength={MAX_ENTRY_CHARS}
                    />
                    <div className="ml-2 mt-1 text-right text-xs text-gray-400">
                      {entry.content.length.toLocaleString("vi-VN")}/{MAX_ENTRY_CHARS.toLocaleString("vi-VN")} ký tự
                    </div>
                  </div>
                ))}

                <button
                  onClick={handleAddEntry}
                  className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white py-3.5 text-base font-medium text-gray-500 transition hover:border-[#C9A24B] hover:bg-[#FFFBF0] hover:text-[#8A6A1F]"
                >
                  <FiPlus size={17} /> Thêm mục
                </button>
              </div>
            )}

            {!knowledgeLoading && (
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className={isOverLimit ? "font-semibold text-red-500" : "text-gray-400"}>
                  Tổng: {totalCurrentChars.toLocaleString("vi-VN")}/{MAX_KNOWLEDGE_CHARS.toLocaleString("vi-VN")} ký tự
                  {isOverLimit && " — vượt giới hạn, vui lòng rút gọn bớt"}
                </span>
                {hasUnsavedChanges && (
                  <span className="flex items-center gap-1.5 font-medium text-amber-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Có thay đổi chưa lưu
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 bg-white p-5">
            <button
              onClick={handleSaveKnowledge}
              disabled={savingKnowledge || isOverLimit || !hasUnsavedChanges}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-base font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              {savingKnowledge ? <FiLoader className="animate-spin" size={18} /> : <FiSave size={18} />}
              Lưu dữ liệu
            </button>
          </div>
        </div>

        {/* ── KHUNG CHAT THỬ ──────────────────────────────────────── */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <FiCpu className="text-gray-400" size={17} />
              <span className="text-base font-semibold text-gray-800">Chat thử (góc nhìn người dân)</span>
            </div>
            <button
              onClick={handleClearChat}
              disabled={messages.length === 0}
              className="flex items-center gap-1.5 text-sm text-gray-400 transition hover:text-gray-600 disabled:opacity-40"
            >
              <FiRefreshCw size={14} /> Xóa hội thoại
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto bg-slate-50/60 px-6 py-5">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-base text-gray-400">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#123262]/40 shadow-sm">
                  <FiCpu size={26} />
                </div>
                <p>Thử đặt câu hỏi như người dân để kiểm tra dữ liệu vừa nạp.</p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex items-start gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && (
                  <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#123262] text-[#F2DFAE] shadow-sm">
                    <FiCpu size={16} />
                  </div>
                )}
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-base leading-relaxed shadow-sm ${
                    m.role === "user"
                      ? "rounded-br-md bg-gradient-to-br from-[#123262] to-[#2C4E80] text-white"
                      : "rounded-bl-md bg-white text-gray-800"
                  }`}
                >
                  {m.content}
                </div>
                {m.role === "user" && (
                  <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-600">
                    <FiUser size={16} />
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#123262] text-[#F2DFAE] shadow-sm">
                  <FiCpu size={16} />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-white px-4 py-3 text-base text-gray-400 shadow-sm">
                  <FiLoader className="animate-spin" /> Đang trả lời...
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          <div className="flex items-center gap-3 border-t border-gray-100 bg-white p-4">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onCompositionStart={() => { isComposingRef.current = true; }}
              onCompositionEnd={() => { isComposingRef.current = false; }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  if (isComposingRef.current || e.nativeEvent.isComposing) return;
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Nhập câu hỏi để test..."
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-base outline-none transition focus:border-[#C9A24B] focus:bg-white focus:ring-2 focus:ring-[#C9A24B]/20"
              maxLength={1000}
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#123262] text-white shadow-sm transition hover:bg-[#1B3E73] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
            >
              <FiSend size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}