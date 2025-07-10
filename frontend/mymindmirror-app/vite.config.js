import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import crypto from "node:crypto";
if (!crypto.hash) {
  crypto.hash = (algo, content) => {
    return crypto.createHash(algo).update(content).digest("hex");
  };
}

export default defineConfig({ define: {
            global: 'window',
          },
  plugins: [react(), tailwindcss()],
});
