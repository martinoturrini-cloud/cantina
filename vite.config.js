import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" così l'app funziona anche se pubblicata in una sottocartella (es. GitHub Pages)
export default defineConfig({
  base: "./",
  plugins: [react()],
});
