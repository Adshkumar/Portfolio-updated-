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
    url: "https://x.com/Adarshsingh1a",
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
  { href: "#projects", label: "Projects" },
  { href: "#achievements", label: "Achievements" },
  { href: "#skills", label: "Skills" },
  { href: "#contact", label: "Contact" },
];

export const aboutStats = [
  // { number: "2+", label: "Years of Experience", link: "https://github.com/Adshkumar" },
  { number: "2", label: "Professional Roles", link: null },
  { number: "1", label: "Certification", link: null },
];

export const education = {
  institution: "Chhotu Ram Rural Institute Of Technology, Delhi",
  degree: "Diploma in Computer Science",
  duration: "September 2024 – June 2027",
  cgpa: "7-6",
};

export const experiences = [
  {
    company: "Full-Stack Developer",
    role: "Independent Builder",
    duration: "2023 – Present",
    type: "Remote • India",
    tech: "React • Node.js • Express • MongoDB",
    logo: null,
    points: [
      "Built real-world web products focused on usability, performance, and clean architecture.",
      "Developed full-stack features with authentication, APIs, database workflows, and responsive UI design.",
      "Worked across frontend, backend, and deployment to ship polished digital experiences end-to-end.",
    ],
  },
  {
    company: "Chat Application",
    role: "Full-Stack Project",
    duration: "2024",
    type: "Node.js • MongoDB • Socket.io",
    tech: "Node.js • Express.js • MongoDB • JWT • Socket.io",
    logo: "/images/chat-app.png",
    proofLink: "https://chat-application-sable-rho.vercel.app/",
    githubLink: "https://github.com/Adshkumar/ChatApplication",
    points: [
      "Built a real-time chat application with secure authentication, room-based messaging, live status, and typing indicators.",
      "Implemented WebSocket-powered communication and persistent message history for a seamless, interactive user experience.",
    ],
  },
  {
    company: "AI Interview Platform",
    role: "Full-Stack Product",
    duration: "2024",
    type: "React • Node.js • AI",
    tech: "React.js • Node.js • Express.js • MongoDB • JWT • Puppeteer",
    logo: "/images/GEN-AI.png",
    proofLink: "https://adarsh-interviewai.vercel.app/",
    githubLink: "https://github.com/Adshkumar/ai-interview-platform-",
    points: [
      "Built an AI-powered mock interview platform with user auth, interview flow logic, and automated feedback generation.",
      "Integrated Puppeteer-based report generation and file handling to create a more complete evaluation workflow.",
    ],
  },
  {
    company: "Uber Clone",
    role: "API & System Design",
    duration: "2024",
    type: "Backend Engineering",
    tech: "Node.js • Express.js • MongoDB • JWT • Socket.IO",
    logo: "/images/UBER.png",
    proofLink: "https://uber-psi-three.vercel.app/",
    githubLink: "https://github.com/Adshkumar/UBER",
    points: [
      "Built backend architecture for ride-booking workflows including secure auth, driver management, and protected endpoints.",
      "Implemented real-time communication for rider and driver coordination and optimized MongoDB data models for product workflows.",
    ],
  },
];

export const projects = [
  {
    title: "CHAT APPLICATION",
    description:
      "A real-time chat application built with secure user authentication and instant messaging features. Users can register, log in, join chat rooms, and exchange messages in real time. Implemented WebSocket-based communication for seamless live chatting, with typing indicators, online/offline user status, and message timestamps.",
    icon: "fas fa-comments",
    tech: ["Node.js", "Express.js", "MongoDB", "JWT", "Socket.io", "Authentication"],
    liveLink: "https://chat-application-sable-rho.vercel.app/",
    githubLink: "https://github.com/Adshkumar/ChatApplication",
  },
  {
    title: "AI Interview Platform",
    description:
      "A full-stack AI-powered interview preparation platform where users can authenticate, attempt mock interviews, and receive AI-generated feedback reports. Built with secure authentication, file handling, and Puppeteer-based report generation.",
    icon: "fas fa-brain",
    tech: ["Node.js", "Express.js", "MongoDB", "JWT", "React.js", "AI Integration", "Puppeteer"],
    liveLink: "https://adarsh-interviewai.vercel.app/",
    githubLink: "https://github.com/Adshkumar/ai-interview-platform-",
  },
  {
    title: "Uber",
    description:
      "A comprehensive backend system simulating Uber's core functionality including user authentication and driver management. Secured endpoints using JWT authentication, implemented real-time communication with Socket.IO for driver-passenger coordination, and designed efficient MongoDB schemas for data storage.",
    icon: "fas fa-car-side",
    tech: ["Node.js", "Express.js", "MongoDB", "JWT", "Socket.IO", "REST API"],
    liveLink: "https://uber-psi-three.vercel.app/",
    githubLink: "https://github.com/Adshkumar/UBER",
  },
  {
    title: "Finance App",
    description:
      "A cross-platform finance application built with React Native for Android and iOS. Designed to provide users with a simple and convenient way to manage their financial activities.",
    icon: "fas fa-wallet",
    tech: ["React Native", "Android", "iOS"],
    githubLink: "https://github.com/Adshkumar/React-Native-Finance-App",
  },
];

export const achievements = [
  {
    rank: "Project",
    title: "CHAT APPLICATION",
    desc: "Built a real-time messaging product with authentication, room support, and live communication features.",
    link: "https://github.com/Adshkumar/ChatApplication",
    linkText: "GitHub",
  },
  {
    rank: "Product",
    title: "AI Interview Platform",
    desc: "Developed an AI-driven interview prep platform with feedback mechanisms and automated reporting.",
    link: "https://adarsh-interviewai.vercel.app/",
    linkText: "Live Demo",
  },
  {
    rank: "System Design",
    title: "Uber Clone",
    desc: "Built a secure ride-booking backend with real-time coordination and scalable data models.",
    link: "https://github.com/Adshkumar/UBER",
    linkText: "Source Code",
  },
  {
    rank: "Mobile",
    title: "Finance App",
    desc: "Created a cross-platform finance app for Android and iOS with a clean user experience and mobile-first design.",
    link: "https://github.com/Adshkumar/React-Native-Finance-App",
    linkText: "View App",
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
