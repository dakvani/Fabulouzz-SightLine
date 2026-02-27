import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Cloud, Sun, CloudRain, Wind, Thermometer, Droplets, Eye, MapPin, Clock, Gauge } from "lucide-react";

interface WeatherData {
  temperature: number;
  windSpeed: number;
  humidity: number;
  weatherCode: number;
  isDay: boolean;
  apparentTemp?: number;
  pressure?: number;
  uvIndex?: number;
  visibility?: number;
  windDirection?: number;
  precipitation?: number;
}

interface HourlyForecast {
  time: string;
  temp: number;
  code: number;
  windSpeed: number;
}

const weatherDescriptions: Record<number, { label: string; icon: typeof Sun }> = {
  0: { label: "Clear Sky", icon: Sun },
  1: { label: "Mainly Clear", icon: Sun },
  2: { label: "Partly Cloudy", icon: Cloud },
  3: { label: "Overcast", icon: Cloud },
  45: { label: "Foggy", icon: Eye },
  48: { label: "Rime Fog", icon: Eye },
  51: { label: "Light Drizzle", icon: CloudRain },
  53: { label: "Drizzle", icon: CloudRain },
  55: { label: "Dense Drizzle", icon: CloudRain },
  61: { label: "Slight Rain", icon: CloudRain },
  63: { label: "Moderate Rain", icon: CloudRain },
  65: { label: "Heavy Rain", icon: CloudRain },
};

const getWeatherInfo = (code: number) => weatherDescriptions[code] || { label: "Clear", icon: Sun };

const getWindDirection = (deg: number) => {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
};

