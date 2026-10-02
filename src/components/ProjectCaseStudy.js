import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import ThemeNavbar from "@/components/ThemeNavbar";
import Link from "next/link";

export default function ProjectCaseStudy({ study }) {
  return (
    <div className="page">
      <main className="container">
        <Hero />
        <Link href="/experience" className="experienceBack">
          <i className="fas fa-arrow-left" aria-hidden="true"></i>
          Back to experience
        </Link>

        <article className="caseStudy">
          <header className="caseStudyHeader">
            <p className="caseStudyEyebrow">{study.eyebrow}</p>
            <h1 className="caseStudyTitle">{study.title}</h1>
            <p className="caseStudyLead">{study.lead}</p>
            <div className="caseStudyLinks">
              {study.links.map((link) => (
                <a
                  href={link.href}
                  key={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i
                    className={
                      link.label.toLowerCase().includes("source") ||
                      link.label.toLowerCase().includes("github")
                        ? "fab fa-github"
                        : "fas fa-external-link-alt"
                    }
                    aria-hidden="true"
                  ></i>
                  {link.label}
                </a>
              ))}
            </div>
          </header>

          {study.heroImage && (
            <figure className="caseStudyScreenshot">
              <img
                src={study.heroImage}
                alt={study.heroImageAlt || `${study.title} project preview`}
                loading="eager"
                fetchPriority="high"
              />
              <figcaption>
                Project banner from the repository README.
              </figcaption>
            </figure>
          )}

          <section className="caseStudySection" aria-labelledby="overview">
            <h2 id="overview">Overview</h2>
            <p>{study.lead}</p>
            <div className="caseStudyFacts" aria-label="Project summary">
              {study.facts.map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="caseStudySection" aria-labelledby="architecture">
            <h2 id="architecture">System architecture</h2>
            <p>
              A high-level view of the components and boundaries described by
              the project source and documentation.
            </p>
            <div className="caseStudyArchitecture">
              {study.architecture.map(([title, detail], index) => (
                <div className="caseStudyArchitectureStep" key={title}>
                  <div className="caseStudyArchitectureNode">
                    <span className="caseStudyArchitectureIndex">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <strong>{title}</strong>
                      <span>{detail}</span>
                    </div>
                  </div>
                  {index < study.architecture.length - 1 && (
                    <div
                      className="caseStudyArchitectureArrow"
                      aria-hidden="true"
                    >
                      <i className="fas fa-arrow-down"></i>
                      <span>requests · events · persisted state</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="caseStudySection" aria-labelledby="workflow">
            <h2 id="workflow">User and data flow</h2>
            <div className="caseStudyFlow">
              {study.flow.map(([title, detail], index) => (
                <div className="caseStudyFlowStep" key={title}>
                  <span>{index + 1}</span>
                  <strong>{title}</strong>
                  <p>{detail}</p>
                </div>
              ))}
            </div>
          </section>

          {study.lifecycle && (
            <section
              className="caseStudySection"
              aria-labelledby="ride-lifecycle"
            >
              <h2 id="ride-lifecycle">Ride lifecycle</h2>
              <p>
                The lifecycle is enforced through state checks in the ride
                service: a captain can only accept a pending request, start an
                accepted ride assigned to them, and end their ongoing ride.
              </p>
              <div className="caseStudyLifecycle">
                {study.lifecycle.map(([state, detail], index) => (
                  <div className="caseStudyLifecycleStep" key={state}>
                    <span className="caseStudyLifecycleMarker">
                      {index + 1}
                    </span>
                    <div>
                      <strong>{state}</strong>
                      <p>{detail}</p>
                    </div>
                    {index < study.lifecycle.length - 1 && (
                      <i
                        className="fas fa-arrow-right"
                        aria-hidden="true"
                      ></i>
                    )}
                  </div>
                ))}
              </div>
              {study.lifecycleNote && (
                <p className="caseStudyLifecycleNote">{study.lifecycleNote}</p>
              )}
            </section>
          )}

          {study.fareRates && (
            <section
              className="caseStudySection"
              aria-labelledby="fare-model"
            >
              <h2 id="fare-model">Fare model</h2>
              <p>
                Estimate = base fare + (distance in km × vehicle rate) +
                (duration in minutes × vehicle rate). The current distance/time
                service is a development stub; implementation details are
                called out below.
              </p>
              <div className="caseStudyTableWrap">
                <table className="caseStudyTable">
                  <thead>
                    <tr>
                      <th scope="col">Vehicle</th>
                      <th scope="col">Base</th>
                      <th scope="col">Per kilometre</th>
                      <th scope="col">Per minute</th>
                    </tr>
                  </thead>
                  <tbody>
                    {study.fareRates.map(([vehicle, base, perKm, perMinute]) => (
                      <tr key={vehicle}>
                        <th scope="row">{vehicle}</th>
                        <td>{base}</td>
                        <td>{perKm}</td>
                        <td>{perMinute}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="caseStudySection" aria-labelledby="capabilities">
            <h2 id="capabilities">Product capabilities</h2>
            <div className="caseStudyFeatureList">
              {study.areas.map((area) => (
                <article className="caseStudyFeature" key={area.title}>
                  <h3>{area.title}</h3>
                  <ul className="caseStudyDetailList">
                    {area.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <section className="caseStudySection" aria-labelledby="data-model">
            <h2 id="data-model">Data model and domain</h2>
            <div className="caseStudyDataDiagram">
              {study.dataModel.map((domain) => (
                <div className="caseStudyDataDomain" key={domain.title}>
                  <h3>{domain.title}</h3>
                  {domain.entities.map(([name, detail]) => (
                    <div className="caseStudyEntity" key={name}>
                      <strong>{name}</strong>
                      <span>{detail}</span>
                    </div>
                  ))}
                  <p className="caseStudyRelation">{domain.relation}</p>
                </div>
              ))}
            </div>
          </section>

          <section
            className="caseStudySection"
            aria-labelledby="data-retrieval"
          >
            <h2 id="data-retrieval">Fast data retrieval and page delivery</h2>
            <p>
              This portfolio case study is statically generated at build time,
              so opening it does not wait for a case-study API or database
              query. The notes below describe the project&apos;s own data path;
              they distinguish implemented behavior from scale-up opportunities.
            </p>
            <div className="caseStudyPerformanceGrid">
              {(study.dataRetrieval || [
                [
                  "Pre-rendered case-study content",
                  "The project details are included in the generated HTML; no runtime content fetch is needed.",
                ],
                [
                  "Application data path",
                  "Project-specific database and API retrieval behavior is documented only where supported by the available source.",
                ],
              ]).map(([title, detail]) => (
                <article key={title}>
                  <h3>{title}</h3>
                  <p>{detail}</p>
                </article>
              ))}
            </div>
          </section>

          {study.apiGroups && (
            <section className="caseStudySection" aria-labelledby="api-surface">
              <h2 id="api-surface">HTTP API surface</h2>
              <div className="caseStudyApiGrid">
                {study.apiGroups.map(([title, routes]) => (
                  <article className="caseStudyApiCard" key={title}>
                    <h3>{title}</h3>
                    <p>{routes}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {study.socketEvents && (
            <section
              className="caseStudySection"
              aria-labelledby="socket-events"
            >
              <h2 id="socket-events">Realtime event contract</h2>
              <div className="caseStudyTableWrap">
                <table className="caseStudyTable">
                  <thead>
                    <tr>
                      <th scope="col">Event</th>
                      <th scope="col">Direction</th>
                      <th scope="col">Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {study.socketEvents.map(([event, direction, purpose]) => (
                      <tr key={event}>
                        <th scope="row">
                          <code>{event}</code>
                        </th>
                        <td>{direction}</td>
                        <td>{purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {study.implementationNotes && (
            <section
              className="caseStudySection caseStudyImplementationNotes"
              aria-labelledby="implementation-notes"
            >
              <h2 id="implementation-notes">
                Implementation notes and current limits
              </h2>
              <p>
                These details were checked against the repository code as well
                as its README, so the design goals are not confused with
                behavior that is already implemented.
              </p>
              <ul className="caseStudyDetailList">
                {study.implementationNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="caseStudySection" aria-labelledby="engineering">
            <h2 id="engineering">Engineering decisions</h2>
            <div className="caseStudyEngineeringGrid">
              {study.engineering.map(([title, detail]) => (
                <article key={title}>
                  <h3>{title}</h3>
                  <p>{detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="caseStudySection" aria-labelledby="delivery">
            <h2 id="delivery">Setup and delivery</h2>
            <ul className="caseStudyDetailList">
              {study.delivery.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </section>

          <section className="caseStudySection" aria-labelledby="technology">
            <h2 id="technology">Technology</h2>
            <div className="caseStudyTech">
              {study.technologies.map((technology) => (
                <span key={technology}>{technology}</span>
              ))}
            </div>
          </section>

          <section className="caseStudySection caseStudyClosing">
            <h2>Explore the project</h2>
            <p>
              Open the project links above to review its source, documentation,
              or available deployment.
            </p>
            <div className="caseStudyLinks">
              {study.links.map((link) => (
                <a
                  href={link.href}
                  key={`footer-${link.href}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i
                    className={
                      link.label.toLowerCase().includes("source") ||
                      link.label.toLowerCase().includes("github")
                        ? "fab fa-github"
                        : "fas fa-external-link-alt"
                    }
                    aria-hidden="true"
                  ></i>
                  {link.label}
                </a>
              ))}
            </div>
          </section>
        </article>
        <Footer />
      </main>
      <ThemeNavbar />
    </div>
  );
}
