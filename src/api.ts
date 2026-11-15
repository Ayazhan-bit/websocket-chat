import { type AuthTokenResponse } from './types';

const BASE_API_URL = 'https://inai-col3.fishrungames.com/api';

// Проверь эти два пути в Swagger, если на прошлом задании они отличались:
const REGISTER_ENDPOINT = `${BASE_API_URL}/register/`;
const LOGIN_ENDPOINT = `${BASE_API_URL}/token/`; // или /api/login/

export async function registerUser(username: string, password: string): Promise<void> {
  const response = await fetch(REGISTER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Ошибка при регистрации. Возможно, логин занят.');
  }
}

export async function loginUser(username: string, password: string): Promise<AuthTokenResponse> {
  const response = await fetch(LOGIN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Неверный логин или пароль');
  }

  return response.json();
}