// Animated weather scene canvas
const WeatherScene = ({ code, isDay }: { code: number; isDay: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    let animId: number;

    const isClear = code <= 1;
    const isCloudy = code >= 2 && code <= 3;
    const isRainy = code >= 51;
    const isFoggy = code >= 45 && code <= 48;

    // Particles
    const particles: { x: number; y: number; vy: number; vx: number; size: number; opacity: number }[] = [];

    if (isRainy) {
      for (let i = 0; i < 80; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vy: 3 + Math.random() * 4,
          vx: -0.5 + Math.random() * -1,
          size: 1 + Math.random() * 1.5,
          opacity: 0.2 + Math.random() * 0.4,
        });
      }
    }

    // Stars for night
    const stars: { x: number; y: number; r: number; pulse: number }[] = [];
    if (!isDay && isClear) {
      for (let i = 0; i < 30; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h * 0.6,
          r: 0.5 + Math.random() * 1,
          pulse: Math.random() * Math.PI * 2,
        });
      }
    }

    // Clouds
    const clouds: { x: number; y: number; w: number; speed: number; opacity: number }[] = [];
    if (isCloudy || isRainy || isFoggy) {
      const count = isFoggy ? 8 : isCloudy ? 4 : 3;
      for (let i = 0; i < count; i++) {
        clouds.push({
          x: Math.random() * w * 1.5 - w * 0.25,
          y: 10 + Math.random() * (h * 0.4),
          w: 40 + Math.random() * 60,
          speed: 0.1 + Math.random() * 0.3,
          opacity: isFoggy ? 0.15 + Math.random() * 0.15 : 0.08 + Math.random() * 0.12,
        });
      }
    }

    let frame = 0;

    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, w, h);

      // Sky gradient
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      if (isDay) {
        if (isClear) {
          grad.addColorStop(0, "hsla(210, 60%, 15%, 0.6)");
          grad.addColorStop(1, "hsla(30, 50%, 20%, 0.3)");
        } else if (isRainy) {
          grad.addColorStop(0, "hsla(220, 30%, 12%, 0.8)");
          grad.addColorStop(1, "hsla(220, 20%, 10%, 0.5)");
        } else {
          grad.addColorStop(0, "hsla(220, 40%, 14%, 0.6)");
          grad.addColorStop(1, "hsla(220, 30%, 12%, 0.4)");
        }
      } else {
        grad.addColorStop(0, "hsla(230, 40%, 6%, 0.8)");
        grad.addColorStop(1, "hsla(230, 30%, 10%, 0.5)");
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Stars
      stars.forEach(s => {
        s.pulse += 0.02;
        const alpha = 0.4 + Math.sin(s.pulse) * 0.3;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      });

      // Sun/Moon
      if (isClear || isCloudy) {
        const cx = w * 0.75;
        const cy = h * 0.3;
        if (isDay) {
          // Sun glow
          const sunGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40);
          sunGlow.addColorStop(0, "hsla(45, 100%, 70%, 0.3)");
          sunGlow.addColorStop(0.5, "hsla(45, 100%, 60%, 0.1)");
          sunGlow.addColorStop(1, "transparent");
          ctx.fillStyle = sunGlow;
          ctx.fillRect(cx - 40, cy - 40, 80, 80);

          // Sun rays
          const rayCount = 8;
          for (let i = 0; i < rayCount; i++) {
            const angle = (i / rayCount) * Math.PI * 2 + frame * 0.005;
            const len = 18 + Math.sin(frame * 0.03 + i) * 5;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(angle) * 10, cy + Math.sin(angle) * 10);
            ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
            ctx.strokeStyle = "hsla(45, 100%, 65%, 0.25)";
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }

          // Sun body
          ctx.beginPath();
          ctx.arc(cx, cy, 8, 0, Math.PI * 2);
          ctx.fillStyle = "hsla(45, 100%, 65%, 0.6)";
          ctx.fill();
        } else {
          // Moon
          ctx.beginPath();
          ctx.arc(cx, cy, 10, 0, Math.PI * 2);
          ctx.fillStyle = "hsla(210, 20%, 80%, 0.4)";
          ctx.fill();
          // Moon shadow
          ctx.beginPath();
          ctx.arc(cx + 4, cy - 2, 8, 0, Math.PI * 2);
          ctx.fillStyle = "hsla(230, 40%, 6%, 0.8)";
          ctx.fill();
        }
      }

      // Clouds
      clouds.forEach(c => {
        c.x += c.speed;
        if (c.x > w + c.w) c.x = -c.w;

        const drawCloud = (x: number, y: number, size: number, alpha: number) => {
          ctx.beginPath();
          ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
          ctx.arc(x + size * 0.3, y - size * 0.2, size * 0.35, 0, Math.PI * 2);
          ctx.arc(x + size * 0.6, y, size * 0.4, 0, Math.PI * 2);
          ctx.arc(x - size * 0.2, y + size * 0.1, size * 0.3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200, 210, 220, ${alpha})`;
          ctx.fill();
        };

        drawCloud(c.x, c.y, c.w * 0.3, c.opacity);
      });

      // Rain
      if (isRainy) {
        particles.forEach(p => {
          p.y += p.vy;
          p.x += p.vx;
          if (p.y > h) { p.y = -5; p.x = Math.random() * w; }
          if (p.x < 0) p.x = w;

          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 2, p.y + p.vy * 2);
          ctx.strokeStyle = `hsla(200, 70%, 70%, ${p.opacity})`;
          ctx.lineWidth = p.size * 0.5;
          ctx.stroke();
        });
      }

      // Fog effect
      if (isFoggy) {
        for (let i = 0; i < 3; i++) {
          const fogY = h * 0.4 + i * h * 0.2;
          const fogGrad = ctx.createLinearGradient(0, fogY - 20, 0, fogY + 20);
          fogGrad.addColorStop(0, "transparent");
          fogGrad.addColorStop(0.5, `rgba(180, 190, 200, ${0.06 + Math.sin(frame * 0.01 + i) * 0.03})`);
          fogGrad.addColorStop(1, "transparent");
          ctx.fillStyle = fogGrad;
          ctx.fillRect(0, fogY - 20, w, 40);
        }
      }

      // Ground horizon line
      const horizonGrad = ctx.createLinearGradient(0, h - 20, 0, h);
      horizonGrad.addColorStop(0, "transparent");
      horizonGrad.addColorStop(1, "hsla(90, 65%, 50%, 0.05)");
      ctx.fillStyle = horizonGrad;
      ctx.fillRect(0, h - 20, w, 20);

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [code, isDay]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full rounded-xl" />;
};

// Wind compass component
const WindCompass = ({ direction, speed }: { direction: number; speed: number }) => (
  <div className="relative w-16 h-16">
    <svg viewBox="0 0 64 64" className="w-full h-full">
      {/* Compass ring */}
      <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--border))" strokeWidth="1" opacity="0.3" />
      <circle cx="32" cy="32" r="20" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.2" />
      {/* Cardinal marks */}
      {["N", "E", "S", "W"].map((dir, i) => {
        const angle = i * 90 - 90;
        const rad = (angle * Math.PI) / 180;
        const x = 32 + Math.cos(rad) * 26;
        const y = 32 + Math.sin(rad) * 26;
        return (
          <text key={dir} x={x} y={y + 3} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="7" fontWeight="600">
            {dir}
          </text>
        );
      })}
      {/* Wind arrow */}
      <motion.g
        animate={{ rotate: direction }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        style={{ transformOrigin: "32px 32px" }}
      >
        <line x1="32" y1="14" x2="32" y2="50" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
        <polygon points="32,10 27,20 37,20" fill="hsl(var(--primary))" />
      </motion.g>
    </svg>
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="text-[8px] font-mono font-bold text-primary bg-background/80 px-1 rounded">{speed}</span>
    </div>
  </div>
);

// Temperature gauge
const TempGauge = ({ temp, feelsLike }: { temp: number; feelsLike: number }) => {
  const maxTemp = 55;
  const fillPct = Math.min(temp / maxTemp, 1);
  const getColor = (t: number) => {
    if (t < 15) return "hsl(var(--info))";
    if (t < 30) return "hsl(var(--completed))";
    if (t < 40) return "hsl(var(--warning))";
    return "hsl(var(--destructive))";
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-8 h-24 rounded-full bg-secondary/50 border border-border/30 overflow-hidden">
        <motion.div
          className="absolute bottom-0 left-0 right-0 rounded-full"
          style={{ backgroundColor: getColor(temp) }}
          initial={{ height: 0 }}
          animate={{ height: `${fillPct * 100}%` }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
        />
        {/* Tick marks */}
        {[0, 10, 20, 30, 40, 50].map(t => (
          <div
            key={t}
            className="absolute left-0 right-0 border-t border-border/20"
            style={{ bottom: `${(t / maxTemp) * 100}%` }}
          />
        ))}
        {/* Bulb */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full" style={{ backgroundColor: getColor(temp) }} />
      </div>
      <motion.div
        className="text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <p className="text-2xl font-bold font-mono text-foreground">{temp}°</p>
        <p className="text-[9px] text-muted-foreground">Feels {feelsLike}°</p>
      </motion.div>
    </div>
  );
};

// Hourly forecast bar
const HourlyBar = ({ forecasts }: { forecasts: HourlyForecast[] }) => (
  <div className="flex gap-1 overflow-x-auto pb-1">
    {forecasts.map((f, i) => {
      const info = getWeatherInfo(f.code);
      const Icon = info.icon;
      return (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + i * 0.05 }}
          className="flex flex-col items-center gap-1 min-w-[44px] p-1.5 rounded-lg bg-secondary/20 border border-border/20"
        >
          <span className="text-[9px] text-muted-foreground font-mono">{f.time}</span>
          <Icon className="w-3.5 h-3.5 text-primary/70" />
          <span className="text-xs font-bold font-mono text-foreground">{f.temp}°</span>
          <span className="text-[8px] text-muted-foreground">{f.windSpeed}km</span>
        </motion.div>
      );
    })}
  </div>
);

const WeatherWidget = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [hourly, setHourly] = useState<HourlyForecast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=22.41&longitude=39.10" +
      "&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day,apparent_temperature,surface_pressure,uv_index,visibility,wind_direction_10m,precipitation" +
      "&hourly=temperature_2m,weather_code,wind_speed_10m" +
      "&forecast_hours=12&timezone=Asia/Riyadh"
    )
      .then(res => res.json())
      .then(data => {
        if (data.current) {
          setWeather({
            temperature: Math.round(data.current.temperature_2m),
            windSpeed: Math.round(data.current.wind_speed_10m),
            humidity: data.current.relative_humidity_2m,
            weatherCode: data.current.weather_code,
            isDay: data.current.is_day === 1,
            apparentTemp: Math.round(data.current.apparent_temperature ?? data.current.temperature_2m),
            pressure: Math.round(data.current.surface_pressure ?? 1013),
            uvIndex: Math.round(data.current.uv_index ?? 0),
            visibility: Math.round((data.current.visibility ?? 10000) / 1000),
            windDirection: data.current.wind_direction_10m ?? 0,
            precipitation: data.current.precipitation ?? 0,
          });
        }
        if (data.hourly) {
          const forecasts: HourlyForecast[] = [];
          const now = new Date();
          for (let i = 0; i < Math.min(8, data.hourly.time?.length ?? 0); i++) {
            const t = new Date(data.hourly.time[i]);
            if (t >= now) {
              forecasts.push({
                time: t.toLocaleTimeString("en", { hour: "2-digit", hour12: true }).replace(" ", ""),
                temp: Math.round(data.hourly.temperature_2m[i]),
                code: data.hourly.weather_code[i],
                windSpeed: Math.round(data.hourly.wind_speed_10m[i]),
              });
            }
            if (forecasts.length >= 6) break;
          }
          setHourly(forecasts);
        }
        setLoading(false);
      })
      .catch(() => {
        setWeather({ temperature: 28, windSpeed: 12, humidity: 55, weatherCode: 0, isDay: true, apparentTemp: 30, pressure: 1013, uvIndex: 8, visibility: 10, windDirection: 315, precipitation: 0 });
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-secondary rounded-xl" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-secondary rounded-lg" />)}
          </div>
        </div>
      </motion.div>
    );
  }

  if (!weather) return null;

  const info = getWeatherInfo(weather.weatherCode);
  const isOutdoorSafe = weather.weatherCode < 51 && weather.windSpeed < 40 && (weather.uvIndex ?? 0) < 11;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="glass-card overflow-hidden"
    >
      {/* Live Weather Scene */}
      <div className="relative h-36 overflow-hidden rounded-t-xl">
        <WeatherScene code={weather.weatherCode} isDay={weather.isDay} />
        {/* Overlay content */}
        <div className="absolute inset-0 flex items-end p-4">
          <div className="flex items-end justify-between w-full">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <MapPin className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-semibold text-foreground/90 uppercase tracking-wider">KAEC, Saudi Arabia</span>
              </div>
              <p className="text-3xl font-bold font-mono text-foreground leading-none">{weather.temperature}°<span className="text-sm text-muted-foreground ml-1">C</span></p>
              <p className="text-xs text-muted-foreground mt-0.5">{info.label} • Feels {weather.apparentTemp}°</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className={`text-[9px] font-bold uppercase px-2.5 py-1 rounded-full backdrop-blur-sm ${
                isOutdoorSafe
                  ? "bg-completed/20 text-completed border border-completed/30"
                  : "bg-destructive/20 text-destructive border border-destructive/30"
              }`}>
                {isOutdoorSafe ? "✓ Safe for Outdoor" : "⚠ Caution"}
              </div>
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>Live</span>
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-completed"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-3">
          <div className="flex flex-col items-center p-2 rounded-lg bg-secondary/20 border border-border/20">
            <Wind className="w-4 h-4 text-primary/70 mb-1" />
            <span className="text-sm font-bold font-mono text-foreground">{weather.windSpeed}</span>
            <span className="text-[8px] text-muted-foreground">km/h {getWindDirection(weather.windDirection ?? 0)}</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-secondary/20 border border-border/20">
            <Droplets className="w-4 h-4 text-info/70 mb-1" />
            <span className="text-sm font-bold font-mono text-foreground">{weather.humidity}%</span>
            <span className="text-[8px] text-muted-foreground">Humidity</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-secondary/20 border border-border/20">
            <Gauge className="w-4 h-4 text-warning/70 mb-1" />
            <span className="text-sm font-bold font-mono text-foreground">{weather.pressure}</span>
            <span className="text-[8px] text-muted-foreground">hPa</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-secondary/20 border border-border/20">
            <Eye className="w-4 h-4 text-muted-foreground mb-1" />
            <span className="text-sm font-bold font-mono text-foreground">{weather.visibility}</span>
            <span className="text-[8px] text-muted-foreground">km Vis</span>
          </div>
        </div>

        {/* UV + Precipitation row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/20 border border-border/20">
            <Sun className="w-4 h-4 text-warning flex-shrink-0" />
            <div>
              <p className="text-xs font-bold font-mono text-foreground">UV {weather.uvIndex}</p>
              <p className="text-[9px] text-muted-foreground">
                {(weather.uvIndex ?? 0) <= 2 ? "Low" : (weather.uvIndex ?? 0) <= 5 ? "Moderate" : (weather.uvIndex ?? 0) <= 7 ? "High" : "Very High"}
              </p>
            </div>
            {/* UV bar */}
            <div className="flex-1 h-1.5 bg-secondary/50 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: (weather.uvIndex ?? 0) <= 2 ? "hsl(var(--completed))" : (weather.uvIndex ?? 0) <= 5 ? "hsl(var(--warning))" : "hsl(var(--destructive))" }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(((weather.uvIndex ?? 0) / 11) * 100, 100)}%` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/20 border border-border/20">
            <CloudRain className="w-4 h-4 text-info flex-shrink-0" />
            <div>
              <p className="text-xs font-bold font-mono text-foreground">{weather.precipitation} mm</p>
              <p className="text-[9px] text-muted-foreground">Precipitation</p>
            </div>
          </div>
        </div>

        {/* Hourly Forecast */}
        {hourly.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Next Hours</p>
            <HourlyBar forecasts={hourly} />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default WeatherWidget;
