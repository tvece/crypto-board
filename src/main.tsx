import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import CryptoBoard from "./CryptoBoard.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CryptoBoard />
  </StrictMode>
);
