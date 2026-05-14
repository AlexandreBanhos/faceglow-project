import { useEffect, useRef } from "react";

interface HeroVideoProps {
  className?: string;
}

export const HeroVideo = ({ className }: HeroVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => {});
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay
      loop
      muted
      playsInline
      poster="/videos/hero-face-poster.jpg"
      className={className}
      style={{ objectFit: "cover", width: "100%", height: "100%" }}
    >
      <source src="/videos/hero-face.webm" type="video/webm" />
      <source src="/videos/hero-face.mp4" type="video/mp4" />
    </video>
  );
};
