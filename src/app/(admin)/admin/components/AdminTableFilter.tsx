"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiX } from "react-icons/fi";
import { TbAdjustmentsHorizontal } from "react-icons/tb";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterSection {
  id: string;
  label: string;
  value: string[];
  options: FilterOption[];
  onChange: (value: string[]) => void;
}

interface AdminTableFilterProps {
  sections: FilterSection[];
  activeCount: number;
  onReset: () => void;
}

export default function AdminTableFilter({
  sections,
  activeCount,
  onReset,
}: AdminTableFilterProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasActiveFilters = useMemo(() => activeCount > 0, [activeCount]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOptionChange = (section: FilterSection, optionValue: string, checked: boolean) => {
    const current = section.value;
    let next: string[];
    if (checked) {
      if (optionValue === "all") {
        next = ["all"];
      } else {
        next = current.filter((v) => v !== "all" && v !== optionValue);
        next.push(optionValue);
      }
    } else {
      next = current.filter((v) => v !== optionValue);
      if (next.length === 0) next = ["all"];
    }
    section.onChange(next);
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "0 12px",
          height: "34px",
          background: open || hasActiveFilters ? "#f1f5f9" : "white",
          border: `0.5px solid ${open || hasActiveFilters ? "#94a3b8" : "#e2e8f0"}`,
          borderRadius: "8px",
          fontSize: "13px",
          color: "#1e293b",
          cursor: "pointer",
          whiteSpace: "nowrap",
          transition: "all .15s",
        }}
      >
        <TbAdjustmentsHorizontal size={15} />
        <span>Bộ lọc</span>
        {hasActiveFilters && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              background: "#1e293b",
              color: "white",
              fontSize: "10px",
              fontWeight: 500,
            }}
          >
            {activeCount}
          </span>
        )}
      </button>

      {/* Popover */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            width: "252px",
            background: "white",
            border: "0.5px solid #e2e8f0",
            borderRadius: "12px",
            overflow: "hidden",
            zIndex: 100,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            animation: "filterPop .12s ease",
          }}
        >
          <style>{`
            @keyframes filterPop {
              from { opacity: 0; transform: translateY(-4px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            .filter-opt:hover { background: #f8fafc; }
          `}</style>

          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              borderBottom: "0.5px solid #f1f5f9",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#94a3b8",
                letterSpacing: ".06em",
                textTransform: "uppercase",
              }}
            >
              Bộ lọc
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onReset}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "3px 8px",
                  border: "0.5px solid #e2e8f0",
                  borderRadius: "6px",
                  background: "none",
                  fontSize: "12px",
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                <FiX size={11} />
                Xóa lọc
              </button>
            )}
          </div>

          {/* Body */}
          <div style={{ maxHeight: "320px", overflowY: "auto" }}>
            {sections.map((section, si) => (
              <div key={section.id}>
                {si > 0 && (
                  <div
                    style={{
                      height: "0.5px",
                      background: "#f1f5f9",
                      margin: "2px 0",
                    }}
                  />
                )}
                <div
                  style={{
                    padding: "8px 14px 4px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#94a3b8",
                    letterSpacing: ".06em",
                    textTransform: "uppercase",
                  }}
                >
                  {section.label}
                </div>
                {section.options.map((option) => {
                  const isChecked = section.value.includes(option.value);
                  const isAll = option.value === "all";
                  return (
                    <label
                      key={option.value}
                      className="filter-opt"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "9px",
                        padding: "6px 14px",
                        cursor: "pointer",
                        transition: "background .1s",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          handleOptionChange(section, option.value, e.target.checked)
                        }
                        style={{
                          width: "14px",
                          height: "14px",
                          cursor: "pointer",
                          accentColor: "#1e293b",
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: isAll ? "12px" : "13px",
                          color: isAll ? "#94a3b8" : "#1e293b",
                        }}
                      >
                        {option.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}