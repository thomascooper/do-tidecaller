import { availableSections } from "../components/nav";

export function NotFound({ paths }: { paths: readonly string[] }) {
  return (
    <div className="wrap page">
      <h1>Page not found</h1>
      <p className="lead">There is no page at this address. Try one of the main sections.</p>
      <ul>
        {availableSections(paths).map((s) => (
          <li key={s.path}>
            <a href={s.path}>{s.label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
