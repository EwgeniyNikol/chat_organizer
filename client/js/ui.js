class UI {
  constructor() {
    this.messagesContainer = document.getElementById('messages');
    this.pinnedContainer = document.getElementById('pinned');
    this.messageInput = document.querySelector('.message-input');
    this.searchInput = document.querySelector('.search-input');
    this.searchClear = document.querySelector('.search-clear');
    this.sendBtn = document.getElementById('sendBtn');
    this.geoBtn = document.getElementById('geoBtn');
    this.recordBtn = document.getElementById('recordBtn');
    this.fileInput = document.getElementById('fileInput');
    this.uploadBtn = document.querySelector('.upload-btn');
    this.emojiBtn = document.querySelector('.emoji-btn');
    this.stickerBtn = document.querySelector('.sticker-btn');
    this.favBtn = document.getElementById('favBtn');
    this.favModal = document.getElementById('favModal');
    this.favList = document.getElementById('favList');
    this.modalClose = document.querySelector('.modal-close');
    this.exportBtn = document.getElementById('exportBtn');
    this.importBtn = document.getElementById('importBtn');
    this.importFile = document.getElementById('importFile');
    this.zipBtn = document.getElementById('zipBtn');
  }

  renderMessage(message) {
    const div = this.buildMessageElement(message);
    this.messagesContainer.append(div);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  renderMessages(messages, prepend = false) {
    if (prepend) {
      const currentScroll = this.messagesContainer.scrollHeight;
      messages.reverse().forEach(msg => {
        const div = this.buildMessageElement(msg);
        this.messagesContainer.prepend(div);
      });
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight - currentScroll;
    } else {
      this.messagesContainer.innerHTML = '';
      messages.forEach(msg => {
        const div = this.buildMessageElement(msg);
        this.messagesContainer.append(div);
      });
    }
  }

  showPinned(message) {
    this.pinnedContainer.style.display = 'block';
    this.pinnedContainer.innerHTML = '';
    
    const text = message.text || (message.file ? `📎 ${message.file.name}` : 'Сообщение');
    const span = document.createElement('span');
    span.textContent = `📌 ${text}`;
    
    const unpinBtn = document.createElement('span');
    unpinBtn.className = 'close-btn';
    unpinBtn.textContent = '✕';
    unpinBtn.addEventListener('click', () => {
      if (this.onUnpin) {
        this.onUnpin();
      }
    });
    
    this.pinnedContainer.append(span, unpinBtn);
  }

  hidePinned() {
    this.pinnedContainer.style.display = 'none';
    this.pinnedContainer.innerHTML = '';
  }

  showFavorites(favorites) {
    this.favList.innerHTML = '';
    if (favorites.length === 0) {
      this.favList.textContent = 'Нет избранных сообщений';
      return;
    }
    favorites.forEach(msg => {
      const div = document.createElement('div');
      div.className = 'fav-item';
      const text = msg.text || (msg.file ? `📎 ${msg.file.name}` : 'Сообщение');
      div.textContent = text;
      
      const removeBtn = document.createElement('span');
      removeBtn.className = 'remove-fav';
      removeBtn.textContent = '✕';
      removeBtn.addEventListener('click', () => {
        if (this.onRemoveFav) {
          this.onRemoveFav(msg.id);
        }
      });
      div.append(removeBtn);
      this.favList.append(div);
    });
    this.favModal.style.display = 'flex';
  }

  buildMessageElement(message) {
    const div = document.createElement('div');
    div.className = 'message';
    div.dataset.id = message.id;

    if (message.sender !== 'Федя') {
      div.classList.add('mine');
    }
    
    const sender = document.createElement('div');
    sender.className = 'message-sender';
    sender.textContent = message.sender === 'Федя' ? 'Федя' : 'Вы';
    div.append(sender);
    
    const starBtn = document.createElement('span');
    starBtn.className = 'star-btn';
    starBtn.textContent = '⭐';
    starBtn.title = 'В избранное';
    starBtn.addEventListener('click', () => {
      if (this.onAddFav) {
        this.onAddFav(message);
      }
    });
    div.append(starBtn);
    
    const pinBtn = document.createElement('span');
    pinBtn.className = 'pin-btn';
    pinBtn.textContent = '📌';
    pinBtn.title = 'Закрепить';
    pinBtn.addEventListener('click', () => {
      if (this.onPinMessage) {
        this.onPinMessage(message);
      }
    });
    div.append(pinBtn);
    
    const closeBtn = document.createElement('span');
    closeBtn.className = 'close-btn';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => {
      if (this.onDeleteMessage) {
        this.onDeleteMessage(message.id);
      }
    });
    div.append(closeBtn);
    
    if (message.text) {
      if (message.text.startsWith('🔒')) {
        const encryptedText = message.text.replace('🔒 ', '');
        const decryptBtn = document.createElement('button');
        decryptBtn.textContent = '🔓 Расшифровать';
        decryptBtn.style.cssText = 'margin-top: 5px; padding: 4px 8px; font-size: 12px; cursor: pointer; background: #075e54; color: white; border: none; border-radius: 4px;';
        decryptBtn.addEventListener('click', () => {
          const password = prompt('Введите пароль для расшифровки:');
          if (password && this.onDecrypt) {
            const decrypted = this.onDecrypt(encryptedText, password);
            if (decrypted) {
              const textSpan = decryptBtn.parentElement.querySelector('.encrypted-text') || document.createElement('span');
              textSpan.className = 'encrypted-text';
              textSpan.textContent = decrypted;
              decryptBtn.replaceWith(textSpan);
            } else {
              alert('Неверный пароль');
            }
          }
        });
        div.append(decryptBtn);
      } else if (message.text.startsWith('sticker:')) {
        const sticker = document.createElement('span');
        sticker.className = 'sticker-img';
        sticker.textContent = message.text.replace('sticker:', '');
        div.append(sticker);
      } else if (message.text.includes('```')) {
        const codeMatch = message.text.match(/```[\s\S]*?```/g);
        if (codeMatch) {
          let html = this.linkify(message.text);
          codeMatch.forEach(block => {
            const code = block.replace(/```/g, '');
            html = html.replace(block, `<pre><code>${this.escapeHtml(code)}</code></pre>`);
          });
          const textSpan = document.createElement('span');
          textSpan.innerHTML = html;
          div.append(textSpan);
        } else {
          const textSpan = document.createElement('span');
          textSpan.innerHTML = this.linkify(message.text);
          div.append(textSpan);
        }
      } else {
        const textSpan = document.createElement('span');
        textSpan.innerHTML = this.linkify(message.text);
        div.append(textSpan);
      }
    }
    
    if (message.geo) {
      const geoLink = document.createElement('a');
      geoLink.href = `https://www.openstreetmap.org/?mlat=${message.geo.lat}&mlon=${message.geo.lon}`;
      geoLink.target = '_blank';
      geoLink.textContent = `📍 ${message.geo.lat}, ${message.geo.lon}`;
      div.append(geoLink);
    }
    
    if (message.file) {
      const file = message.file;
      const downloadBtn = document.createElement('span');
      downloadBtn.className = 'download-btn';
      downloadBtn.textContent = '⬇';
      downloadBtn.title = 'Скачать';
      downloadBtn.addEventListener('click', () => {
        const a = document.createElement('a');
        a.href = file.url;
        a.download = file.name;
        a.click();
      });
      div.append(downloadBtn);
      
      if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = file.url;
        div.append(img);
      } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.src = file.url;
        video.controls = true;
        div.append(video);
      } else if (file.type.startsWith('audio/')) {
        const audio = document.createElement('audio');
        audio.src = file.url;
        audio.controls = true;
        div.append(audio);
      } else {
        const link = document.createElement('a');
        link.href = file.url;
        link.className = 'file-link';
        link.textContent = `📎 ${file.name}`;
        link.download = file.name;
        div.append(link);
      }
    }
    
    return div;
  }

  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  linkify(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
  }

  removeMessage(id) {
    const message = this.messagesContainer.querySelector(`[data-id="${id}"]`);
    if (message) {
      message.remove();
    }
  }

  clearInput() {
    this.messageInput.value = '';
  }

  getInputText() {
    return this.messageInput.value.trim();
  }

  getSearchText() {
    return this.searchInput.value.trim();
  }
}

export default UI;