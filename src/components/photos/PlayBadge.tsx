/** Round play symbol laid over a video's poster. */
export default function PlayBadge() {
  return (
    <span aria-label="Video" className="pointer-events-none absolute inset-0 grid place-items-center">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white">
        <svg aria-hidden className="ml-0.5 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
    </span>
  );
}
