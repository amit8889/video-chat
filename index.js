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
    user1Socket.on("disconnect", ()=>{ 
      //map.delete(user1Socket) 
      this.cleanup(user1Socket)
    });
    user2Socket.on("disconnect", ()=>{
     // map.delete(user2Socket) 
      this.cleanup(user2Socket)
    });
    //map.set(user1Socket,false)
    //map.set(user2Socket,false)

  }

  cleanup(socket) {
    const otherUser = this.users.find((user) => user !== socket);
    if (otherUser) {
      otherUser.emit("call-ended");
    }
    const index = usersQueue.indexOf(socket);
    if (index !== -1) usersQueue.splice(index, 1);
  }
}
eventEmitter.on("execute", async () => {
  console.log("=======limit reach==", usersQueue.length);
  const user1 = usersQueue.shift();
  const user2 = usersQueue.shift();
  const userPair = new UserPair(user1, user2);
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
 
  //map.set(socket,true)
  socket.on("join-channel",()=>{
    usersQueue.push(socket); 
    if (usersQueue.length >= 2) {
      eventEmitter.emit("execute", "");
    }
  })

  socket.on("disconnect", () => {
    console.log('User disconnected:', socket.id);
   // if(map.get(socket)){
     //map.delete(socket)
    const index = usersQueue.indexOf(socket);
    if (index !== -1){
      console.log('====ermoved===')
      usersQueue.splice(index, 1);
    }
  //  }
    
  });
});

app.use(express.static("public")); 
const PORT  = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log("Server running on port 3000");
});
