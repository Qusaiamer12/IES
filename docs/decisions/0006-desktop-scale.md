# 0006 · Desktop renders at a 75% scale and grows with the screen

**Context.** At 100% the design looked too large on typical laptops (Windows at 125% display scaling, ~1500 CSS px wide).
The owners wanted it to look like a 75% browser zoom, but a plain 75% also shrank the content column and left the sides
empty.

**Decision.** Every CSS size is in `rem`. The root font size is 16px on phones, 14px on tablets (≥861px) and
`clamp(12px, 0.79vw, 16px)` on desktop (≥1121px), with the content column at `98.33rem` (1180px at 12px). Small labels
use `max(Xrem, Npx)` floors so they never drop below ~11–12.5px.

**Consequences.** Desktop looks like a 75% zoom at ~1500px and scales up proportionally on larger monitors, filling the
screen instead of leaving a narrow column. Phones are unaffected. New CSS must use `rem` (hairline borders excepted) to
scale with the rest.
