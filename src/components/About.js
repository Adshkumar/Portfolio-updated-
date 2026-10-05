import GitCommitCount from "@/components/GitCommitCount";
import { aboutStats, education } from "@/config/portfolio";

export default function About() {
  return (
    <section id="about" className="section reveal">
      <h2 className="sectionTitle">About</h2>
      <div className="sectionLead">
        <p>
          I&apos;m a Delhi-based <strong className="aboutHighlight">Full-Stack</strong> developer and founder building thoughtful digital
          experiences—from intuitive interfaces to robust, real-time systems.
          I turn ideas into reliable products with clean code and measurable impact.
          Creator of <strong className="aboutHighlight"><a href="https://tsdn.vercel.app/" target="_blank" rel="noopener noreferrer">The System Design Newspaper</a></strong> and the <strong className="aboutHighlight">Finance Tracker app</strong>.
        </p>
      </div>

      {education && (
        <div className="eduCard">
          <div className="eduIcon" aria-hidden="true">
            <i className="fas fa-graduation-cap"></i>
          </div>
          <div className="eduBody">
            <div className="eduInstitution">{education.institution}</div>
            <div className="eduDegree">{education.degree}</div>
            <div className="eduMeta">{education.duration}</div>
          </div>
        </div>
      )}

      {/* YC mention hidden for now
      <a
        href="https://www.ycombinator.com/startupschool"
        target="_blank"
        rel="noopener noreferrer"
        className="eduCard"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <div className="eduIcon" aria-hidden="true" style={{ background: "rgba(255,102,0,0.12)" }}>
          <img
            src="https://www.google.com/s2/favicons?domain=ycombinator.com&sz=64"
            alt="Y Combinator"
            style={{ width: 22, height: 22, objectFit: "contain", borderRadius: 4 }}
          />
        </div>
        <div className="eduBody">
          <div className="eduInstitution">Y Combinator</div>
          <div className="eduDegree">Startup School</div>
        </div>
      </a>
      */}

      <div className="aboutStats">
        {aboutStats.map((stat, i) => {
          const inner = (
            <>
              {stat.liveCount === "github-commits" ? (
                <GitCommitCount />
              ) : (
                <>
                  <span className="statNumber">{stat.number}</span>
                  <span className="statLabel">{stat.label}</span>
                </>
              )}
            </>
          );
          return stat.link ? (
            <a
              key={i}
              href={stat.link}
              target="_blank"
              rel="noopener noreferrer"
              className="statCard"
            >
              {inner}
            </a>
          ) : (
            <div key={i} className="statCard">
              {inner}
            </div>
          );
        })}
      </div>

    </section>
  );
}
