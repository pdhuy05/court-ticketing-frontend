"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        padding: 40,
      }}
    >
      <h1 style={{ color: "#003366", marginBottom: 30 }}>
        Hệ Thống lấy vé tự động
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 20,
          marginBottom: 40,
        }}
      >
        {/* User Access */}
        <div
          style={{
            padding: 20,
            background: "#f0f7ff",
            borderRadius: 8,
            border: "2px solid #003366",
          }}
        >
          <h2 style={{ color: "#003366", marginBottom: 15 }}>Người Dùng</h2>
          <p style={{ marginBottom: 15, color: "#666" }}>
            Người dân lấy số thứ tự
          </p>
          <Link href="/">
            <button
              style={{
                padding: 12,
                background: "#003366",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 16,
                width: "100%",
              }}
            >
              Lấy vé
            </button>
          </Link>
        </div>

        {/* Staff Access */}
        <div
          style={{
            padding: 20,
            background: "#fff0f7",
            borderRadius: 8,
            border: "2px solid #e83e8c",
          }}
        >
          <h2 style={{ color: "#e83e8c", marginBottom: 15 }}>👨‍💼 Nhân Viên</h2>
          <p style={{ marginBottom: 15, color: "#666" }}>
            Nhân viên quầy phục vụ khách
          </p>
          <Link href="/staff/login">
            <button
              style={{
                padding: 12,
                background: "#e83e8c",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 16,
                width: "100%",
              }}
            >
              Đăng Nhập
            </button>
          </Link>
        </div>

        {/* Public Display */}
        <div
          style={{
            padding: 20,
            background: "#f0fff4",
            borderRadius: 8,
            border: "2px solid #28a745",
          }}
        >
          <h2 style={{ color: "#28a745", marginBottom: 15 }}>📺 Màn Hình</h2>
          <p style={{ marginBottom: 15, color: "#666" }}>
            Hiển thị công cộng trước phòng quầy
          </p>
          <div style={{ fontSize: 12, marginBottom: 15 }}>
            <p>
              Quầy 1: <code>/public/display/1</code>
            </p>
            <p>
              Quầy 2: <code>/public/display/2</code>
            </p>
            <p>
              Quầy 3: <code>/public/display/3</code>
            </p>
          </div>
        </div>

        {/* Demo Info */}
        <div
          style={{
            padding: 20,
            background: "#fff3cd",
            borderRadius: 8,
            border: "2px solid #ffc107",
          }}
        >
          <h2 style={{ color: "#ff8c00", marginBottom: 15 }}>🔑 Test Info</h2>
          <p style={{ marginBottom: 15, color: "#666", fontSize: 12 }}>
            <strong>Tài khoản demo nhân viên:</strong>
          </p>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
            <li>counter1 / 123456</li>
            <li>counter2 / 123456</li>
            <li>counter3 / 123456</li>
            <li>counter4 / 123456</li>
          </ul>
        </div>
      </div>

      {/* Architecture Info */}
      <div
        style={{
          padding: 20,
          background: "#f9f9f9",
          borderRadius: 8,
          border: "1px solid #ddd",
        }}
      >
        <h3 style={{ color: "#333", marginBottom: 15 }}>
          📋 Cấu Trúc Hệ Thống
        </h3>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 14,
          }}
        >
          <thead>
            <tr style={{ background: "#f0f0f0" }}>
              <th
                style={{
                  padding: 10,
                  textAlign: "left",
                  borderBottom: "1px solid #ddd",
                }}
              >
                Route
              </th>
              <th
                style={{
                  padding: 10,
                  textAlign: "left",
                  borderBottom: "1px solid #ddd",
                }}
              >
                Mục Đích
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: 10, borderBottom: "1px solid #ddd" }}>/</td>
              <td style={{ padding: 10, borderBottom: "1px solid #ddd" }}>
                Kiosk - Người dân lấy vé
              </td>
            </tr>
            <tr>
              <td style={{ padding: 10, borderBottom: "1px solid #ddd" }}>
                /service/[serviceId]
              </td>
              <td style={{ padding: 10, borderBottom: "1px solid #ddd" }}>
                Form nhập thông tin & lấy vé
              </td>
            </tr>
            <tr>
              <td style={{ padding: 10, borderBottom: "1px solid #ddd" }}>
                /staff/login
              </td>
              <td style={{ padding: 10, borderBottom: "1px solid #ddd" }}>
                Đăng nhập nhân viên
              </td>
            </tr>
            <tr>
              <td style={{ padding: 10, borderBottom: "1px solid #ddd" }}>
                /staff/[counterId]
              </td>
              <td style={{ padding: 10, borderBottom: "1px solid #ddd" }}>
                Dashboard nhân viên quầy
              </td>
            </tr>
            <tr>
              <td style={{ padding: 10, borderBottom: "1px solid #ddd" }}>
                /public/display/[serviceId]
              </td>
              <td style={{ padding: 10, borderBottom: "1px solid #ddd" }}>
                Màn hình công cộng quầy
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
