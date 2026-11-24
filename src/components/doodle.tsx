// Hand-drawn doodles for the "Studio" look: one ink line, flat fills from the shape colours.
// Decorative only (aria-hidden). Use one or two per screen, and vary them between screens.
// Each is drawn on a 120 x 120 grid.

const DOODLES = {
  lamp:
    '<path d="M42 22 C 54 20, 68 20, 80 22 L 93 62 C 70 65, 48 64, 28 62 Z" fill="var(--paper)"></path><path d="M60 63 C 61 80, 59 96, 60 110"></path><path d="M40 112 C 52 108, 68 108, 81 112"></path><path d="M96 36 C 102 34, 106 30, 110 26"></path><path d="M100 48 C 106 48, 110 47, 115 45"></path>',
  vase:
    '<path d="M46 74 C 38 88, 40 110, 60 113 C 80 110, 82 88, 74 74 Z" fill="var(--paper)"></path><path d="M60 74 C 58 56, 50 40, 38 26"></path><path d="M60 74 C 63 58, 72 46, 86 36"></path><path d="M60 74 C 60 54, 61 36, 63 18"></path><path d="M38 26 C 28 26, 24 36, 30 44 C 38 42, 41 34, 38 26 Z" fill="var(--ochre)"></path><path d="M86 36 C 96 34, 102 42, 98 52 C 90 52, 85 44, 86 36 Z" fill="var(--ochre)"></path><path d="M63 18 C 55 14, 52 5, 60 2 C 68 5, 69 12, 63 18 Z" fill="var(--terracotta)"></path>',
  armchair:
    '<path d="M34 62 C 32 40, 40 28, 60 28 C 80 28, 88 40, 86 62 Z" fill="var(--blush)"></path><path d="M30 62 C 44 58, 76 58, 90 62 L 90 80 C 76 82, 44 82, 30 80 Z" fill="var(--paper)"></path><path d="M22 52 C 15 52, 14 63, 20 66 L 21 86 L 32 86 L 30 62 C 30 56, 27 52, 22 52 Z" fill="var(--blush)"></path><path d="M98 52 C 105 52, 106 63, 100 66 L 99 86 L 88 86 L 90 62 C 90 56, 93 52, 98 52 Z" fill="var(--blush)"></path><path d="M27 86 L25 100"></path><path d="M93 86 L95 100"></path>',
  pendant:
    '<path d="M60 6 C 59 18, 61 28, 60 40"></path><path d="M33 72 C 33 52, 46 40, 60 40 C 74 40, 87 52, 87 72 C 70 74, 50 74, 33 72 Z" fill="var(--ochre)"></path><path d="M52 73 C 53 82, 67 82, 68 73" fill="var(--paper)"></path><path d="M40 88 L35 98"></path><path d="M60 92 L60 104"></path><path d="M80 88 L85 98"></path>',
  swatches:
    '<rect x="46" y="26" width="28" height="74" rx="4" fill="var(--sage)" transform="rotate(-26 60 92)"></rect><rect x="46" y="26" width="28" height="74" rx="4" fill="var(--ochre)" transform="rotate(0 60 92)"></rect><rect x="46" y="26" width="28" height="74" rx="4" fill="var(--terracotta)" transform="rotate(26 60 92)"></rect><circle cx="60" cy="90" r="3.2" fill="var(--paper)"></circle>',
  brush:
    '<path d="M20 98 C 17 94, 22 91, 26 89 L 60 55 L 69 64 L 35 98 C 30 103, 24 102, 20 98 Z" fill="var(--ochre)"></path><path d="M60 55 L72 43 L81 52 L69 64 Z" fill="var(--paper)"></path><path d="M72 43 C 80 30, 94 22, 103 20 C 103 30, 94 44, 81 52 Z" fill="var(--terracotta)"></path><path d="M62 106 C 78 100, 92 104, 108 98" stroke="var(--terracotta)" stroke-width="5"></path>',
  pencil:
    '<path d="M27 35 L35 27 L92 84 L84 92 Z" fill="var(--ochre)"></path><path d="M92 84 L104 104 L84 92 Z" fill="var(--paper)"></path><path d="M98 96 L104 104 L95 100 Z" fill="currentColor"></path><path d="M27 35 L35 27 L28 20 C 24 16, 16 24, 20 28 Z" fill="var(--blush)"></path><path d="M33 41 L41 33"></path>',
  tape:
    '<path d="M28 44 C 28 34, 34 30, 44 30 L 70 30 C 80 30, 86 36, 86 46 L 86 76 C 86 86, 80 90, 70 90 L 44 90 C 34 90, 28 86, 28 76 Z" fill="var(--sage)"></path><circle cx="57" cy="60" r="15" fill="var(--paper)"></circle><circle cx="57" cy="60" r="3" fill="currentColor"></circle><path d="M86 78 L112 78 L112 90 L78 90" fill="var(--ochre)"></path><path d="M94 78 L94 84"></path><path d="M103 78 L103 84"></path><path d="M112 74 L112 94"></path>',
  chips:
    '<g transform="rotate(-7 60 60)"><rect x="36" y="14" width="48" height="94" rx="5" fill="var(--paper)"></rect><rect x="44" y="23" width="32" height="15" rx="2" fill="var(--terracotta)"></rect><rect x="44" y="44" width="32" height="15" rx="2" fill="var(--ochre)"></rect><rect x="44" y="65" width="32" height="15" rx="2" fill="var(--sage)"></rect><rect x="44" y="86" width="32" height="15" rx="2" fill="var(--sky)"></rect></g>',
  sofa:
    '<path d="M22 52 C 22 42, 30 38, 40 38 L 80 38 C 90 38, 98 42, 98 52 L 98 68 L 22 68 Z" fill="var(--sage)"></path><path d="M22 68 L60 68 L60 86 L22 86 Z" fill="var(--paper)"></path><path d="M60 68 L98 68 L98 86 L60 86 Z" fill="var(--paper)"></path><path d="M9 60 C 9 52, 22 52, 22 60 L 22 88 L 9 88 Z" fill="var(--sage)"></path><path d="M98 60 C 98 52, 111 52, 111 60 L 111 88 L 98 88 Z" fill="var(--sage)"></path><path d="M16 88 L14 99"></path><path d="M104 88 L106 99"></path>',
  rug:
    '<path d="M26 42 L94 42 L108 84 L12 84 Z" fill="var(--terracotta)"></path><path d="M35 51 L85 51 L94 75 L26 75 Z"></path><path d="M52 63 L68 63"></path><path d="M16 84 L15 93"></path><path d="M28 84 L27 93"></path><path d="M40 84 L39 93"></path><path d="M52 84 L51 93"></path><path d="M64 84 L63 93"></path><path d="M76 84 L75 93"></path><path d="M88 84 L87 93"></path><path d="M100 84 L99 93"></path><path d="M30 42 L30 35"></path><path d="M41 42 L41 35"></path><path d="M52 42 L52 35"></path><path d="M63 42 L63 35"></path><path d="M74 42 L74 35"></path><path d="M85 42 L85 35"></path>',
  frame:
    '<path d="M60 12 L42 30"></path><path d="M60 12 L78 30"></path><rect x="26" y="30" width="68" height="60" rx="3" fill="var(--paper)"></rect><rect x="35" y="39" width="50" height="42" fill="var(--sky)"></rect><circle cx="73" cy="51" r="5" fill="var(--ochre)"></circle><path d="M35 81 L51 60 L61 72 L70 62 L85 81 Z" fill="var(--sage)"></path>',
  mirror:
    '<path d="M38 102 L38 50 C 38 20, 82 20, 82 50 L 82 102 Z" fill="var(--sky)"></path><path d="M49 48 L61 34"></path><path d="M51 64 L71 42"></path><path d="M28 103 C 48 101, 72 101, 92 103"></path>',
  table:
    '<path d="M24 58 C 24 49, 96 49, 96 58 C 96 67, 24 67, 24 58 Z" fill="var(--ochre)"></path><path d="M36 65 L30 106"></path><path d="M84 65 L90 106"></path><path d="M60 67 L60 106"></path><path d="M50 36 L70 36 L68 52 C 62 55, 58 55, 52 52 Z" fill="var(--paper)"></path><path d="M70 40 C 79 40, 79 49, 69 49"></path><path d="M56 28 C 53 24, 59 22, 56 17"></path><path d="M64 28 C 61 24, 67 22, 64 17"></path>',
  stool:
    '<path d="M34 40 C 34 33, 86 33, 86 40 C 86 47, 34 47, 34 40 Z" fill="var(--terracotta)"></path><path d="M42 46 L34 104"></path><path d="M78 46 L86 104"></path><path d="M60 47 L60 102"></path><path d="M39 80 C 52 84, 68 84, 81 80"></path>',
  plant:
    '<path d="M60 74 C 44 62, 40 40, 52 24 C 63 36, 67 56, 60 74 Z" fill="var(--sage)"></path><path d="M60 74 C 62 54, 76 40, 95 42 C 93 58, 79 70, 60 74 Z" fill="var(--sage)"></path><path d="M60 74 C 50 65, 33 63, 23 71 C 33 80, 50 80, 60 74 Z" fill="var(--sage)"></path><path d="M60 74 C 58 58, 55 42, 52 28"></path><path d="M60 74 C 70 62, 82 50, 92 44"></path><path d="M42 80 L78 80 L73 108 L47 108 Z" fill="var(--terracotta)"></path><path d="M38 72 L82 72 L82 81 L38 81 Z" fill="var(--terracotta)"></path>',
  envelope:
    '<g transform="rotate(-6 60 60)"><rect x="18" y="34" width="84" height="58" rx="4" fill="var(--paper)"></rect><path d="M19 36 L60 66 L101 36"></path><path d="M19 90 L47 58"></path><path d="M101 90 L73 58"></path><circle cx="60" cy="74" r="6" fill="var(--terracotta)"></circle></g>',
  certificate:
    '<path d="M32 14 L78 14 L92 28 L92 106 L32 106 Z" fill="var(--paper)"></path><path d="M78 14 L78 28 L92 28"></path><path d="M42 40 L70 40"></path><path d="M42 52 L82 52"></path><path d="M42 64 L82 64"></path><path d="M42 90 C 46 76, 53 76, 52 87 C 51 95, 58 80, 64 82 C 71 84, 66 93, 74 89 L 84 87" stroke="var(--terracotta)"></path>',
  pen:
    '<path d="M28 24 L38 14 L84 60 L74 70 Z" fill="var(--sage)"></path><path d="M74 70 L84 60 L96 82 L100 98 L84 94 Z" fill="var(--ochre)"></path><path d="M87 78 L96 92"></path><path d="M100 98 C 92 108, 72 102, 52 107 C 40 110, 30 105, 20 109"></path>',
  tag:
    '<path d="M22 62 L60 24 L98 24 L98 62 L60 100 Z" fill="var(--ochre)"></path><circle cx="84" cy="38" r="5.5" fill="var(--paper)"></circle><path d="M84 38 C 96 30, 104 20, 112 10"></path><path d="M46 64 L62 48"></path><path d="M56 74 L76 54"></path>',
} as const;

export type DoodleName = keyof typeof DOODLES;

export function Doodle({ name, className = "h-28 w-28" }: { name: DoodleName; className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-ink ${className}`}
      dangerouslySetInnerHTML={{ __html: DOODLES[name] }}
    />
  );
}
