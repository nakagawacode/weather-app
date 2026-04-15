export const fetchWeather = async (lat: number, lon: number) => {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
  );

  const data = await res.json();
  return data.current_weather;
};