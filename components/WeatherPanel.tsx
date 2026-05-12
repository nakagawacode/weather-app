import Image from "next/image";
import { Weather } from "@/lib/weather";
import {
  getWeatherImage,
  getWeatherLabel,
  getWeatherTone,
} from "@/lib/weather-display";

type WeatherPanelProps = {
  aiLoading: boolean;
  onGenerateAdvice: () => void;
  weather: Weather;
};

export function WeatherPanel({
  aiLoading,
  onGenerateAdvice,
  weather,
}: WeatherPanelProps) {
  return (
    <section
      className={`weather-panel weather-panel--${getWeatherTone(
        weather.weathercode
      )}`}
    >
      <div className="panel-topline">
        <div>
          <p className="condition">{getWeatherLabel(weather.weathercode)}</p>
        </div>
      </div>

      <Image
        className="weather-mark"
        src={getWeatherImage(weather.weathercode)}
        alt=""
        aria-hidden="true"
        width={340}
        height={340}
      />

      <div className="temperature-readout">
        <span>{Math.round(weather.temperature)}</span>
        <small>°C</small>
      </div>

      <dl className="metrics">
        <div>
          <dt>降水確率</dt>
          <dd>
            {weather.precipitationProbability === null
              ? "不明"
              : `${weather.precipitationProbability}%`}
          </dd>
        </div>
        <div>
          <dt>風速</dt>
          <dd>{weather.windspeed} m/s</dd>
        </div>
      </dl>

      <button
        onClick={onGenerateAdvice}
        disabled={!weather || aiLoading}
        className="primary-action"
      >
        {aiLoading ? "生成中..." : "天気アドバイスを生成"}
      </button>
    </section>
  );
}
