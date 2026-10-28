import ProjectCaseStudy from "@/components/ProjectCaseStudy";
import { caseStudies, getCaseStudyBySlug } from "@/config/caseStudies";
import { notFound } from "next/navigation";
import { siteConfig } from "@/config/portfolio";

export const dynamicParams = false;

export function generateStaticParams() {
  return caseStudies.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const study = getCaseStudyBySlug(slug);

  if (!study) return { title: "Experience Case Study" };

  return {
    title: `${study.title} | Adarsh Kumar`,
    description: study.lead,
    alternates: { canonical: `${siteConfig.url}/experience/${slug}` },
  };
}

export default async function ProjectCaseStudyPage({ params }) {
  const { slug } = await params;
  const study = getCaseStudyBySlug(slug);

  if (!study) notFound();

  return <ProjectCaseStudy study={study} />;
}
