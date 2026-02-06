const express = require('express');
const expressWs = require('express-ws');
const fs = require('fs');
const path = require("path");
const multer = require("multer");
const cors = require("cors");
const http = require("http");

const { Server } = require("socket.io");
const { createWorker } = require("./voice_room/mediasoup.js");
const { socketHandler } = require("./voice_room/sfu");


const options = {
  key: fs.readFileSync(path.join(__dirname, 'localhost-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'localhost-cert.pem')),
};

const port = 8000;
const app = express();
const server = http.createServer(app);
const wsApp = expressWs(app, server)

// create voice room logic
const voiceRoomServer = https.createServer(options, app);
const io = new Server(voiceRoomServer, {
  path: "/voice_room",
  cors: {
    origin: "*",
  },
});

async function VoiceRoom() {
  await createWorker();
  socketHandler(io);
}

VoiceRoom();

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

app.post("/get-theater-data", (req, res) => {
  const body = req.body;
  const theater_id = body.theater_id;

  fs.readdir("./videos", (err, files) => {
    if (err) {
      console.log("Error reading folder: ", err);
      res.json({ success: false, message: "No file found for the theater" });
      return;
    }

    files.forEach(file => {
      const filePath = path.join("./videos", file);
      if (fs.statSync(filePath).isFile() && file.includes(theater_id)) {
        const fileData = path.basename(file).split("___");
        const creator_name = fileData[2];
        const creator_username = fileData[3];
        const creator_email = fileData[4];
        const theater_name = fileData[5];
        const source = fileData[6];
        const created_at = fileData[7].split(".")[0];

        res.json({ success: true, message: "file found for the theater", metadata: { theater_id: theater_id, created_at: created_at, filename: fileData[0] + path.extname(file), file, creator_name, creator_username, creator_email, theater_name, source } });
      }
    })
  })
})


app.post("/theater/upload", uploadVideo.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  const oldPath = req.file.path;
  const theaterId = req.body.theater_id;

  // delete old videos or expired video of same theater
  await deleteExpired("./videos", req.body.old_theater_id);

  const nameWithoutExt = path.parse(req.file.originalname).name;
  const ext = path.extname(req.file.originalname);

  const newFilename = `${nameWithoutExt}___${theaterId}___${req.body.creator_name}___${req.body.creator_username}___${req.body.creator_email}___${req.body.theater_name}___${req.body.source}___${Date.now()}${ext}`;
  const newPath = path.join(videoUploadFolder, newFilename);

  fs.renameSync(oldPath, newPath);
  res.json({ status: "success", message: `File uploaded successfully: ${req.file.originalname}`, file: newFilename });
})



// socket and connection
// theaterId => { clients, members, readyMembers }
const theaters = new Map();

function getTheater(theaterId) {
  if (!theaters.has(theaterId)) {
    theaters.set(theaterId, {
      clients: new Set(),
      members: new Set(),
      readyMembers: new Set(),
    });
  }
  return theaters.get(theaterId);
}


app.ws("/controls", (ws, req) => {
  const ip = req.connection.remoteAddress;
  const theaterId = req.query.theaterId; // ?theaterId=abc123

  if (!theaterId) {
    console.log("no theater id found")
    ws.close(1008, "theaterId required");
    return;
  }

  ws.theaterId = theaterId;
  console.log(ip, "connected to theater:", theaterId);

  const theater = getTheater(theaterId);

  ws.on("message", (message) => {
    let data;
    try {
      data = JSON.parse(message.toString());
    } catch {
      console.error("Invalid JSON received");
      return;
    }

    if (data.code === 23) {
      const user = data.payload.user_details;

      theater.members.add(user);
      theater.clients.add({ ws, email: user.email });

      broadcast(theaterId, {
        command: "new user joined",
        code: 24,
        user,
        payload: {
          members: Array.from(theater.members),
          ready_members: Array.from(theater.readyMembers),
        },
      });
    }

    else if (data.code === 26) {
      if (data.command.includes("im ready")) {
        theater.readyMembers.add(data.user);
      } else {
        const rm = [...theater.readyMembers].find(
          r => r.email === data.user.email
        );
        if (rm) theater.readyMembers.delete(rm);
      }

      broadcast(theaterId, {
        command: "user ready",
        code: 27,
        user: data.user,
        payload: {
          ready_members: Array.from(theater.readyMembers),
        },
      });
    }

    else {
      handleMessage(ws, data);
    }
  });

  ws.on("close", () => handleDisconnect(ws));
  ws.on("error", (err) => console.error("WS error:", err));
});


// ----------- Helper Functions -----------
function handleMessage(ws, data) {
  const theater = theaters.get(ws.theaterId);
  if (!theater) return;

  switch (data?.send_type) {
    case "all":
      broadcast(ws.theaterId, data);
      break;

    case "all-except-me":
      broadcastExcept(ws, ws.theaterId, data);
      break;

    case "one":
      const target = [...theater.clients]
        .find(c => c.email === data.user.email);
      if (target?.ws?.readyState === 1) {
        target.ws.send(JSON.stringify(data));
      }
      break;
  }
}


function handleDisconnect(ws) {
  const theaterId = ws.theaterId;
  const theater = theaters.get(theaterId);
  if (!theater) return;

  console.log("client disconnected from", theaterId);

  const client = [...theater.clients].find(c => c.ws === ws);
  if (!client) return;

  theater.clients.delete(client);

  const member = [...theater.members]
    .find(m => m.email === client.email);
  const ready = [...theater.readyMembers]
    .find(r => r.email === client.email);

  if (member) theater.members.delete(member);
  if (ready) theater.readyMembers.delete(ready);

  broadcast(theaterId, {
    command: "user leaved",
    code: 25,
    user: member,
    payload: {
      members: Array.from(theater.members),
      ready_members: Array.from(theater.readyMembers),
    },
  });

  // cleanup empty theater
  if (theater.clients.size === 0) {
    theaters.delete(theaterId);
  }
}


function broadcast(theaterId, data) {
  const theater = theaters.get(theaterId);
  if (!theater) return;

  const str = JSON.stringify(data);
  theater.clients.forEach(c => {
    if (c.ws.readyState === 1) c.ws.send(str);
  });
}

function broadcastExcept(ws, theaterId, data) {
  const theater = theaters.get(theaterId);
  if (!theater) return;

  const str = JSON.stringify(data);
  theater.clients.forEach(c => {
    if (c.ws !== ws && c.ws.readyState === 1) {
      c.ws.send(str);
    }
  });
}

async function deleteExpired(dirPath, theaterId) {
  try {
    const dirents = await fs.promises.readdir(dirPath, { withFileTypes: true });

    const now = Date.now();
    const SIX_HOURS = 6 * 60 * 60 * 1000;

    // Allowed video extensions
    const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm"];

    for (const dirent of dirents) {
      if (!dirent.isFile()) continue;

      const ext = path.extname(dirent.name).toLowerCase();
      if (!videoExtensions.includes(ext)) continue; // Only videos

      const fullPath = path.join(dirPath, dirent.name);
      const parts = dirent.name.split("___");

      if (parts.length < 2) continue;

      const fileTheaterId = parts[1];

      const stats = await fs.promises.stat(fullPath);
      const modifiedTime = stats.mtime.getTime();

      const isExpired = now - modifiedTime > SIX_HOURS;
      const isSameTheater = fileTheaterId === theaterId;

      if (isExpired || isSameTheater) {
        await fs.promises.unlink(fullPath);
        console.log(`Deleted video: ${dirent.name}`);
      }
    }
  } catch (err) {
    console.error("deleteExpired error:", err);
  }
}


server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

voiceRoomServer.listen(8001, () => {
  console.log(`voice room server is running on port ${port}`);
})
