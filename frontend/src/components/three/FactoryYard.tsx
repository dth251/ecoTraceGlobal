import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls, useGLTF, useProgress, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/*
 * Bãi xuất hàng của một nhà máy, dựng từ mô hình glTF CC0 của Poly Haven (polyhaven.com):
 * modular_factory_facade, rollershutter_door, modular_industrial_pipes_01, overhead_crane,
 * propane_tank, Barrel_02, barrel_03, plastic_crate_02; ánh sáng HDRI abandoned_tank_farm_03.
 * Đơn vị: mét. Mỗi chi tiết của bộ mặt tiền rộng 3 m (cửa garage 6 m), gốc toạ độ ở mép phải-dưới.
 */

const MODELS = {
  facade: "/models/modular_factory_facade.glb",
  shutter: "/models/rollershutter_door.glb",
  pipes: "/models/modular_industrial_pipes_01.glb",
  crane: "/models/overhead_crane.glb",
  propane: "/models/propane_tank.glb",
  barrelBlue: "/models/Barrel_02.glb",
  barrelRed: "/models/barrel_03.glb",
  crate: "/models/plastic_crate_02.glb",
} as const;
const HDRI = "/hdri/abandoned_tank_farm_03_1k.hdr";
const CONCRETE = {
  map: "/textures/concrete_pavement_diff_1k.jpg",
  normalMap: "/textures/concrete_pavement_nor_1k.jpg",
  roughnessMap: "/textures/concrete_pavement_rough_1k.jpg",
};

type Vec3 = [number, number, number];

/** Bật bóng đổ cho mọi mesh trong một object */
function withShadows<T extends THREE.Object3D>(obj: T): T {
  obj.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return obj;
}

/** Một chi tiết của bộ mặt tiền, lấy theo tên node và đặt lại vị trí */
function KitPiece({ name, position, rotationY = 0 }: { name: string; position: Vec3; rotationY?: number }) {
  const { nodes } = useGLTF(MODELS.facade);
  const obj = useMemo(() => {
    const src = nodes[name];
    if (!src) return null;
    const c = withShadows(src.clone(true));
    c.position.set(0, 0, 0);
    c.rotation.set(0, 0, 0);
    return c;
  }, [nodes, name]);
  if (!obj) return null;
  return <primitive object={obj} position={position} rotation={[0, rotationY, 0]} />;
}

/** Cả một mô hình (đạo cụ), có thể xoay và đổi tỉ lệ */
function Prop({ url, position, rotationY = 0, scale = 1 }: { url: string; position: Vec3; rotationY?: number; scale?: number }) {
  const { scene } = useGLTF(url);
  const obj = useMemo(() => withShadows(scene.clone(true)), [scene]);
  return <primitive object={obj} position={position} rotation={[0, rotationY, 0]} scale={scale} />;
}

/** Ô cửa sổ = tấm tường có lỗ + khung kính cùng vị trí */
function WindowBay({ variant, x, y }: { variant: string; x: number; y: number }) {
  return (
    <>
      <KitPiece name={`wall_window_${variant}`} position={[x, y, 0]} />
      <KitPiece name={`window_${variant}`} position={[x, y, 0]} />
    </>
  );
}

/** Mặt tiền nhà xưởng hai tầng dài 18 m (x từ -9 đến 9) và khối nhà phía sau */
function Facade() {
  const upper = [-6, -3, 0, 3, 6, 9];
  return (
    <group>
      {/* Tầng trệt */}
      <WindowBay variant="tall_large_01" x={-6} y={0} />
      <KitPiece name="wall_door_garage_centered_01" position={[0, 0, 0]} />
      <KitPiece name="door_garage_centered_01" position={[0, 0, 0]} />
      <WindowBay variant="tall_large_02" x={3} y={0} />
      <KitPiece name="wall_standard_standard_01" position={[6, 0, 0]} />
      <KitPiece name="wall_door_centered_large_01" position={[9, 0, 0]} />
      <KitPiece name="door_centered_large_01" position={[9, 0, 0]} />
      {/* Tầng trên: dãy cửa kính cao */}
      {upper.map((x, i) => (
        <WindowBay key={x} variant={i % 2 === 0 ? "tall_large_02" : "tall_small_02"} x={x} y={3} />
      ))}
      {/* Gờ và đỉnh mái */}
      {upper.map((x) => (
        <group key={x}>
          <KitPiece name="cornice02_standard_standard_01" position={[x, 6, 0]} />
          <KitPiece name="crown_standard_standard_01" position={[x, 6.16, 0]} />
        </group>
      ))}
      {/* Khối nhà phía sau mặt tiền */}
      <mesh position={[0, 3.2, -6.3]} castShadow receiveShadow>
        <boxGeometry args={[18, 6.4, 12]} />
        <meshStandardMaterial color="#b9b4aa" roughness={0.9} />
      </mesh>
      {/* Cửa cuốn trong ô cửa garage (ô mở giữa x -4.66..-1.34) */}
      <Prop url={MODELS.shutter} position={[-4.0, 0, -0.32]} />
      {/* Hệ ống trên tường kín */}
      <Prop url={MODELS.pipes} position={[4.5, 1.6, 0.02]} scale={1.1} />
    </group>
  );
}

