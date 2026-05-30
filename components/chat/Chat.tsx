"use client";
import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Entry, type Declaration } from "@/components/entry/Entry";
import { Input } from "./Input";
import { MessagePart } from "./MessagePart";
import { TINTS } from "@/lib/persona";
import styles from "./Chat.module.css";

export function Chat() {
  const [persona, setPersona] = useState<Declaration | null>(null);
  const { messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const declare = (d: Declaration) => {
    setPersona(d);
    document.documentElement.style.setProperty("--ink", TINTS[d.role]);
    const opener = d.text
      ? `I am ${d.text}. Give me your tailored opening.`
      : `I'm here as ${d.role}. Give me your tailored opening.`;
    sendMessage({ text: opener }, { body: { persona: { role: d.role, text: d.text } } });
  };

  if (!persona) return <Entry onDeclare={declare} />;

  return (
    <div className={styles.chat}>
      {messages.map((m) => (
        <div key={m.id} className={m.role === "user" ? styles.user : styles.assistant}>
          {m.parts.map((part, i) => (
            <MessagePart
              key={i}
              part={part as never}
              onPick={(text) => sendMessage({ text }, { body: { persona } })}
            />
          ))}
        </div>
      ))}
      <Input onSend={(text) => sendMessage({ text }, { body: { persona } })} />
    </div>
  );
}
