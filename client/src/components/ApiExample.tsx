import { useEffect, useState } from "react";
import { apiClient } from "../lib/api";

type Player = {
  _id: string;
  name: string;
  position?: string;
  team?: string;
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
  errors?: unknown;
};

export default function ApiExample() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    apiClient
      .get<ApiResponse<Player[]>>("players")
      .then((res) => {
        setPlayers(res?.data ?? []);
      })
      .catch((err: unknown) => {
        const msg =
          err instanceof Error ? err.message : "Failed to load players";
        setError(msg);
      })
      .finally(() => {
        setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <div style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 8 }}>
      <h3 style={{ marginTop: 0 }}>API Example: GET /players</h3>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "#b91c1c" }}>Error: {error}</p>}
      {!loading && !error && players.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {players.slice(0, 5).map((p) => (
            <li key={p._id}>
              {p.name}
              {p.position ? ` • ${p.position}` : ""}
              {p.team ? ` • ${p.team}` : ""}
            </li>
          ))}
        </ul>
      )}
      {!loading && !error && players.length === 0 && <p>No players found.</p>}
    </div>
  );
}
