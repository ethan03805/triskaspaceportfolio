"use client";
import { useState } from "react";
import styles from "./Input.module.css";

export function Input({ onSend }: { onSend: (text: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className={styles.box}>
      <input
        className={styles.input}
        placeholder="ask anything"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && v.trim()) {
            onSend(v.trim());
            setV("");
          }
        }}
      />
    </div>
  );
}
