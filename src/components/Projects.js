import { projects } from "@/config/portfolio";

export default function Projects() {
  return (
    <section id="projects" className="section reveal">
      <h2 className="sectionTitle">Projects</h2>
      <div className="projectList">
        {projects.map((project, i) => (
          <article key={i} className="projectItem">
            <div className="projectTitle">
              <span>{project.title}</span>
              <span className="projectLinks">
                {project.liveLink && (
                  <a
                    href={project.liveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${project.title} live`}
                  >
                    <i className="fas fa-external-link-alt"></i>
                  </a>
                )}
                {project.githubLink && (
                  <a
                    href={project.githubLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${project.title} source`}
                  >
                    <i className="fab fa-github"></i>
                  </a>
                )}
              </span>
            </div>
            <p className="projectDesc">{project.description}</p>
            <div className="projectTech">
              {project.tech.map((t, j) => (
                <span key={j}>{t}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
