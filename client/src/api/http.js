// Base URL for the API — overridable via env var, falls back to local dev server
const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

// Key used to store the auth token in localStorage
const tokenKey = "weekly-reports-token";

export function saveToken(token) {
  localStorage.setItem(tokenKey, token);
}

export function clearToken() {
  localStorage.removeItem(tokenKey);
}

export function getToken() {
  return localStorage.getItem(tokenKey);
}

// Single place where requests are built, so every call sends the token the same
// way and errors come back as plain Error objects with the server message.
export async function request(path, options = {}) {
  const token = getToken();

  const response = await fetch(baseUrl + path, {
    method: options.method || "GET",
    // Include cookies too, in case the backend also relies on a session cookie
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      // Only attach an Authorization header if we actually have a token
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    // Only stringify a body if one was provided (avoids sending "undefined")
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // Read as text first so we can safely handle empty responses (e.g. 204 No Content)
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  // Non-2xx responses are turned into thrown Errors, using the server's
  // message if it provided one, so callers can just try/catch
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

// Converts a plain object of params into a query string like "?key=value&..."
// Skips empty/null/undefined values so they don't pollute the URL.
export function toQuery(params) {
  const search = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) search.set(key, value);
  });

  const query = search.toString();
  return query ? `?${query}` : "";
}