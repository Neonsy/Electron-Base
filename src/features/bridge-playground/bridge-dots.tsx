import { useEffect, useRef } from 'react';

import { useBridgeCalls } from '@/web/features/bridge-playground/store';

/** Time for a call to go out along the renderer lane, turn in the main process, and come back. */
const TRIP_MS = 1800;
/** Share of the trip spent on each lane. The rest is the turn through the main process. */
const LANE_SHARE = 0.44;
/**
 * A burst leaves as a compact swarm: every particle starts within this window, dense at the head. It is
 * short enough that two clicks a tenth of a second apart still show as two separate swarms.
 */
const SWARM_SPREAD_MS = 140;
/** How far particles scatter around the lane, in rem. */
const SWARM_SCATTER_REM = 0.55;
/** Particle core size in rem, so particles grow with the page type on large screens. */
const CORE_RADIUS_REM = 0.12;
/** A single call is drawn a little larger than one particle of a swarm. */
const SINGLE_CALL_SCALE = 1.6;
/**
 * The canvas extends past the lanes by this much so scattered particles and glows are not clipped.
 * Keep in sync with the canvas classes below.
 */
const CANVAS_PADDING_PX = 24;

interface Particle {
    /** Start delay within the swarm. */
    delay: number;
    /** Offset across the lane, from -1 to 1. */
    scatter: number;
    scale: number;
}

interface Swarm {
    start: number;
    particles: Particle[];
}

