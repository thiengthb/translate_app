import { useEffect, useRef, useState } from "react";
import type { Application, Container, Graphics, Text, Ticker } from "pixi.js";
import type {
  KanaSharkGameStatus,
  KanaSharkPerformanceMode,
  KanaSharkSceneEnemy,
} from "../types/kanaShark.types";
import { particleBudget } from "../utils/performanceMode";

type PixiModule = typeof import("pixi.js");

interface PixiTypingSceneProps {
  enemies: KanaSharkSceneEnemy[];
  status: KanaSharkGameStatus;
  performanceMode: KanaSharkPerformanceMode;
  onEnemyMissed: (enemyId: string) => void;
  onSceneError?: (message: string) => void;
}

interface SceneLayers {
  background: Container;
  enemy: Container;
  effect: Container;
}

interface SceneEnemyObject {
  container: Container;
  label: Text;
  warning: Graphics;
  lane: number;
  x: number;
  y: number;
  speed: number;
  missed: boolean;
}

interface ParticleObject {
  graphic: Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

const BASE_WIDTH = 860;
const BASE_HEIGHT = 420;
const PLAYER_EDGE = 72;

export function PixiTypingScene({
  enemies,
  status,
  performanceMode,
  onEnemyMissed,
  onSceneError,
}: PixiTypingSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const pixiRef = useRef<PixiModule | null>(null);
  const layersRef = useRef<SceneLayers | null>(null);
  const enemyObjectsRef = useRef<Map<string, SceneEnemyObject>>(new Map());
  const particlesRef = useRef<ParticleObject[]>([]);
  const statusRef = useRef(status);
  const onEnemyMissedRef = useRef(onEnemyMissed);
  const sizeRef = useRef({ width: BASE_WIDTH, height: BASE_HEIGHT });
  const [sceneFailed, setSceneFailed] = useState(false);

  useEffect(() => {
    statusRef.current = status;
    const ticker = appRef.current?.ticker;
    if (!ticker || sceneFailed) return;

    if (status === "playing" && !document.hidden) {
      ticker.start();
    } else {
      ticker.stop();
    }
  }, [sceneFailed, status]);

  useEffect(() => {
    onEnemyMissedRef.current = onEnemyMissed;
  }, [onEnemyMissed]);

  useEffect(() => {
    if (!sceneFailed || status !== "playing" || enemies.length === 0) return;
    const timeout = window.setTimeout(() => onEnemyMissed(enemies[0].id), 4500);
    return () => window.clearTimeout(timeout);
  }, [enemies, onEnemyMissed, sceneFailed, status]);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    let visibilityHandler: (() => void) | null = null;
    let tickerCallback: ((ticker: Ticker) => void) | null = null;

    async function initScene() {
      try {
        const PIXI = await import("pixi.js");
        if (cancelled || !mountRef.current) return;

        pixiRef.current = PIXI;
        const mount = mountRef.current;
        const app = new PIXI.Application();
        const initialSize = readMountSize(mount);
        sizeRef.current = initialSize;

        await app.init({
          width: initialSize.width,
          height: initialSize.height,
          backgroundAlpha: 0,
          antialias: performanceMode === "balanced",
          autoDensity: true,
          resolution: Math.min(window.devicePixelRatio || 1, performanceMode === "balanced" ? 1.75 : 1.25),
          preference: "webgl",
        });

        if (cancelled) {
          app.destroy(true, { children: true });
          return;
        }

        appRef.current = app;
        app.ticker.stop();

        const canvas = app.canvas as HTMLCanvasElement;
        canvas.className = "h-full w-full";
        mount.replaceChildren(canvas);

        const layers: SceneLayers = {
          background: new PIXI.Container(),
          enemy: new PIXI.Container(),
          effect: new PIXI.Container(),
        };
        app.stage.addChild(layers.background, layers.enemy, layers.effect);
        layersRef.current = layers;
        drawBackground(PIXI, layers.background, initialSize.width, initialSize.height, performanceMode);

        const resize = () => {
          const nextSize = readMountSize(mount);
          sizeRef.current = nextSize;
          app.renderer.resize(nextSize.width, nextSize.height);
          drawBackground(PIXI, layers.background, nextSize.width, nextSize.height, performanceMode);
          enemyObjectsRef.current.forEach((enemy) => {
            enemy.y = laneY(enemy.lane, nextSize.height);
            enemy.container.y = enemy.y;
          });
        };

        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(mount);

        tickerCallback = (ticker) => {
          if (statusRef.current !== "playing") return;
          updateEnemies(ticker.deltaTime, enemyObjectsRef.current, sizeRef.current.width, (enemyId) =>
            onEnemyMissedRef.current(enemyId),
          );
          updateParticles(ticker.deltaTime, particlesRef.current);
        };
        app.ticker.add(tickerCallback);

        visibilityHandler = () => {
          if (document.hidden || statusRef.current !== "playing") {
            app.ticker.stop();
          } else {
            app.ticker.start();
          }
        };
        document.addEventListener("visibilitychange", visibilityHandler);

        if (statusRef.current === "playing") app.ticker.start();
      } catch {
        setSceneFailed(true);
        onSceneError?.("PixiJS could not start on this device. Fallback typing mode is active.");
      }
    }

    void initScene();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      if (visibilityHandler) document.removeEventListener("visibilitychange", visibilityHandler);

      const app = appRef.current;
      if (app && tickerCallback) {
        app.ticker.remove(tickerCallback);
      }
      app?.ticker.stop();
      destroyAllObjects(enemyObjectsRef.current, particlesRef.current);
      app?.destroy(true, { children: true });
      appRef.current = null;
      pixiRef.current = null;
      layersRef.current = null;
      mountRef.current?.replaceChildren();
    };
  }, [onSceneError, performanceMode]);

  useEffect(() => {
    const PIXI = pixiRef.current;
    const layers = layersRef.current;
    if (!PIXI || !layers || sceneFailed) return;

    const nextIds = new Set(enemies.map((enemy) => enemy.id));
    for (const enemy of enemies) {
      const existing = enemyObjectsRef.current.get(enemy.id);
      if (existing) {
        existing.speed = enemy.speed;
        existing.warning.visible = enemy.danger;
        existing.label.text = truncatePrompt(enemy.prompt);
        continue;
      }

      const created = createEnemyObject(PIXI, enemy, sizeRef.current.width, sizeRef.current.height);
      enemyObjectsRef.current.set(enemy.id, created);
      layers.enemy.addChild(created.container);
    }

    for (const [id, enemy] of enemyObjectsRef.current) {
      if (nextIds.has(id)) continue;
      createBurst(PIXI, layers.effect, particlesRef.current, enemy.x, enemy.y, particleBudget(performanceMode));
      enemy.container.destroy({ children: true });
      enemyObjectsRef.current.delete(id);
    }
  }, [enemies, performanceMode, sceneFailed]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      <div ref={mountRef} className="h-full w-full" />
      {sceneFailed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950 px-6 text-center text-slate-100">
          <div className="text-sm font-semibold">Fallback typing mode</div>
          <p className="max-w-md text-xs text-slate-300">
            Canvas rendering is unavailable, but the round still advances and the SRS result can be submitted.
          </p>
        </div>
      )}
    </div>
  );
}

