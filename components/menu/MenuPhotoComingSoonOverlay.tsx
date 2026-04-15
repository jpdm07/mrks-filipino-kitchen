/**
 * Honest note on menu photos: hover shows copy; touch / no-hover devices show it
 * by default so mobile visitors aren’t misled by placeholder imagery.
 */
export function MenuPhotoComingSoonOverlay() {
  return (
    <>
      <span className="sr-only">
        Photos are illustrative for now; real dish photography is coming soon.
      </span>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] flex items-end justify-center bg-gradient-to-t from-black/80 via-black/45 to-transparent px-2 pb-2 pt-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none [@media(hover:none)]:opacity-100"
        aria-hidden
      >
        <p className="max-w-[98%] text-center text-[11px] font-medium leading-snug text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.85)] sm:text-xs">
          More photos coming soon — we&apos;re new and still adding real dish
          pictures.
        </p>
      </div>
    </>
  );
}
