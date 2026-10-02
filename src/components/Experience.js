import { experiences } from "@/config/portfolio";
import Link from "next/link";

function initials(company) {
  const words = company.replace(/[–-]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return company.slice(0, 3);
}

export default function Experience({ showAll = false }) {
  const visibleExperiences = showAll ? experiences : experiences.slice(0, 3);

  return (
    <section id="experience" className="section reveal">
      <div className="expSectionHeader">
        <h2 className="sectionTitle">Experience</h2>
        {!showAll && experiences.length > 3 && (
          <Link href="/experience" className="expShowAll">
            all →
          </Link>
        )}
      </div>
      <div className="expList">
        {visibleExperiences.map((exp, i) => (
          <div key={i} className="expItem">
            <div className="expBadge">
              {exp.logo ? (
                <img src={exp.logo} alt={`${exp.company} logo`} />
              ) : (
                initials(exp.company)
              )}
            </div>
            <div className="expBody">
              <div className="expHeader">
                <div>
                  <div className="expCompany">{exp.company}</div>
                  <div className="expRole">{exp.role}</div>
                </div>
                {exp.duration && (
                  <div className="expDuration">{exp.duration}</div>
                )}
              </div>
              {exp.type && <div className="expType">{exp.type}</div>}
              {exp.tech && <div className="expTech">{exp.tech}</div>}
              <ul className="expPoints">
                {exp.points.map((point, j) => (
                  <li key={j} dangerouslySetInnerHTML={{ __html: point }} />
                ))}
              </ul>
              {(exp.proofLink || exp.githubLink || exp.articleLink) && (
                <div className="expLinks">
                  {exp.proofLink && (
                    <a
                      href={exp.proofLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="fas fa-external-link-alt"></i>
                      {exp.githubLink ? "Live" : "View"}
                    </a>
                  )}
                  {exp.githubLink && (
                    <a
                      href={exp.githubLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="fab fa-github"></i>
                      GitHub
                    </a>
                  )}
                  {exp.articleLink && (
                    <Link href={exp.articleLink}>
                      <i
                        className="fas fa-arrow-up-right-from-square"
                        aria-hidden="true"
                      ></i>
                      View case study
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
