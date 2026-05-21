import API from './api.js';
import WebSocketClient from './ws.js';
import Storage from './storage.js';
import UI from './ui.js';
import 'emoji-picker-element';
import CryptoJS from 'crypto-js';

class App {
  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    this.api = new API(window.location.origin);
    this.ws = new WebSocketClient(wsUrl);
    this.storage = new Storage();
    this.ui = new UI();
    this.offset = 0;
    this.loading = false;
    this.channel = new BroadcastChannel('chaos-organizer');
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.pinnedMessage = null;
    this.favorites = [];
  }

  async init() {
    this.ws.onMessage = (data) => {
      this.handleIncomingMessage(data);
    };

    this.ws.connect();

    this.channel.onmessage = (event) => {
      this.handleIncomingMessage(event.data);
    };

    this.ui.onDeleteMessage = (id) => {
      this.deleteMessage(id);
    };

    this.ui.onPinMessage = (message) => {
      this.pinMessage(message);
    };

    this.ui.onUnpin = () => {
      this.unpinMessage();
    };

    this.ui.onAddFav = (message) => {
      this.addFavorite(message);
    };

    this.ui.onRemoveFav = (id) => {
      this.removeFavorite(id);
    };

    this.ui.onDecrypt = (encrypted, password) => {
      return this.decryptMessage(encrypted, password);
    };

    this.ui.sendBtn.addEventListener('click', () => {
      this.sendMessage();
    });

    this.ui.messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendMessage();
      }
    });

    this.ui.uploadBtn.addEventListener('click', () => {
      this.ui.fileInput.click();
    });

    this.ui.fileInput.addEventListener('change', (e) => {
      this.handleFiles(e.target.files);
    });

    this.ui.searchInput.addEventListener('input', () => {
      this.handleSearch();
    });

    this.ui.searchClear.addEventListener('click', () => {
      this.ui.searchInput.value = '';
      this.ui.renderMessages(this.storage.messages);
    });

    this.ui.recordBtn.addEventListener('click', () => {
      this.toggleRecording();
    });

    this.ui.geoBtn.addEventListener('click', () => {
      this.sendGeo();
    });

    this.ui.favBtn.addEventListener('click', () => {
      this.ui.showFavorites(this.favorites);
    });

    this.ui.modalClose.addEventListener('click', () => {
      this.ui.favModal.style.display = 'none';
    });

    this.ui.favModal.addEventListener('click', (e) => {
      if (e.target === this.ui.favModal) {
        this.ui.favModal.style.display = 'none';
      }
    });

    this.ui.exportBtn.addEventListener('click', () => {
      this.exportHistory();
    });

    this.ui.importBtn.addEventListener('click', () => {
      this.ui.importFile.click();
    });

    this.ui.importFile.addEventListener('change', (e) => {
      this.importHistory(e.target.files[0]);
    });

    this.ui.zipBtn.addEventListener('click', () => {
      this.downloadAllFiles();
    });

    document.querySelectorAll('.commands-list code').forEach(code => {
      code.addEventListener('click', () => {
        this.ui.messageInput.value = code.textContent;
        this.ui.messageInput.focus();
      });
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        this.filterMessages(filter);
      });
    });

    this.setupEmojiPicker();
    this.setupDragAndDrop();
    this.setupLazyLoad();

    await this.loadMessages();
  }

  encryptMessage(text, password) {
    return CryptoJS.AES.encrypt(text, password).toString();
  }

  decryptMessage(encrypted, password) {
    try {
      const bytes = CryptoJS.AES.decrypt(encrypted, password);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      return null;
    }
  }

  exportHistory() {
    const data = JSON.stringify(this.storage.messages, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_history_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importHistory(file) {
    try {
      const text = await file.text();
      const messages = JSON.parse(text);
      if (Array.isArray(messages)) {
        this.storage.messages = messages;
        this.ui.renderMessages(messages);
        this.offset = messages.length;
      }
    } catch (err) {
      alert('Ошибка импорта файла');
    }
  }

  async downloadAllFiles() {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    
    const fileMessages = this.storage.messages.filter(m => m.file);
    
    if (fileMessages.length === 0) {
      alert('Нет файлов для архивации');
      return;
    }
    
    for (const msg of fileMessages) {
      try {
        const response = await fetch(msg.file.url);
        const blob = await response.blob();
        zip.file(msg.file.name, blob);
      } catch (e) {}
    }
    
    const content = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = 'files.zip';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  filterMessages(filter) {
    if (filter === 'all') {
      this.ui.renderMessages(this.storage.messages);
      return;
    }
    let filtered;
    if (filter === 'file') {
      filtered = this.storage.messages.filter(m => m.file && !m.file.type.startsWith('image/') && !m.file.type.startsWith('video/') && !m.file.type.startsWith('audio/'));
    } else {
      filtered = this.storage.messages.filter(m => m.file && m.file.type.startsWith(filter + '/'));
    }
    this.ui.renderMessages(filtered);
  }

  addFavorite(message) {
    if (!this.favorites.find(m => m.id === message.id)) {
      this.favorites.push(message);
    }
  }

  removeFavorite(id) {
    this.favorites = this.favorites.filter(m => m.id !== id);
    this.ui.showFavorites(this.favorites);
  }

  pinMessage(message) {
    this.pinnedMessage = message;
    this.ui.showPinned(message);
    this.channel.postMessage({ type: 'pin', message });
  }

  unpinMessage() {
    this.pinnedMessage = null;
    this.ui.hidePinned();
    this.channel.postMessage({ type: 'unpin' });
  }

  showNotification(text) {
    if (Notification.permission === 'granted') {
      new Notification('Чат Бот', { body: text });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('Чат Бот', { body: text });
        }
      });
    }
  }

  async sendGeo() {
    if (!navigator.geolocation) {
      alert('Геолокация не поддерживается');
      return;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const message = {
        id: Date.now(),
        sender: 'user',
        timestamp: new Date().toISOString(),
        geo: {
          lat: position.coords.latitude,
          lon: position.coords.longitude
        }
      };

      const response = await fetch(`${this.api.baseUrl}/api/geo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
      const saved = await response.json();

      this.ws.send(saved);
      this.channel.postMessage(saved);
    } catch (err) {
      alert('Не удалось получить геолокацию');
    }
  }

  async toggleRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
      this.ui.recordBtn.classList.remove('recording');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const file = new File([audioBlob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
        this.handleFiles([file]);
        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.start();
      this.ui.recordBtn.classList.add('recording');
    } catch (err) {
      alert('Не удалось получить доступ к микрофону');
    }
  }

  setupEmojiPicker() {
    const picker = document.createElement('emoji-picker');
    picker.className = 'emoji-picker';
    document.querySelector('.chat-container').append(picker);

    this.ui.emojiBtn.addEventListener('click', () => {
      picker.classList.toggle('show');
    });

    picker.addEventListener('emoji-click', (event) => {
      this.ui.messageInput.value += event.detail.unicode;
      this.ui.messageInput.focus();
      picker.classList.remove('show');
    });

    document.addEventListener('click', (e) => {
      if (!picker.contains(e.target) && e.target !== this.ui.emojiBtn) {
        picker.classList.remove('show');
      }
    });
  }

  handleIncomingMessage(data) {
    if (data.type === 'delete') {
      this.storage.removeMessage(data.id);
      this.ui.removeMessage(data.id);
      return;
    }
    if (data.type === 'pin') {
      this.pinnedMessage = data.message;
      this.ui.showPinned(data.message);
      return;
    }
    if (data.type === 'unpin') {
      this.pinnedMessage = null;
      this.ui.hidePinned();
      return;
    }
    const exists = this.storage.messages.find(m => m.id === data.id);
    if (!exists) {
      this.storage.addMessage(data);
      this.ui.renderMessage(data);
      
      if (data.text && data.text.startsWith('🔔 Напоминание:')) {
        this.showNotification(data.text);
      }
    }
  }

  setupDragAndDrop() {
    const messagesContainer = this.ui.messagesContainer;

    messagesContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      messagesContainer.classList.add('drag-over');
    });

    messagesContainer.addEventListener('dragleave', () => {
      messagesContainer.classList.remove('drag-over');
    });

    messagesContainer.addEventListener('drop', (e) => {
      e.preventDefault();
      messagesContainer.classList.remove('drag-over');
      this.handleFiles(e.dataTransfer.files);
    });
  }

  setupLazyLoad() {
    this.ui.messagesContainer.addEventListener('scroll', () => {
      if (this.ui.messagesContainer.scrollTop === 0 && !this.loading) {
        this.loadMessages();
      }
    });
  }

  async loadMessages() {
    this.loading = true;
    const messages = await this.api.getMessages(this.offset, 10);
    if (messages.length > 0) {
      this.storage.prependMessages(messages);
      this.ui.renderMessages(messages, true);
      this.offset += messages.length;
    }
    this.loading = false;
  }

  async handleSearch() {
    const query = this.ui.getSearchText();
    if (!query) {
      this.ui.renderMessages(this.storage.messages);
      return;
    }
    const results = await this.api.searchMessages(query);
    this.ui.renderMessages(results);
  }

  async handleFiles(files) {
    for (const file of files) {
      const message = await this.api.uploadFile(file);
      this.ws.send(message);
      this.channel.postMessage(message);
    }
  }

  async sendMessage() {
    const text = this.ui.getInputText();
    if (!text) return;

    let messageText = text;
    if (text.startsWith('@encrypt:')) {
      const password = prompt('Введите пароль для шифрования:');
      if (!password) return;
      const rawText = text.replace('@encrypt:', '').trim();
      messageText = '🔒 ' + this.encryptMessage(rawText, password);
    }

    const message = await this.api.sendMessage(messageText);
    this.ui.clearInput();
    this.ws.send(message);
    this.channel.postMessage(message);
  }

  async deleteMessage(id) {
    await this.api.deleteMessage(id);
    this.storage.removeMessage(id);
    this.ui.removeMessage(id);
    this.channel.postMessage({ type: 'delete', id });
  }
}

const app = new App();
app.init();