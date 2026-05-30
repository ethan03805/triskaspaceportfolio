"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { sanitizeSchema } from "@/lib/markdown/sanitize-schema";
import styles from "./Prose.module.css";

/**
 * Renders an assistant text part as sanitized GFM Markdown, styled in the
 * refined-quiet system. Raw HTML is never parsed (no rehype-raw), and
 * rehype-sanitize provides defense in depth.
 */
export function Prose({ children }: { children: string }) {
  return (
    <div className={styles.prose}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer noopener" className={styles.link}>
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
