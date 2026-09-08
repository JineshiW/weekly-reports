import { request } from "./http";

export function fetchProjects() {
  return request("/projects");
}

export function createProject(body) {
  return request("/projects", { method: "POST", body });
}

export function updateProject(id, body) {
  return request(`/projects/${id}`, { method: "PUT", body });
}

export function deleteProject(id) {
  return request(`/projects/${id}`, { method: "DELETE" });
}
