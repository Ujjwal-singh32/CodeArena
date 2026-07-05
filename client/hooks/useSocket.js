"use client";

import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { getSocketUrl } from "@/services/api";

export function useSocket(userId, handlers = {}) {
  const socketRef = useRef(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!userId) return undefined;

    const socket = io(getSocketUrl(), { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    const joinUser = () => {
      socket.emit("join", { userId: String(userId) });
    };

    socket.on("connect", joinUser);

    const events = [
      "submission:verdict",
      "ai:review-ready",
      "duel:chat",
      "duel:match-update",
      "duel:started",
      "duel:player-ready",
      "duel:finished",
      "duel:match-created",
      "duel:match-found",
      "collab:chat",
      "collab:users",
      "collab:sync",
      "collab:awareness",
    ];

    for (const event of events) {
      socket.on(event, (payload) => {
        handlersRef.current[event]?.(payload);
      });
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  return socketRef;
}

export function useDuelSocket(matchId, userId, handlers = {}) {
  const socketRef = useSocket(userId, handlers);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !matchId || !userId) return;

    const join = () =>
      socket.emit("duel:join", { matchId: String(matchId), userId: String(userId) });
    if (socket.connected) join();
    socket.on("connect", join);

    return () => {
      socket.off("connect", join);
    };
  }, [matchId, userId, socketRef]);

  return socketRef;
}
