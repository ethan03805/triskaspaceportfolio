"use client";
import { useEffect, useState } from "react";
import { Entry, type Declaration } from "@/components/entry/Entry";
import { AssignmentNote } from "./AssignmentNote";
import { MessagePart } from "./MessagePart";
import { Input } from "./Input";
import { SuggestedDirections } from "./SuggestedDirections";
import { Composed } from "@/components/motion/Composed";
import { isOpeningComplete, latestDirections, type TranscriptMessage } from "@/lib/chat/transcript";
import styles from "./Conversation.module.css";

export function Conversation({
  persona, messages, status, onDeclare, onSend,
}: {
  persona: Declaration | null;
  messages: TranscriptMessage[];
  status: string;
  onDeclare: (d: Declaration) => void;
  onSend: (text: string) => void;
}) {
  const [liberated, setLiberated] = useState(false);
  useEffect(() => {
    if (isOpeningComplete(status, messages)) setLiberated(true);
  }, [status, messages]);

  if (!persona) return <Entry onDeclare={onDeclare} />;

  const directions = latestDirections(messages);

  return (
    <div className={styles.conversation}>
      {persona.text ? <AssignmentNote role={persona.role} text={persona.text} /> : null}
      {messages.map((m, mi) => (
        <div key={m.id ?? mi} className={m.role === "user" ? styles.user : styles.assistant}>
          {(m.parts ?? []).map((part, i) => <MessagePart key={i} part={part as never} />)}
        </div>
      ))}
      {liberated ? (
        <Composed className={styles.liberation}>
          <Input onSend={onSend} />
          <SuggestedDirections directions={directions} onPick={onSend} />
        </Composed>
      ) : null}
    </div>
  );
}
