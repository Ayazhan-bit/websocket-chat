import React, { useState, useEffect, useRef } from 'react';
import { loginUser, registerUser } from './api';
import type {
  ChatMessageItem,
  WsIncomingMessage,
  WsOutgoingMessage,
} from './types';
import './App.css';

const WS_URL = 'wss://inai-col3.fishrungames.com/chat/';

export function App() {
  // 1. Состояния для токена и режима формы (Вход / Регистрация)
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return localStorage.getItem('access_token');
  });
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // 2. Состояния для WebSocket и чата
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [isWsAuthorized, setIsWsAuthorized] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('Отключен');
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [messageText, setMessageText] = useState<string>('');

  // useRef хранит ссылку на открытый WebSocket, чтобы он не пересоздавался при каждом рендере
  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Автопрокрутка чата вниз при появлении нового сообщения
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Подключение к WebSocket при наличии accessToken
  useEffect(() => {
    if (!accessToken) {
      return;
    }

    setConnectionStatus('Подключение к серверу...');
    const ws = new WebSocket(WS_URL);
    socketRef.current = ws;

    // Когда соединение открылось — сразу отправляем первое сообщение с токеном
    ws.onopen = () => {
      setConnectionStatus('Отправка токена авторизации...');
      const authMessage: WsOutgoingMessage = {
        type: 'AUTH',
        payload: {
          token: accessToken,
        },
      };
      ws.send(JSON.stringify(authMessage));
    };

    // Когда приходит любое сообщение от сервера
    ws.onmessage = (event: MessageEvent) => {
      try {
        const data: WsIncomingMessage = JSON.parse(event.data);

        if (data.type === 'AUTH_SUCCESS') {
          setCurrentUsername(data.payload.username);
          setIsWsAuthorized(true);
          setConnectionStatus('Подключено');
        } else if (data.type === 'NEW_MESSAGE') {
          setMessages((prevMessages) => [...prevMessages, data.payload]);
        }
      } catch (error) {
        console.error('Ошибка чтения сообщения от сервера:', error);
      }
    };

    // Если сервер закрыл соединение (например, неверный токен)
    ws.onclose = () => {
      setIsWsAuthorized(false);
      setCurrentUsername(null);
      setConnectionStatus('Соединение закрыто');
    };

    ws.onerror = () => {
      setConnectionStatus('Ошибка соединения WebSocket');
    };

    // Функция очистки: закрываем сокет при выходе (logout) или закрытии компонента
    return () => {
      ws.close();
    };
  }, [accessToken]);

  // 4. Обработчик формы входа и регистрации
  const handleAuthSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (isRegisterMode) {
        await registerUser(usernameInput.trim(), passwordInput);
        // После успешной регистрации сразу выполняем вход
      }

      const tokenData = await loginUser(usernameInput.trim(), passwordInput);
      localStorage.setItem('access_token', tokenData.access);
      if (tokenData.refresh) {
        localStorage.setItem('refresh_token', tokenData.refresh);
      }

      setAccessToken(tokenData.access);
      setUsernameInput('');
      setPasswordInput('');
    } catch (error: any) {
      setAuthError(error.message || 'Произошла ошибка авторизации');
    } finally {
      setAuthLoading(false);
    }
  };

  // 5. Выход из аккаунта (Logout)
  const handleLogout = () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setAccessToken(null);
    setIsWsAuthorized(false);
    setCurrentUsername(null);
    setMessages([]);
  };

  // 6. Отправка сообщения в чат
  const handleSendMessage = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedText = messageText.trim();

    if (!trimmedText || !socketRef.current || !isWsAuthorized) {
      return;
    }

    const chatMessage: WsOutgoingMessage = {
      type: 'CHAT_MESSAGE',
      payload: {
        text: trimmedText,
      },
    };

    socketRef.current.send(JSON.stringify(chatMessage));
    setMessageText('');
  };

  // Вспомогательная функция для красивого времени (например, 17:30)
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // --- ЭКРАН 1: Пользователь не авторизован ---
  if (!accessToken) {
    return (
      <div className="page-container">
        <div className="auth-card">
          <h2>{isRegisterMode ? 'Регистрация' : 'Вход в чат'}</h2>

          {authError && <div className="error-banner">{authError}</div>}

          <form onSubmit={handleAuthSubmit} className="auth-form">
            <label>
              Имя пользователя
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Введите логин"
                required
              />
            </label>

            <label>
              Пароль
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Введите пароль"
                required
              />
            </label>

            <button type="submit" disabled={authLoading} className="primary-btn">
              {authLoading
                ? 'Загрузка...'
                : isRegisterMode
                ? 'Зарегистрироваться и войти'
                : 'Войти'}
            </button>
          </form>

          <button
            type="button"
            className="switch-mode-btn"
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setAuthError(null);
            }}
          >
            {isRegisterMode
              ? 'Уже есть аккаунт? Войти'
              : 'Нет аккаунта? Зарегистрироваться'}
          </button>
        </div>
      </div>
    );
  }

  // --- ЭКРАН 2: Окно группового чата ---
  return (
    <div className="page-container">
      <div className="chat-container">
        <header className="chat-header">
          <div>
            <h2>Групповой чат</h2>
            <span className={`status-badge ${isWsAuthorized ? 'online' : 'offline'}`}>
              {connectionStatus}
              {currentUsername ? ` • Вы вошли как ${currentUsername}` : ''}
            </span>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            Выйти
          </button>
        </header>

        <div className="messages-list">
          {messages.length === 0 ? (
            <p className="empty-chat-text">Сообщений пока нет. Напишите первым!</p>
          ) : (
            messages.map((msg, index) => {
              const isMyMessage = msg.sender === currentUsername;
              return (
                <div
                  key={`${msg.timestamp}-${index}`}
                  className={`message-row ${isMyMessage ? 'my-message' : 'other-message'}`}
                >
                  <div className="message-bubble">
                    <div className="message-header">
                      <span className="message-sender">{msg.sender}</span>
                      <span className="message-time">{formatTime(msg.timestamp)}</span>
                    </div>
                    <div className="message-text">{msg.text}</div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="message-input-form">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder={
              isWsAuthorized
                ? 'Введите сообщение...'
                : 'Ожидание авторизации в сокете...'
            }
            disabled={!isWsAuthorized}
          />
          <button type="submit" disabled={!isWsAuthorized || !messageText.trim()}>
            Отправить
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;