import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import clsx from "clsx";

export interface PageTransitionProps {
  children: ReactNode;
  /** "page": nghiêng theo trục X từ dưới lên; "flip": lật theo trục Y (dùng cho đăng nhập/đăng ký) */
  variant?: "page" | "flip";
  className?: string;
}

/** Phát lại hiệu ứng vào trang 3D mỗi khi đường dẫn thay đổi */
export function PageTransition({ children, variant = "page", className }: PageTransitionProps) {
  const { pathname } = useLocation();
  return (
    <div
      key={pathname}
      className={clsx(
        "origin-top backface-hidden",
        variant === "flip" ? "animate-flip-in" : "animate-page-in",
        className,
      )}
    >
      {children}
    </div>
  );
}
