"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { siteConfig } from "@/config/portfolio";
import GistContent from "@/components/GistContent";

export default function Hero({ initialBlogOpen = false }) {
  const [blogOpen, setBlogOpen] = useState(initialBlogOpen);
  const router = useRouter();
  const progressRef = useRef(null);

  // Reading progress: width of the top bar follows modal scroll
  const onBodyScroll = useCallback((e) => {
    const el = e.currentTarget;
    const max = el.scrollHeight - el.clientHeight;
    const pct = max > 0 ? (el.scrollTop / max) * 100 : 0;
    if (progressRef.current) progressRef.current.style.width = `${pct}%`;
  }, []);

  const closeBlog = () => {
    setBlogOpen(false);
    // If we landed directly on /borg, go back to the homepage URL
    if (initialBlogOpen) router.replace("/");
  };

  // Close on Escape + lock body scroll while the modal is open
  useEffect(() => {
    if (!blogOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeBlog();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [blogOpen]);

  return (
    <section id="home" className="hero">
      <div className="heroMain">
        <div className="heroAvatar">
          <Image
            src="/adarsh-profile.png"
            alt={siteConfig.name}
            width={150}
            height={150}
            priority
          />
        </div>
        <div className="heroText">
          <p className="heroName">Hey, I&apos;m {siteConfig.name.split(" ")[0]}</p>
          <p className="heroTagline">{siteConfig.tagline}</p>
        </div>
      </div>
      <div className="heroActions">
        <button
          type="button"
          aria-label="Blog"
          title="Blog"
          className="heroResume"
          onClick={() => setBlogOpen(true)}
        >
          <i className="fas fa-blog" style={{ fontSize: "1.25rem" }}></i>
        </button>
        <a
          href={siteConfig.resumeLink}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View Resume"
          title="Resume"
          className="heroResume"
        >
          <i className="fas fa-file-alt" style={{ fontSize: "1.25rem" }}></i>
        </a>
      </div>

      {blogOpen && (
        <div
          className="blogModalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Blog"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeBlog();
          }}
        >
          <div className="blogModal">
            <div className="blogProgressTrack" aria-hidden="true">
              <div className="blogProgressBar" ref={progressRef}></div>
            </div>
            <button
              type="button"
              aria-label="Close"
              title="Close"
              className="blogModalClose"
              onClick={closeBlog}
            >
              <i className="fas fa-times"></i>
            </button>
            <div className="blogModalBody" onScroll={onBodyScroll}>
              <GistContent />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
