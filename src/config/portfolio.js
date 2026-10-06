/**
 * Portfolio Configuration
 *
 * Edit this file to update your portfolio information.
 * The website will automatically reflect the changes.
 */

export const siteConfig = {
  name: "Adarsh Kumar",
  initials: "AK",
  title: "Adarsh Kumar",
  description:
    "Full-stack developer passionate about building modern web applications that solve real-world problems with elegant, user-centered design.",
  tagline:
    "Software Engineer making the complex feel simple—and the useful feel exceptional.",
  resumeLink: "/Adarsh-Kumar-Resume.pdf",
};

export const contactInfo = {
  email: "adarsh99733207@gmail.com",
};

export const socialLinks = [
  {
    platform: "github",
    url: "https://github.com/Adshkumar",
    icon: "fab fa-github",
    label: "GitHub",
  },
  {
    platform: "linkedin",
    url: "https://www.linkedin.com/in/adarsh-kumar62041/",
    icon: "fab fa-linkedin-in",
    label: "LinkedIn",
  },
  {
    platform: "twitter",
    url: "https://x.com/Adshkumar62",
    icon: "fab fa-x-twitter",
    label: "X (Twitter)",
  },
  {
    platform: "instagram",
    url: "https://www.instagram.com/adsingh9.1/",
    icon: "fab fa-instagram",
    label: "Instagram",
  },
  {
    platform: "email",
    url: "mailto:adarsh99733207@gmail.com",
    icon: "fas fa-envelope",
    label: "Email",
  },
];

export const codingProfiles = [

  {
    platform: "LeetCode",
    rating: "Problem Solving",
    url: "https://leetcode.com/u/Adarsh_kumar62041/",
    className: "leetcode",
  },
];

export const navLinks = [
  { href: "#home", label: "Home" },
  { href: "#about", label: "About" },
  { href: "#experience", label: "Experience" },
  { href: "#achievements", label: "Achievements" },
  { href: "#skills", label: "Skills" },
  { href: "#contact", label: "Contact" },
];

export const aboutStats = [
  // { number: "2+", label: "Years of Experience", link: "https://github.com/Adshkumar" },
  {
    liveCount: "github-commits",
    label: "Git Commits",
    link: "https://github.com/search?q=owner%3AAdshkumar+commits&type=commits",
  },
  { number: "1", label: "Certification", link: null },
];

export const education = {
  institution: "Chhotu Ram Rural Institute of Technology, Delhi",
  degree: "Diploma in Computer Science",
  duration: "Sept 2024 – Jul 2027",
};

