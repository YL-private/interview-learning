/**
 * WebSocket 测试服务端（零依赖，仅需 Node.js）
 *
 * 启动：node websocket-server.js
 * 默认地址：ws://127.0.0.1:8080
 */

const http = require("http");
const crypto = require("crypto");

const PORT = 8080;
const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

function acceptKey(key) {
  return crypto.createHash("sha1").update(key + GUID).digest("base64");
}

function parseFrame(buffer) {
  const opcode = buffer[0] & 0x0f;
  let payloadLen = buffer[1] & 0x7f;
  let offset = 2;

  if (payloadLen === 126) {
    payloadLen = buffer.readUInt16BE(2);
    offset = 4;
  } else if (payloadLen === 127) {
    payloadLen = Number(buffer.readBigUInt64BE(2));
    offset = 10;
  }

  const masked = (buffer[1] & 0x80) !== 0;
  let mask;
  if (masked) {
    mask = buffer.subarray(offset, offset + 4);
    offset += 4;
  }

  let payload = buffer.subarray(offset, offset + payloadLen);
  if (masked) {
    payload = Buffer.from(payload.map((byte, i) => byte ^ mask[i % 4]));
  }

  return { opcode, payload: payload.toString("utf8") };
}

function createTextFrame(text) {
  const payload = Buffer.from(text, "utf8");
  const len = payload.length;

  if (len < 126) {
    const header = Buffer.alloc(2);
    header[0] = 0x81;
    header[1] = len;
    return Buffer.concat([header, payload]);
  }

  if (len < 65536) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
    return Buffer.concat([header, payload]);
  }

  const header = Buffer.alloc(10);
  header[0] = 0x81;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(len), 2);
  return Buffer.concat([header, payload]);
}

function createPongFrame() {
  return Buffer.from([0x8a, 0x00]);
}

function getFrameLength(buffer) {
  if (buffer.length < 2) return null;

  let payloadLen = buffer[1] & 0x7f;
  let headerLen = 2;

  if (payloadLen === 126) {
    if (buffer.length < 4) return null;
    payloadLen = buffer.readUInt16BE(2);
    headerLen = 4;
  } else if (payloadLen === 127) {
    if (buffer.length < 10) return null;
    payloadLen = Number(buffer.readBigUInt64BE(2));
    headerLen = 10;
  }

  const masked = (buffer[1] & 0x80) !== 0;
  if (masked) headerLen += 4;

  return headerLen + payloadLen;
}

const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("WebSocket test server is running. Open websocket-demo.html in browser.");
});

httpServer.on("upgrade", (req, socket) => {
  const key = req.headers["sec-websocket-key"];
  if (!key) {
    socket.destroy();
    return;
  }

  const accept = acceptKey(key);
  socket.write(
    [
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${accept}`,
      "",
      "",
    ].join("\r\n")
  );

  socket.write(
    createTextFrame(
      JSON.stringify({
        type: "welcome",
        message: "已连接本地 WebSocket 测试服务",
        time: Date.now(),
      })
    )
  );

  let buffer = Buffer.alloc(0);

  socket.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (true) {
      const frameLen = getFrameLength(buffer);
      if (!frameLen || buffer.length < frameLen) break;

      const frame = buffer.subarray(0, frameLen);
      buffer = buffer.subarray(frameLen);
      const { opcode, payload } = parseFrame(frame);

      if (opcode === 0x8) {
        socket.end();
        return;
      }

      if (opcode === 0x9) {
        socket.write(createPongFrame());
        continue;
      }

      if (opcode !== 0x1) continue;

      let data;
      try {
        data = JSON.parse(payload);
      } catch {
        data = { raw: payload };
      }

      if (data.type === "ping") {
        socket.write(
          createTextFrame(
            JSON.stringify({ type: "pong", time: Date.now(), clientTime: data.time })
          )
        );
        continue;
      }

      socket.write(
        createTextFrame(
          JSON.stringify({
            type: "echo",
            time: Date.now(),
            received: data,
          })
        )
      );
    }
  });

  socket.on("error", () => {});
});

httpServer.listen(PORT, "127.0.0.1", () => {
  console.log(`WebSocket server: ws://127.0.0.1:${PORT}`);
  console.log("Open websocket-demo.html to test.");
});
