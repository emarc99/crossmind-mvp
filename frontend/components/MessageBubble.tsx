"use client";

import React from "react";
import { ChatMessage } from "@/types";
import clsx from "clsx";

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  const getTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const seconds = Math.floor((now - timestamp) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div
      className={clsx(
        "flex gap-3 animate-fade-in",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={clsx(
          "max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-3",
          isUser
            ? "bg-blue-600 text-white rounded-br-none"
            : isSystem
            ? "bg-yellow-600/20 text-yellow-300 border border-yellow-600/30 rounded-bl-none"
            : "bg-slate-700 text-gray-100 rounded-bl-none"
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>
        <p
          className={clsx(
            "text-xs mt-1",
            isUser ? "text-blue-200" : "text-gray-500"
          )}
        >
          {getTimeAgo(message.timestamp)}
        </p>
      </div>
    </div>
  );
};

export default MessageBubble;
