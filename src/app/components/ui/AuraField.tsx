'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';

/**
 * WebGL aura field, ported from the reference landing page's dark mode —
 * the light-mode washes were too low-contrast to read, so this runs the
 * full-intensity glow branch (bright core, plum fringe, no alpha cap).
 * Entry surfaces only. Renders nothing when the user prefers reduced motion
 * or WebGL is unavailable — the CSS radial wash underneath carries the
 * composition on its own.
 */
export default function AuraField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;

    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl', { alpha: true, antialias: true });
    if (!canvas || !gl) return;

    const vertexShaderSource = `
      attribute vec3 position;
      varying vec2 vUv;
      void main() {
        vUv = position.xy * 0.5 + 0.5;
        gl_Position = vec4(position, 1.0);
      }
    `;
    const fragmentShaderSource = `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform vec3 u_colorCore;
      uniform vec3 u_colorFringe;
      varying vec2 vUv;

      vec2 hash(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
      }
      float noise(vec2 p) {
        const float K1 = 0.366025404;
        const float K2 = 0.211324865;
        vec2 i = floor(p + (p.x + p.y) * K1);
        vec2 a = p - i + (i.x + i.y) * K2;
        vec2 o = (a.x > a.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec2 b = a - o + K2;
        vec2 c = a - 1.0 + 2.0 * K2;
        vec3 h = max(0.5 - vec3(dot(a,a), dot(b,b), dot(c,c)), 0.0);
        vec3 n = h*h*h*h * vec3(dot(a,hash(i)), dot(b,hash(i+o)), dot(c,hash(i+1.0)));
        return dot(n, vec3(70.0));
      }
      float sdArc(vec2 p, vec2 center, float radius, float width, float warp) {
        p.y += sin(p.x * 2.0 + u_time * 0.3) * warp;
        p.x += noise(p * 1.5 + u_time * 0.1) * (warp * 0.3);
        return abs(length(p - center) - radius) - width;
      }
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 st = uv;
        st.x *= u_resolution.x / u_resolution.y;
        st += (u_mouse - 0.5) * 0.05;
        vec2 center = vec2(-0.1, 0.5);
        float d1 = sdArc(st, center, 0.9, 0.02, 0.12);
        float d2 = sdArc(st, center, 0.92, 0.08, 0.2);
        float coreGlow = exp(-d1 * 30.0);
        float fringeGlow = exp(-d2 * 10.0);
        float wash = smoothstep(1.2, -0.3, st.x) * 0.25;
        vec3 finalColor = u_colorCore * coreGlow + u_colorFringe * fringeGlow;
        finalColor += u_colorFringe * wash * (sin(u_time * 0.5) * 0.05 + 0.95);
        float alpha = clamp(coreGlow * 1.2 + fringeGlow + wash, 0.0, 1.0);
        finalColor = vec3(1.0) - exp(-finalColor * 1.5);
        gl_FragColor = vec4(finalColor, alpha);
      }
    `;

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
    };

    const vertex = compile(gl.VERTEX_SHADER, vertexShaderSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertex || !fragment) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);
    gl.disable(gl.BLEND);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0]),
      gl.STATIC_DRAW
    );
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);

    const time = gl.getUniformLocation(program, 'u_time');
    const resolution = gl.getUniformLocation(program, 'u_resolution');
    const mouse = gl.getUniformLocation(program, 'u_mouse');
    const core = gl.getUniformLocation(program, 'u_colorCore');
    const fringe = gl.getUniformLocation(program, 'u_colorFringe');

    const parseColor = (hex: string) => {
      const n = Number.parseInt(hex.slice(1), 16);
      return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
    };
    const coreColor = parseColor('#f8f4f9');
    const fringeColor = parseColor('#6d4c7d');

    let targetX = 0.5, targetY = 0.5, currentX = 0.5, currentY = 0.5, animation = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    const move = (event: MouseEvent) => {
      targetX = event.clientX / window.innerWidth;
      targetY = 1 - event.clientY / window.innerHeight;
    };

    const started = performance.now();
    const render = (now: number) => {
      currentX += (targetX - currentX) * 0.05;
      currentY += (targetY - currentY) * 0.05;
      gl.uniform1f(time, (now - started) / 1000);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform2f(mouse, currentX, currentY);
      gl.uniform3fv(core, coreColor);
      gl.uniform3fv(fringe, fringeColor);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animation = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('mousemove', move);
    animation = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animation);
      window.removeEventListener('resize', resize);
      document.removeEventListener('mousemove', move);
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
    };
  }, [reduceMotion]);

  if (reduceMotion) return null;

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-0 h-full w-full" aria-hidden="true" />;
}
