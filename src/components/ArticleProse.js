"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function ArticleProse({ html }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const closeButtonRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!selectedImage) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") setSelectedImage(null);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [selectedImage]);

  function handleImageClick(event) {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest(".articleImageButton");
    const image = button?.querySelector("img");
    if (!button || !image) return;

    triggerRef.current = button;
    setSelectedImage({
      src: image.src,
      alt: image.alt,
      title: image.title,
    });
  }

  return (
    <>
      <article
        className="articleProse"
        onClick={handleImageClick}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {selectedImage && createPortal(
        <div
          className="articleImageViewer"
          role="dialog"
          aria-modal="true"
          aria-label={selectedImage.alt || "Full-size article image"}
          onClick={() => setSelectedImage(null)}
        >
          <button
            ref={closeButtonRef}
            className="articleImageViewerClose"
            type="button"
            onClick={() => setSelectedImage(null)}
          >
            Close
          </button>
          <figure className="articleImageViewerFigure" onClick={(event) => event.stopPropagation()}>
            <img src={selectedImage.src} alt={selectedImage.alt} />
            {selectedImage.title && <figcaption>{selectedImage.title}</figcaption>}
          </figure>
        </div>,
        document.body
      )}
    </>
  );
}