export const experiences = [
  {
    company: "AKM Techie",
    role: "Intern Web Developer",
    duration: "June 2025 – July 2025",
    type: "India",
    tech: "HTML • CSS • JavaScript • Responsive Design • UI/UX",
    logo: null,
    articleLink: "/experience/akm-techie",
    // proofLink: "https://dtest-inky.vercel.app/",
    githubLink: "https://github.com/Adshkumar/Dtest",
    points: [
      "Developed DTEST, a responsive multi-page website featuring an admin dashboard, client portal, and service pages.",
      "Created consistent, custom-styled interfaces and interactive experiences for contact forms and service demonstrations.",
      "Built dynamic business statistics displays and refined layouts to work across devices.",
    ],
  },
  {
    company: "Finance Tracker",
    role: "Full-Stack Mobile Project",
    type: "Personal Project",
    tech: "React Native • Expo • Supabase • PostgreSQL • Clerk • Gemini AI • NativeWind",
    logo: "/finance-icon-logo.png",
    articleLink: "/experience/finance-tracker",
    proofLink: "",
    githubLink: "https://github.com/Adshkumar/Finance-Tracker",
    points: [
      "Built a mobile budgeting app for tracking accounts, income, expenses, and monthly budgets across iOS and Android.",
      "Integrated Gemini AI for receipt scanning, voice-based transaction entry, and conversational spending assistance.",
      "Implemented Clerk authentication with Supabase and PostgreSQL, including row-level security for user financial data.",
      "Added transaction search and analytics, Excel export, account management, and biometric or PIN-based app locking.",
    ],
  },
  {
    company: "URL Shortener",
    role: "Full-Stack Project",
    duration: "June 2026 – July 2026",
    type: "Self Project • India",
    tech: "MongoDB • Express.js • React.js • Node.js • JWT • REST APIs • Tailwind CSS • Docker",
    logo: "/url-shortener-thumbnail.png",
    articleLink: "/experience/url-shortener",
    proofLink: "https://url-linksnap.vercel.app/",
    githubLink: "https://github.com/Adshkumar/URL-Shortener",
    points: [
      "Built a full-stack platform for creating custom short links, managing URLs, and tracking link performance.",
      "Implemented JWT authentication, protected user dashboards, click analytics, and real-time URL statistics.",
      "Developed responsive link-management interfaces and REST APIs with the MERN stack.",
      "Orchestrated the MongoDB database, API, and frontend with Docker Compose, using a shared bridge network and persistent database storage.",
    ],
  },
  {
    company: "Agentic AI",
    role: "Full-Stack AI Project",
    duration: "May 2026 – June 2026",
    type: "Self Project • India",
    tech: "Next.js • TypeScript • Clerk • Prisma • PostgreSQL • Supabase • Gemini • Cline SDK • Sandpack",
    logo: null,
    articleLink: "/experience/agentic-ai",
    proofLink: "https://agentic-flow-ai.vercel.app/",
    githubLink: "https://github.com/Adshkumar/Agentic-AI",
    points: [
      "Built an AI-powered application builder that turns natural-language prompts into React code rendered in a live browser preview.",
      "Integrated Gemini generation and a Cline SDK agent for streaming, file-by-file app improvements in authenticated workspaces.",
      "Persisted chat history, workspaces, generated files, plan details, and credits with Clerk, Prisma, and PostgreSQL.",
    ],
  },
  {
    company: "Chat Application",
    role: "Full-Stack Project",
    duration: "2024",
    type: "Node.js • MongoDB • Socket.io",
    tech: "Node.js • Express.js • MongoDB • JWT • Socket.io • Docker",
    logo: "/images/chat-app.png",
    articleLink: "/experience/chat-application",
    proofLink: "https://chat-application-sable-rho.vercel.app/",
    githubLink: "https://github.com/Adshkumar/ChatApplication",
    points: [
      "Built a real-time chat application with secure authentication, room-based messaging, live status, and typing indicators.",
      "Implemented WebSocket-powered communication and persistent message history for a seamless, interactive user experience.",
      "Added separate Dockerfiles for the backend and frontend, plus Docker Compose to run the application services together.",
    ],
  },
  {
    company: "AI Interview Platform",
    role: "Full-Stack Product",
    duration: "2024",
    type: "React • Node.js • AI",
    tech: "React.js • Node.js • Express.js • MongoDB • JWT • Puppeteer • Docker",
    logo: "/images/GEN-AI.png",
    articleLink: "/experience/ai-interview-platform",
    proofLink: "https://adarsh-interviewai.vercel.app/",
    githubLink: "https://github.com/Adshkumar/ai-interview-platform-",
    points: [
      "Built an AI-powered mock interview platform with user auth, interview flow logic, and automated feedback generation.",
      "Integrated Puppeteer-based report generation and file handling to create a more complete evaluation workflow.",
      "Containerized the frontend and backend with separate Dockerfiles for isolated Node.js runtime environments.",
    ],
  },
  {
    company: "Uber Clone",
    role: "API & System Design",
    duration: "2024",
    type: "Backend Engineering",
    tech: "React • Vite • Node.js • Express • MongoDB • Socket.IO • Google Maps • Razorpay",
    logo: "/images/UBER.png",
    articleLink: "/experience/uber-clone",
    proofLink: "https://uber-psi-three.vercel.app/",
    githubLink: "https://github.com/Adshkumar/UBER",
    points: [
      "Built backend architecture for ride-booking workflows including secure auth, driver management, and protected endpoints.",
      "Implemented real-time communication for rider and driver coordination and optimized MongoDB data models for product workflows.",
    ],
  },
];

export const projects = [];

