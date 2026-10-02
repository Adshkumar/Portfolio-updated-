import { skillCategories } from "@/config/portfolio";

const ICON_SLUGS = {
  "C++": "cplusplus",
  Python: "python",
  JavaScript: "javascript",
  TypeScript: "typescript",
  HTML: "html5",
  CSS: "css3",
  React: "react",
  "Next.js": "nextdotjs",
  "Express.js": "express",
  Hono: "hono",
  Vite: "vite",
  Prisma: "prisma",
  NextAuth: "nextdotjs",
  WebSocket: "socketdotio",
  WebRTC: "webrtc",
  Supabase: "supabase",
  Appwrite: "appwrite",
  PostgreSQL: "postgresql",
  NeonDB: "neon",
  MongoDB: "mongodb",
  Redis: "redis",
  Docker: "docker",
  AWS: "amazonaws",
  Cloudflare: "cloudflare",
  Nginx: "nginx",
  "CI/CD": "githubactions",
  Git: "git",
  GitHub: "github",
  Postman: "postman",
  Vercel: "vercel",
  Cloudinary: "cloudinary",
  Render: "render",
};

export default function Skills() {
  return (
    <section id="skills" className="section reveal">
      <h2 className="sectionTitle">Skills</h2>
      <div className="skillsList">
        {skillCategories.map((cat, i) => (
          <div key={i} className="skillRow">
            <div className="skillRowTitle">{cat.title}</div>
            <div className="skillTags">
              {cat.skills.map((skill, j) => {
                const slug = ICON_SLUGS[skill];
                return (
                  <span key={j}>
                    {slug && (
                      <img
                        className="skillIcon"
                        src={`https://cdn.simpleicons.org/${slug}/ffffff`}
                        alt=""
                        aria-hidden="true"
                      />
                    )}
                    {skill}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
