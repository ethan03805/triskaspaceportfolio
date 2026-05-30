import styles from "./Column.module.css";
export function Column({ children }: { children: React.ReactNode }) {
  return <div className={styles.col}>{children}</div>;
}
