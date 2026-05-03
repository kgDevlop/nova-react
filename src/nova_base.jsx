// nova_base.jsx — application entry point.
//
// Mounts the theme provider that wraps the entire app. All view routing, tab
// management, and workspace state live in src/shell/nova_router.jsx.

import { ThemeProvider } from "./shared/theme";
import { NovaRouter } from "./shell/nova_router";

export default function NovaOffice() {
  return (
    <ThemeProvider>
      <NovaRouter />
    </ThemeProvider>
  );
}
