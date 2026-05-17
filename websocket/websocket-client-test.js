/**
 * 命令行 WebSocket 客户端测试
 * 用法：先启动 websocket-server.js，再执行 node websocket-client-test.js
 */

const WebSocket = globalThis.WebSocket;

if (!WebSocket) {
  console.error("需要 Node.js 18+（内置 WebSocket）");
  process.exit(1);
}

const url = process.argv[2] || "ws://127.0.0.1:8080";
const ws = new WebSocket(url);

ws.addEventListener("open", () => {
  console.log("[open]", url);
  ws.send(JSON.stringify({ type: "chat", text: "hello from node client" }));
  ws.send(JSON.stringify({ type: "ping", time: Date.now() }));
});

ws.addEventListener("message", (event) => {
  console.log("[message]", event.data);
});

ws.addEventListener("error", (err) => {
  console.error("[error]", err.message || err);
});

ws.addEventListener("close", (event) => {
  console.log("[close]", event.code, event.reason);
  process.exit(0);
});

setTimeout(() => {
  ws.close(1000, "test done");
}, 1500);