/*
export const projects = [
  {
    title: "DTEST Client Portal",
    description:
      "A multi-page DTEST portal with client and admin areas, login, chatbot information, practical resources, and business statistics.",
    icon: "fas fa-laptop-code",
    tech: ["PHP", "CSS"],
    liveLink: "https://dtest-inky.vercel.app/",
    githubLink: "https://github.com/Adshkumar/Dtest",
  },
  {
    title: "DTEST Site",
    description:
      "A standalone DTEST website introducing its AI chatbot service and explaining how the service works.",
    icon: "fas fa-robot",
    tech: ["HTML"],
    liveLink: "https://dtest-site.vercel.app/",
    githubLink: "https://github.com/Adshkumar/Dtest_site",
  },
  {
    title: "Bloggify",
    description:
      "A full-stack blogging platform with user accounts, session-based authentication, and tools to create, edit, and manage blog posts.",
    icon: "fas fa-pen-nib",
    tech: ["Node.js", "Express.js", "MongoDB", "EJS", "Sessions", "Multer"],
    liveLink: "https://bloggify-nu.vercel.app/",
    githubLink: "https://github.com/Adshkumar/Bloggify",
  },
  {
    title: "Zomato",
    description:
      "A full-stack food discovery application with user authentication, food listings, and food-partner workflows.",
    icon: "fas fa-utensils",
    tech: ["React", "Vite", "Tailwind CSS", "Express.js", "MongoDB", "Cloudinary"],
    liveLink: "https://zomato-silk-phi.vercel.app/",
    githubLink: "https://github.com/Adshkumar/Zomato",
  },
  {
    title: "Bank Transaction Backend",
    description:
      "A Node.js backend for secure banking workflows, with authentication, account operations, and transaction APIs backed by MongoDB.",
    icon: "fas fa-building-columns",
    tech: ["Node.js", "Express.js", "MongoDB", "JWT", "REST API"],
    githubLink: "https://github.com/Adshkumar/bank-transaction-backend",
  },
  {
    title: "URL Shortener",
    description:
      "A full-stack link management platform for creating custom short URLs, managing links, and tracking clicks, devices, browsers, and daily trends. Includes JWT authentication, custom aliases, QR code generation, a responsive analytics dashboard, and Docker Compose services for MongoDB, the API, and frontend.",
    icon: "fas fa-link",
    tech: ["React", "Vite", "Tailwind CSS", "Express.js", "MongoDB", "JWT", "Analytics", "Docker"],
    liveLink: "https://url-shortener-seven-lac.vercel.app/",
    githubLink: "https://github.com/Adshkumar/URL-Shortener",
  },
];
*/

export const achievements = [
  {
    rank: "Problem Solving",
    title: "LeetCode",
    desc: "Solved 160+ DSA problems and earned badges, demonstrating consistent practice and strong algorithmic thinking.",
    link: "https://leetcode.com/u/Adarsh_kumar62041/",
    linkText: "LeetCode Profile",
  },
  {
    rank: "Internship",
    title: "Internship Certificate",
    desc: "Successfully completed a web development internship with hands-on project experience.",
    link: "/logos/Internship_Completion_Letter.pdf",
    linkText: "View Certificate",
  },
  {
    rank: "Portfolio",
    title: "Full-Stack Projects",
    desc: "Delivered 6+ full-stack projects featuring real-time functionality and production-ready implementations.",
  },
];

export const skillCategories = [
  {
    title: "Frontend",
    icon: "fas fa-laptop-code",
    skills: ["React", "Next.js", "JavaScript", "TypeScript", "HTML/CSS", "Tailwind", "Responsive Design"],
  },
  {
    title: "Backend",
    icon: "fas fa-server",
    skills: ["Node.js", "Express.js", "REST APIs", "JWT", "Socket.io", "Authentication", "API Design"],
  },
  {
    title: "Databases & Tools",
    icon: "fas fa-database",
    skills: ["MongoDB",  "Git", "Docker", "Vercel", "GitHub", "Postman"],
  },
  {
    title: "Mobile & AI",
    icon: "fas fa-robot",
    skills: ["React Native", "Android", "AI Integration", "Prompt Engineering", "Automation", "Puppeteer"],
  },
];
