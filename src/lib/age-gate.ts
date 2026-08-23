export const AGE_GATE_COOKIE = "sbb_age_ok";
export const AGE_GATE_MAX_AGE_DAYS = 365;

/**
 * Runs before paint, inlined into <head>. Flips the gate off for visitors who
 * have already acknowledged, which keeps the page static and flash-free.
 */
export const AGE_GATE_BOOTSTRAP = `(function(){try{if(document.cookie.indexOf("${AGE_GATE_COOKIE}=1")>-1){document.documentElement.setAttribute("data-age-gate","ok")}}catch(e){}})();`;
