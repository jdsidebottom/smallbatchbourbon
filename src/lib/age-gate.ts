export const AGE_GATE_COOKIE = "sbb_age_ok";
export const AGE_GATE_MAX_AGE_DAYS = 365;

/**
 * Runs before paint, inlined into <head>. Flips the gate off for visitors who
 * have already acknowledged, which keeps the page static and flash-free.
 */
export const AGE_GATE_BOOTSTRAP = `(function(){try{if(document.cookie.indexOf("${AGE_GATE_COOKIE}=1")>-1){document.documentElement.setAttribute("data-age-gate","ok")}}catch(e){}})();`;

/**
 * Whether the site behind the gate should be made `inert`.
 *
 * This is what actually keeps a keyboard user out of alcohol content before
 * they answer, so it is a compliance decision rather than a styling one — hence
 * a pure function with tests rather than a condition inlined in JSX.
 *
 * The under-21 exit is never inert: the gate does not render there, so making
 * the page inert would leave a visitor with nothing they could reach at all.
 */
export function shouldInertShell(gatePending: boolean, pathname: string | null): boolean {
  if (!gatePending) return false;
  return pathname !== "/not-eligible";
}
