import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPost, getSlugs, formatDate } from "@/lib/playbook";

export function generateStaticParams() {
  return getSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Not found" };
  return {
    title: `${post.title} · The Playbook`,
    description: post.summary,
  };
}

export default async function PlaybookPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <main className="mx-auto max-w-2xl px-5 pt-28 pb-24 sm:px-6 sm:pt-32">
      <Link
        href="/playbook"
        className="font-mono text-xs text-muted transition-colors hover:text-lime"
      >
        ← all posts
      </Link>

      <article className="mt-8">
        <div className="flex items-baseline gap-3 font-mono text-[11px] text-faint">
          <span>{formatDate(post.date)}</span>
          {post.tags.map((t) => (
            <span key={t} className="text-mint">
              #{t}
            </span>
          ))}
        </div>
        <h1 className="mt-3 font-display text-4xl leading-[1.02] text-text sm:text-5xl">
          {post.title}
        </h1>
        <p className="mt-4 text-lg text-text-dim">{post.summary}</p>

        <div className="post mt-10 border-t border-line pt-8">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.content}
          </ReactMarkdown>
        </div>

        <footer className="mt-12 border-t border-line pt-6 font-mono text-xs text-faint">
          — {post.author} ·{" "}
          <Link href="/playbook" className="text-muted hover:text-lime">
            more in The Playbook
          </Link>
        </footer>
      </article>
    </main>
  );
}
