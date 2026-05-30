import SectionHeading from "./SectionHeading";
import NewsFeed from "./NewsFeed";

export default function NewsSection() {
  return (
    <section id="news" className="mx-auto max-w-5xl scroll-mt-24 px-5 py-20 sm:px-6">
      <SectionHeading
        index="06"
        kicker="~/news --live"
        title="The wire"
        titleAccent="24/7"
      />
      <p className="-mt-5 mb-8 max-w-xl text-sm text-muted">
        A self-updating stream of AI &amp; tech headlines, merged live from Hacker
        News and four newsrooms. No backend to babysit — it refreshes itself.
      </p>
      <NewsFeed />
    </section>
  );
}
