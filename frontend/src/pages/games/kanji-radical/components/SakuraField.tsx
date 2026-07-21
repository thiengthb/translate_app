import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Ambient sakura-petal field for the karuta table background (WebGL / Three.js).
 *
 * An instanced field of tumbling pink petals drifting down a shallow 3D volume.
 * Self-contained: sizes to its host element (absolute inset-0), scales petal
 * count with area so phones stay smooth, pauses when the tab is hidden, and
 * disposes every GPU resource on unmount. Skipped entirely under
 * prefers-reduced-motion. Kept quiet — it's atmosphere behind the board.
 */
export function SakuraField() {
    const hostRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        const petalTexture = makePetalTexture();

        const width = () => host.clientWidth || 800;
        const height = () => host.clientHeight || 600;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, width() / height(), 0.1, 200);
        camera.position.set(0, 0, 34);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(width(), height());
        renderer.setClearColor(0x000000, 0);
        host.appendChild(renderer.domElement);
        renderer.domElement.style.display = "block";

        const area = width() * height();
        const COUNT = Math.round(THREE.MathUtils.clamp(area / 34000, 18, 54));

        const geometry = new THREE.PlaneGeometry(1.5, 1.5);
        const material = new THREE.MeshBasicMaterial({
            map: petalTexture,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
            side: THREE.DoubleSide,
        });

        const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        // Hanabun sakura palette (pinkSoft → pinkDeep + a few whites).
        const palette = [
            new THREE.Color(0xffd6e6),
            new THREE.Color(0xffc2d4),
            new THREE.Color(0xff8fab),
            new THREE.Color(0xffffff),
            new THREE.Color(0xffe5ec),
        ];

        interface P {
            x: number; y: number; z: number;
            rx: number; ry: number; rz: number;
            spinX: number; spinZ: number;
            fall: number; swayAmp: number; swayFreq: number; swayPhase: number;
            size: number;
        }
        const SPREAD_X = 48;
        const SPREAD_Y = 34;
        const rand = (a: number, b: number) => a + Math.random() * (b - a);

        const petals: P[] = [];
        const dummy = new THREE.Object3D();
        for (let i = 0; i < COUNT; i++) {
            petals.push({
                x: rand(-SPREAD_X, SPREAD_X),
                y: rand(-SPREAD_Y, SPREAD_Y),
                z: rand(-30, 8),
                rx: rand(0, Math.PI * 2),
                ry: rand(0, Math.PI * 2),
                rz: rand(0, Math.PI * 2),
                spinX: rand(-0.5, 0.5),
                spinZ: rand(-0.4, 0.4),
                fall: rand(1.2, 3.0),
                swayAmp: rand(0.6, 2.2),
                swayFreq: rand(0.3, 0.9),
                swayPhase: rand(0, Math.PI * 2),
                size: rand(0.4, 1.25),
            });
            mesh.setColorAt(i, palette[(Math.random() * palette.length) | 0]);
        }
        scene.add(mesh);

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
            if (running) last = performance.now();
        };
        document.addEventListener("visibilitychange", onVisibility);

        return () => {
            cancelAnimationFrame(raf);
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

    return (
        <div
            ref={hostRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden opacity-70"
        />
    );
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
    ctx.moveTo(0, 44);
    ctx.bezierCurveTo(34, 24, 30, -30, 6, -46);
    ctx.quadraticCurveTo(0, -40, -6, -46);
    ctx.bezierCurveTo(-30, -30, -34, 24, 0, 44);
    ctx.closePath();
    ctx.fillStyle = grd;
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 2;
    return texture;
}
