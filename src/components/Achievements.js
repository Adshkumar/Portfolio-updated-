import { achievements } from "@/config/portfolio";

export default function Achievements() {
  return (
    <section id="achievements" className="section reveal">
      <h2 className="sectionTitle">Achievements</h2>
      <div className="achList">
        {achievements.map((a, i) => (
          <div key={i} className="achItem">
            <div className="achRank">{a.rank}</div>
            <div className="achBody">
              <div className="achTitle">{a.title}</div>
              <div className="achDesc">{a.desc}</div>
              {a.link && (
                <a
                  href={a.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="achLink"
                >
                  {a.linkText} →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
