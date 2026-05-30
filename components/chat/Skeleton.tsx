"use client";
import styles from "./Skeleton.module.css";

export function Skeleton() {
  return <div className={styles.skeleton} aria-label="composing" role="status" />;
}
