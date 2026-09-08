import { request, toQuery } from "./http";

export function fetchReports(filters) {
  return request(`/reports${toQuery(filters)}`);
}

export function fetchReport(id) {
  return request(`/reports/${id}`);
}

export function fetchVersions(id) {
  return request(`/reports/${id}/versions`);
}

export function createReport(body) {
  return request("/reports", { method: "POST", body });
}

export function updateReport(id, body) {
  return request(`/reports/${id}`, { method: "PUT", body });
}

export function submitReport(id) {
  return request(`/reports/${id}/submit`, { method: "POST" });
}

export function reviewReport(id, body) {
  return request(`/reports/${id}/review`, { method: "POST", body });
}

export function deleteDraft(id) {
  return request(`/reports/${id}`, { method: "DELETE" });
}
