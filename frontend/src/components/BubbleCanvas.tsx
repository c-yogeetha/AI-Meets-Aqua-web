"use client";

import React, { useEffect, useRef } from "react";

export default function BubbleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let isVisible = true;
    let isIntersecting = true;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || 600;
    };
    resize();
    window.addEventListener("resize", resize);

    const observer = new IntersectionObserver(([entry]) => {
      isIntersecting = entry.isIntersecting;
    });
    observer.observe(canvas);

    const handleVisibility = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const bubbleCount = 24;
    const bubbles = Array.from({ length: bubbleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 2.5 + 1,
      speed: Math.random() * 0.6 + 0.2,
      opacity: Math.random() * 0.25 + 0.08,
      wobble: Math.random() * Math.PI * 2,
    }));

    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      if (isVisible && isIntersecting) {
        const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        bubbles.forEach((b) => {
          b.y -= b.speed * 60 * dt;
          b.wobble += dt * 2;
          const xOffset = Math.sin(b.wobble) * 0.5;

          if (b.y < -10) {
            b.y = canvas.height + 10;
            b.x = Math.random() * canvas.width;
          }

          ctx.beginPath();
          ctx.arc(b.x + xOffset, b.y, b.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(79, 209, 197, ${b.opacity})`;
          ctx.fill();
        });
      }
      lastTime = currentTime;
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
      observer.disconnect();
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0 opacity-40"
      aria-hidden="true"
    />
  );
}