function readMountSize(mount: HTMLDivElement) {
  const rect = mount.getBoundingClientRect();
  return {
    width: Math.max(360, Math.floor(rect.width || BASE_WIDTH)),
    height: Math.max(320, Math.floor(rect.height || BASE_HEIGHT)),
  };
}

function updateEnemies(
  delta: number,
  enemies: Map<string, SceneEnemyObject>,
  width: number,
  onMissed: (enemyId: string) => void,
) {
  enemies.forEach((enemy, id) => {
    enemy.x -= enemy.speed * delta * 2.1;
    enemy.container.x = enemy.x;
    enemy.container.rotation = Math.sin((enemy.x + enemy.y) / 48) * 0.025;

    if (!enemy.missed && enemy.x <= PLAYER_EDGE) {
      enemy.missed = true;
      onMissed(id);
    }

    const dangerZone = width * 0.32;
    enemy.warning.visible = enemy.warning.visible || enemy.x < dangerZone;
  });
}

function updateParticles(delta: number, particles: ParticleObject[]) {
  for (let index = particles.length - 1; index >= 0; index--) {
    const particle = particles[index];
    particle.life += delta;
    particle.graphic.x += particle.vx * delta;
    particle.graphic.y += particle.vy * delta;
    particle.graphic.alpha = Math.max(0, 1 - particle.life / particle.maxLife);

    if (particle.life >= particle.maxLife) {
      particle.graphic.destroy();
      particles.splice(index, 1);
    }
  }
}

