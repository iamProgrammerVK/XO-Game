import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] },
});

const rooms = {};

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push(socket.id);

    const players = rooms[roomId];
    if (players.length === 1) io.to(players[0]).emit("start-game", "X");
    if (players.length === 2) io.to(players[1]).emit("start-game", "O");
  });

  socket.on("move", ({ roomId, board }) => {
    socket.to(roomId).emit("update-board", board);
  });

  socket.on("game-over", ({ roomId, winner }) => {
    io.to(roomId).emit("game-over", winner);
  });

  socket.on("leave-room", (roomId) => {
    socket.leave(roomId);
    if (rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter((id) => id !== socket.id);
      if (rooms[roomId].length === 0) delete rooms[roomId];
      else io.to(roomId).emit("player-left");
    }
  });

  socket.on("disconnect", () => {
    for (const [roomId, players] of Object.entries(rooms)) {
      rooms[roomId] = players.filter((id) => id !== socket.id);
      if (rooms[roomId].length === 0) delete rooms[roomId];
      else io.to(roomId).emit("player-left");
    }
    console.log("Disconnected:", socket.id);
  });
});

server.listen(5000, () => console.log("✅ Server running on port 5000"));