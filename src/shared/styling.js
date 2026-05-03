import { useEffect } from "react";

// Injects (and re-injects on theme change) the global Nova stylesheet into
// the document head. The stylesheet is rebuilt from theme tokens so every
// CSS rule that references a token stays in sync with the active palette.
export const useStyles = (theme) => {
  useEffect(() => {
    document.getElementById("nova-css")?.remove();

    const styleEl = Object.assign(document.createElement("style"), { id: "nova-css" });
    const monogramTextColor = theme.isDark ? "#09060A" : "#fff";
    const menuShadowAlpha = theme.isDark ? 0.7 : 0.15;
    const overlayAlpha = theme.isDark ? 0.78 : 0.45;

    styleEl.textContent = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;overflow:hidden}
body{font-family:${theme.fontFamily};background:${theme.bg};color:${theme.text};-webkit-font-smoothing:antialiased;transition:background ${theme.transition},color ${theme.transition}}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:${theme.borderStrong};border-radius:99px}

@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideL{from{transform:translateX(-100%)}to{transform:none}}
@keyframes slideR{from{transform:translateX(100%)}to{transform:none}}
@keyframes popIn{from{opacity:0;transform:scale(0.95) translateY(-5px)}to{opacity:1;transform:none}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}

.nb{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:7px 14px;border-radius:${theme.r10};font-family:${theme.fontFamily};font-size:13px;font-weight:600;cursor:pointer;border:none;transition:${theme.transition};white-space:nowrap;user-select:none;outline:none}
.nb:active{transform:scale(0.97)}
.np{background:${theme.accent};color:${monogramTextColor}}
.np:hover{opacity:0.9}
.ng{background:transparent;color:${theme.textDim};border:1px solid ${theme.border}}
.ng:hover{background:${theme.surfaceShade};color:${theme.text};border-color:${theme.borderStrong}}
.ni{padding:6px;background:transparent;color:${theme.textDim};border-radius:${theme.r6};border:none;cursor:pointer;display:inline-flex;align-items:center;transition:${theme.transition}}
.ni:hover{background:${theme.surfaceShade};color:${theme.text}}

.ninput{background:${theme.surface};border:1px solid ${theme.border};color:${theme.text};font-family:${theme.fontFamily};font-size:13px;border-radius:${theme.r10};padding:8px 12px;outline:none;transition:${theme.transition};width:100%}
.ninput::placeholder{color:${theme.textMuted}}
.ninput:focus{border-color:${theme.borderStrong};background:${theme.surfaceShade}}

.ncard{background:${theme.surface};border:1px solid ${theme.border};border-radius:${theme.r14};transition:${theme.transition}}
.ncard:hover{border-color:${theme.borderStrong};background:${theme.surfaceShade}}

.nmenu{position:absolute;z-index:400;min-width:168px;background:${theme.elevated};border:1px solid ${theme.borderStrong};border-radius:${theme.r14};padding:4px;box-shadow:0 16px 48px rgba(0,0,0,${menuShadowAlpha});animation:popIn 0.14s ease;transform-origin:top right}
.nmi{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:${theme.r6};font-size:13px;font-weight:500;color:${theme.textDim};cursor:pointer;transition:${theme.transition};white-space:nowrap}
.nmi:hover{background:${theme.surfaceAlt};color:${theme.text}}
.nmi.danger:hover{color:${theme.error};background:rgba(232,82,82,0.08)}

.nnav{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:${theme.r10};font-size:13px;font-weight:500;color:${theme.textDim};cursor:pointer;transition:${theme.transition};user-select:none}
.nnav:hover{background:${theme.surfaceShade};color:${theme.text}}
.nnav.active{background:${theme.surfaceAlt};color:${theme.text}}

.ndiv{height:1px;background:${theme.borderStrong};margin:4px 6px}
.novl{position:fixed;inset:0;z-index:500;background:rgba(0,0,0,${overlayAlpha});animation:fadeIn 0.15s ease;display:flex;align-items:center;justify-content:center;padding:16px}
.nmod{background:${theme.elevated};border:1px solid ${theme.borderStrong};border-radius:${theme.r20};padding:28px;width:100%;max-width:520px;box-shadow:0 28px 72px rgba(0,0,0,0.5);animation:popIn 0.2s ease}
.nbadge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:${theme.rF};font-size:11px;font-weight:700;letter-spacing:.02em}
.nsect{font-size:10px;font-weight:700;color:${theme.textMuted};padding:14px 10px 6px;letter-spacing:.08em;text-transform:uppercase}
.nscroll{overflow-y:auto;scrollbar-width:thin}

.nova-editor:empty::before{content:"Start writing…";color:${theme.textMuted};font-style:italic;pointer-events:none}
.nova-editor:focus{outline:none}
.nova-editor h1{font-size:2em;font-weight:800;margin:0 0 0.5em;letter-spacing:-0.02em;color:${theme.text}}
.nova-editor h2{font-size:1.45em;font-weight:700;margin:1.2em 0 0.4em;letter-spacing:-0.01em;color:${theme.text}}
.nova-editor h3{font-size:1.15em;font-weight:600;margin:1em 0 0.35em;color:${theme.text}}
.nova-editor p{margin:0 0 0.9em;color:${theme.text}}
.nova-editor ul{padding-left:1.8em;margin:0 0 0.9em;color:${theme.text};list-style-type:disc}
.nova-editor ol{padding-left:1.8em;margin:0 0 0.9em;color:${theme.text};list-style-type:decimal}
.nova-editor ul ul{list-style-type:circle;margin:0}
.nova-editor ul ul ul{list-style-type:square;margin:0}
.nova-editor li{margin-bottom:0.3em;display:list-item}
.nova-editor blockquote{border-left:3px solid ${theme.accent};padding:0.2em 0 0.2em 1em;margin:0.8em 0;color:${theme.textDim};font-style:italic}
.nova-editor pre{background:${theme.surfaceAlt};border:1px solid ${theme.border};padding:0.8em 1em;border-radius:${theme.r6};font-family:monospace;font-size:0.88em;overflow-x:auto;margin:0.8em 0;color:${theme.text}}
.nova-editor table{border-collapse:collapse;width:100%;margin:0.8em 0}
.nova-editor td,.nova-editor th{border:1px solid ${theme.border};padding:6px 10px;text-align:left}
.nova-editor th{background:${theme.surfaceAlt};font-weight:600}
.nova-editor a{color:${theme.accent};text-decoration:underline}
.nova-editor strong{font-weight:700}
.nova-editor em{font-style:italic}
`;

    document.head.appendChild(styleEl);
  }, [theme]);
};
