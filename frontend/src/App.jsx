import React, { useState, useEffect } from "react";
import io from "socket.io-client";

const socket = io(
  import.meta.env.VITE_SERVER_URL || process.env.REACT_APP_SERVER_URL || "http://localhost:5000",
  { transports: ["websocket"] }
);

export default function App() {
  const [mode, setMode] = useState("offline"); // "offline" | "online"
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXTurn, setIsXTurn] = useState(true);
  const [winner, setWinner] = useState(null);
  const [playerSymbol, setPlayerSymbol] = useState("");
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [joinedId, setJoinedId] = useState("");
  const [draw, setDraw] = useState(false);

  // Join room
  const joinRoom = () => {
    if (roomId.trim()) {
      socket.emit("join-room", roomId);
    }
  };

  const exitRoom = () => {
    socket.emit("leave-room", roomId);
    setJoined(false);
    setRoomId("");
    setPlayerSymbol("");
    setJoinedId("");
    resetGame();
  };

  // Socket listeners
  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected:", socket.id);
      setJoinedId(socket.id);
    });

    socket.on("start-game", (symbol) => {
      setPlayerSymbol(symbol);
      setJoined(true);
    });

    socket.on("update-board", (newBoard) => {
      setBoard(newBoard);
      setIsXTurn((prev) => !prev);
    });

    socket.on("game-over", (winner) => setWinner(winner));

    socket.on("player-left", () => {
      alert("Opponent left. Room unlocked.");
      setJoined(false);
      setRoomId("");
      setPlayerSymbol("");
    });

    return () => {
      socket.off("start-game");
      socket.off("update-board");
      socket.off("game-over");
      socket.off("player-left");
    };
  }, []);

  // Handle cell click
  const handleClick = (index) => {
    if (winner || board[index] || draw) return;

    if (mode === "offline") {
      const newBoard = [...board];
      newBoard[index] = isXTurn ? "X" : "O";
      setBoard(newBoard);
      setIsXTurn(!isXTurn);
      checkWinner(newBoard);
    } else {
      if (playerSymbol !== (isXTurn ? "X" : "O")) return;
      const newBoard = [...board];
      newBoard[index] = isXTurn ? "X" : "O";
      setBoard(newBoard);
      setIsXTurn(!isXTurn);
      socket.emit("move", { roomId, board: newBoard });
      checkWinner(newBoard);
    }
  };

  // Check winner or draw
  const checkWinner = (board) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        setWinner(board[a]);
        if (mode === "online")
          socket.emit("game-over", { roomId, winner: board[a] });
        return;
      }
    }

    // Draw condition
    if (board.every((cell) => cell !== null) && !winner) {
      setDraw(true);
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setWinner(null);
    setIsXTurn(true);
    setDraw(false);
  };

  // Draw handling
  useEffect(() => {
    if (draw && mode === "offline") {
      setTimeout(() => {
        if (window.confirm("It's a draw! Click OK to restart.")) {
          resetGame();
        }
      }, 200);
    }
  }, [draw]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-center">
        Multiplayer XO Game
      </h1>

      {/* Mode Selector */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => {
            setMode("offline");
            resetGame();
            setJoined(false);
            setRoomId("");
          }}
          className={`px-4 py-2 rounded-lg font-semibold ${
            mode === "offline" ? "bg-blue-600" : "bg-gray-700"
          }`}
        >
          Offline
        </button>
        <button
          onClick={() => {
            setMode("online");
            resetGame();
          }}
          className={`px-4 py-2 rounded-lg font-semibold ${
            mode === "online" ? "bg-blue-600" : "bg-gray-700"
          }`}
        >
          Online
        </button>
      </div>

      {/* Online Controls */}
      {mode === "online" && (
        <div className="flex flex-col sm:flex-row gap-2 mb-4 items-center">
          {!joined ? (
            <>
              <input
                type="text"
                className="px-3 py-2 rounded bg-gray-800 border border-gray-700"
                placeholder="Enter Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
              <button
                onClick={joinRoom}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
              >
                Join Room
              </button>
            </>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <p className="text-sm sm:text-base">
                ✅ Joined Room: <span className="font-bold">{roomId}</span>
              </p>
              <button
                onClick={exitRoom}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
              >
                Exit
              </button>
            </div>
          )}
        </div>
      )}

      {/* Joined ID */}
      {mode === "online" && joinedId && (
        <p className="text-gray-400 text-sm mb-2">
          Your ID: <span className="text-gray-200 font-mono">{joinedId}</span>
        </p>
      )}

      {/* Game Board */}
      <div className="grid grid-cols-3 gap-2 w-[90vw] max-w-[300px] sm:max-w-[360px]">
        {board.map((cell, index) => (
          <button
            key={index}
            onClick={() => handleClick(index)}
            className="aspect-square text-4xl sm:text-5xl font-bold bg-gray-800 rounded-xl hover:bg-gray-700 flex items-center justify-center transition-all"
          >
            {cell}
          </button>
        ))}
      </div>

      {/* Game Status */}
      <div className="mt-6 text-center">
        {winner ? (
          <p className="text-2xl text-green-400 font-semibold">
            🎉 {winner} wins!
          </p>
        ) : draw ? (
          <p className="text-xl text-yellow-400 font-semibold">Draw!</p>
        ) : (
          <p className="text-xl text-gray-300">
            Turn: {isXTurn ? "X" : "O"}
          </p>
        )}
      </div>

      {/* Restart */}
      <button
        onClick={resetGame}
        className="mt-6 bg-yellow-600 hover:bg-yellow-700 px-5 py-2 rounded-lg font-semibold"
      >
        Restart
      </button>
    </div>
  );
}
