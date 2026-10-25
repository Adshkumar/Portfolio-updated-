import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/portfolio";

export default function ArticleAuthorHeader() {
  return (
    <header className="hero articleAuthorHeader">
      <div className="heroMain">
        <Link className="heroAvatar" href="/" aria-label="Adarsh Kumar portfolio home">
          <Image
            src="/adarsh-profile.png"
            alt=""
            className="heroAvatarPhoto"
            width={150}
            height={150}
            priority
          />
          <Image
            src="/adarsh-profile-light.png"
            alt=""
            aria-hidden="true"
            className="heroAvatarLight"
            width={150}
            height={150}
            priority
          />
        </Link>
        <div className="heroText">
          <Link href="/" className="heroName">
            Hey, I&apos;m {siteConfig.name.split(" ")[0]}
          </Link>
          <p className="heroTagline">{siteConfig.tagline}</p>
        </div>
      </div>
      <div className="heroActions articleAuthorActions">
        <Link href="/borg" className="heroResume" aria-label="Blog" title="Blog">
          <i className="fas fa-blog" style={{ fontSize: "1.25rem" }} aria-hidden="true"></i>
        </Link>
        <Link href="/articles" className="heroResume" aria-label="Articles" title="Articles">
          <i className="fas fa-book-open" style={{ fontSize: "1.25rem" }} aria-hidden="true"></i>
        </Link>
        {siteConfig.resumeLink && (
          <a
            href={siteConfig.resumeLink}
            target="_blank"
            rel="noopener noreferrer"
            className="heroResume"
            aria-label="Resume"
            title="Resume"
          >
            <i className="fas fa-file-alt" style={{ fontSize: "1.25rem" }} aria-hidden="true"></i>
          </a>
        )}
      </div>
    </header>
  );
}
