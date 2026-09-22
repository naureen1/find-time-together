/**
 * A deliberately quiet framing for the prototype. The interactive product
 * below is the hero, so this stays understated rather than becoming a
 * case-study header.
 */
export function ProductIntro() {
  return (
    <header className="ftt-intro">
      <p className="ftt-intro-name">Find Time Together</p>
      <p className="ftt-intro-tag">An exploration of constraint-aware group scheduling.</p>
      <p className="ftt-intro-q">
        When no ideal meeting time exists, how might Cal.com help organizers understand
        the trade-offs and find the least disruptive alternative?
      </p>
    </header>
  );
}
