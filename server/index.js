const Koa = require('koa');
const { koaBody } = require('koa-body');
const koaStatic = require('koa-static');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');
const fs = require('fs');

require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

const app = new Koa();
const server = http.createServer(app.callback());
const wss = new WebSocketServer({ server });

const messages = [];
const clients = new Set();
const reminders = [];
const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`);
});

app.use(koaBody({ multipart: true }));

app.use(async (ctx, next) => {
  ctx.set('Access-Control-Allow-Origin', '*');
  ctx.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  ctx.set('Access-Control-Allow-Headers', 'Content-Type');
  if (ctx.method === 'OPTIONS') {
    ctx.status = 204;
    return;
  }
  await next();
});

app.use(async (ctx, next) => {
  if (ctx.path.startsWith('/uploads/')) {
    const fileName = ctx.path.replace('/uploads/', '');
    const filePath = path.join(uploadsDir, fileName);
    if (fs.existsSync(filePath)) {
      ctx.type = path.extname(filePath);
      ctx.body = fs.createReadStream(filePath);
      return;
    }
  }
  await next();
});

app.use(koaStatic(path.join(__dirname, '../client')));

app.use(async (ctx) => {
  if (ctx.method === 'POST' && ctx.path === '/api/messages') {
    const { text } = ctx.request.body;
    const message = {
      id: Date.now(),
      text,
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    messages.push(message);
    broadcast(message);

    if (text && text.startsWith('@chaos:')) {
      const command = text.replace('@chaos:', '').trim().toLowerCase();
      const botResponse = getBotResponse(command);
      const botMessage = {
        id: Date.now() + 1,
        text: botResponse,
        sender: 'Федя',
        timestamp: new Date().toISOString()
      };
      messages.push(botMessage);
      broadcast(botMessage);
    } else if (text && text.startsWith('@schedule:')) {
      const scheduleText = text.replace('@schedule:', '').trim();
      const match = scheduleText.match(/^(\d{2}:\d{2})\s+(\d{2}\.\d{2}\.\d{4})\s+«(.+)»$/);
      if (match) {
        const [, time, date, reminderText] = match;
        const [hours, minutes] = time.split(':').map(Number);
        const [day, month, year] = date.split('.').map(Number);
        const reminderDate = new Date(year, month - 1, day, hours, minutes);
        if (reminderDate > new Date()) {
          const timeout = reminderDate.getTime() - Date.now();
          reminders.push({ text: reminderText, date: reminderDate });
          setTimeout(() => {
            broadcast({
              id: Date.now(),
              text: `🔔 Напоминание: ${reminderText}`,
              sender: 'Федя',
              timestamp: new Date().toISOString()
            });
          }, timeout);
          const confirmMessage = {
            id: Date.now() + 1,
            text: `Напоминание установлено на ${time} ${date}: «${reminderText}»`,
            sender: 'Федя',
            timestamp: new Date().toISOString()
          };
          messages.push(confirmMessage);
          broadcast(confirmMessage);
        }
      }
    } else if (text && !text.startsWith('@encrypt:') && !text.startsWith('sticker:')) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'deepseek/deepseek-v4-flash-20260423:free',
          messages: [{ role: 'user', content: text }],
        });
        const aiResponse = completion.choices[0].message.content;
        const botMessage = {
          id: Date.now() + 1,
          text: aiResponse,
          sender: 'Федя',
          timestamp: new Date().toISOString()
        };
        messages.push(botMessage);
        broadcast(botMessage);
      } catch (err) {
        console.error('AI error:', err.message);
      }
    }

    ctx.body = message;
    return;
  }

  if (ctx.method === 'POST' && ctx.path === '/api/upload') {
    const file = ctx.request.files?.file;
    if (!file) {
      ctx.status = 400;
      ctx.body = { error: 'No file' };
      return;
    }
    const ext = path.extname(file.originalFilename);
    const fileName = Date.now() + ext;
    const filePath = path.join(uploadsDir, fileName);
    const buffer = fs.readFileSync(file.filepath);
    fs.writeFileSync(filePath, buffer);
    fs.unlinkSync(file.filepath);
    const message = {
      id: Date.now(),
      sender: 'user',
      timestamp: new Date().toISOString(),
      file: {
        name: file.originalFilename,
        type: file.mimetype,
        url: `/uploads/${fileName}`
      }
    };
    messages.push(message);
    broadcast(message);
    ctx.body = message;
    return;
  }

  if (ctx.method === 'POST' && ctx.path === '/api/geo') {
    const message = {
      id: Date.now(),
      sender: 'user',
      timestamp: new Date().toISOString(),
      geo: {
        lat: ctx.request.body.geo.lat,
        lon: ctx.request.body.geo.lon
      }
    };
    messages.push(message);
    broadcast(message);
    ctx.body = message;
    return;
  }

  if (ctx.method === 'DELETE' && ctx.path.startsWith('/api/messages/')) {
    const id = parseInt(ctx.path.split('/').pop());
    const index = messages.findIndex(m => m.id === id);
    if (index !== -1) {
      const deleted = messages.splice(index, 1)[0];
      if (deleted.file) {
        const filePath = path.join(uploadsDir, path.basename(deleted.file.url));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      broadcast({ type: 'delete', id });
      ctx.body = { success: true };
    } else {
      ctx.status = 404;
      ctx.body = { error: 'Not found' };
    }
    return;
  }

  if (ctx.method === 'GET' && ctx.path === '/api/messages') {
    const offset = parseInt(ctx.query.offset) || 0;
    const limit = parseInt(ctx.query.limit) || 10;
    const start = Math.max(0, messages.length - offset - limit);
    const end = messages.length - offset;
    ctx.body = messages.slice(start, end);
    return;
  }

  if (ctx.method === 'GET' && ctx.path === '/api/search') {
    const query = ctx.query.q?.toLowerCase() || '';
    const results = messages.filter(m => {
      if (m.text && m.text.toLowerCase().includes(query)) return true;
      if (m.file && m.file.name.toLowerCase().includes(query)) return true;
      return false;
    });
    ctx.body = results;
    return;
  }

  if (ctx.path === '/') {
    ctx.body = 'Chaos Organizer API';
  }
});

function getBotResponse(command) {
  const weather = ['Солнечно ☀️', 'Дождь 🌧️', 'Облачно ☁️', 'Снег ❄️', 'Ветрено 💨'];
  const advices = ['Сделай перерыв на 5 минут', 'Выпей воды', 'Проверь осанку', 'Улыбнись!', 'Позвони другу'];
  const jokes = [
    'Почему программисты не любят природу? Слишком много багов',
    'Какой язык программирования у пиратов? R!',
    '— Ты кто? — Я бот. — А почему не человек? — Баги не дают',
  ];

  if (command.includes('погода')) return `Прогноз погоды: ${weather[Math.floor(Math.random() * weather.length)]}`;
  if (command.includes('время')) return `Текущее время: ${new Date().toLocaleTimeString()}`;
  if (command.includes('совет')) return advices[Math.floor(Math.random() * advices.length)];
  if (command.includes('шутка')) return jokes[Math.floor(Math.random() * jokes.length)];
  if (command.includes('монета')) return Math.random() > 0.5 ? 'Орёл 🪙' : 'Решка 🪙';
  if (command.includes('help')) return 'Доступные команды:\n@chaos: погода — прогноз погоды\n@chaos: время — текущее время\n@chaos: совет — полезный совет\n@chaos: шутка — случайная шутка\n@chaos: монета — орёл или решка';
  return 'Неизвестная команда. Доступные: погода, время, совет, шутка, монета, help';
}

function broadcast(data) {
  const json = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === 1) client.send(json);
  });
}

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});

const PORT = process.env.PORT || 7070;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));