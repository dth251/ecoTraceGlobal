import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { LogoMark } from "@/components/layout/Logo";
import { Cuboid, Ground, Scene, type Tones } from "@/components/three/Iso3D";

const CONCRETE: Tones = { top: "#f4f5f7", front: "#d9dde3", side: "#aab3bf" };
const STEEL: Tones = { top: "#c9cfd8", front: "#8f99a7", side: "#6b7584" };
const SOLAR: Tones = { top: "#12b76a", front: "#039855", side: "#027a48" };
const TRACE: Tones = { top: "#6ce9a6", front: "#32d583", side: "#12b76a" };
const PAPER: Tones = { top: "#ffffff", front: "#e6e9ee", side: "#cfd5dd" };

/** Dải cửa sổ trên mặt trước của nhà xưởng */
function Windows({ count, color }: { count: number; color: string }) {
  return (
    <div className="flex h-full items-center justify-evenly px-3">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="h-[38%] w-[9%] rounded-[3px]" style={{ background: color }} />
      ))}
    </div>
  );
}

/** Nhà máy: nhà xưởng có pin mặt trời, văn phòng, ống khói với các khối phát thải được truy vết bay lên */
export function FactoryScene({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <Scene className={className} label={t("landing.art.factory")} scale={1.15}>
      <Ground size={320} color="#1f2329" />
      <Cuboid w={170} h={72} d={110} x={-15} z={15} tones={CONCRETE} front={<Windows count={6} color="#2a2f37" />} />
      <Cuboid w={130} h={5} d={78} x={-15} z={15} y={72} tones={SOLAR} />
      <Cuboid w={64} h={46} d={62} x={110} z={50} tones={CONCRETE} front={<Windows count={2} color="#2a2f37" />} />
      <Cuboid w={24} h={128} d={24} x={-80} z={-40} tones={STEEL} />
      <Cuboid w={92} h={34} d={36} x={80} z={-75} tones={{ top: "#6ea8e0", front: "#1c7ed6", side: "#1864ab" }} />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute left-0 top-0 animate-trace preserve-3d"
          style={{ animationDelay: `${i * 1.1}s` } as CSSProperties}
        >
          <Cuboid w={12} h={12} d={12} x={-80 + (i - 1) * 6} z={-40} y={134} tones={TRACE} />
        </div>
      ))}
    </Scene>
  );
}

/** Ba container xếp chồng chờ xuất khẩu, container trên cùng mang màu thương hiệu */
export function ContainerScene({ className }: { className?: string }) {
  const { t } = useTranslation();
  const ribs = (color: string) => (
    <div className="flex h-full justify-evenly">
      {Array.from({ length: 7 }, (_, i) => (
        <span key={i} className="h-full w-[3px]" style={{ background: color }} />
      ))}
    </div>
  );
  return (
    <Scene className={className} label={t("landing.art.containers")} tiltY={-32} scale={1.05}>
      <Ground size={300} color="rgba(255,255,255,0.08)" />
      <Cuboid w={180} h={50} d={64} x={-20} z={30} tones={{ top: "#f4f5f7", front: "#d9dde3", side: "#aab3bf" }} front={ribs("#c4cad3")} />
      <Cuboid w={180} h={50} d={64} x={-20} z={-40} tones={{ top: "#c9cfd8", front: "#8f99a7", side: "#6b7584" }} front={ribs("#7f8998")} />
      <Cuboid w={180} h={50} d={64} x={-5} z={-5} y={50} tones={{ top: "#6ce9a6", front: "#12b76a", side: "#039855" }} front={ribs("#0f9f5c")} />
    </Scene>
  );
}

/** Chồng chứng từ, tờ trên cùng là hộ chiếu xanh mang dấu EcoTrace */
export function DocumentStackScene({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <Scene className={className} label={t("landing.art.documents")} tiltX={-34} tiltY={-28} scale={1.05}>
      {[0, 1, 2].map((i) => (
        <Cuboid
          key={i}
          w={130}
          h={4}
          d={170}
          x={i * 10 - 10}
          z={-i * 8}
          y={i * 10}
          tones={PAPER}
          style={{ rotate: `y ${(i - 1) * 6}deg` } as CSSProperties}
        />
      ))}
      <Cuboid
        w={130}
        h={6}
        d={170}
        x={22}
        z={-26}
        y={34}
        tones={{ top: "#12b76a", front: "#039855", side: "#027a48" }}
        top={
          <div className="flex h-full items-center justify-center">
            <LogoMark className="h-20 w-20" inverse />
          </div>
        }
      />
    </Scene>
  );
}
