// src/components/TodoInput/TodoInput.tsx
import { useState, type FormEvent, type ChangeEvent } from "react";
import styles from "./TodoInput.module.css";

interface TodoInputProps {
  onAdd: (text: string) => void;
  placeholder?: string;
}

function TodoInput({
  onAdd,
  placeholder = "Tambah todo baru...",
}: TodoInputProps) {
  const [inputValue, setInputValue] = useState("");

  // ── Submit via form (Enter atau klik tombol) ─────────────
  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault(); // Cegah reload halaman

    const trimmed = inputValue.trim();
    if (!trimmed) return; // Jangan submit kalau kosong

    onAdd(trimmed);
    setInputValue(""); // Reset input setelah berhasil add
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setInputValue(e.target.value);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={styles.input}
        // autoFocus supaya user langsung bisa ketik tanpa klik dulu
        autoFocus
        // maxLength untuk mencegah input yang terlalu panjang
        maxLength={200}
        aria-label="Input todo baru"
      />
      <button
        type="submit"
        className={styles.button}
        // Disable tombol kalau input kosong
        disabled={!inputValue.trim()}
        aria-label="Tambah todo"
      >
        Tambah
      </button>
    </form>
  );
}

export default TodoInput;