/** Deterministic pseudo-random number in [0, 1), so a particle keeps its place every frame. */
function random(seed: number): number {
    let value = (seed + 0x6d2b79f5) | 0;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

function createParticles(id: number, calls: number): Particle[] {
    if (calls === 1) {
        return [{ delay: 0, scatter: 0, scale: SINGLE_CALL_SCALE }];
    }

    return Array.from({ length: calls }, (_, index) => {
        const seed = id * 997 + index * 3;
        return {
            // Squaring the random value packs most particles near the front, like a comet head.
            delay: random(seed) ** 2 * SWARM_SPREAD_MS,
            // Averaging two values concentrates particles near the lane and thins them at the edges.
            scatter: random(seed + 1) + random(seed + 2) - 1,
            scale: 0.75 + random(seed + 3) * 0.5,
        };
    });
}

interface PathPoint {
    x: number;
    y: number;
    /** True on the turn through the main process, where scatter runs horizontally. */
    vertical: boolean;
}

function positionOnPath(progress: number, width: number, height: number): PathPoint {
    if (progress < LANE_SHARE) {
        return { x: (progress / LANE_SHARE) * width, y: 0, vertical: false };
    }

    const turnEnd = 1 - LANE_SHARE;
    if (progress < turnEnd) {
        return { x: width, y: ((progress - LANE_SHARE) / (turnEnd - LANE_SHARE)) * height, vertical: true };
    }

    return { x: (1 - (progress - turnEnd) / LANE_SHARE) * width, y: height, vertical: false };
}

/** Soft glow around each swarm, beyond its outermost particles, in multiples of the core radius. */
const GLOW_REACH = 6;
const GLOW_ALPHA = 0.5;

/** Bounds of one swarm's visible particles of one color, used to size its glow. */
interface GlowBounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

function emptyBounds(): GlowBounds {
    return { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
}

function extendBounds(bounds: GlowBounds, x: number, y: number): void {
    bounds.minX = Math.min(bounds.minX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.maxY = Math.max(bounds.maxY, y);
}

/** One soft elliptical glow per swarm and color: a single gradient instead of a halo per particle. */
function paintGlow(context: CanvasRenderingContext2D, bounds: GlowBounds, reach: number, color: string): void {
    if (bounds.minX > bounds.maxX) {
        return;
    }

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const radiusX = (bounds.maxX - bounds.minX) / 2 + reach;
    const radiusY = (bounds.maxY - bounds.minY) / 2 + reach;

    context.save();
    context.translate(centerX, centerY);
    context.scale(radiusX, radiusY);
    const glow = context.createRadialGradient(0, 0, 0, 0, 0, 1);
    glow.addColorStop(0, color);
    glow.addColorStop(1, 'transparent');
    context.globalAlpha = GLOW_ALPHA;
    context.fillStyle = glow;
    context.beginPath();
    context.arc(0, 0, 1, 0, Math.PI * 2);
    context.fill();
    context.restore();
}

/**
 * Paints every particle core of one color in one batched path fill. Per-particle drawImage calls, and
 * later per-particle halos, dominated frame time when many swarms were in flight.
 * `points` holds x, y, radius triples.
 */
function paintCores(context: CanvasRenderingContext2D, points: readonly number[], color: string): void {
    if (points.length === 0) {
        return;
    }

    context.fillStyle = color;
    context.beginPath();
    for (let index = 0; index < points.length; index += 3) {
        const x = points[index] ?? 0;
        const y = points[index + 1] ?? 0;
        const radius = points[index + 2] ?? 0;
        context.moveTo(x + radius, y);
        context.arc(x, y, radius, 0, Math.PI * 2);
    }
    context.fill();
}

function readRootStyle() {
    const style = getComputedStyle(document.documentElement);
    return {
        rem: Number.parseFloat(style.fontSize) || 16,
        renderer: style.getPropertyValue('--color-renderer').trim(),
        main: style.getPropertyValue('--color-main-bright').trim(),
    };
}

/**
 * Draws bridge traffic on a single canvas: one particle per call, and one swarm per burst. A canvas
 * keeps hundreds of moving particles smooth, where DOM elements would each become a composited layer.
 */
export default function BridgeDots() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!canvas || !context) {
            return;
        }

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        let root = readRootStyle();
        // Reused every frame: x, y, radius triples for each color.
        const rendererPoints: number[] = [];
        const mainPoints: number[] = [];
        // Each swarm leaves the moment its click happened. Particle layouts are created once per swarm.
        const swarms = new Map<number, Swarm>();
        let frame = 0;
        let width = 0;
        let height = 0;

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const scale = window.devicePixelRatio || 1;
            width = rect.width;
            height = rect.height;
            canvas.width = Math.round(width * scale);
            canvas.height = Math.round(height * scale);
            context.setTransform(scale, 0, 0, scale, 0, 0);
            // The root font size changes with the window width, so particle sizes follow it.
            root = readRootStyle();
        };

        const draw = (now: number) => {
            frame = 0;
            const { pulses, dropPulse } = useBridgeCalls.getState();
            if (pulses.length === 0) {
                // Clear can remove swarms mid-flight. Forget them too.
                swarms.clear();
            }

            const laneWidth = Math.max(1, width - CANVAS_PADDING_PX * 2);
            const laneHeight = height - CANVAS_PADDING_PX * 2;
            const scatter = SWARM_SCATTER_REM * root.rem;
            const coreRadius = CORE_RADIUS_REM * root.rem;
            rendererPoints.length = 0;
            mainPoints.length = 0;

            context.clearRect(0, 0, width, height);

            for (const pulse of pulses) {
                let swarm = swarms.get(pulse.id);
                if (!swarm) {
                    swarm = { start: pulse.startedAt, particles: createParticles(pulse.id, pulse.calls) };
                    swarms.set(pulse.id, swarm);
                }

                const spread = pulse.calls > 1 ? SWARM_SPREAD_MS : 0;
                if (reducedMotion.matches || now >= swarm.start + spread + TRIP_MS) {
                    swarms.delete(pulse.id);
                    dropPulse(pulse.id);
                    continue;
                }

                const rendererBounds = emptyBounds();
                const mainBounds = emptyBounds();

                for (const particle of swarm.particles) {
                    const progress = (now - swarm.start - particle.delay) / TRIP_MS;
                    if (progress <= 0 || progress >= 1) {
                        continue;
                    }

                    const point = positionOnPath(progress, laneWidth, laneHeight);
                    const offset = particle.scatter * scatter;
                    const x = point.x + (point.vertical ? offset : 0) + CANVAS_PADDING_PX;
                    const y = point.y + (point.vertical ? 0 : offset) + CANVAS_PADDING_PX;
                    const toMain = progress >= 0.5;
                    (toMain ? mainPoints : rendererPoints).push(x, y, coreRadius * particle.scale);
                    extendBounds(toMain ? mainBounds : rendererBounds, x, y);
                }

                const reach = coreRadius * GLOW_REACH * (pulse.calls > 1 ? 1 : SINGLE_CALL_SCALE);
                paintGlow(context, rendererBounds, reach, root.renderer);
                paintGlow(context, mainBounds, reach, root.main);
            }

            paintCores(context, rendererPoints, root.renderer);
            paintCores(context, mainPoints, root.main);
            if (useBridgeCalls.getState().pulses.length > 0) {
                frame = requestAnimationFrame(draw);
            }
        };

        const start = () => {
            if (!frame) {
                frame = requestAnimationFrame(draw);
            }
        };

        const observer = new ResizeObserver(resize);
        observer.observe(canvas);
        resize();

        const unsubscribe = useBridgeCalls.subscribe((state) => {
            if (state.pulses.length > 0) {
                start();
            }
        });
        start();

        return () => {
            cancelAnimationFrame(frame);
            unsubscribe();
            observer.disconnect();
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            aria-hidden='true'
            className='pointer-events-none absolute -top-[24px] -left-[24px] h-[calc(100%+48px)] w-[calc(100%+48px)]'
        />
    );
}
