import Link from "next/link";

/** Corner photo — `public/images/aboutpic.jpg` (same folder as menu item photos). */
const ABOUT_PHOTO_SRC = "/images/aboutpic.jpg";

export default function AboutPage() {
  return (
    <div className="pattern-bg relative">
      {/*
        Layering: photo z-[15] (above footer z-10, below nav z-50). Section + article use
        z-[20] on the *outer* elements so the whole block stacks above the photo — inner z-index
        alone does not beat a fixed sibling. Native <img> avoids next/image fill edge cases.
      */}
      <div className="pointer-events-none fixed bottom-0 right-0 z-[15] h-[min(48vh,380px)] w-[min(94vw,380px)] sm:h-[min(62vh,620px)] sm:w-[min(720px,55vw)]">
        <div className="relative h-full w-full bg-[var(--bg-section)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- static public asset; reliable corner rendering */}
          <img
            src={ABOUT_PHOTO_SRC}
            alt="The cook behind Mr. K's Filipino Kitchen"
            width={720}
            height={620}
            decoding="async"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-contain object-bottom object-right opacity-[0.52]"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, var(--bg-section) 0%, rgba(247, 242, 234, 0.55) 18%, rgba(247, 242, 234, 0.12) 45%, transparent 72%)",
            }}
          />
        </div>
      </div>

      {/*
        Grid: text column stays left-weighted; flexible right column reserves space so the fixed
        photo reads intentional. Paragraph styles unchanged inside the prose column.
      */}
      <div className="relative z-20 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:grid lg:max-w-[90rem] lg:grid-cols-[minmax(0,42rem)_minmax(2rem,1fr)] lg:gap-x-10 lg:px-10 xl:grid-cols-[minmax(0,44rem)_minmax(3rem,1fr)] xl:gap-x-14">
        <div className="mx-auto min-w-0 w-full max-w-3xl lg:mx-0 lg:max-w-none lg:col-start-1">
          <section className="relative overflow-hidden py-16 md:py-20">
            <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center opacity-20">
              <svg viewBox="0 0 200 200" className="h-64 w-64 text-[var(--gold)]">
                {[...Array(8)].map((_, i) => {
                  const a = (i / 8) * Math.PI * 2;
                  const x1 = 100 + Math.cos(a) * 28;
                  const y1 = 100 + Math.sin(a) * 28;
                  const x2 = 100 + Math.cos(a) * 90;
                  const y2 = 100 + Math.sin(a) * 90;
                  return (
                    <line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                  );
                })}
                <circle cx="100" cy="100" r="26" fill="var(--primary)" />
              </svg>
            </div>
            <div className="relative text-center">
              <p className="font-[family-name:var(--font-playfair)] text-2xl italic text-[var(--primary)] md:text-3xl">
                &ldquo;Good Filipino food isn&apos;t just food. It&apos;s memory, family, and
                identity — all wrapped into one bite.&rdquo;
              </p>
            </div>
          </section>

          <article className="relative pb-16 pt-0">
            <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[var(--text)]">
              About Mr. K&apos;s Filipino Kitchen
            </h1>
            <div className="mt-8 space-y-6 sm:space-y-7">
              <p className="text-lg leading-relaxed text-[var(--text)]">
                Mr. K&apos;s Filipino Kitchen is a family pickup kitchen rooted in Cypress,
                Texas. The name belongs to someone very special — a little boy named Mr. K,
                whose mother built this kitchen in his honor. Behind every recipe, every order,
                and every carefully packed container is one person: a self-taught Filipino cook
                who has been quietly perfecting these dishes for years, driven by love,
                homesickness, and the stubborn belief that good food should make you feel like
                you belong somewhere.
              </p>
              <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--text)]">
                The Story Behind the Kitchen
              </h2>
              <p className="text-base leading-relaxed text-[var(--text-muted)]">
                Filipino food is how she reaches across years and miles when she cannot reach
                with her hands.
              </p>
              <p className="text-base leading-relaxed text-[var(--text-muted)]">
                She came to Houston in 2008. One move, one decision, and suddenly a world away
                from nearly everyone who had ever filled her table. The friends who knew her
                before she knew herself. The family whose laughter she had fallen asleep to her
                whole life. She was grateful for the new beginning, genuinely grateful, but the
                city felt wide and quiet in a way she didn&apos;t know how to name. The silence
                at mealtimes was its own kind of lonely.
              </p>
              <p className="text-base leading-relaxed text-[var(--text-muted)]">
                She searched for Filipino food that tasted like home, again and again, and too
                often walked away disappointed. What she missed wasn&apos;t only flavor. It was
                memory. It was the feeling of belonging to a table. The sound of people she loves
                laughing over shared plates. The simple, deep relief of recognizing yourself in
                what&apos;s being served.
              </p>
              <p className="text-base leading-relaxed text-[var(--text-muted)]">
                <span className="font-semibold text-[var(--text)]">
                  So she went to the stove and figured it out.
                </span>{" "}
                Those years were stubborn and unglamorous, love in the form of practice. She kept
                going because she needed that closeness to exist inside her house, not just inside a
                memory she couldn&apos;t touch.
              </p>
              <p className="text-base leading-relaxed text-[var(--text-muted)]">
                Then her son arrived, and everything sharpened into something that can only be
                described as purpose.
              </p>
              <p className="text-base leading-relaxed text-[var(--text-muted)]">
                Naming this kitchen after him was her way of planting their heritage somewhere
                he can see it every single day. She wants him to grow up surrounded by their
                traditions, proud of where he comes from, carrying flavors and stories he can
                someday pass to his own family. She wants her son to understand in his bones that
                who they are doesn&apos;t have to fade just because life moved them far from where
                it began.
              </p>
              <p className="text-base leading-relaxed text-[var(--text-muted)]">
                And she wants her neighbors here in Cypress to taste something honest. Food that
                shows up at your celebrations and your ordinary Tuesday nights alike. Food that
                reminds you that culture travels with people and that it is worth keeping alive
                wherever you land.
              </p>
              <p className="text-base leading-relaxed text-[var(--text)]">
                This kitchen is her answer to years of longing. Food that carries their story,
                made with love, served with the warmth of Filipino hospitality, and sent home
                with you in the hope that it adds something good to your own four walls, today
                and in the generations still to come.
              </p>
              <p className="text-center font-[family-name:var(--font-playfair)] text-xl font-semibold text-[var(--text)]">
                Mabuhay. 🌟
              </p>
            </div>
            <div className="mt-14 flex justify-center">
              <Link href="/menu" className="btn btn-primary px-8">
                View Our Menu
              </Link>
            </div>
          </article>
        </div>
        {/* Reserves horizontal space on large screens so copy and the corner photo don’t compete */}
        <div className="hidden min-h-[1px] lg:col-start-2 lg:block" aria-hidden />
      </div>
    </div>
  );
}
