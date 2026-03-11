import { useState } from "react";
import useFetch from "../hooks/useFetch";

interface User {
  id: number;
  name: string;
  email: string;
  username: string;
  address: {
    city: string;
  };
}

function UserSearch() {
  const [userId, setUserId] = useState<number>(1);

  // Fetch berubah setiap userId berubah (karena URL berubah)
  const { data: user, isLoading, isError, error } = useFetch<User>(
    `https://jsonplaceholder.typicode.com/users/${userId}`
  );

  return (
    <div>
      <div>
        <label>User ID (1–10): </label>
        <input
          type="number"
          min={1}
          max={10}
          value={userId}
          onChange={(e) => setUserId(Number(e.target.value))}
        />
      </div>

      {isLoading && <p>Mencari user {userId}...</p>}
      {isError && <p style={{ color: "red" }}>{error?.message}</p>}

      {user && !isLoading && (
        <div style={{ marginTop: "1rem", padding: "1rem", border: "1px solid #ddd" }}>
          <h2>{user.name}</h2>
          <p>@{user.username}</p>
          <p>{user.email}</p>
          <p>📍 {user.address.city}</p>
        </div>
      )}
    </div>
  );
}

export default UserSearch;