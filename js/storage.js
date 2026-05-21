class Storage {
  constructor() {
    this.messages = [];
  }

  addMessage(message) {
    this.messages.push(message);
  }

  prependMessages(messages) {
    this.messages = [...messages, ...this.messages];
  }

  removeMessage(id) {
    this.messages = this.messages.filter(m => m.id !== id);
  }

  getMessages(offset = 0, limit = 10) {
    const start = Math.max(0, this.messages.length - offset - limit);
    const end = this.messages.length - offset;
    return this.messages.slice(start, end);
  }
}

export default Storage;