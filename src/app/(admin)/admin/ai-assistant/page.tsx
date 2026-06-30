"use client";

import { useEffect, useRef, useState } from "react";
import {
  FiCpu, FiSave, FiSend, FiRefreshCw, FiLoader, FiUser, FiBookOpen, FiX, FiCheckCircle, FiLock,
} from "react-icons/fi";
import ToastContainer from "@/components/ToastContainer";
import { useToast } from "@/hooks/useToast";
import { getMyProfile } from "@/services/auth.service";
import type { AdminProfile } from "@/services/auth.service";
import {
  getAiKnowledge,
  updateAiKnowledge,
  askAi,
  type ChatMessage,
} from "@/services/ai.service";

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

// ── Các mục huấn luyện dạng box tự do ─────────────────────────────────
// Thay vì 1 ô lớn hoặc các nhóm cố định, admin tự thêm từng "mục" riêng
// (vd: 1 mục cho giờ làm việc, 1 mục cho quầy A, 1 mục cho quầy B, ...).
// Mỗi mục có tiêu đề tự đặt + nội dung. Tất cả được lưu chung vào 1 chuỗi
// text (vì backend chỉ nhận 1 field "knowledge"), phân tách bằng header
// dạng "## <tiêu đề>" để có thể tách lại khi tải dữ liệu lên.
type KnowledgeEntry = {
  id: string;
  title: string;
  content: string;
};

let entryIdCounter = 0;
const makeEntryId = () => {
  entryIdCounter += 1;
  return `entry-${Date.now()}-${entryIdCounter}`;
};

const makeEmptyEntry = (): KnowledgeEntry => ({
  id: makeEntryId(),
  title: "",
  content: "",
});

// Ghép các mục riêng lẻ thành 1 chuỗi knowledge duy nhất để lưu xuống DB.
const buildKnowledgeText = (entries: KnowledgeEntry[]): string => {
  return entries
    .map((e) => {
      const title = e.title.trim();
      const content = e.content.trim();
      if (!title && !content) return null;
      return `## ${title || "Không có tiêu đề"}\n${content}`;
    })
    .filter(Boolean)
    .join("\n\n");
};

// Tách 1 chuỗi knowledge (đã lưu hoặc mẫu mặc định) trở lại thành các mục riêng.
// Nếu nội dung không theo định dạng header (vd: dữ liệu cũ gõ tự do trước đây),
// toàn bộ sẽ được đổ vào 1 mục duy nhất để admin không bị mất dữ liệu.
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
    // Không nhận diện được định dạng header -> giữ nguyên vào 1 mục chung.
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