/** Cầu trục ngoài trời trên 4 cột thép: dầm chạy dọc ray, tời chạy ngang dầm */
function Crane({ still }: { still: boolean }) {
  const { nodes } = useGLTF(MODELS.crane);
  const parts = useMemo(() => {
    const get = (n: string) => withShadows(nodes[n].clone(true));
    return { rails: get("overhead_crane_rails"), bridge: get("overhead_crane"), winch: get("overhead_crane_winch") };
  }, [nodes]);
  const bridge = useRef<THREE.Group>(null);
  const winch = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (still) return;
    const t = clock.elapsedTime;
    // Chu kỳ chậm, êm: dầm đi lại dọc ray, tời đi lại ngang dầm
    const z = 1.05 + Math.sin(t * 0.18) * 1.0;
    const x = Math.sin(t * 0.27 + 1.2) * 3.6;
    if (bridge.current) bridge.current.position.z = z;
    if (winch.current) {
      winch.current.position.z = z;
      winch.current.position.x = x;
    }
  });

  const H = 7.2;
  const steel = <meshStandardMaterial color="#c9a227" roughness={0.45} metalness={0.6} />;
  return (
    <group position={[0, 0, 4.2]}>
      {[-6.1, 6.1].flatMap((x) =>
        [-0.9, 3.0].map((z) => (
          <mesh key={`${x}${z}`} position={[x, (H - 0.4) / 2, z]} castShadow receiveShadow>
            <boxGeometry args={[0.32, H - 0.4, 0.32]} />
            {steel}
          </mesh>
        )),
      )}
      <group position={[0, H, 0]}>
        <primitive object={parts.rails} position={[0, -0.4, -0.96]} />
        <group ref={bridge}>
          <primitive object={parts.bridge} />
        </group>
        <group ref={winch} position={[0, 0, 0]}>
          <primitive object={parts.winch} position={[-0.07, -0.57, 0.03]} />
        </group>
      </group>
    </group>
  );
}

/** Hàng hóa và thiết bị cạnh cửa xuất hàng */
function YardProps() {
  return (
    <group>
      {[[-7.6, 0.9], [-7.0, 1.4], [-7.9, 1.6]].map(([x, z], i) => (
        <Prop key={i} url={MODELS.barrelBlue} position={[x, 0, z]} rotationY={i} />
      ))}
      {[[-6.4, 1.0], [-6.2, 1.7]].map(([x, z], i) => (
        <Prop key={i} url={MODELS.barrelRed} position={[x, 0, z]} rotationY={i * 2} />
      ))}
      {[[7.2, 0.6], [7.6, 0.6], [8.0, 0.6]].map(([x, z], i) => (
        <Prop key={i} url={MODELS.propane} position={[x, 0, z]} rotationY={i * 1.3} scale={1.6} />
      ))}
      {[0, 1, 2].map((row) =>
        [0, 1].map((col) => (
          <Prop key={`${row}${col}`} url={MODELS.crate} position={[1.4 + col * 0.52, row * 0.255, 1.2]} rotationY={0} />
        )),
      )}
      {[0, 1].map((row) => (
        <Prop key={row} url={MODELS.crate} position={[2.6, row * 0.255, 1.5]} rotationY={0.3} />
      ))}
    </group>
  );
}

/** Mặt sân bê tông (texture CC0 lặp 2 m) và vạch sơn khu bốc xếp */
function Ground() {
  const tex = useTexture(CONCRETE);
  useMemo(() => {
    for (const t of Object.values(tex)) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(30, 30);
      t.anisotropy = 8;
    }
    tex.map.colorSpace = THREE.SRGBColorSpace;
  }, [tex]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[60, 96]} />
        <meshStandardMaterial {...tex} roughness={1} />
      </mesh>
      {[-4.66, -1.34].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.005, 3.5]} receiveShadow>
          <planeGeometry args={[0.12, 7]} />
          <meshStandardMaterial color="#e2b23a" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/** Lắc lư camera rất chậm khi người dùng không kéo xoay */
function Sway({ still }: { still: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (still || !group.current) return;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.08) * 0.12;
  });
  return (
    <group ref={group}>
      <Facade />
      <Crane still={still} />
      <YardProps />
      <Ground />
    </group>
  );
}

function Loader({ label }: { label: string }) {
  const { progress, active } = useProgress();
  if (!active && progress >= 100) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-end justify-start p-5">
      <p className="rounded-xl bg-ink/80 px-3 py-1.5 text-sm text-white tabular-nums">
        {label} {Math.round(progress)}%
      </p>
    </div>
  );
}

export interface FactoryYardProps {
  className?: string;
  label: string;
  loadingLabel: string;
}

/** Cảnh 3D bãi xuất hàng nhà máy: kéo để xoay, cầu trục chuyển động, ánh sáng HDRI thật */
export function FactoryYard({ className, label, loadingLabel }: FactoryYardProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof IntersectionObserver === "undefined") return setVisible(true);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} role="img" aria-label={label} className={`relative ${className ?? ""}`}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [19, 6.5, 26], fov: 34, near: 0.5, far: 300 }}
        frameloop={visible ? "always" : "never"}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      >
        <Suspense fallback={null}>
          <Environment files={HDRI} background backgroundBlurriness={0.08} />
          <directionalLight
            position={[18, 22, 14]}
            intensity={2.2}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0003}
            shadow-camera-left={-18}
            shadow-camera-right={18}
            shadow-camera-top={18}
            shadow-camera-bottom={-18}
          />
          <Sway still={reduced} />
        </Suspense>
        <OrbitControls
          target={[0, 3.6, 1.5]}
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2.15}
          minAzimuthAngle={-0.2}
          maxAzimuthAngle={1.1}
          enableDamping
        />
      </Canvas>
      <Loader label={loadingLabel} />
    </div>
  );
}

Object.values(MODELS).forEach((url) => useGLTF.preload(url));

export default FactoryYard;
