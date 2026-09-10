"use client";

import { useState } from "react";
import { sourceRoutes } from "@/lib/routes";

const dimensions = [
  [360, 800],
  [390, 844],
  [430, 932],
  [600, 960],
  [820, 1180],
  [1024, 768],
  [1366, 768],
  [1440, 900],
  [1920, 1080],
];

export function ViewportCompare() {
  const [file, setFile] = useState("index.html");
  const [size, setSize] = useState("1440x900");
  const [view, setView] = useState("current");
  const [width, height] = size.split("x").map(Number);
  const src = view === "source" ? `/dev/reference/${file}` : sourceRoutes[file];
  return (
    <div style={{ minWidth: width, background: "#e8e8ed" }}>
      <div
        style={{
          display: "flex",
          gap: 16,
          padding: 16,
          background: "#fff",
          alignItems: "center",
        }}
      >
        <label>
          页面{" "}
          <select
            aria-label="对照页面"
            value={file}
            onChange={(event) => setFile(event.target.value)}
          >
            {Object.keys(sourceRoutes).map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          视口{" "}
          <select
            aria-label="对照视口"
            value={size}
            onChange={(event) => setSize(event.target.value)}
          >
            {dimensions.map(([w, h]) => (
              <option key={w} value={`${w}x${h}`}>
                {w} × {h}
              </option>
            ))}
          </select>
        </label>
        <label>
          版本{" "}
          <select
            aria-label="对照版本"
            value={view}
            onChange={(event) => setView(event.target.value)}
          >
            <option value="current">Next.js 页面</option>
            <option value="source">原始 HTML</option>
          </select>
        </label>
      </div>
      <iframe
        key={src}
        src={src}
        title="视口对照"
        width={width}
        height={height}
        style={{
          display: "block",
          width,
          height,
          border: 0,
          background: "#fff",
        }}
      />
    </div>
  );
}
