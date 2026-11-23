"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import {
  codingProfiles,
  siteConfig,
  socialLinks,
} from "@/config/portfolio";

const dockOrder = ["github", "linkedin", "twitter", "instagram", "medium", "email"];

const profileAbbr = {
  LeetCode: "LC",
};

const hoverColors = {
  home: "#22d3ee",
  resume: "#a78bfa",
  articles: "#22d3ee",
  github: "#ffffff",
  linkedin: "#0a66c2",
  twitter: "#ffffff",
  instagram: "#e1306c",
  medium: "#ffffff",
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
  const articlesIdx = nextIndex();
  const socialIndices = dockOrder.map(() => nextIndex());
  const themeIdx = nextIndex();
  const profileIndices = codingProfiles.map(() => nextIndex());

  const activeStyle = (i, key) =>
    hoveredIndex === i
      ? {
          color:
            theme === "light" && (key === "github" || key === "twitter" || key === "medium")
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
      <Link
        href="/articles"
        className={`dockItem${hoveredIndex === articlesIdx ? " isActive" : ""}`}
        aria-label="Tech Articles"
        title="Tech Articles"
        ref={registerItem(articlesIdx, hoverColors.articles)}
        onMouseEnter={onEnter(articlesIdx)}
        onMouseLeave={onLeave}
        style={activeStyle(articlesIdx, "articles")}
      >
        <i className="fas fa-book-open" aria-hidden="true"></i>
      </Link>
      <span className="dockSep" aria-hidden="true"></span>
      {dockOrder.map((p, i) => {
        const link = byPlatform[p];
        if (!link) return null;
        const index = socialIndices[i];
        const color =
          theme === "light" && (p === "github" || p === "twitter" || p === "medium")
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
            {p === "medium" ? (
              <svg
                className="dockMediumLogo"
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  fill="currentColor"
                  d="M4.21 0A4.201 4.201 0 0 0 0 4.21v15.58A4.201 4.201 0 0 0 4.21 24h15.58A4.201 4.201 0 0 0 24 19.79v-1.093c-.137.013-.278.02-.422.02-2.577 0-4.027-2.146-4.09-4.832a7.592 7.592 0 0 1 .022-.708c.093-1.186.475-2.241 1.105-3.022a3.885 3.885 0 0 1 1.395-1.1c.468-.237 1.127-.367 1.664-.367h.023c.101 0 .202.004.303.01V4.211A4.201 4.201 0 0 0 19.79 0Zm.198 5.583h4.165l3.588 8.435 3.59-8.435h3.864v.146l-.019.004c-.705.16-1.063.397-1.063 1.254h-.003l.003 10.274c.06.676.424.885 1.063 1.03l.02.004v.145h-4.923v-.145l.019-.005c.639-.144.994-.353 1.054-1.03V7.267l-4.745 11.15h-.261L6.15 7.569v9.445c0 .857.358 1.094 1.063 1.253l.02.004v.147H4.405v-.147l.019-.004c.705-.16 1.065-.397 1.065-1.253V6.987c0-.857-.358-1.094-1.064-1.254l-.018-.004z"
                />
              </svg>
            ) : (
              <i className={link.icon}></i>
            )}
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
