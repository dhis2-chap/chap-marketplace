import { ChapMark } from "./icons";

function buildStamp(): string {
  const date = new Date().toISOString().slice(0, 10);
  const sha = (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7);
  return sha ? `${date} · ${sha}` : `${date} · local`;
}

const LinkClass =
  "text-board-ink-2 transition-colors hover:text-board-ink hover:underline";

export function Footer() {
  return (
    <footer className="board-panel text-board-ink">
      <div className="mx-auto grid max-w-[1240px] gap-x-10 gap-y-9 px-5 pb-10 pt-11 sm:grid-cols-[1.5fr_1fr] sm:px-8 sm:pt-12">
        <div>
          <div className="flex items-center gap-3">
            <ChapMark className="h-6 w-6 text-white" />
            <span className="text-[14px] font-medium leading-none">
              Chap Marketplace
            </span>
          </div>
          <p className="mt-4 max-w-[44ch] text-[15px] leading-[1.7] text-board-ink-2">
            Chap Modeling Platform, by the HISP Centre at the
            University of Oslo.
          </p>
        </div>
        <div>
          <div className="mb-3.5 text-[13px] font-medium uppercase tracking-[0.1em] text-board-ink-2">
            Platform
          </div>
          <ul className="space-y-2.5 text-[15px]">
            <li>
              <a href="https://chap.dhis2.org" target="_blank" rel="noreferrer" className={LinkClass}>
                chap.dhis2.org
              </a>
            </li>
            <li>
              <a href="https://dhis2.org/climate" target="_blank" rel="noreferrer" className={LinkClass}>
                DHIS2 for climate &amp; health
              </a>
            </li>
            <li>
              <a href="mailto:climate@dhis2.org" className={LinkClass}>
                climate@dhis2.org
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-5 sm:px-8 py-4 font-mono text-[12px] text-board-ink-2">
          <span>HISP Centre · University of Oslo</span>
          <span>catalog build {buildStamp()}</span>
        </div>
      </div>
    </footer>
  );
}
