export class SignalingClient {
  constructor(onMessage) {
    this._onMessage = onMessage;
    this._ws = null;
    this._ready = false;
    this._queue = [];
  }

  connect() {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const url = `${proto}://${location.host}/ws/signal`;
    this._ws = new WebSocket(url);

    this._ws.addEventListener("open", () => {
      this._ready = true;
      this._queue.forEach((m) => this._ws.send(JSON.stringify(m)));
      this._queue = [];
    });

    this._ws.addEventListener("message", (e) => {
      try {
        this._onMessage(JSON.parse(e.data));
      } catch {}
    });

    this._ws.addEventListener("close", () => {
      this._ready = false;
    });
  }

  send(msg) {
    if (this._ready) {
      this._ws.send(JSON.stringify(msg));
    } else {
      this._queue.push(msg);
    }
  }

  close() {
    this._ws?.close();
  }
}
