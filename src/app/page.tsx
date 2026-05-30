import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import NowSection from "@/components/NowSection";
import WorkSection from "@/components/WorkSection";
import StackSection from "@/components/StackSection";
import ProjectsSection from "@/components/ProjectsSection";
import NewsSection from "@/components/NewsSection";
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
        <NewsSection />
      </main>
      <Footer />
    </>
  );
}
