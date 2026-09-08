// Small coloured label used in report lists, the dashboard and report headers.
export default function StatusTag({ status }) {
  const label = status || "not started";
  return <span className={`tag ${label.replace(/\s+/g, "-")}`}>{label}</span>;
}
