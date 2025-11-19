import React from "react";
import type { Mode } from "./App";
import { t } from "../i18n";

export function CaptureToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div className="toggle">
      <button
        className={mode === "quick" ? "active" : ""}
        onClick={() => onChange("quick")}
      >
        {t("mode_quick")}
      </button>
      <button
        className={mode === "detail" ? "active" : ""}
        onClick={() => onChange("detail")}
      >
        {t("mode_detail")}
      </button>
    </div>
  );
}
