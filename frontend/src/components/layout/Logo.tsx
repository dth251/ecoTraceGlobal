import { Link } from "react-router-dom";
import clsx from "clsx";

export interface LogoProps {
  /** Dùng trên nền tối */
  dark?: boolean;
  to?: string;
  className?: string;
}

/** Biểu tượng EcoTrace: chiếc lá có đường dữ liệu đi lên, kết thúc bằng một điểm nút */
export function LogoMark({
  className,
  dark = false,
  inverse = false,
}: {
  className?: string;
  dark?: boolean;
  /** Lá trắng, đường dữ liệu xanh — dùng trên nền xanh thương hiệu */
  inverse?: boolean;
}) {
  const leaf = inverse ? "#ffffff" : "#12b76a";
  const line = inverse ? "#039855" : dark ? "#0e1013" : "#ffffff";
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M5 27C5 14.3 14.3 5 27 5c0 12.7-9.3 22-22 22Z" fill={leaf} />
      <path
        d="M9.5 22.5 14.5 17.5 18 20 23 13"
        fill="none"
        stroke={line}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="23" cy="13" r="2.3" fill={line} />
    </svg>
  );
}

export function Logo({ dark = false, to = "/", className }: LogoProps) {
  return (
    <Link to={to} aria-label="EcoTrace" className={clsx("inline-flex items-center gap-2.5 rounded-xl", className)}>
      <LogoMark className="h-8 w-8" dark />
      <span className={clsx("text-xl font-extrabold tracking-tight", dark ? "text-white" : "text-ink")}>
        Eco<span className="font-semibold">Trace</span>
      </span>
    </Link>
  );
}
