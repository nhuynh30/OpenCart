"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send } from "lucide-react";

type Message = {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; email: string; role: string };
};

export default function MessageThread({
  conversationId,
  currentUserId,
  initialMessages,
}: {
  conversationId: string;
  currentUserId: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Poll for new messages every 4 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/conversations/${conversationId}/messages`);
        if (!res.ok) return;
        const data = await res.json();
        setMessages(
          data.messages.map((m: { id: string; body: string; createdAt: string; sender: { id: string; email: string; role: string } }) => ({
            id: m.id,
            body: m.body,
            createdAt: m.createdAt,
            sender: m.sender,
          }))
        );
      } catch {
        // Silently ignore poll failures
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [conversationId]);

  async function send() {
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to send message");
        return;
      }
      setMessages((prev) => [...prev, {
        id: data.message.id,
        body: data.message.body,
        createdAt: data.message.createdAt,
        sender: data.message.sender,
      }]);
      setInput("");
      textareaRef.current?.focus();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  // Group messages by day
  const grouped: { date: string; messages: Message[] }[] = [];
  for (const msg of messages) {
    const date = formatDate(msg.createdAt);
    const last = grouped[grouped.length - 1];
    if (last?.date === date) {
      last.messages.push(msg);
    } else {
      grouped.push({ date, messages: [msg] });
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-3xl space-y-1">
          {messages.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-400">
              No messages yet. Send the first one!
            </div>
          )}

          {grouped.map((group) => (
            <div key={group.date}>
              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-[11px] text-gray-400">{group.date}</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              {group.messages.map((msg) => {
                const isMe = msg.sender.id === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 mb-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {!isMe && (
                      <div className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600">
                        {msg.sender.email[0].toUpperCase()}
                      </div>
                    )}
                    <div className={`group flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[70%]`}>
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          isMe
                            ? "rounded-br-sm bg-indigo-500 text-white"
                            : "rounded-bl-sm bg-white text-gray-900 shadow-sm border border-gray-100"
                        }`}
                      >
                        {msg.body}
                      </div>
                      <span className="mt-0.5 text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto max-w-3xl">
          {error && (
            <p className="mb-2 text-xs text-red-500">{error}</p>
          )}
          <div className="flex items-end gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
              style={{ maxHeight: "120px" }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || sending}
              className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
