import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base path must match your GitHub repo name for Pages to serve assets correctly.
export default defineConfig({
  plugins: [react()],
  base: "/NatParkTracker/"
});
