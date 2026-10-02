"use client";

import { useEffect } from "react";
import { getCalApi } from "@calcom/embed-react";
import { contactInfo } from "@/config/portfolio";

const CAL_USER = "adarsh-kumar";

export default function Contact() {
  useEffect(() => {
    (async () => {
      const cal = await getCalApi({ namespace: "15min" });
      cal("ui", { hideEventTypeDetails: false, layout: "month_view" });
    })();
    (async () => {
      const cal = await getCalApi({ namespace: "30min" });
      cal("ui", { hideEventTypeDetails: false, layout: "month_view" });
    })();
  }, []);

  return (
    <section id="contact" className="section reveal">
      <h2 className="sectionTitle">Contact</h2>
      <div className="sectionLead bookCallLead">
        <p>Got a project, idea, or just want to chat? Let&apos;s connect.</p>
      </div>

      <div className="bookCallRow">
        <button
          type="button"
          className="btn btnGhost"
          data-cal-namespace="15min"
          data-cal-link={`${CAL_USER}/15min`}
          data-cal-config='{"layout":"month_view"}'
        >
          Book a 15-min call
        </button>
        <button
          type="button"
          className="btn btnPrimary"
          data-cal-namespace="30min"
          data-cal-link={`${CAL_USER}/30min`}
          data-cal-config='{"layout":"month_view"}'
        >
          Book a 30-min call
        </button>
      </div>

      <div className="contactList">
        <a href={`mailto:${contactInfo.email}`} className="contactRow">
          <i className="fas fa-envelope contactIcon"></i>
          <span>{contactInfo.email}</span>
        </a>
      </div>
    </section>
  );
}
