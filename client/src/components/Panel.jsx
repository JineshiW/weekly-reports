
// Bordered white block used for every section of every page.
export default function Panel({ title, action, children }) {
  // Return the panel section along with its optional heading and content.
  return (
    <section className="panel">
      {/* Only render the panel header when either a title or an action has been provided. */}
      {(title || action) && (
        <div className="panel-head">
          {/* Display the title when one is provided, otherwise use an empty span to keep the layout consistent. */}
          {title ? <h2>{title}</h2> : <span />}
          {/* Render the action passed into the component, such as a button. */}
          {action}
        </div>
      )}
      {/* Render the content passed between the opening and closing Panel tags. */}
      {children}
    </section>
  );
}

