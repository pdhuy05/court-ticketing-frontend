import { getServerApiBase } from "@/lib/runtime-config";

export async function GET(request: Request) {
  try {
    const apiBase = getServerApiBase();
    const apiUrl = `${apiBase}/services/active`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Máy chủ phản hồi lỗi ${response.status}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching services:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Không thể tải danh sách dịch vụ",
        message: error instanceof Error ? error.message : "Không thể kết nối máy chủ",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
