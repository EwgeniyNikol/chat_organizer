# Chaos Organizer — Чат Бот Федя

[![GitHub Actions](https://github.com/EwgeniyNikol/chat_organizer/actions/workflows/deploy.yml/badge.svg)](https://github.com/EwgeniyNikol/chat_organizer/actions/workflows/deploy.yml)

## Демо

- **GitHub Pages:** https://ewgeniynikol.github.io/chat_organizer/
- **Бекенд:** https://chat-organizer-fedy.onrender.com

## Функции

### Обязательные
- Сохранение текстовых сообщений и ссылок
- Кликабельные ссылки (http/https)
- Загрузка файлов через Drag & Drop и иконку
- Скачивание файлов
- Ленивая подгрузка (по 10 сообщений)

### Дополнительные
- Синхронизация между вкладками
- Поиск по сообщениям
- Запись аудио
- Отправка геолокации
- Напоминания через `@schedule`
- Команды боту `@chaos` (погода, время, совет, шутка, монета, help)
- Закрепление сообщений (pin)
- Избранные сообщения
- Просмотр вложений по категориям
- Экспорт/импорт истории
- Шифрование сообщений (`@encrypt`)
- Архивирование файлов в ZIP
- Emoji-пикер
- Оформление кода (```)
- Стикеры

## Команды боту

| Команда | Описание |
|---------|----------|
| `@chaos: погода` | Прогноз погоды |
| `@chaos: время` | Текущее время |
| `@chaos: совет` | Полезный совет |
| `@chaos: шутка` | Случайная шутка |
| `@chaos: монета` | Орёл или решка |
| `@chaos: help` | Список команд |
| `@schedule: ЧЧ:ММ ДД.ММ.ГГГГ «текст»` | Установить напоминание |
| `@encrypt: текст` | Зашифровать сообщение |

## Установка

\`\`\`bash
npm install
npm run build
npm start
\`\`\`

Открыть: `http://localhost:7070`