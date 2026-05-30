"use client";

import { motion } from "motion/react";

type Props = {
  index: string; // "01"
  kicker: string; // "~/now"
  title: string; // big serif title
  titleAccent?: string; // italic accent word appended
};

/** Editorial section header: index numeral + mono kicker + serif display title. */
export default function SectionHeading({
  index,
  kicker,
  title,
  titleAccent,
}: Props) {
  return (
    <div className="mb-10 flex items-end justify-between gap-4 border-b border-line pb-5">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5 }}
      >
        <div className="kicker mb-3">{kicker}</div>
        <h2 className="font-display text-4xl leading-[0.95] text-text sm:text-5xl">
          {title}
          {titleAccent && (
            <span className="italic text-lime"> {titleAccent}</span>
          )}
        </h2>
      </motion.div>
      <div
        aria-hidden
        className="font-display text-5xl leading-none text-faint/40 sm:text-7xl"
      >
        {index}
      </div>
    </div>
  );
}
