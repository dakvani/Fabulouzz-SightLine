import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Cloud, Sun, CloudRain, Wind, Droplets, MapPin, Gauge, ShieldCheck, ShieldAlert, Clock, TrendingUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface WeatherData {
  temperature: number;
  windSpeed: number;
  humidity: number;
  weatherCode: number;
  isDay: boolean;
  apparentTemp: number;
  windDirection: number;
  pressure: number;
  visibility: number;
  uvIndex: number;
  dewPoint: number;
  cloudCover: number;
  windGusts: number;
}

interface ForecastDay {
  date: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
}

const weatherDescriptions: Record<number, { label: string; icon: typeof Sun }> = {
  0: { label: "Clear Sky", icon: Sun },
  1: { label: "Mainly Clear", icon: Sun },
  2: { label: "Partly Cloudy", icon: Cloud },
  3: { label: "Overcast", icon: Cloud },
  45: { label: "Foggy", icon: Cloud },
  48: { label: "Rime Fog", icon: Cloud },
  51: { label: "Light Drizzle", icon: CloudRain },
  53: { label: "Drizzle", icon: CloudRain },
  55: { label: "Dense Drizzle", icon: CloudRain },
  61: { label: "Slight Rain", icon: CloudRain },
  63: { label: "Moderate Rain", icon: CloudRain },
  65: { label: "Heavy Rain", icon: CloudRain },
};

const getWeatherInfo = (code: number) => weatherDescriptions[code] || { label: "Clear", icon: Sun };
const getWindDir = (deg: number) => ["N","NE","E","SE","S","SW","W","NW"][Math.round(deg / 45) % 8];

type SafetyResult = { safe: boolean; label: string; reason: string };

