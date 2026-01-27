const mediasoup = require("mediasoup");

let worker;

async function createWorker() {
  worker = await mediasoup.createWorker({
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
  });

  worker.on("died", () => {
    console.error("❌ mediasoup worker died");
    process.exit(1);
  });

  console.log("✅ mediasoup worker created");
  return worker;
}

function getWorker() {
  return worker;
}

module.exports = {
  createWorker,
  getWorker,
};
