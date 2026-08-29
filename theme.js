/* ============================================================
   JEFF CADY / UESCA COACHING — SHARED THEME SCRIPT
   ------------------------------------------------------------
   Two small, page-agnostic utilities used across every page:

   1. Sets the --contour-pattern CSS variable that .hero (and
      any other element) can use as a topographic-line texture
      via `background-image:var(--contour-pattern)`. Runs
      automatically on load — nothing to call.

   2. window.waypointIcon(color, size) — returns an inline SVG
      string for the concentric-ring "waypoint" icon used
      throughout these sites (category markers, process steps,
      anything that wants the same signature mark). Call it
      from your own page script and inject the result into an
      element's innerHTML.

      Example:
        document.getElementById('step1-icon').innerHTML =
          waypointIcon('#CB5A28', 44);
   ============================================================ */

(function(){
  const contourSVG = `
  <svg xmlns='http://www.w3.org/2000/svg' width='240' height='160'>
    <g fill='none' stroke='%23c8b190' stroke-width='1'>
      <path d='M-20 20 Q 40 0, 90 20 T 200 15 T 300 25'/>
      <path d='M-20 46 Q 40 26, 90 46 T 200 41 T 300 51'/>
      <path d='M-20 74 Q 40 54, 90 74 T 200 69 T 300 79'/>
      <path d='M-20 102 Q 40 82, 90 102 T 200 97 T 300 107'/>
      <path d='M-20 130 Q 40 110, 90 130 T 200 125 T 300 135'/>
    </g>
  </svg>`;
  document.documentElement.style.setProperty(
    '--contour-pattern',
    `url("data:image/svg+xml,${encodeURIComponent(contourSVG)}")`
  );
})();

function waypointIcon(color, size){
  size = size || 34;
  const c = size / 2;
  const r1 = size * 0.456, r2 = size * 0.309, r3 = size * 0.162, r4 = size * 0.059;
  return `<svg viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${c}" cy="${c}" r="${r1.toFixed(1)}" stroke="${color}" stroke-width="1" opacity="0.35"/>
    <circle cx="${c}" cy="${c}" r="${r2.toFixed(1)}" stroke="${color}" stroke-width="1" opacity="0.6"/>
    <circle cx="${c}" cy="${c}" r="${r3.toFixed(1)}" stroke="${color}" stroke-width="1.2"/>
    <circle cx="${c}" cy="${c}" r="${r4.toFixed(1)}" fill="${color}"/>
  </svg>`;
}
