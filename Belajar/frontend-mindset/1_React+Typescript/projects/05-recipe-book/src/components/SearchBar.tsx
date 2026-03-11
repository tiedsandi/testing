// src/components/SearchBar.tsx
import { Form, useSubmit } from "react-router-dom";
import { useEffect, useRef } from "react";

interface SearchBarProps {
  defaultValue?: string;
}

export default function SearchBar({ defaultValue }: SearchBarProps) {
  const submit = useSubmit();
  const formRef = useRef<HTMLFormElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleChange = () => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounce
    timeoutRef.current = setTimeout(() => {
      if (formRef.current) {
        submit(formRef.current);
      }
    }, 300);
  };

  return (
    <Form ref={formRef} method="get" className="w-full max-w-md">
      <input
        type="text"
        name="search"
        placeholder="Search recipes..."
        defaultValue={defaultValue}
        onChange={handleChange}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </Form>
  );
}
