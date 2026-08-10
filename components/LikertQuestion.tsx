interface LikertQuestionProps {
  label: string;
  name: string;
  value: number | null;
  onChange: (value: number) => void;
  lowLabel: string;
  highLabel: string;
  scale?: number;
}

export default function LikertQuestion({
  label,
  name,
  value,
  onChange,
  lowLabel,
  highLabel,
  scale = 5,
}: LikertQuestionProps) {
  const options = Array.from({ length: scale }, (_, i) => i + 1);

  return (
    <fieldset className="mb-6">
      <legend className="font-semibold text-gray-900 mb-3">{label}</legend>
      <div className="flex items-center justify-between gap-2">
        {options.map((option) => (
          <label key={option} className="flex flex-col items-center gap-1 flex-1">
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="h-5 w-5 accent-blue-600"
            />
            <span className="text-xs text-gray-500">{option}</span>
          </label>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </fieldset>
  );
}
