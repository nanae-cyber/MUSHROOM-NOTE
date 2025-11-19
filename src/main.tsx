import React from "react";
import { createRoot } from "react-dom/client";
import App from "./ui/App";
import "./ui/styles.css";
import { db } from "./utils/db";
if (typeof window !== "undefined") (window as any).db = db;

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
