export const fetchWeather = async (lat: number, lon: number) => {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=precipitation_probability_max&timezone=Asia%2FTokyo&forecast_days=1`
  );

  const data = await res.json();

  if (!data.current_weather) {
    throw new Error("天気データが取得できません");
  }

  return {
    ...data.current_weather,
    precipitationProbability:
      data.daily?.precipitation_probability_max?.[0] ?? null,
  };
};
