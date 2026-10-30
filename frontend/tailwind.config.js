/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Một họ chữ duy nhất cho toàn bộ giao diện, hỗ trợ đầy đủ dấu tiếng Việt
        sans: ["'Be Vietnam Pro'", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        // slate-400 gốc (#94a3b8) chỉ đạt 2.6:1 trên nền trắng; làm tối để chữ phụ đạt chuẩn WCAG AA (≥4.5:1)
        slate: { 400: "#606d82" },
        // Nền tối của sidebar và hero (lấy cảm hứng từ thiết kế Figma)
        ink: {
          DEFAULT: "#0e1013",
          800: "#16191e",
          700: "#1f2329",
          600: "#2a2f37",
          muted: "#a7afbc",
        },
        surface: "#f4f5f7",
        // Màu thương hiệu: xanh lá đậm
        brand: {
          50: "#ecfdf3",
          100: "#d1fadf",
          200: "#a6f4c5",
          300: "#6ce9a6",
          400: "#32d583",
          500: "#12b76a",
          600: "#039855",
          700: "#027a48",
          800: "#05603a",
          900: "#054f31",
          DEFAULT: "#027a48",
        },
        // Ba màu scope cố định trên mọi biểu đồ
        scope1: { light: "#fde4d8", DEFAULT: "#eb6834", dark: "#a63f12" },
        scope2: { light: "#dbe9fa", DEFAULT: "#2a78d6", dark: "#1c5cab" },
        scope3: { light: "#fdefcc", DEFAULT: "#eda100", dark: "#7a5300" },
        warning: { light: "#fef3c7", DEFAULT: "#d97706", dark: "#92400e" },
        danger: { light: "#fee2e2", DEFAULT: "#dc2626", dark: "#991b1b" },
        success: { light: "#dcfce7", DEFAULT: "#16a34a", dark: "#166534" },
      },
      // Không có chữ nhỏ hơn 13px; tối đa năm cỡ chữ dùng thường xuyên
      fontSize: {
        xs: ["13px", { lineHeight: "1.45" }],
        sm: ["14px", { lineHeight: "1.5" }],
        base: ["16px", { lineHeight: "1.55" }],
      },
      // Bóng đổ chỉ dành cho thứ đang nổi (menu, hộp thoại); thẻ ở trạng thái tĩnh không có bóng
      boxShadow: {
        float: "0 12px 32px -8px rgba(14,16,19,0.22)",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        press: "140ms",
        hover: "180ms",
        ui: "240ms",
      },
      keyframes: {
        "page-in": {
          "0%": { opacity: "0", transform: "perspective(1400px) rotateX(5deg) translate3d(0, 18px, -60px)" },
          "100%": { opacity: "1", transform: "none" },
        },
        "flip-in": {
          "0%": { opacity: "0", transform: "perspective(1400px) rotateY(-22deg) translate3d(40px, 0, -80px)" },
          "100%": { opacity: "1", transform: "none" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "none" },
        },
      },
      animation: {
        "page-in": "page-in 480ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "flip-in": "flip-in 560ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-up": "fade-up 800ms cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};
