import { useState } from "react";

interface TodoInputProps {
  onAdd: (text: string) => void;
  placeholder?: string;
}

export default function TodoInput({
  onAdd,
  placeholder = "Add new task",
}: TodoInputProps) {
  const [value, setValue] = useState("");

  const handleAdd = () => {
    if (value.trim()) {
      onAdd(value.trim());
      setValue("");
    }
  };

  return (
    <div className="relative flex items-center w-full">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        className="input-base"
        style={{
          borderRadius: "var(--radius-full)",
          paddingRight: "7.5rem",
          height: "2.6rem",
        }}
      />
      <button
        onClick={handleAdd}
        className="btn-primary absolute right-0 flex items-center justify-center"
        style={{
          borderRadius: "var(--radius-full)",
          width: "6.5rem",
          height: "2.6rem",
        }}
      >
        Add
      </button>
    </div>
  );
}
