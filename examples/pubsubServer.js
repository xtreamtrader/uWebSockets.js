/* Simplified stock exchange made with uWebSockets.js pub/sub */
const uWS = require("../dist/uws.js");
const PORT = 9001;
const { StringDecoder } = require("string_decoder");
const decoder = new StringDecoder("utf8");

/* We measure transactions per second server side */
let transactionsPerSecond = 0;

/* Share valuations */
let shares = {
  NFLX: 280.48,
  TSLA: 244.74,
  AMZN: 1720.26,
  GOOG: 1208.67,
  NVDA: 183.03,
};

uWS
  .App()
  .ws("/*", {
    /* Options */
    compression: uWS.SHARED_COMPRESSOR,
    maxPayloadLength: 16 * 1024 * 1024,
    maxBackpressure: 1024,
    idleTimeout: 16,
    sendPingsAutomatically: true,

    /* Todo, Setting 1: merge messages in one, or keep them as separate WebSocket frames - mergePublishedMessages */
    /* Todo, Setting 4: send to all including us, or not? That's not a setting really just use ws.publish or global uWS.publish */

    /* Handlers */
    open: (ws) => {
      /* Let this client listen to all sensor topics */
      ws.subscribe("shares/#");
    },

    message: (ws, message, isBinary) => {
      /* Parse JSON and perform the action */
      let json = JSON.parse(decoder.write(Buffer.from(message)));
      switch (json.action) {
        case "sub": {
          /* Subscribe to the share's value stream */
          ws.subscribe("shares/" + json.share + "/value");
          break;
        }
        case "buy": {
          transactionsPerSecond++;

          /* For simplicity, shares increase 0.1% with every buy */
          shares[json.share] *= 1.001;

          /* Value of share has changed, update subscribers */
          ws.publish(
            "shares/" + json.share + "/value",
            JSON.stringify({ [json.share]: shares[json.share] })
          );
          break;
        }
        case "sell": {
          transactionsPerSecond++;

          /* For simplicity, shares decrease 0.1% with every sale */
          shares[json.share] *= 0.999;

          ws.publish(
            "shares/" + json.share + "/value",
            JSON.stringify({ [json.share]: shares[json.share] })
          );
          break;
        }
      }
    },
  })
  .listen(PORT, (listenSocket) => {
    if (listenSocket) {
      console.log("Listening to port 9001");
    }
  });

/* Print transactions per second */
let last = Date.now();
setInterval(() => {
  transactionsPerSecond /= (Date.now() - last) * 0.001;
  console.log(
    "Transactions per second: " +
      transactionsPerSecond +
      ", here are the curret shares:"
  );
  console.log(shares);
  console.log("");
  transactionsPerSecond = 0;
  last = Date.now();
}, 1000);
