"use client";
import { z } from "zod";
import styles from "./SuggestedDirections.module.css";

const renderSchema = z.object({ directions: z.array(z.string()) });

export function SuggestedDirections({
  directions, onPick,
}: {
  directions: string[];
  onPick?: (text: string) => void;
}) {
  const { directions: list } = renderSchema.parse({ directions });
  const clean = list.map((d) => d.trim()).filter(Boolean);
  if (clean.length === 0) return null;
  return (
    <div className={styles.row}>
      {clean.map((d) => (
        <button key={d} type="button" className={styles.chip} onClick={() => onPick?.(d)}>
          [ {d} ]
        </button>
      ))}
    </div>
  );
}
