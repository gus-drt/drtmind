import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import React, { Suspense } from "react";
import { getMissingPublicConfig } from "./lib/runtimeConfig";
import "./index.css";

const missing = getMissingPublicConfig();

const root = createRoot(document.getElementById("root")!);

if (missing.length > 0) {
  console.error(
    `[GraphNotes] Missing required config: ${missing.join(", ")}. The app cannot start.`
  );
  root.render(
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "2rem", fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
      <div>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Configuração indisponível</h1>
        <p style={{ color: "#888" }}>O app não conseguiu carregar as variáveis de ambiente necessárias. Tente republicar o projeto ou recarregar a página.</p>
      </div>
    </div>
  );
} else {
  const App = React.lazy(() => import("./App.tsx"));
  root.render(
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Suspense fallback={null}>
        <App />
      </Suspense>
    </ThemeProvider>
  );
}
