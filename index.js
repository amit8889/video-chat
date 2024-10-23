const express = require("express");
const http = require("http");
const socketIO = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const EventEmitter = require("node:events");

const eventEmitter = new EventEmitter();

const usersQueue = [];
const map = new Map();

class UserPair {
  constructor(user1, user2) {
    this.users = [user1, user2];
    this.roomId = Math.random().toString(36).substring(2, 15);

    this.setupSocketEvents();
  }

  setupSocketEvents() {
    console.log("=====ececute");
    const [user1Socket, user2Socket] = this.users;

    // Notify both users that a call is starting
    user1Socket.emit("start-call", { userId: user2Socket.id });
    user2Socket.emit("start-call", { userId: user1Socket.id });

    user1Socket.on("offer", (data) => {
      user2Socket.emit("offer", data);
    });

    user2Socket.on("answer", (data) => {
      user1Socket.emit("answer", data);
    });

    user1Socket.on("ice-candidate", (candidate) => {
      user2Socket.emit("ice-candidate", candidate);
    });

    user2Socket.on("ice-candidate", (candidate) => {
      user1Socket.emit("ice-candidate", candidate);
    });

    // Cleanup when a user disconnects
    user1Socket.on("disconnect", () => this.cleanup(user1Socket));
    user2Socket.on("disconnect", () => this.cleanup(user2Socket));
    map.set(user1Socket,false)
    map.set(user2Socket,false)

  }

  cleanup(socket) {
    const otherUser = this.users.find((user) => user !== socket);
    console.log("=====other");
    if (otherUser) {
      console.log("=====oth1er");
      otherUser.emit("call-ended");
    }
    // Remove the user from the queue if still present
    const index = usersQueue.indexOf(socket);
    if (index !== -1) usersQueue.splice(index, 1);
  }
}
eventEmitter.on("execute", async () => {
  console.log("=======limit reach==", usersQueue.length);
  const user1 = usersQueue.shift(); // Get the first user
  const user2 = usersQueue.shift(); // Get the second user
  await new Promise((res) => setTimeout(res, 1000));
  const userPair = new UserPair(user1, user2);
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  usersQueue.push(socket);
  map.set(socket,true)
  if (usersQueue.length >= 2) {
    eventEmitter.emit("execute", "");
  }

  socket.on("disconnect", () => {
    console.log('User disconnected:', socket.id);
    if(map.get(socket)){
      const index = usersQueue.indexOf(socket);
    if (index !== -1){
      console.log('====ermoved===')
      usersQueue.splice(index, 1);
    }
    }
    
  });
});

app.use(express.static("public")); 
const PORT  = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log("Server running on port 3000");
});
