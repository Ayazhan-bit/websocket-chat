// --- Типы для REST API авторизации ---
export interface AuthTokenResponse {
  access: string;
  refresh?: string;
}

// --- Типы сообщений, которые МЫ отправляем на WebSocket ---
export interface WsAuthOutgoingMessage {
  type: 'AUTH';
  payload: {
    token: string;
  };
}

export interface WsChatOutgoingMessage {
  type: 'CHAT_MESSAGE';
  payload: {
    text: string;
  };
}

export type WsOutgoingMessage = WsAuthOutgoingMessage | WsChatOutgoingMessage;

// --- Типы сообщений, которые ПРИХОДЯТ от WebSocket ---
export interface WsAuthSuccessIncoming {
  type: 'AUTH_SUCCESS';
  payload: {
    username: string;
  };
}

export interface WsNewMessageIncoming {
  type: 'NEW_MESSAGE';
  payload: {
    sender: string;
    text: string;
    timestamp: number;
  };
}

export type WsIncomingMessage = WsAuthSuccessIncoming | WsNewMessageIncoming;

// Удобный тип для хранения сообщения в списке чата
export interface ChatMessageItem {
  sender: string;
  text: string;
  timestamp: number;
}