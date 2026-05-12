import { prefectures } from "@/data/prefectures";
import { Prefecture, SelectedArea } from "@/lib/prefecture";

type AreaSelectorProps = {
  city: SelectedArea | null;
  onCurrentLocation: () => void;
  onSelectPrefecture: (prefecture: Prefecture) => void;
};

export function AreaSelector({
  city,
  onCurrentLocation,
  onSelectPrefecture,
}: AreaSelectorProps) {
  return (
    <div className="control-row">
      <label className="field">
        <span>Area</span>
        <select
          value={city?.name === "現在地" ? "" : city?.name ?? ""}
          onChange={(event) => {
            const selected = prefectures.find(
              (prefecture) => prefecture.name === event.target.value
            );

            if (selected) {
              onSelectPrefecture(selected);
            }
          }}
        >
          <option value="" disabled>
            都道府県を選択
          </option>

          {prefectures.map((prefecture) => (
            <option key={prefecture.name} value={prefecture.name}>
              {prefecture.name}
            </option>
          ))}
        </select>
      </label>

      <button onClick={onCurrentLocation} className="secondary-action">
        現在地で見る
      </button>
    </div>
  );
}
