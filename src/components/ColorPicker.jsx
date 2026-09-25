const PRESET_COLORS = [
  "#EF4444", // red
  "#F97316", // orange
  "#F59E0B", // amber
  "#EAB308", // yellow
  "#84CC16", // lime
  "#22C55E", // green
  "#10B981", // emerald
  "#14B8A6", // teal
  "#06B6D4", // cyan
  "#3B82F6", // blue
  "#6366F1", // indigo
  "#8B5CF6", // violet
  "#A855F7", // purple
  "#EC4899", // pink
  "#F43F5E", // rose
  "#64748B", // slate
];

export default function ColorPicker({ value, onChange }) {
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`w-8 h-8 rounded-lg transition-all ${
              value === c
                ? "ring-2 ring-offset-2 ring-gray-900 scale-110"
                : "hover:scale-110"
            }`}
            style={{ backgroundColor: c }}
            aria-label={`Select color ${c}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#3B82F6"
          className="input !w-32 font-mono text-sm uppercase"
          maxLength={7}
        />
        <div
          className="w-10 h-10 rounded-lg border border-gray-200"
          style={{ backgroundColor: value }}
        />
      </div>
    </div>
  );
}