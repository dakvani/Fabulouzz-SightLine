import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Cloud, Sun, CloudRain, Wind, Thermometer, Droplets, Eye } from "lucide-react";

interface WeatherData {
  temperature: number;
  windSpeed: number;
  humidity: number;
  weatherCode: number;
  isDay: boolean;
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

const getWeatherInfo = (code: number) => {
  return weatherDescriptions[code] || { label: "Clear", icon: Sun };
};

const WeatherWidget = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // KAEC coordinates: 22.4094° N, 39.1044° E
    fetch("https://api.open-meteo.com/v1/forecast?latitude=22.41&longitude=39.10&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day&timezone=Asia/Riyadh")
      .then(res => res.json())
      .then(data => {
        if (data.current) {
          setWeather({
            temperature: Math.round(data.current.temperature_2m),
            windSpeed: Math.round(data.current.wind_speed_10m),
            humidity: data.current.relative_humidity_2m,
            weatherCode: data.current.weather_code,
            isDay: data.current.is_day === 1,
          });
        }
        setLoading(false);
      })
      .catch(() => {
        // Fallback data for KAEC
        setWeather({ temperature: 28, windSpeed: 12, humidity: 55, weatherCode: 0, isDay: true });
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4"
      >
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary" />
          <div className="space-y-2 flex-1">
            <div className="h-3 bg-secondary rounded w-24" />
            <div className="h-2 bg-secondary rounded w-16" />
          </div>
        </div>
      </motion.div>
    );
  }

  if (!weather) return null;

  const info = getWeatherInfo(weather.weatherCode);
  const WeatherIcon = info.icon;
  const isOutdoorSafe = weather.weatherCode < 51 && weather.windSpeed < 40;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="glass-card p-4 relative overflow-hidden"
    >
      {/* Subtle ambient glow */}
      <motion.div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none"
        style={{ background: weather.isDay 
          ? "radial-gradient(circle, hsl(38, 92%, 55%, 0.1), transparent 70%)" 
          : "radial-gradient(circle, hsl(210, 80%, 55%, 0.08), transparent 70%)" 
        }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <motion.div
            animate={weather.weatherCode < 3 ? { rotate: [0, 5, -5, 0] } : {}}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <WeatherIcon className="w-5 h-5 text-primary" />
          </motion.div>
          <div>
            <p className="text-xs font-semibold text-foreground">KAEC Site Weather</p>
            <p className="text-[10px] text-muted-foreground">{info.label}</p>
          </div>
        </div>
        <div className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
          isOutdoorSafe 
            ? "bg-completed/15 text-completed border border-completed/30" 
            : "bg-destructive/15 text-destructive border border-destructive/30"
        }`}>
          {isOutdoorSafe ? "Safe for outdoor" : "Caution"}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-2">
          <Thermometer className="w-3.5 h-3.5 text-muted-foreground" />
          <div>
            <p className="text-lg font-bold font-mono text-foreground">{weather.temperature}°</p>
            <p className="text-[9px] text-muted-foreground">Celsius</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Wind className="w-3.5 h-3.5 text-muted-foreground" />
          <div>
            <p className="text-lg font-bold font-mono text-foreground">{weather.windSpeed}</p>
            <p className="text-[9px] text-muted-foreground">km/h</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Droplets className="w-3.5 h-3.5 text-muted-foreground" />
          <div>
            <p className="text-lg font-bold font-mono text-foreground">{weather.humidity}%</p>
            <p className="text-[9px] text-muted-foreground">Humidity</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default WeatherWidget;
