import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cloud,
  Sun,
  CloudRain,
  Wind,
  Droplets,
  MapPin,
  Gauge,
  ShieldCheck,
  ShieldAlert,
  Clock,
  TrendingUp,
  Loader2,
  ChevronDown,
  Search,
  Check,
  Save,
  Compass
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useProjectData } from "@/contexts/ProjectDataContext";
import { SAUDI_CITIES, findSaudiCity, SaudiCity } from "@/data/saudiCities";
import { supabase } from "@/integrations/supabase/client";

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
  71: { label: "Dust / Wind", icon: Wind },
  95: { label: "Thunderstorm", icon: CloudRain },
};

const getWeatherInfo = (code: number) => weatherDescriptions[code] || { label: "Clear", icon: Sun };
const getWindDir = (deg: number) => ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(deg / 45) % 8];

type SafetyResult = { safe: boolean; label: string; reason: string };

const getSafetyStatus = (temp: number, wind: number, uv: number): SafetyResult => {
  if (temp >= 48 || wind >= 50 || uv >= 11) {
    return {
      safe: false,
      label: "Danger",
      reason: temp >= 48 ? "Extreme Heat Warning" : wind >= 50 ? "High Winds Hazard" : "Dangerous UV Radiation",
    };
  }
  if (temp >= 42 || wind >= 35 || uv >= 8) {
    return {
      safe: false,
      label: "Caution",
      reason: temp >= 42 ? "High Heat Alert" : wind >= 35 ? "Gusty Winds Alert" : "High UV Index",
    };
  }
  return { safe: true, label: "Safe to Work", reason: "Standard Site Conditions" };
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
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    let animId: number;
    const isClear = code <= 1;
    const isRainy = code >= 51;

    const particles: { x: number; y: number; vy: number; vx: number; opacity: number }[] = [];
    if (isRainy) {
      for (let i = 0; i < 40; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vy: 3 + Math.random() * 3,
          vx: -0.5 + Math.random() * -0.5,
          opacity: 0.2 + Math.random() * 0.3,
        });
      }
    }

    const stars: { x: number; y: number; r: number; p: number }[] = [];
    if (!isDay && isClear) {
      for (let i = 0; i < 20; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h * 0.6,
          r: 0.5 + Math.random(),
          p: Math.random() * Math.PI * 2,
        });
      }
    }

    let frame = 0;
    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, w, h);
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      if (isDay) {
        grad.addColorStop(0, "hsla(210, 65%, 20%, 0.5)");
        grad.addColorStop(1, "hsla(35, 60%, 25%, 0.2)");
      } else {
        grad.addColorStop(0, "hsla(224, 45%, 9%, 0.75)");
        grad.addColorStop(1, "hsla(224, 40%, 14%, 0.45)");
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      stars.forEach((s) => {
        s.p += 0.02;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${0.4 + Math.sin(s.p) * 0.3})`;
        ctx.fill();
      });

      if (isClear && isDay) {
        const cx = w * 0.85;
        const cy = h * 0.35;
        const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 32);
        sg.addColorStop(0, "hsla(45, 100%, 70%, 0.35)");
        sg.addColorStop(1, "transparent");
        ctx.fillStyle = sg;
        ctx.fillRect(cx - 32, cy - 32, 64, 64);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + frame * 0.005;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8);
          ctx.lineTo(cx + Math.cos(a) * 16, cy + Math.sin(a) * 16);
          ctx.strokeStyle = "hsla(45, 100%, 65%, 0.25)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fillStyle = "hsla(45, 100%, 65%, 0.6)";
        ctx.fill();
      }

      if (isRainy) {
        particles.forEach((p) => {
          p.y += p.vy;
          p.x += p.vx;
          if (p.y > h) {
            p.y = -3;
            p.x = Math.random() * w;
          }
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 2, p.y + p.vy * 2);
          ctx.strokeStyle = `hsla(200, 70%, 70%, ${p.opacity})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        });
      }

      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, [code, isDay]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full rounded-t-2xl pointer-events-none" />;
};

