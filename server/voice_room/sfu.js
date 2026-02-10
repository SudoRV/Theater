// Helper to start stats logging
function startStatsLogger(obj, label) {
  if (obj._statsInterval) clearInterval(obj._statsInterval);
  obj._statsInterval = setInterval(async () => {
    if (obj.closed) return;
    try {
      const stats = await obj.getStats();
      stats.forEach(report => {
        if (report.type === "inbound-rtp") {
          console.log(`${label} RECEIVED { packetCount: ${report.packetCount}, byteCount: ${report.byteCount}, bitrate: ${report.bitrate}, score: ${report.score} }`);
        }
        if (report.type === "outbound-rtp") {
          console.log(`${label} SENT { packetCount: ${report.packetCount}, byteCount: ${report.byteCount}, bitrate: ${report.bitrate}, score: ${report.score} }`);
        }
      });
    } catch (err) {
      // ignore errors after close
    }
  }, 2000);
}

const { rooms } = require("./state.js");
const { mediaCodecs, webRtcTransportOptions } = require("./config.js");
const { getWorker } = require("./mediasoup.js");

function socketHandler(io) {
  io.on("connection", (socket) => {
    console.log("[1] 🟢 Client connected:", socket.id);

    /* =======================
       JOIN ROOM
    ======================= */
    socket.on("joinRoom", async ({ roomId, userId, name, email }) => {
      console.log("[2] joinRoom:", userId, name, roomId);

      let room = rooms[roomId];

      if (!room) {
        const worker = getWorker();
        const router = await worker.createRouter({ mediaCodecs });

        room = rooms[roomId] = {
          router,
          peers: {},
        };

        console.log("[3] 📦 Room created:", roomId);
      }

      room.peers[userId] = {
        socketId: socket.id,
        name,
        email,
        transports: {},
        producers: {},
        consumers: {},
      };

      socket.join(roomId);

      // console.log("[4] 📡 Sending RTP capabilities");
      socket.emit("routerRtpCapabilities", room.router.rtpCapabilities);
    });


    socket.on("device-loaded", async ({ userId, roomId }) => {
      /* ==========================
         SEND EXISTING PRODUCERS
      =========================== */
      let room = rooms[roomId];
      const existingProducers = [];

      for (const [otherUserId, peer] of Object.entries(room.peers)) {
        if (otherUserId === userId) continue;

        for (const producer of Object.values(peer.producers)) {
          existingProducers.push({
            producerId: producer.id,
            userId: otherUserId,
            name: peer.name,
          });
        }
      }

      if (existingProducers.length > 0) {
        // console.log(
        //   `[5] 📤 Sending ${existingProducers.length} existing producers`
        // );

        socket.emit("existingProducers", existingProducers);
      }
    })


    /* =======================
       CREATE TRANSPORT
    ======================= */
    socket.on("createTransport", async ({ roomId, userId, direction }) => {
      const room = rooms[roomId];
      const peer = room?.peers[userId];
      if (!peer) return;

      const transport = await room.router.createWebRtcTransport(
        webRtcTransportOptions
      );

      transport.appData = { direction, userId };

      peer.transports[transport.id] = transport;

      // console.log(direction)
      socket.emit("transportCreated", {
        direction,
        transportOptions: {
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        },
      });
    });

    /* =======================
       CONNECT TRANSPORT
    ======================= */
    socket.on("connectTransport", ({ transportId, dtlsParameters }) => {
      for (const room of Object.values(rooms)) {
        for (const peer of Object.values(room.peers)) {
          const transport = peer.transports[transportId];
          if (transport) {
            transport.connect({ dtlsParameters });
            return;
          }
        }
      }
    });

    /* =======================
       PRODUCE (MIC)
    ======================= */
    socket.on("produce", async ({ transportId, kind, rtpParameters }, cb) => {
      for (const [roomId, room] of Object.entries(rooms)) {
        for (const [userId, peer] of Object.entries(room.peers)) {
          if (peer.socketId !== socket.id) continue;

          const transport = peer.transports[transportId];
          if (!transport) continue;

          const producer = await transport.produce({
            kind,
            rtpParameters,
          });

          peer.producers[producer.id] = producer;

          socket.to(roomId).emit("newProducer", {
            producerId: producer.id,
            userId,
            name: peer.name,
          });

          cb({ producerId: producer.id });
          return;
        }
      }
    });


    /* =======================
       CONSUME
    ======================= */
    socket.on("consume", async ({ roomId, userId, producerUserId, producerId, transportId, rtpCapabilities }, cb) => {
      const room = rooms[roomId];
      const peer = room.peers[userId];

      const recvTransport = peer.transports[transportId];

      if (!recvTransport) {
        console.error("❌ recv transport not found:", transportId);
        return;
      }

      if (!room.router.canConsume({ producerId, rtpCapabilities })) {
        console.error("❌ cannot consume producer:", producerId);
        return;
      }

      const consumer = await recvTransport.consume({
        producerId,
        rtpCapabilities,
        paused: true,
      });

      peer.consumers[consumer.id] = consumer;

      // Start consumer stats logger
      // startStatsLogger(consumer, '📡 CONSUMER RTP (OUTBOUND)');

      cb({
        id: consumer.id,
        producerId,
        userId: producerUserId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      });
    });


    /* =======================
       RESUME CONSUMER
    ======================= */
    socket.on("resumeConsumer", async ({ roomId, consumerId }) => {
      const room = rooms[roomId];
      if (!room) return;

      const peer = Object.values(room.peers).find(p => p.socketId === socket.id);
      if (!peer) return;

      const consumer = peer.consumers[consumerId];
      if (!consumer) {
        console.log("❌ Consumer not found:", consumerId);
        return;
      }
      await consumer.resume();
    });


    /* =======================
       DISCONNECT
    ======================= */
    socket.on("disconnect", () => {
      console.log("[11] 🔴 Socket disconnected:", socket.id);

      for (const [roomId, room] of Object.entries(rooms)) {
        for (const [userId, peer] of Object.entries(room.peers)) {
          if (peer.socketId === socket.id) {
            Object.values(peer.producers).forEach((p) => {
              if (p._statsInterval) clearInterval(p._statsInterval);
              p.close();
            });
            Object.values(peer.consumers).forEach((c) => {
              if (c._statsInterval) clearInterval(c._statsInterval);
              c.close();
            });
            Object.values(peer.transports).forEach((t) => t.close());

            delete room.peers[userId];

            socket.to(roomId).emit("userLeft", { userId });

            if (Object.keys(room.peers).length === 0) {
              room.router.close();
              delete rooms[roomId];
              console.log("🧹 Room closed:", roomId);
            }
            return;
          }
        }
      }
    });
  });
}


module.exports = {
  socketHandler
};