export default function AdminAiAssistantPage() {
  const toast = useToast();

  // ── Quyền hạn ────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<AdminProfile | null>(getCachedAdminUser);
  const isSuperAdmin = Boolean(currentUser?.isSuperAdmin);

  // ── Huấn luyện (knowledge) - dạng các box tự do, thêm/xóa tùy ý ──────
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [savedEntries, setSavedEntries] = useState<KnowledgeEntry[]>([]);
  const [isDefaultKnowledge, setIsDefaultKnowledge] = useState(true);
  const [knowledgeLoading, setKnowledgeLoading] = useState(true);
  const [savingKnowledge, setSavingKnowledge] = useState(false);
  const [showTrainingPanel, setShowTrainingPanel] = useState(false);

  // ── Chat thử ─────────────────────────────────────────────────────────
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
      .then((profile) => {
        if (mounted) setCurrentUser(profile);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) {
      setKnowledgeLoading(false);
      return;
    }
    let mounted = true;
    getAiKnowledge()
      .then(({ knowledge: value, isDefault }) => {
        if (mounted) {
          const parsed = parseKnowledgeText(value);
          setEntries(parsed.length > 0 ? parsed : [makeEmptyEntry()]);
          setSavedEntries(isDefault ? [] : parsed);
          setIsDefaultKnowledge(isDefault);
        }
      })
      .catch((err) => toast.error(err.message || "Không tải được nội dung huấn luyện"))
      .finally(() => {
        if (mounted) setKnowledgeLoading(false);
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const handleSaveKnowledge = async () => {
    setSavingKnowledge(true);
    try {
      const combined = buildKnowledgeText(entries);
      await updateAiKnowledge(combined);
      setSavedEntries(entries);
      setIsDefaultKnowledge(false);
      toast.success("Đã lưu nội dung huấn luyện cho trợ lý AI");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lưu thất bại");
    } finally {
      setSavingKnowledge(false);
    }
  };

  const handleCloseTrainingPanel = () => {
    if (hasUnsavedChanges) {
      const confirmDiscard = window.confirm(
        "Bạn có thay đổi chưa lưu trong nội dung huấn luyện. Đóng lại sẽ mất các thay đổi này, tiếp tục?",
      );
      if (!confirmDiscard) return;
      setEntries(savedEntries);
    }
    setShowTrainingPanel(false);
  };

  const updateEntryTitle = (id: string, title: string) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, title } : e)));
  };

  const updateEntryContent = (id: string, content: string) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, content } : e)));
  };

  const handleAddEntry = () => {
    setEntries((prev) => [...prev, makeEmptyEntry()]);
  };

  const handleRemoveEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const result = await askAi(trimmed, messages);
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Trợ lý AI không phản hồi được");
      setMessages((prev) => prev.slice(0, -1)); // bỏ message vừa gửi nếu lỗi
      setInput(trimmed);
    } finally {
      setSending(false);
    }
  };

  const handleClearChat = () => setMessages([]);

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col">
      <ToastContainer toasts={toast.toasts} onRemoveToast={toast.removeToast} />

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <FiCpu size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Trợ lý AI</h1>
            <p className="text-sm text-gray-500">Chat thử và kiểm tra trợ lý AI nội bộ.</p>
          </div>
        </div>

        {isSuperAdmin ? (
          <button
            onClick={() => setShowTrainingPanel(true)}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600"
          >
            <FiBookOpen size={15} />
            Huấn luyện AI
            {knowledgeLoading ? null : isDefaultKnowledge ? (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                Đang dùng mẫu mặc định
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                <FiCheckCircle size={11} /> {totalSavedChars} ký tự
              </span>
            )}
          </button>
        ) : (
          <span className="flex items-center gap-1.5 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-400">
            <FiLock size={13} /> Chỉ admin chính mới được huấn luyện AI
          </span>
        )}
      </div>

      {/* ── KHUNG CHAT (chính, chiếm toàn bộ không gian còn lại) ──── */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <span className="text-sm font-medium text-gray-500">Cuộc trò chuyện thử nghiệm</span>
          <button
            onClick={handleClearChat}
            disabled={messages.length === 0}
            className="flex items-center gap-1 text-xs text-gray-400 transition hover:text-gray-600 disabled:opacity-40"
          >
            <FiRefreshCw size={12} /> Xóa hội thoại
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50 px-5 py-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-gray-400">
              <FiCpu size={28} className="text-gray-300" />
              {!isDefaultKnowledge ? (
                <p>Đã có nội dung huấn luyện. Nhập câu hỏi để thử nghiệm trợ lý AI.</p>
              ) : isSuperAdmin ? (
                <p>
                  Đang dùng nội dung mẫu mặc định. Bấm{" "}
                  <button
                    onClick={() => setShowTrainingPanel(true)}
                    className="font-medium text-indigo-600 underline-offset-2 hover:underline"
                  >
                    Huấn luyện AI
                  </button>{" "}
                  để điền thông tin thực tế trước khi dùng chính thức.
                </p>
              ) : (
                <p>Trợ lý AI đang dùng nội dung mặc định. Bạn vẫn có thể đặt câu hỏi để thử nghiệm.</p>
              )}
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex items-start gap-2.5 ${m.role === "user" ? "justify-end" : ""}`}
            >
              {m.role === "assistant" && (
                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
                  <FiCpu size={14} />
                </div>
              )}
              <div
                className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-800 shadow-sm"
                }`}
              >
                {m.content}
              </div>
              {m.role === "user" && (
                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-300 text-gray-600">
                  <FiUser size={14} />
                </div>
              )}
            </div>
          ))}

          {sending && (
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
                <FiCpu size={14} />
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl bg-white px-4 py-2.5 text-sm text-gray-400 shadow-sm">
                <FiLoader className="animate-spin" /> Đang trả lời...
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        <div className="flex items-center gap-2 border-t border-gray-100 p-3">
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
              // Bỏ qua Enter khi bộ gõ tiếng Việt (IME) đang trong quá trình ghép chữ,
              // tránh việc gửi tin nhắn giữa chừng làm sót lại ký tự trong ô input.
              if (e.key === "Enter" && !e.shiftKey) {
                if (isComposingRef.current || e.nativeEvent.isComposing) {
                  return;
                }
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Nhập câu hỏi để test trợ lý AI..."
            className="flex-1 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            maxLength={1000}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            <FiSend size={16} />
          </button>
        </div>
      </div>

      {/* ── PANEL HUẤN LUYỆN (trượt từ bên phải, chỉ hiện khi cần) ── */}
      {isSuperAdmin && showTrainingPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={handleCloseTrainingPanel}
          />
          <div className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <FiBookOpen className="text-indigo-600" />
                <h2 className="font-semibold text-gray-800">Huấn luyện trợ lý AI</h2>
              </div>
              <button
                onClick={handleCloseTrainingPanel}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="flex flex-1 flex-col overflow-y-auto p-5">
              <p className="mb-4 text-sm text-gray-500">
                Mỗi ý/quy định nội bộ bạn muốn AI tuân theo, hãy tách thành 1 box riêng
                bên dưới (tự đặt tiêu đề + nội dung) để dễ quản lý, thay vì gõ chung vào
                1 đoạn dài. Nội dung này được ưu tiên cao nhất, cùng với danh sách dịch vụ
                đang hoạt động lấy tự động từ hệ thống.
              </p>

              {knowledgeLoading ? (
                <div className="flex h-48 items-center justify-center text-gray-400">
                  <FiLoader className="mr-2 animate-spin" /> Đang tải...
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {entries.length === 0 && (
                    <div className="rounded-xl border border-dashed border-gray-300 py-8 text-center text-sm text-gray-400">
                      Chưa có mục nào. Bấm &quot;Thêm mục&quot; bên dưới để bắt đầu.
                    </div>
                  )}

                  {entries.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-gray-200 bg-gray-50/60 p-3"
                    >
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-semibold text-indigo-600">
                          {idx + 1}
                        </span>
                        <input
                          value={entry.title}
                          onChange={(e) => updateEntryTitle(entry.id, e.target.value)}
                          placeholder="Tiêu đề mục (vd: Giờ làm việc, Quầy Nộp đơn...)"
                          className="flex-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                          maxLength={100}
                        />
                        <button
                          onClick={() => handleRemoveEntry(entry.id)}
                          title="Xóa mục này"
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                        >
                          <FiX size={15} />
                        </button>
                      </div>
                      <textarea
                        value={entry.content}
                        onChange={(e) => updateEntryContent(entry.id, e.target.value)}
                        placeholder="Nội dung chi tiết cho mục này..."
                        rows={4}
                        className="min-h-[90px] w-full resize-y rounded-lg border border-gray-200 bg-white p-2.5 text-sm text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        maxLength={MAX_ENTRY_CHARS}
                      />
                      <div className="mt-1 text-right text-[11px] text-gray-400">
                        {entry.content.length}/{MAX_ENTRY_CHARS.toLocaleString("vi-VN")} ký tự
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={handleAddEntry}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 py-2.5 text-sm font-medium text-gray-500 transition hover:border-indigo-300 hover:text-indigo-600"
                  >
                    + Thêm mục
                  </button>
                </div>
              )}

              {!knowledgeLoading && (
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className={isOverLimit ? "font-semibold text-red-500" : "text-gray-400"}>
                    Tổng: {totalCurrentChars.toLocaleString("vi-VN")}/{MAX_KNOWLEDGE_CHARS.toLocaleString("vi-VN")} ký tự
                    {isOverLimit && " — vượt giới hạn, vui lòng rút gọn bớt"}
                  </span>
                  {hasUnsavedChanges && (
                    <span className="font-medium text-amber-500">Có thay đổi chưa lưu</span>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 p-4">
              <button
                onClick={handleSaveKnowledge}
                disabled={savingKnowledge || knowledgeLoading || !hasUnsavedChanges || isOverLimit}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingKnowledge ? <FiLoader className="animate-spin" /> : <FiSave />}
                Lưu huấn luyện
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}