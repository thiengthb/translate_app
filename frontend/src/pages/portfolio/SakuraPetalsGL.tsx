import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Ambient sakura petal field (WebGL / Three.js).
 *
 * An instanced field of tumbling petals drifting through a shallow 3D volume,
 * with soft depth fog and a gentle mouse parallax. Kept deliberately quiet —
 * it's atmosphere behind the hero, not the main event.
 *
 * Loaded lazily and only mounted when motion is allowed. Petal count scales
 * with viewport so phones stay smooth. All GPU resources are disposed on
 * unmount, and the loop pauses when the tab is hidden.
 */
export default function SakuraPetalsGL() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const WASHI = 0xfbf3f1;

    // Petal texture — a soft white blossom petal drawn once to a canvas and
    // tinted per-instance. White so instanceColor controls the final hue.
    const petalTexture = makePetalTexture();

    const width = () => host.clientWidth || window.innerWidth;
    const height = () => host.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(WASHI, 28, 78);

    const camera = new THREE.PerspectiveCamera(60, width() / height(), 0.1, 200);
    camera.position.set(0, 0, 34);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width(), height());
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    // Count scales with area; fewer on small screens.
    const area = width() * height();
    const COUNT = Math.round(THREE.MathUtils.clamp(area / 26000, 26, 78));

    const geometry = new THREE.PlaneGeometry(1.5, 1.5);
    const material = new THREE.MeshBasicMaterial({
      map: petalTexture,
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const palette = [
      new THREE.Color(0xffd6e6),
      new THREE.Color(0xf7b6cf),
      new THREE.Color(0xf1a9c4),
      new THREE.Color(0xffffff),
      new THREE.Color(0xf6c9b8),
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
    const SPREAD_Y = 36;
    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const petals: P[] = [];
    const dummy = new THREE.Object3D();
    for (let i = 0; i < COUNT; i++) {
      const p: P = {
        x: rand(-SPREAD_X, SPREAD_X),
        y: rand(-SPREAD_Y, SPREAD_Y),
        z: rand(-30, 8),
        rx: rand(0, Math.PI * 2),
        ry: rand(0, Math.PI * 2),
        rz: rand(0, Math.PI * 2),
        spinX: rand(-0.5, 0.5),
        spinZ: rand(-0.4, 0.4),
        fall: rand(1.4, 3.4),
        swayAmp: rand(0.6, 2.2),
        swayFreq: rand(0.3, 0.9),
        swayPhase: rand(0, Math.PI * 2),
        size: rand(0.45, 1.35),
      };
      petals.push(p);
      mesh.setColorAt(i, palette[(Math.random() * palette.length) | 0]);
    }
    scene.add(mesh);

    // Mouse parallax (pointer normalised to [-1, 1]); lerped for smoothness.
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
      if (!running) return;
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;
      const t = elapsed;

      pointer.x += (target.x - pointer.x) * 0.04;
      pointer.y += (target.y - pointer.y) * 0.04;
      mesh.rotation.y = pointer.x * 0.14;
      mesh.rotation.x = pointer.y * 0.1;

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
    tick();

    const onResize = () => {
      camera.aspect = width() / height();
      camera.updateProjectionMatrix();
      renderer.setSize(width(), height());
    };
    window.addEventListener("resize", onResize);

    const onVisibility = () => {
      running = !document.hidden;
      if (running) last = performance.now(); // drop the accumulated hidden time
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      geometry.dispose();
      material.dispose();
      petalTexture.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={hostRef} className="pf-petals" aria-hidden="true" />;
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
  grd.addColorStop(1, "rgba(255,255,255,0.6)");

  ctx.translate(size / 2, size / 2);
  ctx.beginPath();
  // teardrop petal with a small notch at the tip
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
