class WebSocketClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.onMessage = null;
  }

  connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (this.onMessage) {
        this.onMessage(data);
      }
    };
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}

export default WebSocketClient;