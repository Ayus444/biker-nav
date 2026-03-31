// src/components/SearchPanel.tsx
"use client";
import { useState } from "react";
import styles from "./SearchPanel.module.css";

interface Props {
  onRoute: (src: string, dst: string) => void;
  loading: boolean;
  error: string | null;
}

const EXAMPLES = [
  { label: "Eiffel → Louvre", src: "48.8584,2.2945", dst: "48.8606,2.3376" },
  { label: "Times Sq → Central Park", src: "40.7580,-73.9855", dst: "40.7812,-73.9665" },
];

export function SearchPanel({ onRoute, loading, error }: Props) {
  const [src, setSrc] = useState("");
  const [dst, setDst] = useState("");

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setSrc(`${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`),
      () => alert("Location access denied")
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (src && dst) onRoute(src.trim(), dst.trim());
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.logo}>⟁ VELOPATH</span>
        <span className={styles.tagline}>BIKER NAV</span>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label>FROM</label>
          <div className={styles.inputRow}>
            <input
              value={src}
              onChange={(e) => setSrc(e.target.value)}
              placeholder="lat,lng  (e.g. 48.8584,2.2945)"
              className={styles.input}
              required
            />
            <button type="button" onClick={handleLocate} className={styles.locBtn} title="Use my location">
              ◎
            </button>
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label>TO</label>
          <input
            value={dst}
            onChange={(e) => setDst(e.target.value)}
            placeholder="lat,lng  (e.g. 48.8606,2.3376)"
            className={styles.input}
            required
          />
        </div>

        {error && <p className={styles.error}>⚠ {error}</p>}

        <button type="submit" className={styles.goBtn} disabled={loading}>
          {loading ? "CALCULATING…" : "GET ROUTE →"}
        </button>

        <div className={styles.examples}>
          <span>Try: </span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              className={styles.exBtn}
              onClick={() => { setSrc(ex.src); setDst(ex.dst); }}
            >
              {ex.label}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}
