"use client";

import { useCallback, useEffect, useRef } from "react";
import type { NewTicketSocketPayload } from "@/types/new-ticket";

const stripTitleBadge = (title: string) => title.replace(/^\(\d+\)\s+/, "");

// ─── Web Audio beep ────────────────────────────────────────────────────────────

let _audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
  }
  if (_audioCtx.state === "suspended") void _audioCtx.resume();
  return _audioCtx;
}

/**
 * @param freq      Tần số Hz
 * @param duration  Giây
 * @param volume    0–1
 * @param startAt   Delay giây (để ghép nhiều tone)
 */
function playTone(
  freq: number,
  duration: number,
  volume = 0.4,
  startAt = 0,
): void {
  const ctx = getAudioCtx();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, ctx.currentTime + startAt);
  gain.gain.setValueAtTime(volume, ctx.currentTime + startAt);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    ctx.currentTime + startAt + duration,
  );

  osc.start(ctx.currentTime + startAt);
  osc.stop(ctx.currentTime + startAt + duration);
}

function playNewTicketSound() {
  playTone(880, 2, 0.5, 0.0);   
  playTone(1100, 2, 0.4, 0.7);   
}

// ─── Browser notification ──────────────────────────────────────────────────────

function showDesktopNotification(payload: NewTicketSocketPayload) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;

  const { ticket, service } = payload;
  const label =
    ticket.displayNumber?.trim() || ticket.ticketNumber?.trim() || "—";

  try {
    const n = new Notification(`Vé mới — ${service.name}`, {
      body: `Số ${label} — ${ticket.name || "Đương sự"}`,
      tag: String(ticket._id),
      requireInteraction: false,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {

  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNewTicketAlerts() {
  const baseTitleRef = useRef<string | null>(null);
  const unseenRef = useRef(0);

  useEffect(() => {
    if (typeof document === "undefined") return;
    baseTitleRef.current = stripTitleBadge(document.title);

    // Unlock AudioContext khi user tương tác lần đầu
    const unlock = () => {
      getAudioCtx();
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    const onFocus = () => {
      unseenRef.current = 0;
      if (baseTitleRef.current !== null) document.title = baseTitleRef.current;
    };
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  return useCallback((payload: NewTicketSocketPayload) => {

    playNewTicketSound();

    showDesktopNotification(payload);

    unseenRef.current += 1;
    const base =
      baseTitleRef.current ??
      stripTitleBadge(
        typeof document !== "undefined" ? document.title : "",
      );
    baseTitleRef.current = base;
    if (typeof document !== "undefined") {
      document.title = `(${unseenRef.current}) ${base}`;
    }
  }, []);
}