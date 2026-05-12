import { prefectures } from "@/data/prefectures";

export type Prefecture = (typeof prefectures)[number];

export type CurrentLocation = {
  name: "現在地";
  lat: number;
  lon: number;
};

export type SelectedArea = Prefecture | CurrentLocation;

export const getNearestPrefecture = (lat: number, lon: number) => {
  return prefectures.reduce((nearest, prefecture) => {
    const nearestDistance =
      (nearest.lat - lat) ** 2 + (nearest.lon - lon) ** 2;
    const prefectureDistance =
      (prefecture.lat - lat) ** 2 + (prefecture.lon - lon) ** 2;

    return prefectureDistance < nearestDistance ? prefecture : nearest;
  }, prefectures[0]);
};
