import React from 'react';

interface RatingInputProps {
  value: number;
  onChange: (val: number) => void;
}

const RatingInput: React.FC<RatingInputProps> = ({ value, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseFloat(e.target.value);
    if (isNaN(val)) val = 0;
    if (val < 0) val = 0;
    if (val > 10) val = 10;
    onChange(val);
  };

  return (
    <div className="flex flex-col space-y-4">
      <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Rating Score</label>
      <div className="relative group max-w-xs flex items-baseline gap-4">
        <input
          type="number"
          step="0.1"
          min="0"
          max="10"
          value={value}
          onChange={handleChange}
          className="w-32 bg-transparent border-b border-neutral-800 py-2 px-0 text-6xl font-heading text-neutral-200 focus:outline-none focus:border-white transition-colors placeholder-neutral-800"
          placeholder="0.0"
        />
        <span className="text-neutral-600 font-bold text-[10px] tracking-widest">
          OUT OF 10
        </span>
      </div>
    </div>
  );
};

export default RatingInput;