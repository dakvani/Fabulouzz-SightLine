import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

const BlueprintBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      pulse: number;
      pulseSpeed: number;
    }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    const initParticles = () => {
      const count = Math.min(40, Math.floor((canvas.offsetWidth * canvas.offsetHeight) / 15000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.3 + 0.1,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.005,
      }));
    };

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      // Get computed primary color
      const style = getComputedStyle(canvas);
      const primaryHSL = style.getPropertyValue("--primary").trim();

      // Draw connection lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            const alpha = (1 - dist / 150) * 0.06;
            ctx.strokeStyle = `hsla(${primaryHSL}, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      particles.forEach((p) => {
        p.pulse += p.pulseSpeed;
        const pulseOpacity = p.opacity + Math.sin(p.pulse) * 0.08;
        const pulseSize = p.size + Math.sin(p.pulse) * 0.4;

        ctx.fillStyle = `hsla(${primaryHSL}, ${pulseOpacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulseSize, 0, Math.PI * 2);
        ctx.fill();

        // Outer glow
        ctx.fillStyle = `hsla(${primaryHSL}, ${pulseOpacity * 0.3})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulseSize * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Move
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      });

      animationId = requestAnimationFrame(draw);
    };

    resize();
    initParticles();
    draw();

    window.addEventListener("resize", () => {
      resize();
      initParticles();
    });

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
};

// Blueprint grid overlay (pure CSS)
export const BlueprintGrid = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {/* Primary grid */}
    <div
      className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: `
          linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
          linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
      }}
    />
    {/* Secondary fine grid */}
    <div
      className="absolute inset-0 opacity-[0.015]"
      style={{
        backgroundImage: `
          linear-gradient(hsl(var(--primary)) 0.5px, transparent 0.5px),
          linear-gradient(90deg, hsl(var(--primary)) 0.5px, transparent 0.5px)
        `,
        backgroundSize: "15px 15px",
      }}
    />
    {/* Corner markers */}
    {[
      "top-[60px] left-[60px]",
      "top-[60px] right-[60px]",
      "bottom-[60px] left-[60px]",
      "bottom-[60px] right-[60px]",
    ].map((pos, i) => (
      <motion.div
        key={i}
        className={`absolute ${pos} w-3 h-3 border border-primary/10`}
        animate={{ opacity: [0.1, 0.3, 0.1] }}
        transition={{ duration: 3, repeat: Infinity, delay: i * 0.8 }}
      />
    ))}
    {/* Scanning line */}
    <motion.div
      className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent"
      animate={{ top: ["0%", "100%"] }}
      transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
    />
  </div>
);

export default BlueprintBackground;
