"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import {
  codingProfiles,
  siteConfig,
  socialLinks,
} from "@/config/portfolio";

const dockOrder = ["github", "linkedin", "twitter", "instagram", "email"];

const profileAbbr = {
  LeetCode: "LC",
};

const hoverColors = {
  home: "#22d3ee",
  resume: "#a78bfa",
  github: "#ffffff",
  linkedin: "#0a66c2",
  twitter: "#ffffff",
  instagram: "#e1306c",
  email: "#ea4335",
  LeetCode: "#ffa116",
};

function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function Navbar({ theme, onToggleTheme }) {
  const byPlatform = Object.fromEntries(
    socialLinks.map((s) => [s.platform, s])
  );

  const dockRef = useRef(null);
  const itemRefs = useRef([]);
  const itemColors = useRef([]);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [highlight, setHighlight] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    opacity: 0,
    color: "#ffffff",
  });

  useLayoutEffect(() => {
    if (hoveredIndex === null) {
      setHighlight((h) => ({ ...h, opacity: 0 }));
      return;
    }
    const el = itemRefs.current[hoveredIndex];
    const parent = dockRef.current;
    if (!el || !parent) return;
    const elRect = el.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    setHighlight({
      left: elRect.left - parentRect.left,
      top: elRect.top - parentRect.top,
      width: elRect.width,
      height: elRect.height,
      opacity: 1,
      color: itemColors.current[hoveredIndex] || "#ffffff",
    });
  }, [hoveredIndex]);

  const registerItem = (i, color) => (el) => {
    itemRefs.current[i] = el;
    itemColors.current[i] = color;
  };

  const onEnter = (i) => () => setHoveredIndex(i);
  const onLeave = () => setHoveredIndex(null);

  let idx = 0;
  const nextIndex = () => idx++;

  const homeIdx = nextIndex();
  const resumeIdx = nextIndex();
  const socialIndices = dockOrder.map(() => nextIndex());
  const themeIdx = nextIndex();
  const profileIndices = codingProfiles.map(() => nextIndex());

  const activeStyle = (i, key) =>
    hoveredIndex === i
      ? {
          color:
            theme === "light" && (key === "github" || key === "twitter")
              ? "#18181b"
              : hoverColors[key],
        }
      : undefined;

  return (
    <nav className="dock" aria-label="Primary" ref={dockRef}>
      <span
        className="dockHighlight"
        aria-hidden="true"
        style={{
          left: highlight.left,
          top: highlight.top,
          width: highlight.width,
          height: highlight.height,
          opacity: highlight.opacity,
          background: hexToRgba(highlight.color, 0.15),
          boxShadow: `0 0 12px ${hexToRgba(highlight.color, 0.25)}`,
        }}
      />
      <Link
        href="/#home"
        className={`dockItem${hoveredIndex === homeIdx ? " isActive" : ""}`}
        aria-label="Home"
        ref={registerItem(homeIdx, hoverColors.home)}
        onMouseEnter={onEnter(homeIdx)}
        onMouseLeave={onLeave}
        style={activeStyle(homeIdx, "home")}
      >
        <i className="fas fa-home"></i>
      </Link>
      {siteConfig.resumeLink && (
        <a
          href={siteConfig.resumeLink}
          target="_blank"
          rel="noopener noreferrer"
          className={`dockItem${hoveredIndex === resumeIdx ? " isActive" : ""}`}
          aria-label="Resume"
          ref={registerItem(resumeIdx, hoverColors.resume)}
          onMouseEnter={onEnter(resumeIdx)}
          onMouseLeave={onLeave}
          style={activeStyle(resumeIdx, "resume")}
        >
          <i className="fas fa-file-alt"></i>
        </a>
      )}
      <span className="dockSep" aria-hidden="true"></span>
      {dockOrder.map((p, i) => {
        const link = byPlatform[p];
        if (!link) return null;
        const index = socialIndices[i];
        const color =
          theme === "light" && (p === "github" || p === "twitter")
            ? "#18181b"
            : hoverColors[p];
        return (
          <a
            key={p}
            href={link.url}
            target={p === "email" ? undefined : "_blank"}
            rel={p === "email" ? undefined : "noopener noreferrer"}
            className={`dockItem${hoveredIndex === index ? " isActive" : ""}`}
            aria-label={link.label}
            ref={registerItem(index, color)}
            onMouseEnter={onEnter(index)}
            onMouseLeave={onLeave}
            style={activeStyle(index, p)}
          >
            <i className={link.icon}></i>
          </a>
        );
      })}
      <span className="dockSep" aria-hidden="true"></span>
      <button
        type="button"
        className="dockItem"
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        ref={registerItem(themeIdx, hoverColors.home)}
        onMouseEnter={onEnter(themeIdx)}
        onMouseLeave={onLeave}
        onClick={onToggleTheme}
        style={activeStyle(themeIdx, "home")}
      >
        <i className={`fas fa-${theme === "dark" ? "sun" : "moon"}`} aria-hidden="true"></i>
      </button>
      {codingProfiles.map((profile, i) => {
        const index = profileIndices[i];
        const color = hoverColors[profile.platform];
        return (
          <a
            key={profile.platform}
            href={profile.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`dockItem dockItemText${
              hoveredIndex === index ? " isActive" : ""
            }`}
            aria-label={profile.platform}
            title={`${profile.platform} — ${profile.rating}`}
            ref={registerItem(index, color)}
            onMouseEnter={onEnter(index)}
            onMouseLeave={onLeave}
            style={hoveredIndex === index ? { color } : undefined}
          >
            {profileAbbr[profile.platform] || profile.platform.slice(0, 2)}
          </a>
        );
      })}
    </nav>
  );
}
