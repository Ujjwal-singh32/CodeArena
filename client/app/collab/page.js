"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Users, Plus, LogIn, Copy, Check } from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { languages } from "@/lib/mockData";

export default function CollabPage() {
  const [mode, setMode] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [roomTitle, setRoomTitle] = useState("");
  const [roomLang, setRoomLang] = useState("javascript");

  const handleCreate = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(code);
    setMode("created");
  };

  const handleJoin = () => {
    if (joinCode.trim()) {
      window.location.href = `/collab/${joinCode.trim().toUpperCase()}`;
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <Users className="w-12 h-12 text-primary mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">Collaborative Editor</h1>
        <p className="text-muted max-w-lg mx-auto">
          Create a room and invite up to 5 friends to code together in real time.
          All cursors visible — like Google Docs for code.
        </p>
      </motion.div>

      {!mode && (
        <div className="grid sm:grid-cols-2 gap-6">
          <Card
            glow
            className="cursor-pointer hover:border-primary/40 transition-all"
            onClick={() => setMode("create")}
          >
            <div className="text-center py-8">
              <Plus className="w-10 h-10 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Create Room</h3>
              <p className="text-sm text-muted">Start a new session and share the room code</p>
            </div>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary/40 transition-all"
            onClick={() => setMode("join")}
          >
            <div className="text-center py-8">
              <LogIn className="w-10 h-10 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Join Room</h3>
              <p className="text-sm text-muted">Enter a room code to join an existing session</p>
            </div>
          </Card>
        </div>
      )}

      {mode === "create" && !roomCode && (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Create a Room</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <Input
              label="Room Title"
              placeholder="e.g. Weekend Hackathon"
              value={roomTitle}
              onChange={(e) => setRoomTitle(e.target.value)}
            />
            <Select
              label="Default Language"
              options={languages}
              value={roomLang}
              onChange={(e) => setRoomLang(e.target.value)}
            />
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setMode(null)}>
                Back
              </Button>
              <Button className="flex-1" onClick={handleCreate}>
                Create Room
              </Button>
            </div>
          </div>
        </Card>
      )}

      {mode === "created" && roomCode && (
        <Card glow className="max-w-md mx-auto text-center">
          <CardHeader>
            <CardTitle>Room Created!</CardTitle>
          </CardHeader>
          <div className="py-6">
            <p className="text-sm text-muted mb-4">Share this code with your friends:</p>
            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="text-3xl font-mono font-bold text-primary tracking-widest">{roomCode}</span>
              <button onClick={copyCode} className="p-2 rounded-lg hover:bg-primary/10 text-muted hover:text-primary cursor-pointer">
                {copied ? <Check className="w-5 h-5 text-primary" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            <Link href={`/collab/${roomCode}`}>
              <Button className="w-full">
                Enter Room
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {mode === "join" && (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Join a Room</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <Input
              label="Room Code"
              placeholder="Enter 6-character code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="font-mono tracking-widest text-center text-lg"
            />
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setMode(null)}>
                Back
              </Button>
              <Button className="flex-1" onClick={handleJoin} disabled={joinCode.length < 4}>
                Join Room
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
