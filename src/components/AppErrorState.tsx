"use client";

import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";

type AppErrorStateProps = {
  code?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
};

export default function AppErrorState({
  code = "500",
  title,
  message,
  actionLabel,
  actionHref,
  onAction,
  actionDisabled = false,
}: AppErrorStateProps) {
  const actionStyle: CSSProperties = {
    height: 48,
    minWidth: 132,
    padding: "0 22px",
    border: "none",
    borderRadius: 8,
    background: actionDisabled ? "#a8adbc" : "#f97316",
    color: "#ffffff",
    cursor: actionDisabled ? "wait" : "pointer",
    fontSize: 16,
    fontWeight: 800,
    lineHeight: "48px",
    boxShadow: actionDisabled ? "none" : "0 18px 34px rgba(249, 115, 22, 0.26)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    textDecoration: "none",
    boxSizing: "border-box",
    transition: "transform 180ms ease, box-shadow 180ms ease, background 180ms ease",
  };

  const action = actionLabel && actionHref ? (
    <Link href={actionHref} style={actionStyle}>
      {actionLabel}
    </Link>
  ) : actionLabel ? (
    <button
      type="button"
      onClick={onAction}
      disabled={actionDisabled}
      style={actionStyle}
    >
      {actionLabel}
    </button>
  ) : null;

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100%",
        width: "100%",
        overflow: "hidden",
        background: "transparent",
        color: "#343954",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <section
        style={{
          position: "relative",
          zIndex: 2,
          minHeight: "calc(100vh - 170px)",
          width: "min(1180px, calc(100% - 48px))",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.06fr) minmax(260px, 0.94fr)",
          alignItems: "center",
          gap: "clamp(32px, 8vw, 118px)",
          padding: "clamp(44px, 7vw, 92px) 0",
          boxSizing: "border-box",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: "clamp(120px, 17vw, 200px)",
              lineHeight: 0.9,
              fontWeight: 900,
              letterSpacing: 0,
              color: "#353a59",
              textShadow: "0 16px 34px rgba(53, 58, 89, 0.12)",
            }}
          >
            {code}
          </div>
          <h1
            style={{
              margin: "18px 0 0",
              maxWidth: "min(720px, 100vw - 48px)",
              fontSize: "clamp(28px, 3vw, 44px)",
              lineHeight: 1.05,
              fontWeight: 900,
              letterSpacing: 0,
              color: "#252a44",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </h1>
          {message && (
            <p
              style={{
                margin: "10px 0 22px",
                maxWidth: 450,
                fontSize: "clamp(16px, 1.7vw, 22px)",
                lineHeight: 1.28,
                fontWeight: 500,
                color: "#6d7286",
              }}
            >
              {message}
            </p>
          )}
          <div style={{ marginTop: message ? 0 : 28 }}>
            {action}
          </div>
        </div>

        <div
          aria-hidden="true"
          style={{
            position: "relative",
            minHeight: 360,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: "#353a59",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: "min(390px, 68vw)",
              aspectRatio: "1",
              borderRadius: "50%",
              border: "1px solid rgba(53, 58, 89, 0.12)",
              background: "rgba(255, 255, 255, 0.3)",
              boxShadow: "inset 0 0 0 34px rgba(255, 255, 255, 0.2)",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: "min(286px, 52vw)",
              aspectRatio: "1",
              borderRadius: "50%",
              border: "1px dashed rgba(53, 58, 89, 0.26)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "18%",
              right: "18%",
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "#f97316",
              boxShadow: "0 0 0 10px rgba(249, 115, 22, 0.14)",
              animation: "statusPulse 1.4s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "relative",
              width: "min(250px, 48vw)",
              aspectRatio: "1",
              borderRadius: 8,
              background: "transparent",
              border: "none",
              boxShadow: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Image
              src="/assets/logotoaan.png"
              alt=""
              width={148}
              height={148}
              priority
              style={{
                width: "clamp(148px, 18vw, 216px)",
                height: "clamp(148px, 18vw, 216px)",
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      </section>

      <style>
        {`
          @keyframes statusPulse {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
              box-shadow: 0 0 0 8px rgba(249, 115, 22, 0.16);
            }

            50% {
              opacity: 0.58;
              transform: scale(1.22);
              box-shadow: 0 0 0 18px rgba(249, 115, 22, 0);
            }
          }

          @media (max-width: 720px) {
            main section {
              grid-template-columns: 1fr !important;
              align-content: start !important;
              gap: 36px !important;
              padding-top: 56px !important;
              padding-bottom: 56px !important;
            }

            main h1 {
              font-size: clamp(24px, 7vw, 34px) !important;
            }

            main section > div:last-child {
              justify-content: flex-start !important;
              transform: none !important;
              min-height: 260px !important;
            }
          }
        `}
      </style>
    </main>
  );
}