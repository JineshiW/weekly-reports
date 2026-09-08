import { request, toQuery } from "./http";

export function fetchSummary(week) {
  return request(`/dashboard/summary${toQuery({ week })}`);
}

export function fetchSection(week, field) {
  return request(`/dashboard/section${toQuery({ week, field })}`);
}
