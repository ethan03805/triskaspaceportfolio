"use client";
import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Conversation } from "./Conversation";
import { type Declaration } from "@/components/entry/Entry";
import { TINTS } from "@/lib/persona";
import { type TranscriptMessage } from "@/lib/chat/transcript";

export function Chat() {
  const [persona, setPersona] = useState<Declaration | null>(null);
  const { messages, sendMessage, status } = useChat({
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

  const send = (text: string) => sendMessage({ text }, { body: { persona } });

  return (
    <Conversation
      persona={persona}
      messages={messages}
      status={status}
      onDeclare={declare}
      onSend={send}
    />
  );
}
