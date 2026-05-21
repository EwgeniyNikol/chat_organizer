class API {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async sendMessage(text) {
    const response = await fetch(`${this.baseUrl}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    return response.json();
  }

  async getMessages(offset = 0, limit = 10) {
    const response = await fetch(`${this.baseUrl}/api/messages?offset=${offset}&limit=${limit}`);
    return response.json();
  }

  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${this.baseUrl}/api/upload`, {
      method: 'POST',
      body: formData
    });
    return response.json();
  }

  async deleteMessage(id) {
    const response = await fetch(`${this.baseUrl}/api/messages/${id}`, {
      method: 'DELETE'
    });
    return response.json();
  }

  async searchMessages(query) {
    const response = await fetch(`${this.baseUrl}/api/search?q=${encodeURIComponent(query)}`);
    return response.json();
  }

  getFileUrl(id) {
    return `${this.baseUrl}/api/files/${id}`;
  }
}

export default API;