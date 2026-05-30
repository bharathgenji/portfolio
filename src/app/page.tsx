import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import NowSection from "@/components/NowSection";
import WorkSection from "@/components/WorkSection";
import StackSection from "@/components/StackSection";
import ProjectsSection from "@/components/ProjectsSection";
import LabSection from "@/components/LabSection";
import NewsSection from "@/components/NewsSection";
import PlaybookTeaser from "@/components/PlaybookTeaser";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <NowSection />
        <WorkSection />
        <StackSection />
        <ProjectsSection />
        <LabSection />
        <NewsSection />
        <PlaybookTeaser />
      </main>
      <Footer />
    </>
  );
}
