# Adarsh Kumar — Portfolio

Personal portfolio for **Adarsh Kumar**, built with Next.js and React.

- **Live site:** [adsingh-portfolio.vercel.app](https://adsingh-portfolio.vercel.app/)
- **Resume:** [View or download PDF](./public/Adarsh-Kumar-Resume.pdf)

## Features

- Responsive portfolio with Home, About, Experience, Projects, Achievements, Activity, Skills, and Contact sections
- Persistent light and dark themes
- GitHub and LeetCode activity calendar:
  - Light mode displays GitHub activity.
  - Dark mode alternates between GitHub and LeetCode by day.
  - The most recently loaded calendars are cached in the browser and refreshed in the background.
  - The 2026 GitHub daily contribution counts are estimates based on public activity; private daily counts are not available from the public data source.
- Resume links in the hero section and navigation dock
- Local images for experience badges
- Scroll reveal animations

## Tech Stack

- Next.js 16 with the App Router and static export
- React 19
- JavaScript
- CSS with custom properties
- Font Awesome icons

## Getting Started

Requirements: Node.js and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Commands

```bash
npm run dev    # Start the development server
npm run lint   # Run ESLint
npm run build  # Create the production static export
```

The production export is written to `out/`. The project is configured for static hosting and can be deployed through Vercel.

## Project Structure

```text
public/
├── Adarsh-Kumar-Resume.pdf
└── images/                  # Experience badge images
src/
├── app/
│   ├── globals.css          # Global styles, themes, and responsive layout
│   ├── layout.js            # Root layout and metadata
│   └── page.js              # Main page and theme state
├── components/              # Portfolio sections and UI components
└── config/
    └── portfolio.js         # Profile, links, projects, and section content
```

## Updating Portfolio Content

Edit [`src/config/portfolio.js`](./src/config/portfolio.js) to update profile details, social links, experience, projects, achievements, and skills. Replace the PDF at `public/Adarsh-Kumar-Resume.pdf` to update the resume.

## Contact

- **LinkedIn:** [Adarsh Kumar](https://www.linkedin.com/in/adarsh-kumar62041/)
- **X:** [@Adarshsingh1a](https://x.com/Adarshsingh1a)
- **GitHub:** [@Adshkumar](https://github.com/Adshkumar)
- **Instagram:** [@adsingh9.1](https://www.instagram.com/adsingh9.1/)
- **LeetCode:** [Adarsh_kumar62041](https://leetcode.com/u/Adarsh_kumar62041/)
- **Email:** [adarsh99733207@gmail.com](mailto:adarsh99733207@gmail.com)
