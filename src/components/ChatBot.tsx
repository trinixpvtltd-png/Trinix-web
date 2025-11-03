"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { Bot, Send } from "lucide-react";
import { sendChatMessage } from "@/lib/chatApi";

type ChatMessage = {
  id: number;
  text: string;
  sender: "bot" | "user";
  timestamp: Date;
};

type StyleMap = Record<string, CSSProperties>;

const BORDER = "rgba(255,255,255,0.12)";
const TEXT_PRIMARY = "rgba(255,255,255,0.92)";
const TEXT_MUTED = "rgba(255,255,255,0.7)";
const PANEL_BG = "rgba(255,255,255,0.08)";
const BOT_BG = "rgba(255,255,255,0.1)";
const USER_BG = "rgba(255,255,255,0.15)";
const GLOW_TEAL = "rgba(61,245,242,0.6)";
const GLOW_WHITE = "rgba(255,255,255,0.4)";

const getBotResponse = (msg: string): string => {
  const lower = msg.toLowerCase();
  if (lower.includes("service")) return "We provide complete web, app, and cloud solutions at Trinix.";
  if (lower.includes("contact")) return "You can reach us through our contact page or call our team directly.";
  if (lower.includes("price")) return "Pricing depends on your project scope. We can connect you with our team for details.";
  if (lower.includes("hello") || lower.includes("hi")) return "Hello! Welcome to Trinix Cosmos. How can I help you today?";
  return "That’s a great question! I’ll help you connect with our team for more details.";
};

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, text: "Hi! I'm Trinix AI Assistant. How can I help you today?", sender: "bot", timestamp: new Date() },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => scrollToBottom(), [messages]);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes auroraPulse {
        0%, 100% { box-shadow: 0 0 14px ${GLOW_TEAL}, 0 0 26px ${GLOW_WHITE}; }
        50% { box-shadow: 0 0 24px ${GLOW_TEAL}, 0 0 34px ${GLOW_WHITE}; }
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  const styles = useMemo(() => {
    return {
      container: {
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 1000,
        fontFamily: "Inter, system-ui, sans-serif",
      },
      iconButton: {
        width: "62px",
        height: "62px",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.08)",
        border: `1px solid ${BORDER}`,
        color: TEXT_PRIMARY,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        backdropFilter: "blur(10px)",
        animation: "auroraPulse 4s ease-in-out infinite",
        transition: "transform 0.25s ease",
      },
      chatWindow: {
        position: "absolute",
        bottom: "80px",
        right: 0,
        width: "380px",
        height: "500px",
        display: isOpen ? "flex" : "none",
        flexDirection: "column",
        background: PANEL_BG,
        borderRadius: "24px",
        border: `1px solid ${BORDER}`,
        backdropFilter: "blur(20px)",
        overflow: "hidden",
      },
      header: {
        background: "linear-gradient(90deg, rgba(61,245,242,0.15), rgba(255,255,255,0.08))",
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: `1px solid ${BORDER}`,
        color: TEXT_PRIMARY,
      },
      headerLeft: { display: "flex", alignItems: "center", gap: "10px" },
      botIcon: {
        width: "40px",
        height: "40px",
        borderRadius: "12px",
        background: "rgba(255,255,255,0.08)",
        border: `1px solid ${BORDER}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "auroraPulse 5s ease-in-out infinite",
      },
      messages: {
        flex: 1,
        padding: "20px",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        color: TEXT_PRIMARY,
      },
      message: {
        maxWidth: "80%",
        padding: "10px 14px",
        borderRadius: "16px",
        fontSize: "14px",
        lineHeight: 1.5,
        wordBreak: "break-word",
      },
      botMessage: {
        background: BOT_BG,
        border: `1px solid ${BORDER}`,
        alignSelf: "flex-start",
        color: TEXT_MUTED,
      },
      userMessage: {
        background: USER_BG,
        color: "#fff",
        alignSelf: "flex-end",
        border: `1px solid ${GLOW_TEAL}`,
        boxShadow: `0 0 14px ${GLOW_TEAL}`,
      },
      inputContainer: {
        borderTop: `1px solid ${BORDER}`,
        background: "rgba(255,255,255,0.06)",
        padding: "16px",
        backdropFilter: "blur(12px)",
      },
      inputWrapper: { display: "flex", gap: "10px", alignItems: "center" },
      input: {
        flex: 1,
        background: "rgba(255,255,255,0.05)",
        border: `1px solid ${BORDER}`,
        borderRadius: "12px",
        padding: "10px 14px",
        color: TEXT_PRIMARY,
        fontSize: "14px",
        outline: "none",
        resize: "none",
      },
      sendButton: {
        background: "linear-gradient(90deg, rgba(61,245,242,0.35), rgba(255,255,255,0.3))",
        border: `1px solid ${BORDER}`,
        borderRadius: "10px",
        padding: "10px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: TEXT_PRIMARY,
        animation: "auroraPulse 4s ease-in-out infinite",
      },
    } satisfies StyleMap;
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    const userMsg: ChatMessage = { id: Date.now(), text: inputMessage, sender: "user", timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsTyping(true);
    try {
      const res = await sendChatMessage(userMsg.text);
      const botMsg: ChatMessage = {
        id: Date.now() + 1,
        text: res?.answer || res?.response || getBotResponse(userMsg.text),
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, text: getBotResponse(userMsg.text), sender: "bot", timestamp: new Date() },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.chatWindow}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.botIcon}><Bot size={20} color="#3df5f2" /></div>
            <div>
              <div style={{ fontWeight: 600 }}>Trinix AI Assistant</div>
              <div style={{ fontSize: "12px", color: TEXT_MUTED }}>Online • Always here to help</div>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} style={{ background: "none", color: TEXT_PRIMARY, border: "none", fontSize: "20px" }}>×</button>
        </div>

        <div style={styles.messages}>
          {messages.map((m) => (
            <div key={m.id} style={{ ...styles.message, ...(m.sender === "user" ? styles.userMessage : styles.botMessage) }}>{m.text}</div>
          ))}
          {isTyping && <div style={{ ...styles.botMessage, opacity: 0.6 }}>Typing...</div>}
          <div ref={messagesEndRef} />
        </div>

        <div style={styles.inputContainer}>
          <div style={styles.inputWrapper}>
            <textarea
              style={styles.input}
              rows={1}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
            />
            <button onClick={handleSendMessage} style={styles.sendButton}>
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      <button style={styles.iconButton} onClick={() => setIsOpen((p) => !p)}>
        {isOpen ? "×" : <Bot size={26} color="#3df5f2" />}
      </button>
    </div>
  );
}

