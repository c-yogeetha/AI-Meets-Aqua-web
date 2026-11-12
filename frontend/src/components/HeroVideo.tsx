"use client";

import React, { useEffect, useRef } from "react";
import { Figure } from "@/components/ui/Figure";

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <Figure
      number="1"
      caption="Tracked goldfish with multi-cue bounding boxes and template coasting"
      provenance="Synthetic test clip"
      className="w-full max-w-xl mx-auto shadow-2xl"
    >
      <video
        ref={videoRef}
        muted
        autoPlay
        loop
        playsInline
        preload="metadata"
        poster="/media/hero-poster.jpg"
        aria-label="Tracked goldfish video demonstration"
        className="w-full h-auto aspect-video object-cover"
      >
        <source src="/media/hero.webm" type="video/webm" />
        <source src="/media/hero.mp4" type="video/mp4" />
        Video demonstration not supported.
      </video>
    </Figure>
  );
}
