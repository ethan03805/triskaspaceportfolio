import styles from "./Footer.module.css";
import { profile } from "@/content/profile";
export function Footer() {
  return (
    <footer className={styles.footer}>
      <a href={`mailto:${profile.email}`} className={styles.link}>{profile.email}</a>
    </footer>
  );
}
