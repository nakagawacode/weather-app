export const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : "予期しないエラーが発生しました";
};

export const getWeatherLabel = (code: number) => {
  if (code === 0) return "晴れ";
  if (code <= 3) return "くもり";
  if (code <= 48) return "霧";
  if (code <= 67) return "雨";
  return "不明";
};

export const getWeatherTone = (code: number) => {
  if (code === 0) return "clear";
  if (code <= 3) return "cloud";
  if (code <= 48) return "mist";
  if (code <= 67) return "rain";
  return "unknown";
};

export const getWeatherImage = (code: number) => {
  return `/weather/${getWeatherTone(code)}-pictogram.png`;
};
