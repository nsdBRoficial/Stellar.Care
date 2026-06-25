import { User } from "../types";

export function validateLocalSession(): User | null {
  const dataString = localStorage.getItem("stellarcare_sessao_7dias");
  if (!dataString) return null;

  try {
    const data = JSON.parse(dataString);
    const expiresAt = data.token_expiration;
    if (expiresAt && Date.now() < expiresAt) {
      return data.user as User;
    }
  } catch (err) {
    console.error("Erro parse session", err);
  }
  return null;
}

export function checkExpiredSession(): boolean {
  const dataString = localStorage.getItem("stellarcare_sessao_7dias");
  if (!dataString) return false;
  try {
    const data = JSON.parse(dataString);
    const expiresAt = data.token_expiration;
    if (expiresAt && Date.now() >= expiresAt) {
      return true;
    }
  } catch (err) {}
  return false;
}

export function getExpiredUser(): User | null {
  const dataString = localStorage.getItem("stellarcare_sessao_7dias");
  if (!dataString) return null;
  try {
    const data = JSON.parse(dataString);
    return data.user as User;
  } catch (err) {}
  return null;
}

export function saveSession7Days(user: User, passToken: string) {
  // Save for 7 days
  const data = {
    user,
    passToken, // might be needed for silent login or re-auth fake
    token_expiration: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days in ms
  };
  localStorage.setItem("stellarcare_sessao_7dias", JSON.stringify(data));
}

export function clearSession() {
  localStorage.removeItem("stellarcare_sessao_7dias");
  // Also clear legacy session if it exists to clean up
  localStorage.removeItem("stellarcare_usuario");
  sessionStorage.removeItem("stellarcare_sessao_ativa");
}
