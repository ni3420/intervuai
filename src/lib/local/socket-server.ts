import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("voice_start", ({ callId, userId }) => {
    console.log("🎤 Voice started:", {
      callId,
      userId,
    });
  });

  socket.on("voice_chunk", ({ callId, userId, audio }) => {
    const buffer = Buffer.from(audio);
    console.log("buffer",buffer)

    console.log("🎵 Voice chunk received:", {
      callId,
      userId,
      bytes: buffer.length,
      date:Date.now()
    });
  });

  socket.on("voice_end", ({ callId, userId }) => {
    console.log("🛑 Voice ended:", {
      callId,
      userId,
    });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});
