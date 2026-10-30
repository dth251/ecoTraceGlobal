import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import clsx from "clsx";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/** Ba sắc độ cho một khối: mặt trên sáng nhất, mặt trước, mặt bên tối nhất */
export interface Tones {
  top: string;
  front: string;
  side: string;
}

export interface CuboidProps {
  /** Rộng (trục X), cao (trục Y), sâu (trục Z) — đơn vị px */
  w: number;
  h: number;
  d: number;
  /** Vị trí đáy khối trên mặt đất: x, z và độ nâng y */
  x?: number;
  z?: number;
  y?: number;
  tones: Tones;
  className?: string;
  style?: CSSProperties;
  /** Nội dung vẽ lên mặt trước (cửa sổ, chữ...) */
  front?: ReactNode;
  top?: ReactNode;
}

/** Khối hộp CSS 3D thật gồm 6 mặt; gốc toạ độ ở tâm mặt đất của cảnh. */
export function Cuboid({ w, h, d, x = 0, z = 0, y = 0, tones, className, style, front, top }: CuboidProps) {
  const face = "absolute left-1/2 top-1/2 backface-hidden";
  return (
    <div
      className={clsx("absolute left-0 top-0 preserve-3d", className)}
      style={{ transform: `translate3d(${x}px, ${-(y + h / 2)}px, ${z}px)`, ...style }}
    >
      <div className={face} style={{ width: w, height: h, margin: `${-h / 2}px 0 0 ${-w / 2}px`, background: tones.front, transform: `translateZ(${d / 2}px)` }}>
        {front}
      </div>
      <div className={face} style={{ width: w, height: h, margin: `${-h / 2}px 0 0 ${-w / 2}px`, background: tones.side, transform: `rotateY(180deg) translateZ(${d / 2}px)` }} />
      <div className={face} style={{ width: d, height: h, margin: `${-h / 2}px 0 0 ${-d / 2}px`, background: tones.side, transform: `rotateY(90deg) translateZ(${w / 2}px)` }} />
      <div className={face} style={{ width: d, height: h, margin: `${-h / 2}px 0 0 ${-d / 2}px`, background: tones.side, transform: `rotateY(-90deg) translateZ(${w / 2}px)` }} />
      <div className={face} style={{ width: w, height: d, margin: `${-d / 2}px 0 0 ${-w / 2}px`, background: tones.top, transform: `rotateX(90deg) translateZ(${h / 2}px)` }}>
        {top}
      </div>
    </div>
  );
}

export interface SceneProps {
  children: ReactNode;
  /** Kích thước khung hiển thị */
  className?: string;
  /** Góc nhìn mặc định */
  tiltX?: number;
  tiltY?: number;
  scale?: number;
  /** Xoay nhẹ theo con trỏ chuột */
  interactive?: boolean;
  label: string;
}

/** Sân khấu 3D: phối cảnh + góc nhìn từ trên xuống, xoay nhẹ theo chuột. */
export function Scene({ children, className, tiltX = -26, tiltY = -38, scale = 1, interactive = true, label }: SceneProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || !interactive) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const dx = e.clientX / window.innerWidth - 0.5;
      const dy = e.clientY / window.innerHeight - 0.5;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.transform = `scale(${scale}) rotateX(${tiltX - dy * 8}deg) rotateY(${tiltY + dx * 14}deg)`;
      });
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, [reduced, interactive, tiltX, tiltY, scale]);

  return (
    <div role="img" aria-label={label} className={clsx("relative perspective", className)}>
      <div className="absolute left-1/2 top-[62%] h-0 w-0 preserve-3d">
        <div
          ref={ref}
          className="preserve-3d transition-transform duration-[900ms] ease-smooth"
          style={{ transform: `scale(${scale}) rotateX(${tiltX}deg) rotateY(${tiltY}deg)` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** Mặt đất phẳng (nằm ngang) dưới các khối */
export function Ground({ size, color, x = 0, z = 0 }: { size: number; color: string; x?: number; z?: number }) {
  return (
    <div
      className="absolute left-0 top-0 rounded-[28px]"
      style={{
        width: size,
        height: size,
        margin: `${-size / 2}px 0 0 ${-size / 2}px`,
        background: color,
        transform: `translate3d(${x}px, 0, ${z}px) rotateX(90deg)`,
      }}
    />
  );
}
