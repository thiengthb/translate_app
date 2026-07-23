import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Yozakura (夜桜) — glowing night-petal field for the designer profile hero.
 *
 * A darker sibling of the portfolio's SakuraPetalsGL: instead of pale petals
 * on washi, warm blossom petals drift and tumble through a plum-indigo night,
 * lit as if by lantern light, with a slow additive-blended "bokeh" of drifting
 * light points behind them for depth. Night fog folds distant petals back into
 * the sky so nothing reads as a hard sprite.
 *
 * Loaded lazily and mounted only when motion is allowed. Counts scale with the
 * viewport so phones stay smooth; every GPU resource is disposed on unmount and
 * the loop pauses while the tab is hidden.
 */
export default function YozakuraGL() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const NIGHT = 0x141021; // matches --yz-night so fog blends seamlessly

    const petalTexture = makePetalTexture();
    const sparkTexture = makeSparkTexture();

    const width = () => host.clientWidth || window.innerWidth;
    const height = () => host.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(NIGHT, 26, 82);

    const camera = new THREE.PerspectiveCamera(60, width() / height(), 0.1, 200);
    camera.position.set(0, 0, 34);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width(), height());
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    const area = width() * height();
    const COUNT = Math.round(THREE.MathUtils.clamp(area / 30000, 22, 66));
    const SPARKS = Math.round(THREE.MathUtils.clamp(area / 42000, 18, 54));

    // ---- petals -------------------------------------------------------------
    const geometry = new THREE.PlaneGeometry(1.5, 1.5);
    const material = new THREE.MeshBasicMaterial({
      map: petalTexture,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // Warm, lantern-lit blossom tones — brighter than the daytime palette so
    // petals glow against the dark sky; a couple of gold ones read as embers.
    const palette = [
      new THREE.Color(0xffc0dc),
      new THREE.Color(0xff9ec7),
      new THREE.Color(0xff7fae),
      new THREE.Color(0xffe0c0),
      new THREE.Color(0xf6c674),
    ];

    interface P {
      x: number; y: number; z: number;
      rx: number; ry: number; rz: number;
      spinX: number; spinZ: number;
      fall: number; swayAmp: number; swayFreq: number; swayPhase: number;
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
        fall: rand(1.3, 3.2),
        swayAmp: rand(0.6, 2.2),
        swayFreq: rand(0.3, 0.9),
        swayPhase: rand(0, Math.PI * 2),
        size: rand(0.5, 1.4),
      };
      petals.push(p);
      mesh.setColorAt(i, palette[(Math.random() * palette.length) | 0]);
    }
    scene.add(mesh);

    // ---- bokeh sparks (additive, behind the petals) -------------------------
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(SPARKS * 3);
    const sparkColor = new Float32Array(SPARKS * 3);
    const sparkVel: number[] = [];
    const cGold = new THREE.Color(0xf6c674);
    const cPink = new THREE.Color(0xff9ec7);
    for (let i = 0; i < SPARKS; i++) {
      sparkPos[i * 3] = rand(-SPREAD_X, SPREAD_X);
      sparkPos[i * 3 + 1] = rand(-SPREAD_Y, SPREAD_Y);
      sparkPos[i * 3 + 2] = rand(-34, -6);
      const c = Math.random() > 0.5 ? cGold : cPink;
      sparkColor[i * 3] = c.r;
      sparkColor[i * 3 + 1] = c.g;
      sparkColor[i * 3 + 2] = c.b;
      sparkVel.push(rand(0.15, 0.5));
    }
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
    sparkGeo.setAttribute("color", new THREE.BufferAttribute(sparkColor, 3));
    const sparkMat = new THREE.PointsMaterial({
      map: sparkTexture,
      size: 2.2,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      sizeAttenuation: true,
    });
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    scene.add(sparks);

    // Mouse parallax.
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
      sparks.rotation.y = pointer.x * 0.08;

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

      // sparks drift slowly upward and twinkle as a group
      const pos = sparkGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < SPARKS; i++) {
        let y = pos.getY(i) + sparkVel[i] * dt;
        if (y > SPREAD_Y) y = -SPREAD_Y;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
      sparkMat.opacity = 0.5 + Math.sin(t * 0.8) * 0.18;

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
      if (running) last = performance.now();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      geometry.dispose();
      material.dispose();
      sparkGeo.dispose();
      sparkMat.dispose();
      petalTexture.dispose();
      sparkTexture.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={hostRef} className="yz-petals" aria-hidden="true" />;
}

/** Soft, faintly-haloed blossom petal (white core) so instanceColor tints it. */
function makePetalTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // faint outer halo so lit petals glow against the dark sky
  const halo = ctx.createRadialGradient(size / 2, size / 2, 6, size / 2, size / 2, size / 2);
  halo.addColorStop(0, "rgba(255,255,255,0.35)");
  halo.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, size, size);

  const grd = ctx.createRadialGradient(size * 0.5, size * 0.62, 4, size * 0.5, size * 0.55, size * 0.55);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.6, "rgba(255,255,255,0.95)");
  grd.addColorStop(1, "rgba(255,255,255,0.55)");

  ctx.translate(size / 2, size / 2);
  ctx.beginPath();
  ctx.moveTo(0, 44);
  ctx.bezierCurveTo(34, 24, 30, -30, 6, -46);
  ctx.quadraticCurveTo(0, -40, -6, -46); // tip notch — the sakura signature
  ctx.bezierCurveTo(-30, -30, -34, 24, 0, 44);
  ctx.closePath();
  ctx.fillStyle = grd;
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  return texture;
}

/** Round soft sprite for the additive bokeh light points. */
function makeSparkTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.6)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
