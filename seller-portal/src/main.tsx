import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import SellerPortal from "./SellerPortal";
import "./seller.css";
import "./standalone.css";

const root = document.getElementById("root");
if (!root) throw new Error("Seller portal root element was not found.");

createRoot(root).render(
  <StrictMode>
    <SellerPortal />
  </StrictMode>,
);