const LocationClock = () => {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          timeZone: "Asia/Riyadh",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-1 bg-background/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-border/40">
      <Clock className="w-2.5 h-2.5 text-primary" />
      <span className="text-[9px] font-mono font-bold text-foreground tabular-nums">KSA {time}</span>
    </div>
  );
};

const ForecastMiniChart = ({ forecast }: { forecast: ForecastDay[] }) => {
  if (forecast.length === 0) return null;

  const allTemps = forecast.flatMap((d) => [d.tempMax, d.tempMin]);
  const maxT = Math.max(...allTemps);
  const minT = Math.min(...allTemps);
  const range = maxT - minT || 1;
  const h = 26;
  const w = 100;
  const stepX = w / (forecast.length - 1);

  const toY = (t: number) => h - 3 - ((t - minT) / range) * (h - 7);

  const maxPoints = forecast.map((d, i) => `${i * stepX},${toY(d.tempMax)}`).join(" ");
  const minPoints = forecast.map((d, i) => `${i * stepX},${toY(d.tempMin)}`).join(" ");

  const dayLabels = forecast.map((d) => {
    const date = new Date(d.date);
    return date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2);
  });

  return (
    <div className="px-3 py-1.5 border-t border-border/20">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <TrendingUp className="w-2.5 h-2.5 text-primary" />
          <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider">5-Day Forecast</span>
        </div>
        <span className="text-[8px] font-mono text-muted-foreground">High / Low</span>
      </div>
      <div className="relative">
        <svg viewBox={`-3 -3 ${w + 6} ${h + 12}`} className="w-full" style={{ height: 38 }}>
          <polyline points={maxPoints} fill="none" stroke="hsl(var(--warning))" strokeWidth="1.4" strokeLinejoin="round" />
          <polyline points={minPoints} fill="none" stroke="hsl(var(--info))" strokeWidth="1.4" strokeLinejoin="round" opacity="0.8" />
          {forecast.map((d, i) => (
            <g key={i}>
              <circle cx={i * stepX} cy={toY(d.tempMax)} r="1.5" fill="hsl(var(--warning))" />
              <circle cx={i * stepX} cy={toY(d.tempMin)} r="1.5" fill="hsl(var(--info))" opacity="0.8" />
              <text x={i * stepX} y={toY(d.tempMax) - 3} textAnchor="middle" fontSize="4.2" fill="hsl(var(--warning))" fontWeight="bold">
                {d.tempMax}°
              </text>
              <text x={i * stepX} y={toY(d.tempMin) + 6.5} textAnchor="middle" fontSize="4.2" fill="hsl(var(--info))" opacity="0.8">
                {d.tempMin}°
              </text>
              <text x={i * stepX} y={h + 8.5} textAnchor="middle" fontSize="4" fill="hsl(var(--muted-foreground))" fontWeight="600">
                {dayLabels[i]}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

const WeatherWidget = () => {
  const { projectInfo, projectId, canEditProject, refresh } = useProjectData();
  const [selectedCity, setSelectedCity] = useState<SaudiCity>(() => findSaudiCity(projectInfo.location));
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingLocation, setSavingLocation] = useState(false);
  const prevSafetyRef = useRef<boolean | null>(null);

  // Sync selected city if projectInfo location changes from outside
  useEffect(() => {
    if (projectInfo.location) {
      const matched = findSaudiCity(projectInfo.location);
      setSelectedCity(matched);
    }
  }, [projectInfo.location]);

  // Click outside to close city dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCityDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch weather for selected city coordinates
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    const fetchExactWeather = async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${selectedCity.lat}&longitude=${selectedCity.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day,apparent_temperature,wind_direction_10m,surface_pressure,cloud_cover,wind_gusts_10m,dew_point_2m&daily=temperature_2m_max,temperature_2m_min,weather_code,uv_index_max&timezone=Asia%2FRiyadh&forecast_days=6`;
        const res = await fetch(url);
        const d = await res.json();

        if (isCancelled) return;

        if (d.current) {
          setWeather({
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
        }

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
      } catch (err) {
        console.error("Failed to fetch Saudi weather:", err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchExactWeather();

    return () => {
      isCancelled = true;
    };
  }, [selectedCity]);

  // Toast alert when safety status changes
  useEffect(() => {
    if (!weather) return;
    const safety = getSafetyStatus(weather.temperature, weather.windSpeed, weather.uvIndex);
    if (prevSafetyRef.current !== null && prevSafetyRef.current === true && !safety.safe) {
      toast({
        title: `⚠️ Weather Advisory: ${safety.label}`,
        description: `${safety.reason} reported for ${selectedCity.name}. Please follow safety SOPs for outdoor crew.`,
        variant: "destructive",
      });
    }
    prevSafetyRef.current = safety.safe;
  }, [weather, selectedCity]);

  // Save selected city as official project location
  const handleSaveLocationAsProjectSite = async () => {
    if (!projectId || !canEditProject) return;
    setSavingLocation(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({ location: selectedCity.name })
        .eq("id", projectId);

      if (error) throw error;
      toast({
        title: "Site Location Updated",
        description: `Project site location synchronized to ${selectedCity.name}.`,
      });
      await refresh();
    } catch (err: any) {
      toast({
        title: "Failed to update site location",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingLocation(false);
    }
  };

  const filteredCities = SAUDI_CITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(citySearchQuery.toLowerCase()) ||
      c.arabicName.includes(citySearchQuery) ||
      c.region.toLowerCase().includes(citySearchQuery.toLowerCase())
  );

  const info = weather ? getWeatherInfo(weather.weatherCode) : { label: "Clear", icon: Sun };
  const safety = weather
    ? getSafetyStatus(weather.temperature, weather.windSpeed, weather.uvIndex)
    : { safe: true, label: "Checking", reason: "" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card overflow-hidden h-full flex flex-col relative"
    >
      {/* Sky Scene Top Container */}
      <div className="relative min-h-[76px] overflow-visible rounded-t-2xl flex-shrink-0 p-3 flex flex-col justify-between">
        {weather && <WeatherScene code={weather.weatherCode} isDay={weather.isDay} />}

        {/* Header row: City Selector Dropdown + KSA Clock */}
        <div className="relative z-20 flex items-center justify-between gap-2">
          {/* City Selector Dropdown */}
          <div ref={dropdownRef} className="relative min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setCityDropdownOpen(!cityDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/70 backdrop-blur-md border border-border/50 text-foreground hover:bg-secondary/60 transition-all text-left max-w-full"
              title="Select Saudi Arabia City for Exact Weather"
            >
              <MapPin className="w-3 h-3 text-primary shrink-0" />
              <span className="text-[11px] font-bold truncate">{selectedCity.name}</span>
              <ChevronDown
                className={`w-3 h-3 text-muted-foreground shrink-0 transition-transform ${
                  cityDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {cityDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.96 }}
                  className="absolute left-0 mt-1.5 w-72 max-h-72 overflow-y-auto rounded-2xl border border-border/80 bg-card/95 backdrop-blur-2xl shadow-2xl p-2 z-50 space-y-1"
                >
                  <div className="relative px-1 pb-1">
                    <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={citySearchQuery}
                      onChange={(e) => setCitySearchQuery(e.target.value)}
                      placeholder="Search Saudi cities or regions..."
                      className="w-full bg-secondary/50 border border-border/50 rounded-xl pl-8 pr-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-0.5 max-h-48 overflow-y-auto pr-0.5">
                    {filteredCities.map((city) => {
                      const isSelected = selectedCity.id === city.id;
                      return (
                        <button
                          key={city.id}
                          type="button"
                          onClick={() => {
                            setSelectedCity(city);
                            setCityDropdownOpen(false);
                            setCitySearchQuery("");
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl transition-all flex items-center justify-between text-xs group ${
                            isSelected
                              ? "bg-primary/15 text-primary font-bold border border-primary/30"
                              : "hover:bg-secondary/60 text-foreground"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold flex items-center gap-1.5">
                              <span>{city.name}</span>
                              <span className="text-[10px] text-muted-foreground font-normal">
                                {city.arabicName}
                              </span>
                            </p>
                            <p className="text-[9px] text-muted-foreground truncate">{city.region}</p>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Local Clock */}
          <div className="shrink-0 flex items-center gap-1">
            <LocationClock />
            {canEditProject && projectInfo.location?.trim() !== selectedCity.name && (
              <button
                type="button"
                onClick={handleSaveLocationAsProjectSite}
                disabled={savingLocation}
                className="p-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all text-[9px] flex items-center gap-1 px-2"
                title="Save this city as official project site location"
              >
                {savingLocation ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Save className="w-2.5 h-2.5" />}
                <span className="hidden sm:inline font-bold">Set as Site</span>
              </button>
            )}
          </div>
        </div>

        {/* Current Temperature & Conditions */}
        <div className="relative z-10 flex items-end justify-between mt-2">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-xs">Fetching live telemetry for {selectedCity.name}...</span>
            </div>
          ) : weather ? (
            <>
              <div>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-extrabold font-mono text-foreground leading-none">
                    {weather.temperature}°C
                  </p>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Feels {weather.apparentTemp}°
                  </span>
                </div>
                <p className="text-[10px] font-semibold text-foreground/80 mt-1 flex items-center gap-1.5">
                  <span>{info.label}</span>
                  <span className="text-muted-foreground">•</span>
                  <span>UV Index {weather.uvIndex.toFixed(1)}</span>
                </p>
              </div>

              <div className="flex flex-col items-end">
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    safety.safe
                      ? "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/30"
                      : "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/30"
                  }`}
                >
                  {safety.label}
                </span>
                <span className="text-[8px] text-muted-foreground font-mono mt-0.5">
                  {selectedCity.region}
                </span>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Weather Telemetry Grid */}
      {weather && (
        <div className="p-2.5 grid grid-cols-3 gap-2">
          <div className="p-2 rounded-xl bg-secondary/30 border border-border/30 flex items-center gap-2">
            <Wind className="w-3.5 h-3.5 text-primary shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-mono font-bold text-foreground block leading-tight">
                {weather.windSpeed} <span className="text-[8px] text-muted-foreground font-normal">km/h</span>
              </span>
              <span className="text-[8px] text-muted-foreground truncate block">
                {getWindDir(weather.windDirection)} • G{weather.windGusts}
              </span>
            </div>
          </div>

          <div className="p-2 rounded-xl bg-secondary/30 border border-border/30 flex items-center gap-2">
            <Droplets className="w-3.5 h-3.5 text-[hsl(var(--info))] shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-mono font-bold text-foreground block leading-tight">
                {weather.humidity}%
              </span>
              <span className="text-[8px] text-muted-foreground truncate block">
                Dew {weather.dewPoint}°C
              </span>
            </div>
          </div>

          <div className="p-2 rounded-xl bg-secondary/30 border border-border/30 flex items-center gap-2">
            <Gauge className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-mono font-bold text-foreground block leading-tight">
                {weather.pressure} <span className="text-[8px] text-muted-foreground font-normal">hPa</span>
              </span>
              <span className="text-[8px] text-muted-foreground truncate block">
                Cloud {weather.cloudCover}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 5-day forecast mini chart */}
      {forecast.length > 0 && <ForecastMiniChart forecast={forecast} />}

      {/* Site Safety Banner */}
      {weather && (
        <div
          className={`mx-2.5 mb-2.5 mt-auto px-2.5 py-1.5 rounded-xl flex items-center justify-between gap-2 text-[10px] font-semibold border ${
            safety.safe
              ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20"
              : "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20"
          }`}
        >
          <div className="flex items-center gap-1.5">
            {safety.safe ? <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> : <ShieldAlert className="w-3.5 h-3.5 shrink-0" />}
            <span>Work Conditions: {safety.label}</span>
          </div>
          <span className="text-[9px] font-normal opacity-85 truncate text-right">
            {safety.reason}
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default WeatherWidget;
