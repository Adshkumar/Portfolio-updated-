<div align="center">

# Adarsh Kumar

### Full-Stack Developer | Building thoughtful digital experiences

I design and build responsive web applications that bring together clear user experiences, reliable backend systems, and practical product thinking.

[Portfolio](https://adsingh-portfolio.vercel.app/) · [Resume](./public/Adarsh-Kumar-Resume.pdf) · [GitHub](https://github.com/Adshkumar) · [LinkedIn](https://www.linkedin.com/in/adarsh-kumar62041/)

</div>

---

## About

I’m a Delhi-based full-stack developer focused on turning ideas into useful, well-crafted software. I enjoy working across the stack—from shaping an intuitive interface to building the APIs, authentication, and data flows behind it.

My current toolkit includes **JavaScript, React, Next.js, Node.js, Express, and MongoDB**. I’m pursuing a Diploma in Computer Science at **Chhotu Ram Rural Institute of Technology, Delhi**, while continuing to learn through hands-on projects.

## Selected Work

### Real-Time Chat Application

A room-based messaging app with secure authentication, live communication, online status, typing indicators, and persistent message history.

**Built with:** Node.js · Express · MongoDB · JWT · Socket.IO  
[Live application](https://chat-application-sable-rho.vercel.app/) · [Source code](https://github.com/Adshkumar/ChatApplication)

### AI Interview Platform

An interview preparation product where users can work through mock interviews and receive AI-generated feedback, with report generation and file handling built into the workflow.

**Built with:** React · Node.js · Express · MongoDB · JWT · Puppeteer  
[Live application](https://adarsh-interviewai.vercel.app/) · [Source code](https://github.com/Adshkumar/ai-interview-platform-)

### Uber-Inspired Ride-Booking Backend

A backend project exploring core ride-booking workflows, protected endpoints, driver management, real-time rider–driver coordination, and structured data models.

**Built with:** Node.js · Express · MongoDB · JWT · Socket.IO  
[Live application](https://uber-psi-three.vercel.app/) · [Source code](https://github.com/Adshkumar/UBER)

### Cross-Platform Finance App

A mobile-first finance application concept designed to make everyday financial activity simple to manage across Android and iOS.

**Built with:** React Native  
[Source code](https://github.com/Adshkumar/React-Native-Finance-App)

## Portfolio Highlights

- **A focused presentation:** experience, selected projects, achievements, skills, and contact details in one responsive portfolio.
- **A considered interface:** persistent light and dark themes, responsive layouts, and subtle scroll-reveal motion.
- **A live activity view:** GitHub activity in light mode and a daily GitHub/LeetCode rotation in dark mode, with recent data cached for quicker repeat visits.
- **A direct introduction:** the current resume is available from the portfolio’s hero section and navigation dock.

> **Activity data note:** Public GitHub data does not expose private daily contribution counts. The 2026 GitHub daily values shown in the portfolio are estimates based on public activity and the supplied calendar pattern; they are not an exact record of private contributions. The annual GitHub Contributions card is synced separately from GitHub's authenticated contribution calendar for the previous and current calendar years. LeetCode activity depends on the availability and freshness of its public calendar service.

## Tech Stack

| Area | Tools |
| --- | --- |
| Framework | Next.js 16 · React 19 |
| Languages | JavaScript |
| UI | CSS · CSS custom properties · Font Awesome |
| Backend and data | Node.js · Express · MongoDB · REST APIs |
| Authentication and real time | JWT · Socket.IO |
| Deployment | Static export · Vercel |

## Run Locally

### Requirements

- Node.js
- npm

### Install and start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Available scripts

```bash
npm run dev                # Start the development server
npm run lint               # Run ESLint
npm run validate:articles  # Validate Markdown metadata, links, and local article images
npm run test:articles      # Run focused article publishing and rendering tests
npm run build              # Generate the production static export
```

The production export is written to `out/`. The project uses Next.js static export and is configured for static hosting.

## Project Structure

```text
.github/
└── workflows/                 # Static deployment and GitHub data-sync automation
public/
├── articles/
│   └── images/                # Article diagrams and images (keep URL paths stable)
├── astra/                     # Public Astra assets
├── data/                      # Public data consumed by the portfolio
├── images/                    # Project and experience images
├── logos/                     # Public organization and project logos
└── ...                        # Public files served from the site root
content/
└── articles/                  # One Markdown file per article, plus publishing guide
scripts/
├── update-github-commits.mjs  # Refresh public GitHub commit totals
└── validate-articles.mjs      # Validate article content before publishing
src/
├── app/
│   ├── articles/              # Articles index and statically generated article routes
│   ├── borg/                  # Existing personal blog route
│   ├── experience/            # Experience and case-study routes
│   ├── globals.css            # Shared themes, typography, layout, and component styles
│   ├── layout.js              # Root layout and site metadata
│   ├── page.js                # Portfolio home route
│   └── sitemap.js             # Static sitemap
├── components/                # Portfolio, navigation, and article UI
├── config/                    # Portfolio and case-study content
└── lib/
    └── articles.mjs           # Article loading, validation, and safe Markdown rendering
tests/
└── articles.test.mjs          # Focused tests for article validation and rendering
package.json                   # Scripts and runtime dependencies
package-lock.json              # Reproducible npm dependency lockfile
next.config.mjs                # Next.js static-export settings
jsconfig.json                  # @/* import alias for src/*
eslint.config.mjs              # ESLint configuration
portfolio-content.json         # Legacy content snapshot; not imported by the app
```

### Structure and asset conventions

- Keep routes in `src/app`, reusable interface components in `src/components`, site data in `src/config`, and shared server-side article helpers in `src/lib`.
- Add technical articles as Markdown files in `content/articles`. The build generates pages only for articles with `published: true`; see [`content/articles/README.md`](./content/articles/README.md) for metadata and publishing steps.
- Put article diagrams and images in `public/articles/`. Other files in `public/` are served at their existing root-relative URLs (for example, `/adarsh-profile.png`). Keep those paths stable unless every reference is updated together.
- Keep automation in `.github/workflows/` and `scripts/`, and tests in `tests/`. `portfolio-content.json` is a legacy root-level content snapshot and is not imported by the current application; leave it in place unless its future use has been confirmed.
- `.next/`, `out/`, and `node_modules/` are generated/dependency directories, not source folders. They are ignored by Git and should not be manually reorganized or committed.
- `.env` is local configuration and is ignored by Git. Never commit credentials or tokens.
```

## Updating the Portfolio

Update [`src/config/portfolio.js`](./src/config/portfolio.js) to change profile details, social links, experience, projects, achievements, and skills. Replace `public/Adarsh-Kumar-Resume.pdf` to publish a new resume.

### GitHub commit totals

The Git Commits card and Activity calendar count unique commits authored by the GitHub account across all branches of accessible repositories for the previous and current calendar years. They use authenticated GitHub repository and commit APIs, splitting the total by public/private repository visibility. This is a commit-only metric, not the broader contribution-calendar total (which also includes eligible issues, pull requests, and reviews). The `Sync GitHub commit totals` workflow refreshes the data every 15 minutes.

Add a repository Actions secret named `CONTRIBUTIONS_TOKEN` using a token authenticated as `Adshkumar` with read access to every repository whose commits should count, including private repositories, and **Contents: Read and write** access to this portfolio repository so the workflow can publish updated data. Repository privacy does not need to be changed. Never put the token in the site code, a committed file, or a chat message. Commits in repositories the token cannot access will not be counted.

## Connect

- **Email:** [adarsh99733207@gmail.com](mailto:adarsh99733207@gmail.com)
- **LinkedIn:** [Adarsh Kumar](https://www.linkedin.com/in/adarsh-kumar62041/)
- **GitHub:** [@Adshkumar](https://github.com/Adshkumar)
- **LeetCode:** [Adarsh_kumar62041](https://leetcode.com/u/Adarsh_kumar62041/)
- **X:** [@Adshkumar62](https://x.com/Adshkumar62)
- **Instagram:** [@adsingh9.1](https://www.instagram.com/adsingh9.1/)

---

<div align="center">

**Open to conversations about software, collaboration, and building useful products.**

</div>
