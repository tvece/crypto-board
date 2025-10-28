import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import CryptoBoard from "./components/CryptoBoard.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CryptoBoard
      monitoredCoinsCount={5}
      // 500 + transition
      highlightDuration={900}
    />
  </StrictMode>
);