const getSafetyStatus = (temp: number, wind: number, uv: number): SafetyResult => {
  if (temp >= 48 || wind >= 50 || uv >= 11) return { safe: false, label: "Danger", reason: temp >= 48 ? "Extreme heat" : wind >= 50 ? "High winds" : "Extreme UV" };
  if (temp >= 42 || wind >= 35 || uv >= 8) return { safe: false, label: "Caution", reason: temp >= 42 ? "High heat" : wind >= 35 ? "Strong winds" : "Very high UV" };
  return { safe: true, label: "Safe", reason: "Conditions OK" };
};

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
    const w = canvas.offsetWidth, h = canvas.offsetHeight;
    let animId: number;
    const isClear = code <= 1, isRainy = code >= 51;

    const particles: { x: number; y: number; vy: number; vx: number; opacity: number }[] = [];
    if (isRainy) {
      for (let i = 0; i < 40; i++) particles.push({ x: Math.random() * w, y: Math.random() * h, vy: 3 + Math.random() * 3, vx: -0.5 + Math.random() * -0.5, opacity: 0.2 + Math.random() * 0.3 });
    }

    const stars: { x: number; y: number; r: number; p: number }[] = [];
    if (!isDay && isClear) for (let i = 0; i < 20; i++) stars.push({ x: Math.random() * w, y: Math.random() * h * 0.6, r: 0.5 + Math.random(), p: Math.random() * Math.PI * 2 });

    let frame = 0;
    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, w, h);
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      if (isDay) { grad.addColorStop(0, "hsla(210,60%,15%,0.5)"); grad.addColorStop(1, "hsla(30,50%,20%,0.2)"); }
      else { grad.addColorStop(0, "hsla(230,40%,6%,0.7)"); grad.addColorStop(1, "hsla(230,30%,10%,0.4)"); }
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

      stars.forEach(s => { s.p += 0.02; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,255,255,${0.4 + Math.sin(s.p) * 0.3})`; ctx.fill(); });

      if (isClear && isDay) {
        const cx = w * 0.8, cy = h * 0.3;
        const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30);
        sg.addColorStop(0, "hsla(45,100%,70%,0.3)"); sg.addColorStop(1, "transparent");
        ctx.fillStyle = sg; ctx.fillRect(cx - 30, cy - 30, 60, 60);
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + frame * 0.005; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8); ctx.lineTo(cx + Math.cos(a) * 16, cy + Math.sin(a) * 16); ctx.strokeStyle = "hsla(45,100%,65%,0.2)"; ctx.lineWidth = 1.5; ctx.stroke(); }
        ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fillStyle = "hsla(45,100%,65%,0.5)"; ctx.fill();
      }

      if (isRainy) particles.forEach(p => { p.y += p.vy; p.x += p.vx; if (p.y > h) { p.y = -3; p.x = Math.random() * w; } ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.vx * 2, p.y + p.vy * 2); ctx.strokeStyle = `hsla(200,70%,70%,${p.opacity})`; ctx.lineWidth = 0.8; ctx.stroke(); });

      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, [code, isDay]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full rounded-t-xl" />;
};

const KAECClock = () => {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleTimeString("en-US", { timeZone: "Asia/Riyadh", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-1">
      <Clock className="w-2.5 h-2.5 text-primary/60" />
      <span className="text-[9px] font-mono font-semibold text-foreground tabular-nums">{time}</span>
    </div>
  );
};

const ForecastMiniChart = ({ forecast }: { forecast: ForecastDay[] }) => {
  if (forecast.length === 0) return null;
  
  const allTemps = forecast.flatMap(d => [d.tempMax, d.tempMin]);
  const maxT = Math.max(...allTemps);
  const minT = Math.min(...allTemps);
  const range = maxT - minT || 1;
  const h = 28;
  const w = 100;
  const stepX = w / (forecast.length - 1);

  const toY = (t: number) => h - 4 - ((t - minT) / range) * (h - 8);

  const maxPoints = forecast.map((d, i) => `${i * stepX},${toY(d.tempMax)}`).join(" ");
  const minPoints = forecast.map((d, i) => `${i * stepX},${toY(d.tempMin)}`).join(" ");

  const dayLabels = forecast.map(d => {
    const date = new Date(d.date);
    return date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2);
  });

  return (
    <div className="px-2 pb-1.5">
      <div className="flex items-center gap-1 mb-1">
        <TrendingUp className="w-2.5 h-2.5 text-primary/50" />
        <span className="text-[7px] font-semibold text-muted-foreground uppercase tracking-wider">5-Day Forecast</span>
      </div>
      <div className="relative">
        <svg viewBox={`-2 -2 ${w + 4} ${h + 12}`} className="w-full" style={{ height: 40 }}>
          <polyline points={maxPoints} fill="none" stroke="hsl(var(--warning))" strokeWidth="1.2" strokeLinejoin="round" />
          <polyline points={minPoints} fill="none" stroke="hsl(var(--info))" strokeWidth="1.2" strokeLinejoin="round" opacity="0.7" />
          {forecast.map((d, i) => (
            <g key={i}>
              <circle cx={i * stepX} cy={toY(d.tempMax)} r="1.5" fill="hsl(var(--warning))" />
              <circle cx={i * stepX} cy={toY(d.tempMin)} r="1.5" fill="hsl(var(--info))" opacity="0.7" />
              <text x={i * stepX} y={toY(d.tempMax) - 3} textAnchor="middle" fontSize="4" fill="hsl(var(--warning))" fontWeight="bold">{d.tempMax}°</text>
              <text x={i * stepX} y={toY(d.tempMin) + 7} textAnchor="middle" fontSize="4" fill="hsl(var(--info))" opacity="0.7">{d.tempMin}°</text>
              <text x={i * stepX} y={h + 8} textAnchor="middle" fontSize="4" fill="hsl(var(--muted-foreground))">{dayLabels[i]}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

const WeatherWidget = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(true);
  const prevSafetyRef = useRef<boolean | null>(null);

  useEffect(() => {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=22.41&longitude=39.10&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day,apparent_temperature,wind_direction_10m,surface_pressure,cloud_cover,wind_gusts_10m,dew_point_2m&daily=temperature_2m_max,temperature_2m_min,weather_code,uv_index_max&timezone=Asia/Riyadh&forecast_days=6")
      .then(r => r.json())
      .then(d => {
        if (d.current) setWeather({
          temperature: Math.round(d.current.temperature_2m),
          windSpeed: Math.round(d.current.wind_speed_10m),
          humidity: d.current.relative_humidity_2m,
          weatherCode: d.current.weather_code,
          isDay: d.current.is_day === 1,
          apparentTemp: Math.round(d.current.apparent_temperature ?? d.current.temperature_2m),
          windDirection: d.current.wind_direction_10m ?? 0,
          pressure: Math.round(d.current.surface_pressure ?? 1013),
          visibility: 10,
          uvIndex: d.daily?.uv_index_max?.[0] ?? 0,
          dewPoint: Math.round(d.current.dew_point_2m ?? 0),
          cloudCover: d.current.cloud_cover ?? 0,
          windGusts: Math.round(d.current.wind_gusts_10m ?? 0),
        });
        if (d.daily) {
          const days: ForecastDay[] = [];
          for (let i = 1; i <= 5 && i < d.daily.time.length; i++) {
            days.push({
              date: d.daily.time[i],
              tempMax: Math.round(d.daily.temperature_2m_max[i]),
              tempMin: Math.round(d.daily.temperature_2m_min[i]),
              weatherCode: d.daily.weather_code[i],
            });
          }
          setForecast(days);
        }
        setLoading(false);
      })
      .catch(() => { 
        setWeather({ temperature: 28, windSpeed: 12, humidity: 55, weatherCode: 0, isDay: true, apparentTemp: 30, windDirection: 315, pressure: 1013, visibility: 10, uvIndex: 8, dewPoint: 18, cloudCover: 10, windGusts: 22 }); 
        setForecast([
          { date: "2026-03-01", tempMax: 30, tempMin: 20, weatherCode: 0 },
          { date: "2026-03-02", tempMax: 32, tempMin: 22, weatherCode: 1 },
          { date: "2026-03-03", tempMax: 29, tempMin: 19, weatherCode: 2 },
          { date: "2026-03-04", tempMax: 31, tempMin: 21, weatherCode: 0 },
          { date: "2026-03-05", tempMax: 33, tempMin: 23, weatherCode: 1 },
        ]);
        setLoading(false); 
      });
  }, []);

  // Toast alert when safety status changes from Safe to Caution/Danger
  useEffect(() => {
    if (!weather) return;
    const safety = getSafetyStatus(weather.temperature, weather.windSpeed, weather.uvIndex);
    if (prevSafetyRef.current !== null && prevSafetyRef.current === true && !safety.safe) {
      toast({
        title: `⚠️ Weather Alert: ${safety.label}`,
        description: `${safety.reason} — outdoor conditions are no longer safe at KAEC site.`,
        variant: "destructive",
      });
    }
    prevSafetyRef.current = safety.safe;
  }, [weather]);

  if (loading) return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4 h-full"><div className="animate-pulse h-full bg-secondary rounded-xl" /></motion.div>;
  if (!weather) return null;

  const info = getWeatherInfo(weather.weatherCode);
  const safety = getSafetyStatus(weather.temperature, weather.windSpeed, weather.uvIndex);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card overflow-hidden h-full flex flex-col">
      {/* Sky scene */}
      <div className="relative h-16 overflow-hidden rounded-t-xl flex-shrink-0">
        <WeatherScene code={weather.weatherCode} isDay={weather.isDay} />
        <div className="absolute inset-0 flex items-center justify-between px-3">
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <MapPin className="w-2.5 h-2.5 text-primary" />
              <span className="text-[8px] font-semibold text-foreground/70 uppercase tracking-widest">KAEC</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <p className="text-2xl font-bold font-mono text-foreground leading-none">{weather.temperature}°</p>
              <span className="text-[9px] text-muted-foreground">Feels {weather.apparentTemp}°</span>
            </div>
            <p className="text-[9px] text-muted-foreground mt-0.5">{info.label} • UV {weather.uvIndex.toFixed(1)}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <KAECClock />
            <motion.div
              className="w-2 h-2 rounded-full bg-[hsl(var(--completed))]"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </div>
      </div>

      {/* Data grid */}
      <div className="p-2 grid grid-cols-3 gap-1.5">
        <div className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-secondary/30">
          <Wind className="w-2.5 h-2.5 text-primary/60 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-[9px] font-mono font-semibold text-foreground block leading-tight">{weather.windSpeed}<span className="text-muted-foreground text-[8px]">km/h</span></span>
            <span className="text-[7px] text-muted-foreground">{getWindDir(weather.windDirection)} G{weather.windGusts}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-secondary/30">
          <Droplets className="w-2.5 h-2.5 text-[hsl(var(--info))]/60 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-[9px] font-mono font-semibold text-foreground block leading-tight">{weather.humidity}%</span>
            <span className="text-[7px] text-muted-foreground">Dew {weather.dewPoint}°</span>
          </div>
        </div>
        <div className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-secondary/30">
          <Gauge className="w-2.5 h-2.5 text-muted-foreground/60 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-[9px] font-mono font-semibold text-foreground block leading-tight">{weather.pressure}</span>
            <span className="text-[7px] text-muted-foreground">hPa ☁{weather.cloudCover}%</span>
          </div>
        </div>
      </div>

      {/* 5-day forecast mini chart */}
      <ForecastMiniChart forecast={forecast} />

      {/* Safety banner */}
      <div className={`mx-2 mb-2 mt-auto px-2 py-1 rounded-md flex items-center gap-1.5 text-[9px] font-semibold ${
        safety.safe
          ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]"
          : "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]"
      }`}>
        {safety.safe ? <ShieldCheck className="w-3 h-3 flex-shrink-0" /> : <ShieldAlert className="w-3 h-3 flex-shrink-0" />}
        <span>Outdoor: {safety.label}</span>
        <span className="text-[8px] font-normal opacity-70 ml-auto">{safety.reason}</span>
      </div>
    </motion.div>
  );
};

export default WeatherWidget;
