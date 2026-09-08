import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";

// Wraps every signed in page: navigation on top, page content underneath.
export default function AppShell() {
  return (
    <>
      <TopBar />
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}
