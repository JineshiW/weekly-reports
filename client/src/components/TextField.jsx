// Label plus input wrapper. Keeps every form on the same spacing without each
// page repeating the same markup.
export default function TextField({ label, as = "input", children, ...rest }) {
  const Tag = as;
  return (
    <div className="field">
      {label && <label>{label}</label>}
      {as === "select" ? <select {...rest}>{children}</select> : <Tag {...rest} />}
    </div>
  );
}
