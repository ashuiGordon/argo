import { useState, useCallback } from "react";

interface SearchBarProps {
  onSearch: (term: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [value, setValue] = useState("");

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setValue(v);
      onSearch(v);
    },
    [onSearch],
  );

  return (
    <div className="px-3 pb-2">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="Search conversations..."
        className="w-full rounded-[var(--radius-sm)] border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none"
      />
    </div>
  );
}
