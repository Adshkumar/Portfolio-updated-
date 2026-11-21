<div align="center">

# Adarsh Kumar

### Full-Stack and Desktop Software Developer

Building practical software across web, mobile, desktop, AI, and developer tooling.

[Portfolio](https://adshkumar.is-a.dev/) · [Resume](./public/Adarsh-Kumar-Resume.pdf) · [GitHub](https://github.com/Adshkumar) · [LinkedIn](https://www.linkedin.com/in/adarsh-kumar62041/)

</div>

---

## About

I’m a Delhi-based software developer focused on building useful, polished, and reliable products. I work across interfaces, backend systems, databases, desktop applications, mobile apps, and AI-enabled workflows.

I’m pursuing a Diploma in Computer Science at **Chhotu Ram Rural Institute of Technology, Delhi**.

## Selected Projects

### [Notro](https://apps.microsoft.com/detail/9PB2K096PHCQ)

A customizable Windows desktop companion that turns the top-edge of the screen into a hub for live activities, quick controls, notes, reminders, media, utilities, and local productivity tools.

**Stack:** C# · .NET 8 · WPF · XAML · Win32 · PowerShell  
[Microsoft Store](https://apps.microsoft.com/detail/9PB2K096PHCQ) · [Source](https://github.com/Adshkumar/Notch) · [Case study](https://adshkumar.is-a.dev/experience/notro)

### [r0](https://r0-ide.vercel.app/)

A cross-platform AI-powered code editor with Agent, Plan, and Ask workflows, an integrated terminal, Git tools, database support, language servers, debugging, previews, and extensions.

**Stack:** Rust · TypeScript · CodeMirror 6 · portable-pty · SQLite  
[Live app](https://r0-ide.vercel.app/) · [Source](https://github.com/Adshkumar/r0) · [Case study](https://adshkumar.is-a.dev/experience/r0)

### [Finance Tracker](https://github.com/Adshkumar/Finance-Tracker)

A mobile budgeting app for accounts, budgets, transactions, receipt scanning, voice entry, spending insights, and biometric or PIN protection.

**Stack:** React Native · Expo · Supabase · PostgreSQL · Clerk · Gemini AI · NativeWind  
[Source](https://github.com/Adshkumar/Finance-Tracker) · [Case study](https://adshkumar.is-a.dev/experience/finance-tracker)

### [PurseWar](https://www.iplauction.site/)

A real-time multiplayer IPL auction simulator with synchronized bidding, timers, franchise budgets, AI bots, and post-auction ratings.

**Stack:** React · Vite · Tailwind CSS · Firebase · Supabase  
[Live app](https://www.iplauction.site/) · [Source](https://github.com/Adshkumar/ipl-auction) · [Case study](https://adshkumar.is-a.dev/experience/pursewar)

### Real-Time Chat Application

A room-based messaging app featuring authentication, live communication, online status, typing indicators, and persistent message history.

**Stack:** Node.js · Express · MongoDB · JWT · Socket.IO  
[Live app](https://chat-application-sable-rho.vercel.app/) · [Source](https://github.com/Adshkumar/ChatApplication)

### AI Interview Platform

An interview preparation product with mock interviews, AI-generated feedback, report generation, and file handling.

**Stack:** React · Node.js · Express · MongoDB · JWT · Puppeteer  
[Live app](https://adarsh-interviewai.vercel.app/) · [Source](https://github.com/Adshkumar/ai-interview-platform-)

### Uber-Inspired Ride-Booking Backend

A backend project exploring ride-booking workflows, protected endpoints, driver management, real-time rider–driver coordination, and structured data models.

**Stack:** Node.js · Express · MongoDB · JWT · Socket.IO  
[Live app](https://uber-psi-three.vercel.app/) · [Source](https://github.com/Adshkumar/UBER)

### URL Shortener

A full-stack link platform with custom aliases, JWT authentication, QR codes, click analytics, and Docker Compose-based deployment.

**Stack:** MERN · JWT · REST APIs · Tailwind CSS · Docker  
[Live app](https://url-linksnap.vercel.app/) · [Source](https://github.com/Adshkumar/URL-Shortener) · [Case study](https://adshkumar.is-a.dev/experience/url-shortener)

### Agentic AI

An authenticated AI application builder that turns natural-language prompts into React apps and improves generated projects through streaming agent workflows.

**Stack:** Next.js · TypeScript · Clerk · Prisma · PostgreSQL · Supabase · Gemini · Sandpack  
[Live app](https://agentic-flow-ai.vercel.app/) · [Source](https://github.com/Adshkumar/Agentic-AI) · [Case study](https://adshkumar.is-a.dev/experience/agentic-ai)

## Portfolio

This portfolio brings together experience, selected projects, achievements, skills, articles, and contact details in a responsive interface. It includes light and dark themes, section reveal motion, case studies, a blog modal, technical article pages, GitHub activity, and direct résumé access.

Some daily GitHub activity values shown in the portfolio are estimates based on public activity and a supplied calendar pattern; they are not an exact record of private contributions. The annual GitHub Contributions card is synced separately from GitHub’s authenticated contribution calendar for the previous and current calendar years. LeetCode activity depends on the availability and freshness of its public calendar service.

## Technology

| Area | Technologies |
| --- | --- |
| Framework | Next.js 16 · React 19 |
| Languages | JavaScript · TypeScript · C# · Rust |
| Interface | CSS · CSS custom properties · Font Awesome |
| Web and data | React · Next.js · Node.js · Express · PostgreSQL · MongoDB · Supabase |
| Desktop and mobile | WPF · .NET 8 · React Native · Expo |
| AI and real time | Gemini · Socket.IO · WebRTC · WebSockets |
| Content | Markdown · marked · highlight.js |
| Deployment | Next.js static export · GitHub Pages / Vercel |

## Run Locally

### Requirements

- Node.js
- npm

### Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run lint` | Run ESLint |
| `npm run validate:articles` | Validate article metadata, links, and local images |
| `npm run test:articles` | Run article validation and rendering tests |
| `npm run build` | Generate the production static export in `out/` |

## Project Structure

```text
.github/workflows/   Deployment and GitHub data-sync automation
content/articles/    Markdown articles and publishing guide
public/              Static assets and public data
scripts/             Article validation and GitHub data utilities
src/app/             Routes, layouts, metadata, and styles
src/components/      Reusable interface components
src/config/          Portfolio and case-study content
src/lib/             Shared article loading and rendering utilities
tests/               Automated tests
```

### Updating portfolio content

Edit [`src/config/portfolio.js`](./src/config/portfolio.js) to update profile details, social links, experience, projects, achievements, and skills. Replace [`public/Adarsh-Kumar-Resume.pdf`](./public/Adarsh-Kumar-Resume.pdf) to publish an updated resume.

### Publishing articles

Add articles as Markdown files in [`content/articles/`](./content/articles/). The build generates routes only for articles marked `published: true`. See the [article publishing guide](./content/articles/README.md) for metadata requirements and the review workflow. Store article images in `public/articles/` and keep existing asset URLs stable.

### GitHub commit totals

The Git Commits card and Activity calendar count unique commits authored by the GitHub account across accessible repositories for the previous and current calendar years. The metric is based on commits only; it does not include other contribution types such as issues, pull requests, or reviews. The `Sync GitHub commit totals` workflow refreshes the data every 15 minutes.

To enable the workflow, add a repository Actions secret named `CONTRIBUTIONS_TOKEN`. The token must be authenticated as `Adshkumar`, have read access to each repository to include, and have **Contents: Read and write** access to this repository so the workflow can publish updates. Repositories do not need to be public. Never commit the token or include it in site code.

## Connect

- **Email:** [adarsh99733207@gmail.com](mailto:adarsh99733207@gmail.com)
- **LinkedIn:** [Adarsh Kumar](https://www.linkedin.com/in/adarsh-kumar62041/)
- **GitHub:** [@Adshkumar](https://github.com/Adshkumar)
- **LeetCode:** [Adarsh_kumar62041](https://leetcode.com/u/Adarsh_kumar62041/)
- **X:** [@Adshkumar62](https://x.com/Adshkumar62)
- **Instagram:** [@adsingh9.1](https://www.instagram.com/adsingh9.1/)

---

<div align="center">

Open to conversations about software, collaboration, and building useful products.

</div>
