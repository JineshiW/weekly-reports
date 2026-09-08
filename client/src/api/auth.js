import { request } from "./http";

export function login(body) {
  return request("/auth/login", { method: "POST", body });
}

export function register(body) {
  return request("/auth/register", { method: "POST", body });
}

export function logout() {
  return request("/auth/logout", { method: "POST" });
}

export function currentUser() {
  return request("/auth/me");
}
