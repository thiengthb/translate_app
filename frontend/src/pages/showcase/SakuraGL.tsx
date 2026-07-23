import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Interactive sakura petal field (WebGL / Three.js) for the hero.
 *
 * An instanced field of soft pink petals tumbling through a shallow 3D
 * volume, with gentle mouse parallax and depth fog-free additive softness.
 * Petal count scales with viewport so phones stay smooth; the loop pauses
 * when the tab is hidden or the hero scrolls away, and every GPU resource
 * is disposed on unmount. Only mounted when motion is allowed.
 */
export default function SakuraGL() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const width = () => host.clientWidth || window.innerWidth;
    const height = () => host.clientHeight || window.innerHeight;

    const petalTexture = makePetalTexture();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
    camera.position.set(0, 0, 34);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    const geometry = new THREE.PlaneGeometry(1.5, 1.5);
    const material = new THREE.MeshBasicMaterial({
      map: petalTexture,
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // Count scales with area; capped low on small screens.
    let COUNT = 0;
    const palette = [
      new THREE.Color(0xffd6e6),
      new THREE.Color(0xff8fab),
      new THREE.Color(0xff6b9d),
      new THREE.Color(0xffffff),
      new THREE.Color(0xffc2d4),
    ];

    interface P {
      x: number;
      y: number;
      z: number;
      rx: number;
      ry: number;
      rz: number;
      spinX: number;
      spinZ: number;
      fall: number;
      swayAmp: number;
      swayFreq: number;
      swayPhase: number;
      size: number;
    }
    const SPREAD_X = 48;
    const SPREAD_Y = 34;
    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    let petals: P[] = [];
    let mesh: THREE.InstancedMesh | null = null;
    const dummy = new THREE.Object3D();

    const build = () => {
      const area = width() * height();
      COUNT = Math.round(THREE.MathUtils.clamp(area / 22000, 24, 80));
      if (mesh) {
        scene.remove(mesh);
        mesh.dispose();
      }
      mesh = new THREE.InstancedMesh(geometry, material, COUNT);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      petals = [];
      for (let i = 0; i < COUNT; i++) {
        petals.push({
          x: rand(-SPREAD_X, SPREAD_X),
          y: rand(-SPREAD_Y, SPREAD_Y),
          z: rand(-28, 8),
          rx: rand(0, Math.PI * 2),
          ry: rand(0, Math.PI * 2),
          rz: rand(0, Math.PI * 2),
          spinX: rand(-0.5, 0.5),
          spinZ: rand(-0.4, 0.4),
          fall: rand(1.3, 3.2),
          swayAmp: rand(0.6, 2.2),
          swayFreq: rand(0.3, 0.9),
          swayPhase: rand(0, Math.PI * 2),
          size: rand(0.5, 1.4),
        });
        mesh.setColorAt(i, palette[(Math.random() * palette.length) | 0]);
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      scene.add(mesh);
    };
    build();

    const pointer = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    let last = performance.now();
    let elapsed = 0;
    let raf = 0;
    let running = true;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!running || !mesh) return;

      // Recede + skip rendering once the hero has scrolled well away.
      const heroProg = THREE.MathUtils.clamp(window.scrollY / (height() || 1), 0, 1.4);
      if (heroProg >= 1.35) return;

      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;
      const t = elapsed;

      pointer.x += (target.x - pointer.x) * 0.04;
      pointer.y += (target.y - pointer.y) * 0.04;
      mesh.rotation.y = pointer.x * 0.16;
      mesh.rotation.x = pointer.y * 0.1;
      mesh.position.y = heroProg * 12;
      material.opacity = 0.96 * THREE.MathUtils.clamp(1 - heroProg * 0.9, 0, 1);

      for (let i = 0; i < COUNT; i++) {
        const p = petals[i];
        p.y -= p.fall * dt;
        p.x += Math.sin(t * p.swayFreq + p.swayPhase) * p.swayAmp * dt;
        p.rx += p.spinX * dt;
        p.rz += p.spinZ * dt;
        if (p.y < -SPREAD_Y) {
          p.y = SPREAD_Y;
          p.x = rand(-SPREAD_X, SPREAD_X);
        }
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(p.rx, p.ry, p.rz);
        dummy.scale.setScalar(p.size);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      renderer.render(scene, camera);
    };

    const resize = () => {
      const w = width();
      const h = height();
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    resize();
    tick();

    // Size off the host box so the initial (pre-layout) measurement can't
    // leave the canvas the wrong size, and so it tracks container changes.
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const onVisibility = () => {
      running = !document.hidden;
      if (running) last = performance.now();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      geometry.dispose();
      material.dispose();
      petalTexture.dispose();
      if (mesh) mesh.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0" aria-hidden="true" />;
}

/** Draw a single soft blossom petal (white, notched tip) to a canvas texture. */
function makePetalTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const grd = ctx.createRadialGradient(size * 0.5, size * 0.62, 4, size * 0.5, size * 0.55, size * 0.55);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.6, "rgba(255,255,255,0.95)");
  grd.addColorStop(1, "rgba(255,255,255,0.55)");

  ctx.translate(size / 2, size / 2);
  ctx.beginPath();
  ctx.moveTo(0, 44);
  ctx.bezierCurveTo(34, 24, 30, -30, 6, -46);
  ctx.quadraticCurveTo(0, -40, -6, -46); // notch
  ctx.bezierCurveTo(-30, -30, -34, 24, 0, 44);
  ctx.closePath();
  ctx.fillStyle = grd;
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  return texture;
}