function drawBackground(
  PIXI: PixiModule,
  layer: Container,
  width: number,
  height: number,
  performanceMode: KanaSharkPerformanceMode,
) {
  clearLayer(layer);

  const water = new PIXI.Graphics();
  water.rect(0, 0, width, height).fill(0x07131f);
  water.rect(0, 0, width, height * 0.4).fill({ color: 0x083344, alpha: 0.9 });
  water.rect(0, height * 0.4, width, height * 0.6).fill({ color: 0x0f172a, alpha: 0.95 });
  layer.addChild(water);

  const lane = new PIXI.Graphics();
  for (let index = 1; index <= 4; index++) {
    const y = laneY(index - 1, height);
    lane.moveTo(PLAYER_EDGE, y + 44).lineTo(width - 26, y + 44).stroke({
      color: 0x38bdf8,
      width: 1,
      alpha: 0.12,
    });
  }
  layer.addChild(lane);

  const playerZone = new PIXI.Graphics();
  playerZone.roundRect(20, 42, PLAYER_EDGE, height - 84, 28).fill({ color: 0x0e7490, alpha: 0.22 });
  playerZone.roundRect(32, height / 2 - 36, 48, 72, 18).stroke({ color: 0x7dd3fc, width: 2, alpha: 0.55 });
  layer.addChild(playerZone);

  if (performanceMode === "performance") return;

  const bubbles = new PIXI.Graphics();
  for (let index = 0; index < 18; index++) {
    const x = ((index * 149) % Math.max(width, 1)) + 8;
    const y = ((index * 83) % Math.max(height, 1)) + 8;
    const radius = 2 + (index % 4);
    bubbles.circle(x, y, radius).stroke({ color: 0xbae6fd, width: 1, alpha: 0.18 });
  }
  layer.addChild(bubbles);
}

function createEnemyObject(
  PIXI: PixiModule,
  enemy: KanaSharkSceneEnemy,
  width: number,
  height: number,
): SceneEnemyObject {
  const container = new PIXI.Container();
  const y = laneY(enemy.lane, height);
  const startX = width + 96 + enemy.lane * 26;
  container.x = startX;
  container.y = y;

  const warning = new PIXI.Graphics();
  warning.roundRect(-86, -52, 172, 104, 24).stroke({ color: 0xf97316, width: 2, alpha: 0.85 });
  warning.visible = enemy.danger;

  const body = new PIXI.Graphics();
  body.ellipse(0, 0, 58, 27).fill(0x0891b2).stroke({ color: 0x67e8f9, width: 2, alpha: 0.8 });
  body.poly([42, -8, 80, -30, 66, 4]).fill(0x0e7490);
  body.poly([-44, 13, -80, 32, -58, 0]).fill(0x0e7490);
  body.poly([-10, -20, 20, -52, 24, -14]).fill(0x06b6d4);
  body.circle(-25, -8, 5).fill(0xecfeff);
  body.circle(-24, -8, 2).fill(0x0f172a);

  const plate = new PIXI.Graphics();
  plate.roundRect(-74, -74, 148, 30, 12).fill({ color: 0x020617, alpha: 0.78 });
  plate.stroke({ color: 0x38bdf8, width: 1, alpha: 0.35 });

  const label = new PIXI.Text({
    text: truncatePrompt(enemy.prompt),
    style: {
      fill: 0xf8fafc,
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: 18,
      fontWeight: "700",
      align: "center",
    },
  });
  label.anchor.set(0.5);
  label.y = -59;

  container.addChild(warning, body, plate, label);

  return {
    container,
    label,
    warning,
    lane: enemy.lane,
    x: startX,
    y,
    speed: enemy.speed,
    missed: false,
  };
}

function createBurst(
  PIXI: PixiModule,
  layer: Container,
  particles: ParticleObject[],
  x: number,
  y: number,
  count: number,
) {
  const maxParticles = count * 5;
  while (particles.length > maxParticles) {
    particles.shift()?.graphic.destroy();
  }

  for (let index = 0; index < count; index++) {
    const graphic = new PIXI.Graphics();
    const radius = 2 + (index % 3);
    graphic.circle(0, 0, radius).fill(index % 2 === 0 ? 0xfef08a : 0x67e8f9);
    graphic.x = x;
    graphic.y = y;
    layer.addChild(graphic);
    const angle = (Math.PI * 2 * index) / Math.max(1, count);
    particles.push({
      graphic,
      vx: Math.cos(angle) * (2.2 + (index % 3) * 0.5),
      vy: Math.sin(angle) * (2.2 + (index % 2) * 0.4),
      life: 0,
      maxLife: 28 + (index % 5) * 4,
    });
  }
}

function laneY(lane: number, height: number) {
  const top = 72;
  const bottom = height - 70;
  const step = (bottom - top) / 3;
  return top + step * Math.min(3, Math.max(0, lane));
}

function truncatePrompt(prompt: string) {
  return prompt.length > 16 ? `${prompt.slice(0, 15)}...` : prompt;
}

function clearLayer(layer: Container) {
  const children = [...layer.children];
  layer.removeChildren();
  children.forEach((child) => child.destroy());
}

function destroyAllObjects(enemies: Map<string, SceneEnemyObject>, particles: ParticleObject[]) {
  enemies.forEach((enemy) => enemy.container.destroy({ children: true }));
  enemies.clear();
  particles.forEach((particle) => particle.graphic.destroy());
  particles.length = 0;
}
