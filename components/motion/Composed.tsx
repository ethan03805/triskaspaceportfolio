"use client";
import { Children, isValidElement, useEffect, useState } from "react";
import styles from "./Composed.module.css";

export function Composed({
  children,
  as: Tag = "div",
  className = "",
  startDelay = 0,
}: {
  children: React.ReactNode;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  startDelay?: number;
}) {
  const [go, setGo] = useState(false);
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false;
    if (reduce) {
      setGo(true);
      return;
    }
    const t = setTimeout(() => setGo(true), startDelay);
    return () => clearTimeout(t);
  }, [startDelay]);

  const items = Children.toArray(children);
  return (
    <Tag className={`${styles.panel} ${go ? styles.go : ""} ${className}`}>
      {items.map((child, i) => (
        <div
          key={isValidElement(child) && child.key != null ? child.key : i}
          className={styles.line}
          style={{ ["--i" as string]: i }}
        >
          {child}
        </div>
      ))}
    </Tag>
  );
}
