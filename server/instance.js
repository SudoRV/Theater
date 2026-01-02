const express = require('express');
const expressWs = require('express-ws');
const fs = require('fs');
const path = require("path");
const multer = require("multer");
const cors = require("cors");
const https = require("https");

const sfu = require("./sfu");


const options = {
  key: fs.readFileSync(path.join(__dirname, 'localhost-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'localhost-cert.pem')),
};

const port = 8000;
const app = express();
const server = https.createServer(options, app);
const wsApp = expressWs(app, server)

app.use(express.urlencoded({ extended: true }));
app.use(express.json())
app.use(express.static(path.join(__dirname, "static")))
app.use(cors());


const videoUploadFolder = path.join(__dirname, "videos");
if (!fs.existsSync(videoUploadFolder)) {
  fs.mkdirSync(videoUploadFolder);
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, videoUploadFolder); // Save to /videos
  },
  filename: function (req, file, cb) {
    // Get original name without extension
    const nameWithoutExt = path.parse(file.originalname).name;
    
    // Get file extension
    const ext = path.extname(file.originalname);
    
    // Create new filename: originalName_theaterId_timestamp.extension
    const filename = `${nameWithoutExt}_${Date.now()}${ext}`;
    
    cb(null, filename);
  }
});

const uploadVideo = multer({ storage: storage });


// stream video 
app.get('/theater/video', (req, res) => {
  const filename = req.query.file;
  const videoPath = filename ? path.join(__dirname, `./videos/${filename}`) : path.join(__dirname, './videos/finding-her.mp4');

  const filesize = fs.statSync(videoPath).size;

  const [start, end] = req.headers.range.replace("bytes=", "").split("-").map((elt) => elt == "" || elt == undefined ? filesize - 1 : parseInt(elt, 10));

  const chunksize = (end - start) + 1;

  res.status(206).header(
    {
      'Content-Range': `bytes ${start}-${end}/${filesize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4'
    }
  );

  const file = fs.createReadStream(videoPath, { start, end })

  file.pipe(res)

})

app.post("/get-theater-data", (req, res)=>{
  const body = req.body;
  const theater_id = body.theater_id;

  fs.readdir("./videos", (err, files)=>{
    if(err){
      console.log("Error reading folder: ", err);
      res.json({success: false,message: "No file found for the theater"});
      return;
    }

    files.forEach(file => {
      const filePath = path.join("./videos", file);
      if(fs.statSync(filePath).isFile() && file.includes(theater_id)){
        const created_at = file.split(".")[0].split("_")[2];
        
        res.json({success: true, message: "file found for the theater", theater_id: theater_id, created_at: created_at, filename: file});
      }
    })
  })
})

app.post("/theater/upload",uploadVideo.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  const oldPath = req.file.path;
  const theaterId = req.body.theater_id;
  const nameWithoutExt = path.parse(req.file.originalname).name;
  const ext = path.extname(req.file.originalname);
  const newFilename = `${nameWithoutExt}_${theaterId}_${Date.now()}${ext}`;
  const newPath = path.join(videoUploadFolder, newFilename);

  fs.renameSync(oldPath, newPath);
  res.json({status: "success", message:`File uploaded successfully: ${newFilename}`, file: newFilename});
})





// socket and connection

const clients = new Set();
const members = new Set();
const readyMembers = new Set();

app.ws("/controls", (ws, req) => {
  const ip = req.connection.remoteAddress;
  console.log(ip)

  // Handle incoming messages
  ws.on("message", (message) => {
    let data;
    try {
      data = JSON.parse(message.toString());
    } catch (err) {
      console.error("Invalid JSON received:", message);
      return;
    }

    if (data.code == 23) {
      members.add(data.payload.user_details);

      // Add to clients with ws binding
      const email = data.payload.user_details.email;
      clients.add({ ws, email });

      // updating users for new user and updated members set
      broadcast({ command: "new user joined", code: 24, user: data.payload.user_details, payload:{"members": Array.from(members), "ready_members": Array.from(readyMembers)} })
    }else if(data.code == 26){
      if(data.command.includes("im ready")){
        readyMembers.add(data.user);
      }else{
        const readyMember = Array.from(readyMembers).find(r => r.email == data.user.email);
        readyMembers.delete(readyMember);
      }

      const command = { command: "user ready", code: 27, user: data.user, payload:{"ready_members": Array.from(readyMembers)}}
      broadcast(command);
    }
    else {
      handleMessage(ws, data)
    }
  });

  // Handle disconnection
  ws.on("close", () => handleDisconnect(ws, req));
  ws.on("error", (err) => console.error("WS error:", err));
})

// ----------- Helper Functions -----------

function handleMessage(ws, data) {
  switch (data?.send_type) {
    case "all":
      broadcast(data);
      break;
    case "all-except-me":
      broadcastExcept(ws, data);
      break;
    case "one":
      Array.from(clients).find(c=>c.email == data.user.email).ws.send(JSON.stringify(data));
      // Array.from(clients).filter(c=>c.email == data.user.email)[0].ws.send(data);
      break;
    default:
      console.warn("default :", data.send_type);
  }
}

function handleDisconnect(ws, req) {
  console.log("client discconnected");
  const client = Array.from(clients).find(c => c.ws == ws);
  clients.delete(client);

  const member = Array.from(members).find(m => m.email == client.email);
  const ready_member = Array.from(readyMembers).find(rm => rm.email == client.email);

  members.delete(member);
  readyMembers.delete(ready_member);

  // broadcast client leaved
  const command = {command: "user leaved", code: 25,user: member, payload:{"members": Array.from(members), ready_members: Array.from(readyMembers)}};
  broadcast(command);
}

function broadcast(data) {
  const strData = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.ws.readyState === client.ws.OPEN) client.ws.send(strData);
  });
}

function broadcastExcept(ws, data) {
  const strData = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.ws !== ws && client.ws.readyState === client.ws.OPEN){
      client.ws.send(strData);
    } 
  });
}



server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
