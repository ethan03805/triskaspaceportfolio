"use client";
import { useEffect, useRef, useState } from "react";
import { Composed } from "@/components/motion/Composed";
import { renderProjectSchema, type RenderProject } from "./projectShape";
import {
  STREAM_URL, NOW_PATH, nowPlayingResultSchema, type NowPlaying,
} from "@/lib/serenity/now-playing";
import styles from "./Serenity.module.css";

const POLL_MS = 15_000;

export function SerenityComponent({ project }: { project: RenderProject }) {
  const p = renderProjectSchema.parse(project); // render-boundary revalidation
  const [np, setNp] = useState<NowPlaying | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch(NOW_PATH, { cache: "no-store" });
        const json = nowPlayingResultSchema.parse(await res.json());
        if (!active) return;
        if (json.ok) { setNp(json); setDegraded(false); }
        else setDegraded(true);
      } catch {
        if (active) setDegraded(true);
      }
    };
    load();
    const id = setInterval(load, POLL_MS);
    return () => { active = false; clearInterval(id); };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  const showStatic = degraded && !np;

  return (
    <Composed className={styles.card}>
      <div className={styles.title}>{p.name}</div>
      <div className={styles.tagline}>{np?.tagline ?? p.tagline}</div>
      <div className={styles.body}>
        {showStatic ? (
          <>
            <div className={styles.desc}>{p.description}</div>
            <div className={styles.meta}>
              {p.tech} · {p.year}
              {p.url ? <> · <a href={p.url} target="_blank" rel="noreferrer" className={styles.link}>visit</a></> : null}
            </div>
          </>
        ) : (
          <>
            <div className={styles.live}>
              <span className={`${styles.dot} ${np?.onAir ? styles.on : ""}`} aria-hidden="true" />
              <span className={styles.onair}>
                {np?.onAir ? "on air" : "off air"}{np?.show ? ` · ${np.show}` : ""}
              </span>
            </div>
            <div className={styles.track}>
              {np?.track ? (
                <>
                  <span className={styles.trackTitle}>{np.track.title}</span>
                  <span className={styles.trackArtist}>{np.track.artist}</span>
                </>
              ) : (
                <span className={styles.trackArtist}>loading the current track…</span>
              )}
            </div>
            {np?.beat ? <div className={styles.beat}>{np.beat}</div> : null}
            <div className={styles.player}>
              <button type="button" className={styles.play} onClick={toggle}>
                {playing ? "pause" : "listen live"}
              </button>
              <span className={`${styles.eq} ${playing ? styles.eqOn : ""}`} aria-hidden="true">
                <i /><i /><i /><i />
              </span>
            </div>
            {p.url ? (
              <div className={styles.meta}>
                <a href={p.url} target="_blank" rel="noreferrer" className={styles.link}>open underclassradio.com</a>
              </div>
            ) : null}
          </>
        )}
        <audio ref={audioRef} src={STREAM_URL} preload="none" />
      </div>
    </Composed>
  );
}
