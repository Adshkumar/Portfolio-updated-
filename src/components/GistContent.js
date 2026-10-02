"use client";

import { marked } from "marked";

export const GIST_URL = "https://github.com/Adshkumar";

const BLOG_CONTENT = `
# Building with clarity: my journey as a full-stack developer

Hi, I’m Adarsh Kumar, a full-stack developer passionate about turning ideas into smooth, useful digital products. I enjoy building interfaces people can trust, APIs that stay reliable under real-world use, and systems that feel polished from the first click to the final deployment.

I work across the stack — from UI design and frontend logic to backend architecture, database flows, and deployment. My focus is always the same: build products that are simple to use, strong technically, and valuable to the people they serve.

## Why I build

I’ve always been drawn to the way software solves real problems. A great product can remove friction, save time, help people make decisions faster, and create experiences that feel natural instead of complicated.

That’s why I enjoy building full-stack apps: they let me think about both the user experience and the engineering behind it. I like shaping the product from the idea stage to the final working system.

## What I work on

My recent projects include:

- real-time chat platforms with authentication and live communication
- AI-powered mock interview apps with feedback reports
- backend systems for ride-booking and service workflows
- mobile finance applications with a clean user experience
- responsive web apps designed for real users, not just demos

I enjoy combining frontend creativity with backend structure. I care about clean code, strong architecture, and making sure every feature feels intentional.

## My development style

I believe great software is not just functional — it should feel thoughtful.

That means:

- building interfaces that are easy to understand
- writing APIs that are organized and scalable
- handling real-user edge cases early
- optimizing for performance without sacrificing usability
- shipping products that are stable enough for real-world use

I like to keep learning, testing ideas quickly, and improving based on feedback. Every project teaches me something new about better product thinking and cleaner engineering.

## The projects I care about

One of my strengths is building end-to-end experiences. I like projects where I can take ownership of the idea, design the flow, implement the main features, and make sure the final product works well in practice.

Some of the work I’m proud of includes:

- a real-time chat application with secure auth and WebSocket messaging
- an AI interview platform with mock interview logic and generated reports
- an Uber-style backend system with protected routes and driver workflows
- a React Native finance application for mobile users

## Looking ahead

I want to keep growing as a developer who can design, build, and ship meaningful products. My goal is to keep creating systems that are useful, scalable, and enjoyable to use.

I’m always open to building new ideas, collaborating on strong products, and taking on challenges that help me keep learning.

Connect with me on [LinkedIn](https://www.linkedin.com/in/adarsh-kumar62041/), [X](https://x.com/Adarshsingh1a), [GitHub](https://github.com/Adshkumar), [Instagram](https://www.instagram.com/adsingh9.1/), or [LeetCode](https://leetcode.com/u/Adarsh_kumar62041/), or email me at [adarsh99733207@gmail.com](mailto:adarsh99733207@gmail.com).
`;

export default function GistContent() {
  const html = marked.parse(BLOG_CONTENT);

  return (
    <>
      <p className="gistMeta">
        7 min read · Updated Oct 2026 ·{" "}
        <a href={GIST_URL} target="_blank" rel="noopener noreferrer">
          View profile
        </a>
      </p>

      <article className="gistProse" dangerouslySetInnerHTML={{ __html: html }} />

      <style>{`
        .gistMeta {
          color: var(--text-muted);
          font-size: 0.8rem;
          margin: 0 0 20px;
          letter-spacing: 0.01em;
        }
        .gistMeta a {
          color: var(--text-muted);
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .gistMeta a:hover {
          color: var(--text);
        }
        .gistProse {
          color: var(--text-secondary);
          line-height: 1.7;
          font-size: 0.95rem;
        }
        .gistProse h1,
        .gistProse h2,
        .gistProse h3,
        .gistProse h4 {
          color: var(--text);
          line-height: 1.3;
          margin: 1.6em 0 0.6em;
        }
        .gistProse h1 {
          font-size: 1.6rem;
          margin-top: 0;
        }
        .gistProse h2 {
          font-size: 1.25rem;
        }
        .gistProse h3 {
          font-size: 1.05rem;
        }
        .gistProse p {
          margin: 0 0 1em;
        }
        .gistProse a {
          color: var(--link);
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .gistProse strong {
          color: var(--text);
        }
        .gistProse ul,
        .gistProse ol {
          padding-left: 1.4em;
          margin: 0 0 1em;
        }
        .gistProse li {
          margin-bottom: 0.35em;
        }
        .gistProse code {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 5px;
          padding: 0.12em 0.35em;
          font-size: 0.85em;
        }
        .gistProse pre {
          background: var(--bg-elev);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 14px 16px;
          overflow-x: auto;
          margin: 0 0 1em;
        }
        .gistProse pre code {
          background: none;
          border: none;
          padding: 0;
        }
        .gistProse blockquote {
          border-left: 3px solid var(--border);
          margin: 0 0 1em;
          padding-left: 1em;
          color: var(--text-muted);
        }
        .gistProse hr {
          border: none;
          border-top: 1px solid var(--border);
          margin: 2em 0;
        }
        .gistProse img,
        .gistProse table {
          max-width: 100%;
        }
        .gistProse table {
          border-collapse: collapse;
          display: block;
          overflow-x: auto;
          margin: 0 0 1em;
        }
        .gistProse th,
        .gistProse td {
          border: 1px solid var(--border);
          padding: 6px 10px;
        }
      `}</style>
    </>
  );
}
