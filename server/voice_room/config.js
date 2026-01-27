const mediaCodecs = [
  {
    kind: "audio",
    mimeType: "audio/opus",
    clockRate: 48000,
    channels: 2
  }
];

const webRtcTransportOptions = {
  listenIps: [
    {
      ip: "127.0.0.1",
      announcedIp: null // set public IP if deployed
    }
  ],
  enableUdp: true,
  enableTcp: true,
  preferUdp: true
};

module.exports = {
  mediaCodecs, webRtcTransportOptions
}