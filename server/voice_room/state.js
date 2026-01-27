const rooms = {};
module.exports = { rooms };

/*
rooms = {
  roomId: {
    router,
    peers: {
      userId: {
        socketId,
        name,
        email,
        rtpCapabilities,
        transports: {},
        producers: {},
        consumers: {}
      }
    }
  }
}
*/