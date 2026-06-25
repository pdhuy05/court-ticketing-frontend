import AppErrorState from "@/components/AppErrorState";

export default function NotFound() {
  return (
    <AppErrorState
      code="404"
      title="Không tìm thấy trang"
      actionLabel="Quay lại"
      actionHref="/"
    />
  );
}
