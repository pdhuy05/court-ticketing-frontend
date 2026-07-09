"use client";

import { useCallback, useEffect, useRef } from "react";
import { getPublicApiBase } from "@/lib/runtime-config";

/**
 * Hook TTS cho màn hình hiển thị (display page).
 * - Ưu tiên: Web Speech API với giọng tiếng Việt (vi-VN), MIỄN PHÍ, chạy offline
 * - Nếu thiết bị/trình duyệt KHÔNG có giọng tiếng Việt cài sẵn, Web Speech API
 *   sẽ tự phát bằng giọng mặc định (thường là tiếng Anh) và đọc sai — vì vậy
 *   trong trường hợp này ta CHỦ ĐỘNG bỏ qua Web Speech API luôn, không cố đọc
 *   sai giọng, mà nhường ngay cho Google Translate TTS (luôn đọc đúng tiếng
 *   Việt, nhưng cần Internet).
 * - Tự động load danh sách voices khi browser sẵn sàng (có độ trễ nên cần chờ).
 */
export const useTTS = () => {
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // Load danh sách voices — voices cần thời gian để browser tải
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  /**
   * Đảm bảo danh sách voices đã được load trước khi quyết định có giọng
   * tiếng Việt hay không. getVoices() có thể trả về mảng rỗng nếu gọi quá
   * sớm (trước khi browser tải xong danh sách giọng đọc), nên chờ tối đa
   * 300ms hoặc tới khi sự kiện voiceschanged bắn ra, tùy cái nào tới trước.
   */
  const ensureVoicesLoaded = useCallback((): Promise<SpeechSynthesisVoice[]> => {
    return new Promise((resolve) => {
      const existing = window.speechSynthesis.getVoices();
      if (existing.length > 0) {
        voicesRef.current = existing;
        resolve(existing);
        return;
      }

      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        const voices = window.speechSynthesis.getVoices();
        voicesRef.current = voices;
        resolve(voices);
      };

      window.speechSynthesis.onvoiceschanged = finish;
      setTimeout(finish, 300);
    });
  }, []);

  const findVietnameseVoice = (voices: SpeechSynthesisVoice[]) =>
    voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith("vi") ||
        v.name.toLowerCase().includes("vietnam") ||
        v.name.toLowerCase().includes("việt")
    );

  /** Phát bằng Web Speech API — CHỈ khi có giọng tiếng Việt thật sự. */
  const speakWebAPI = useCallback(
    (text: string): Promise<void> => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        return Promise.reject(new Error("Web Speech API không được hỗ trợ"));
      }

      return ensureVoicesLoaded().then(
        (voices) =>
          new Promise<void>((resolve, reject) => {
            const viVoice = findVietnameseVoice(voices);

            if (!viVoice) {
              // Không có giọng tiếng Việt trên thiết bị này — không đọc sai
              // giọng (tiếng Anh), nhường ngay cho Google TTS fallback.
              reject(
                new Error(
                  "Thiết bị không có giọng đọc tiếng Việt cài sẵn cho Web Speech API"
                )
              );
              return;
            }

            // Hủy nếu đang đọc dở
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = "vi-VN";
            utterance.voice = viVoice;
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.volume = 1;

            utterance.onend = () => resolve();
            utterance.onerror = (e) => reject(e);

            window.speechSynthesis.speak(utterance);
          })
      );
    },
    [ensureVoicesLoaded]
  );

  /** Fallback: Google Translate TTS — luôn đọc đúng tiếng Việt, cần Internet. */
  /**
   * Fallback: Google Translate TTS — nhưng gọi QUA BACKEND (proxy), không
   * gọi thẳng translate.google.com từ trình duyệt. Lý do: trình duyệt
   * không set được header Referer, mà Google yêu cầu Referer đúng mới cho
   * tải, nên gọi trực tiếp từ client hay bị chặn (403 / lỗi audio chung
   * chung). Backend set được header đó nên tải thành công, rồi chỉ pipe lại
   * y nguyên bytes cho client — client vẫn là bên tự phát audio, backend
   * không hề tự bật loa của nó.
   */
  const speakGoogleTTS = useCallback((text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const apiBase = getPublicApiBase();
      if (!apiBase) {
        reject(new Error("Thiếu NEXT_PUBLIC_BACKEND_API_URL, không thể gọi TTS proxy"));
        return;
      }
      const url = `${apiBase}/tts/audio?text=${encodeURIComponent(text)}`;
      const audio = new Audio(url);
      audio.onended = () => resolve();
      audio.onerror = (e) => reject(e);
      audio.play().catch(reject);
    });
  }, []);

  /**
   * Phát text tiếng Việt.
   * Ưu tiên Web Speech API nếu máy có giọng tiếng Việt thật; nếu không có
   * giọng tiếng Việt (hoặc bị lỗi khác) thì tự động chuyển sang Google TTS.
   */
  const speak = useCallback(
    async (text: string) => {
      try {
        await speakWebAPI(text);
      } catch (err) {
        console.warn("[TTS] Web Speech API không dùng được, thử Google TTS fallback:", err);
        try {
          await speakGoogleTTS(text);
        } catch (e) {
          console.error("[TTS] Không thể phát âm thanh:", e);
        }
      }
    },
    [speakWebAPI, speakGoogleTTS]
  );

  return { speak };
};