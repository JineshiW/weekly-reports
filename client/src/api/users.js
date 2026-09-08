import { request } from "./http";

export function fetchUsers() {
  return request("/users");
}

export function inviteUser(body) {
  return request("/users", { method: "POST", body });
}

export function changeRole(id, role) {
  return request(`/users/${id}/role`, { method: "PATCH", body: { role } });
}

export function deactivateUser(id) {
  return request(`/users/${id}`, { method: "DELETE" });
}
