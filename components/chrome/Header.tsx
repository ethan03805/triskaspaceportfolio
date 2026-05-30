import styles from "./Header.module.css";
import { profile } from "@/content/profile";
export function Header() {
  return (
    <header className={styles.header}>
      <span className={styles.mark}>{profile.wordmark}</span>
    </header>
  );
}
