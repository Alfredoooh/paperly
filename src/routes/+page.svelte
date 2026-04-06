<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import Underline from '@tiptap/extension-underline';
  import TextStyle from '@tiptap/extension-text-style';
  import Color from '@tiptap/extension-color';
  import FontFamily from '@tiptap/extension-font-family';
  import TextAlign from '@tiptap/extension-text-align';
  import Superscript from '@tiptap/extension-superscript';
  import Subscript from '@tiptap/extension-subscript';
  import Link from '@tiptap/extension-link';
  import Image from '@tiptap/extension-image';
  import Table from '@tiptap/extension-table';
  import TableRow from '@tiptap/extension-table-row';
  import TableHeader from '@tiptap/extension-table-header';
  import TableCell from '@tiptap/extension-table-cell';
  import { Extension } from '@tiptap/core';

  // ── Lucide Icons (inline SVG strings) ──
  const IC = {
    menu:        `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>`,
    undo:        `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M3 13C5.33 7.67 9 5 14 5c4 0 7 2 8.5 6"/></svg>`,
    redo:        `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"/><path d="M21 13C18.67 7.67 15 5 10 5c-4 0-7 2-8.5 6"/></svg>`,
    send:        `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
    check:       `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    chevDown:    `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
    plus:        `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    settings:    `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/></svg>`,
    ai:          `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/><path d="M9 21h6"/><path d="M10 17v4"/><path d="M14 17v4"/></svg>`,
    file:        `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    link:        `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    image:       `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    table:       `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>`,
    minus:       `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    calendar:    `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    trash:       `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
    scissors:    `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>`,
    copy:        `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    clipboard:   `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`,
    selectAll:   `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/></svg>`,
    alignL:      `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="15" y1="12" x2="3" y2="12"/><line x1="17" y1="18" x2="3" y2="18"/></svg>`,
    alignC:      `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="17" y1="12" x2="7" y2="12"/><line x1="19" y1="18" x2="5" y2="18"/></svg>`,
    alignR:      `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="9" y2="12"/><line x1="21" y1="18" x2="7" y2="18"/></svg>`,
    alignJ:      `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="3" y2="12"/><line x1="21" y1="18" x2="3" y2="18"/></svg>`,
    listUl:      `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
    listOl:      `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>`,
    indent:      `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="8" x2="21" y2="8"/><line x1="3" y1="16" x2="21" y2="16"/><polyline points="9 12 12 14 15 12"/></svg>`,
    outdent:     `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="8" x2="21" y2="8"/><line x1="3" y1="16" x2="21" y2="16"/><polyline points="15 12 12 10 9 12"/></svg>`,
    warning:     `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info:        `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    checkCircle: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    xCircle:     `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    refreshCw:   `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
    shadow:      `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="13" height="13" rx="2"/><path d="M8 21h12a2 2 0 0 0 2-2V8"/></svg>`,
    radius:      `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h7"/><path d="M3 3v7"/><path d="M3 21h7"/><path d="M21 3h-7"/><path d="M21 21h-7"/><path d="M21 21v-7"/><path d="M21 3v7"/><path d="M3 21v-7"/></svg>`,
    opacity:     `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20V2z"/></svg>`,
    border:      `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`,
  };

  // ── State ──
  let drawerOpen = false;
  let appShifted = false;
  let a4Mode = false;
  let aiMode = false;
  let aiThinking = false;
  let aiInput = '';
  let fontLabel = 'Lora';
  let sizeLabel = '16';
  let colorBarBg = '#34322d';
  let pageFocused = false;
  let baseScale = 1;

  let boldActive = false;
  let italicActive = false;
  let underlineActive = false;
  let strikeActive = false;
  let alignActive = 'left';

  let activePopup = null;
  let popupStyle = '';
  let popupArrowLeft = '50%';
  let fontSearch = '';
  let hexInput = '#34322d';
  let hexPreview = '#34322d';
  let sizeStepper = 16;
  let curSz = 16;
  let curFont = "'Lora',Georgia,serif";

  let selMenuVisible = false;
  let selMenuStyle = '';
  let selMenuArrowX = '50%';

  let imgBarVisible = false;
  let imgBarStyle = '';
  let imgBarArrowX = '50%';
  let imgMoreVisible = false;
  let selImg = null;

  let editorEl;
  let canvasScroll;
  let pageWrapper;
  let topbarTitle;
  let aiInputEl;

  /** @type {import('@tiptap/core').Editor} */
  let editor;

  const COLORS = ['#000000','#34322d','#5e5e5b','#858481','#d1d5db','#e5e7eb','#f3f4f6','#ffffff','#dc2626','#ea580c','#d97706','#ca8a04','#65a30d','#16a34a','#0891b2','#2563eb','#4f46e5','#7c3aed','#9333ea','#db2777','#fca5a5','#fdba74','#fcd34d','#86efac','#93c5fd','#c4b5fd','#f9a8d4','#fde68a','#6ee7b7','#a5b4fc','#fbcfe8','#e9d5ff'];
  const SZP = [8,10,12,13,14,15,16,18,20,22,24,28,32,36,48,64,72];
  const FONTS = [
    {l:'Lora',v:"'Lora',Georgia,serif",g:'Serif'},{l:'Georgia',v:'Georgia,serif',g:'Serif'},{l:'Times New Roman',v:"'Times New Roman',serif",g:'Serif'},
    {l:'Playfair Display',v:"'Playfair Display',serif",g:'Serif'},{l:'Merriweather',v:"'Merriweather',serif",g:'Serif'},{l:'Source Serif 4',v:"'Source Serif 4',serif",g:'Serif'},
    {l:'PT Serif',v:"'PT Serif',serif",g:'Serif'},{l:'Libre Baskerville',v:"'Libre Baskerville',serif",g:'Serif'},{l:'EB Garamond',v:"'EB Garamond',serif",g:'Serif'},
    {l:'Crimson Text',v:"'Crimson Text',serif",g:'Serif'},{l:'Cormorant Garamond',v:"'Cormorant Garamond',serif",g:'Serif'},{l:'Noto Serif',v:"'Noto Serif',serif",g:'Serif'},
    {l:'Spectral',v:"'Spectral',serif",g:'Serif'},{l:'Zilla Slab',v:"'Zilla Slab',serif",g:'Serif'},{l:'Alegreya',v:"'Alegreya',serif",g:'Serif'},
    {l:'Vollkorn',v:"'Vollkorn',serif",g:'Serif'},{l:'Bitter',v:"'Bitter',serif",g:'Serif'},{l:'Arvo',v:"'Arvo',serif",g:'Serif'},
    {l:'Cardo',v:"'Cardo',serif",g:'Serif'},{l:'IBM Plex Serif',v:"'IBM Plex Serif',serif",g:'Serif'},
    {l:'Inter',v:"'Inter',sans-serif",g:'Sans-serif'},{l:'Open Sans',v:"'Open Sans',sans-serif",g:'Sans-serif'},{l:'Montserrat',v:"'Montserrat',sans-serif",g:'Sans-serif'},
    {l:'DM Sans',v:"'DM Sans',sans-serif",g:'Sans-serif'},{l:'Roboto',v:"'Roboto',sans-serif",g:'Sans-serif'},{l:'Nunito',v:"'Nunito',sans-serif",g:'Sans-serif'},
    {l:'Poppins',v:"'Poppins',sans-serif",g:'Sans-serif'},{l:'Raleway',v:"'Raleway',sans-serif",g:'Sans-serif'},{l:'Josefin Sans',v:"'Josefin Sans',sans-serif",g:'Sans-serif'},
    {l:'Quicksand',v:"'Quicksand',sans-serif",g:'Sans-serif'},{l:'Mulish',v:"'Mulish',sans-serif",g:'Sans-serif'},{l:'Work Sans',v:"'Work Sans',sans-serif",g:'Sans-serif'},
    {l:'Karla',v:"'Karla',sans-serif",g:'Sans-serif'},{l:'Cabin',v:"'Cabin',sans-serif",g:'Sans-serif'},{l:'Barlow',v:"'Barlow',sans-serif",g:'Sans-serif'},
    {l:'Fira Sans',v:"'Fira Sans',sans-serif",g:'Sans-serif'},{l:'Rubik',v:"'Rubik',sans-serif",g:'Sans-serif'},{l:'IBM Plex Sans',v:"'IBM Plex Sans',sans-serif",g:'Sans-serif'},
    {l:'Arial',v:'Arial,sans-serif',g:'Sans-serif'},{l:'Helvetica',v:"'Helvetica Neue',sans-serif",g:'Sans-serif'},{l:'Verdana',v:'Verdana,sans-serif',g:'Sans-serif'},
    {l:'Courier New',v:"'Courier New',monospace",g:'Monospace'},{l:'IBM Plex Mono',v:"'IBM Plex Mono',monospace",g:'Monospace'},{l:'Source Code Pro',v:"'Source Code Pro',monospace",g:'Monospace'},
    {l:'Fira Code',v:"'Fira Code',monospace",g:'Monospace'},{l:'JetBrains Mono',v:"'JetBrains Mono',monospace",g:'Monospace'},{l:'Space Mono',v:"'Space Mono',monospace",g:'Monospace'},
    {l:'Inconsolata',v:"'Inconsolata',monospace",g:'Monospace'},{l:'Ubuntu Mono',v:"'Ubuntu Mono',monospace",g:'Monospace'},
    {l:'Cinzel',v:"'Cinzel',serif",g:'Decorativa'},{l:'Abril Fatface',v:"'Abril Fatface',cursive",g:'Decorativa'},{l:'Pacifico',v:"'Pacifico',cursive",g:'Decorativa'},
    {l:'Dancing Script',v:"'Dancing Script',cursive",g:'Manuscrita'},{l:'Great Vibes',v:"'Great Vibes',cursive",g:'Manuscrita'},{l:'Sacramento',v:"'Sacramento',cursive",g:'Manuscrita'},
    {l:'Caveat',v:"'Caveat',cursive",g:'Manuscrita'},{l:'Kalam',v:"'Kalam',cursive",g:'Manuscrita'},{l:'Patrick Hand',v:"'Patrick Hand',cursive",g:'Manuscrita'},
    {l:'Indie Flower',v:"'Indie Flower',cursive",g:'Manuscrita'},{l:'Permanent Marker',v:"'Permanent Marker',cursive",g:'Manuscrita'}
  ];
  const STLS = [
    {l:'Parágrafo',cmd:'paragraph',icon:'¶'},
    {l:'Título 1',cmd:'h1',icon:'H1'},{l:'Título 2',cmd:'h2',icon:'H2'},
    {l:'Título 3',cmd:'h3',icon:'H3'},{l:'Título 4',cmd:'h4',icon:'H4'},
    {l:'Citação',cmd:'blockquote',icon:'"'},{l:'Código',cmd:'codeBlock',icon:'</>'}
  ];

  $: filteredFonts = FONTS.filter(f => f.l.toLowerCase().includes(fontSearch.toLowerCase()));

  // ── FontSize extension ──
  const FontSize = Extension.create({
    name: 'fontSize',
    addGlobalAttributes() {
      return [{
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: el => el.style.fontSize?.replace(/['"]+/g, '') || null,
            renderHTML: attrs => attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {}
          }
        }
      }];
    }
  });

  function syncToolbar() {
    if (!editor) return;
    boldActive      = editor.isActive('bold');
    italicActive    = editor.isActive('italic');
    underlineActive = editor.isActive('underline');
    strikeActive    = editor.isActive('strike');
    alignActive     = editor.isActive({ textAlign: 'center'  }) ? 'center'
                    : editor.isActive({ textAlign: 'right'   }) ? 'right'
                    : editor.isActive({ textAlign: 'justify' }) ? 'justify'
                    : 'left';
  }

  function openDrawer()  { drawerOpen = true;  appShifted = true;  }
  function closeDrawer() { drawerOpen = false; appShifted = false; }
  function toggleDrawer() { drawerOpen ? closeDrawer() : openDrawer(); }

  function togglePageMode() { a4Mode = !a4Mode; closeDrawer(); applyZoom(); }

  function applyZoom() {
    if (!canvasScroll) return;
    const a = canvasScroll.clientWidth - 32;
    baseScale = a < 794 ? a / 794 : 1;
    applyScale();
  }

  function applyScale() {
    if (!pageWrapper) return;
    const s = Math.min(baseScale * (pageFocused ? 1.15 : 1), 1);
    if (s < 1) {
      pageWrapper.style.transform = `scale(${s})`;
      pageWrapper.style.transformOrigin = 'top center';
      pageWrapper.style.marginBottom = `${(s - 1) * 1123}px`;
    } else {
      pageWrapper.style.transform = 'none';
      pageWrapper.style.marginBottom = '0';
    }
  }

  function onTitleKeydown(e) { if (e.key === 'Enter') { e.preventDefault(); topbarTitle.blur(); } }

  function tbBold()        { editor?.chain().focus().toggleBold().run();           syncToolbar(); }
  function tbItalic()      { editor?.chain().focus().toggleItalic().run();         syncToolbar(); }
  function tbUnderline()   { editor?.chain().focus().toggleUnderline().run();      syncToolbar(); }
  function tbStrike()      { editor?.chain().focus().toggleStrike().run();         syncToolbar(); }
  function tbAlign(dir)    { alignActive = dir; editor?.chain().focus().setTextAlign(dir).run(); }
  function tbList()        { editor?.chain().focus().toggleBulletList().run(); }
  function tbListOrdered() { editor?.chain().focus().toggleOrderedList().run(); }
  function tbIndent()      { editor?.chain().focus().sinkListItem('listItem').run(); }
  function tbOutdent()     { editor?.chain().focus().liftListItem('listItem').run(); }

  async function enterAI() {
    aiMode = true; closeDrawer();
    await tick();
    if (aiInputEl) aiInputEl.focus();
  }
  function exitAI()    { aiMode = false; aiInput = ''; }
  function toggleAI() { aiMode ? exitAI() : enterAI(); }

  async function doAI() {
    const p = aiInput.trim(); if (!p) return;
    aiInput = ''; aiThinking = true;
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 1000,
          system: 'Responde APENAS com o texto a inserir no editor, sem explicações nem markdown extra. Responde em português.',
          messages: [{ role: 'user', content: p }]
        })
      });
      const d = await r.json();
      const txt = d.content?.map(i => i.text || '').join('') || '(sem resposta)';
      editor?.chain().focus().insertContent(txt).run();
    } catch (_) { editor?.chain().focus().insertContent('[Erro IA]').run(); }
    aiThinking = false;
    if (aiInputEl) aiInputEl.focus();
  }

  function onAIKeydown(e) { if (e.key === 'Enter') { e.preventDefault(); doAI(); } }
  function onConfirm()    { if (aiMode) { doAI(); } else { closePopup(); editor?.commands.focus(); } }

  function openPopup(name, triggerEl) {
    if (activePopup === name) { closePopup(); return; }
    activePopup = name;
    fontSearch = ''; sizeStepper = curSz; hexInput = '#34322d';
    tick().then(() => positionPopup(triggerEl));
  }

  function positionPopup(triggerEl) {
    if (!triggerEl) return;
    const r = triggerEl.getBoundingClientRect();
    const w = getPopupWidth();
    let left = r.left + r.width / 2 - w / 2;
    left = Math.max(8, Math.min(window.innerWidth - w - 8, left));
    const bottom = window.innerHeight - r.top + 12;
    popupStyle = `left:${left}px;bottom:${bottom}px;width:${w}px`;
    popupArrowLeft = Math.max(12, Math.min(w - 24, r.left + r.width / 2 - left - 7)) + 'px';
  }

  function getPopupWidth() {
    const ws = { 'color-text': 254, font: 230, size: 220, styles: 200, insert: 240, format: 240 };
    return ws[activePopup] || 240;
  }

  function closePopup() { activePopup = null; }

  function applyColor(c) { editor?.chain().focus().setColor(c).run(); colorBarBg = c; closePopup(); }
  function applyHex()    { if (/^#[0-9a-f]{6}$/i.test(hexInput)) applyColor(hexInput); }
  function onHexInput()  { if (/^#[0-9a-f]{6}$/i.test(hexInput)) hexPreview = hexInput; }

  function applyFont(f) {
    curFont = f.v; fontLabel = f.l;
    editor?.chain().focus().setFontFamily(f.l).run();
    closePopup();
  }

  function setSize(s) {
    sizeStepper = s; curSz = s; sizeLabel = String(s);
    editor?.chain().focus().setMark('textStyle', { fontSize: s + 'px' }).run();
  }
  function sizeDown() { sizeStepper = Math.max(6,   sizeStepper - 1); setSize(sizeStepper); }
  function sizeUp()   { sizeStepper = Math.min(200, sizeStepper + 1); setSize(sizeStepper); }

  function applyStyle(cmd) {
    if      (cmd === 'paragraph')  editor?.chain().focus().setParagraph().run();
    else if (cmd === 'blockquote') editor?.chain().focus().toggleBlockquote().run();
    else if (cmd === 'codeBlock')  editor?.chain().focus().toggleCodeBlock().run();
    else editor?.chain().focus().toggleHeading({ level: parseInt(cmd.replace('h','')) }).run();
    closePopup();
  }

  function insertLink() {
    closePopup();
    const u = prompt('URL:');
    if (u) editor?.chain().focus().setLink({ href: u }).run();
  }
  function insertTable() {
    closePopup();
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }
  function insertHr()   { editor?.chain().focus().setHorizontalRule().run(); closePopup(); }
  function insertDate() { editor?.chain().focus().insertContent(new Date().toLocaleString('pt-PT')).run(); closePopup(); }

  function insertCallout(type) {
    const cx = { warn:['#fef3c7','#f59e0b'], info:['#eff6ff','#3b82f6'], ok:['#f0fdf4','#22c55e'], err:['#fef2f2','#ef4444'] };
    const [bg, br] = cx[type];
    editor?.chain().focus().insertContent(
      `<div style="background:${bg};border-left:4px solid ${br};padding:12px 16px;margin:8px 0;font-size:.9em;border-radius:6px">Escreve aqui.</div>`
    ).run();
    closePopup();
  }

  function insertImage() {
    closePopup();
    const fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'image/*'; fi.style.display = 'none';
    document.body.appendChild(fi);
    fi.addEventListener('change', e => {
      const f = e.target.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = ev => { editor?.chain().focus().setImage({ src: ev.target.result }).run(); };
      rd.readAsDataURL(f); fi.value = ''; document.body.removeChild(fi);
    });
    fi.click();
  }

  function fmtCase(type) {
    const { from, to } = editor.state.selection;
    const t = editor.state.doc.textBetween(from, to);
    if (!t) { closePopup(); return; }
    const m = { upper: t.toUpperCase(), lower: t.toLowerCase(), title: t.replace(/\b\w/g, c => c.toUpperCase()) };
    editor?.chain().focus().insertContent(m[type]).run();
    closePopup();
  }
  function fmtSup()          { editor?.chain().focus().toggleSuperscript().run(); closePopup(); }
  function fmtSub()          { editor?.chain().focus().toggleSubscript().run();   closePopup(); }
  function fmtCode()         { editor?.chain().focus().toggleCode().run();        closePopup(); }
  function fmtLineHeight(v)  { if (editorEl) editorEl.style.lineHeight = v;       closePopup(); }
  function fmtClear()        { editor?.chain().focus().unsetAllMarks().clearNodes().run(); closePopup(); }

  function tryShowSel() {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) { selMenuVisible = false; return; }
    const coords = editor.view.coordsAtPos(from);
    const w = 360;
    let left = coords.left; left = Math.max(6, Math.min(window.innerWidth - w - 6, left));
    const top = Math.max(8, coords.top - 56);
    selMenuStyle = `left:${left}px;top:${top}px`;
    selMenuArrowX = (coords.left - left) + 'px';
    selMenuVisible = true;
  }
  function hideSel() { selMenuVisible = false; }

  async function selCut() { editor?.chain().focus().deleteSelection().run(); hideSel(); }
  async function selCopy() {
    const { from, to } = editor.state.selection;
    const t = editor.state.doc.textBetween(from, to);
    try { await navigator.clipboard.writeText(t); } catch(_) {}
    hideSel();
  }
  async function selPaste() {
    hideSel();
    try { const t = await navigator.clipboard.readText(); editor?.chain().focus().insertContent(t).run(); } catch(_) {}
  }
  function selAll()       { editor?.chain().focus().selectAll().run(); hideSel(); setTimeout(tryShowSel, 80); }
  function selBold()      { editor?.chain().focus().toggleBold().run();      hideSel(); }
  function selItalic()    { editor?.chain().focus().toggleItalic().run();    hideSel(); }
  function selUnderline() { editor?.chain().focus().toggleUnderline().run(); hideSel(); }
  function selUpper()     { fmtCase('upper'); hideSel(); }
  function selLink()      { hideSel(); const u = prompt('URL:'); if (u) editor?.chain().focus().setLink({ href: u }).run(); }
  function selDelete()    { editor?.chain().focus().deleteSelection().run(); hideSel(); }

  function onCanvasClick(e) {
    if (!e.target.closest('#imgBarEl') && !e.target.closest('.img-more-pop')) {
      imgBarVisible = false; imgMoreVisible = false;
    }
  }

  function ibFloat(cls) {
    const img = editorEl?.querySelector('.ProseMirror-selectednode img') || editorEl?.querySelector('img.selected');
    if (!img) return;
    const style = cls === 'fl-l' ? 'float:left;margin:0 12px 8px 0'
                : cls === 'fl-r' ? 'float:right;margin:0 0 8px 12px'
                : 'display:block;margin:8px auto';
    img.style.cssText = img.style.cssText
      .replace(/float:[^;]+;?/g, '')
      .replace(/display:[^;]+;?/g, '')
      .replace(/margin:[^;]+;?/g, '') + style;
    imgBarVisible = false;
  }
  function ibMore() { imgMoreVisible = !imgMoreVisible; }

  function imgMoreAction(type) {
    const img = editorEl?.querySelector('.ProseMirror-selectednode img') || editorEl?.querySelector('img.selected');
    if (!img) return;
    if      (type === 'border')  img.style.border      = img.style.border      ? '' : '2px solid #888';
    else if (type === 'shadow')  img.style.boxShadow   = img.style.boxShadow   ? '' : '0 4px 20px rgba(0,0,0,.3)';
    else if (type === 'radius')  img.style.borderRadius = img.style.borderRadius ? '' : '12px';
    else if (type === 'opacity') img.style.opacity      = img.style.opacity === '0.5' ? '1' : '0.5';
    else if (type === 'replace') {
      const fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'image/*';
      fi.addEventListener('change', e => {
        const f = e.target.files[0]; if (!f) return;
        const rd = new FileReader(); rd.onload = ev => { img.src = ev.target.result; }; rd.readAsDataURL(f);
      });
      fi.click();
    } else if (type === 'delete') { editor?.chain().focus().deleteSelection().run(); }
    imgMoreVisible = false; imgBarVisible = false;
  }

  onMount(() => {
    editor = new Editor({
      element: editorEl,
      extensions: [
        StarterKit,
        Underline,
        TextStyle,
        Color,
        FontFamily,
        FontSize,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Superscript,
        Subscript,
        Link.configure({ openOnClick: false }),
        Image.configure({ inline: false, allowBase64: true }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
      ],
      content: '<p></p>',
      editorProps: {
        attributes: {
          class: 'page-content',
          spellcheck: 'true',
        }
      },
      onSelectionUpdate() { syncToolbar(); tryShowSel(); },
      onUpdate()          { syncToolbar(); },
      onFocus()           { pageFocused = true;  applyScale(); },
      onBlur()            { pageFocused = false; applyScale(); }
    });

    applyZoom();
    window.addEventListener('resize', applyZoom);
    new ResizeObserver(applyZoom).observe(canvasScroll);

    document.addEventListener('mousedown', e => {
      if (!e.target.closest('.sel-menu') && !e.target.closest('#imgBarEl')) hideSel();
    });
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.querySelector('.floating-toolbar')?.addEventListener('mousedown', e => e.preventDefault());

    return () => window.removeEventListener('resize', applyZoom);
  });

  onDestroy(() => { editor?.destroy(); });
</script>

<!-- ── Drawer ── -->
<div class="drawer" class:open={drawerOpen}>
  <div class="drawer-head">
    <div class="drawer-head-title">Funcionalidades</div>
  </div>
  <div class="drawer-body">
    <div class="drawer-section">
      <button class="drawer-item" class:active={aiMode} on:click={toggleAI}>
        {@html IC.ai}
        <span>{aiMode ? 'IA activa' : 'Toolbar / IA'}</span>
      </button>
      <button class="drawer-item" class:active={a4Mode} on:click={togglePageMode}>
        {@html IC.file}
        <span>Formato: {a4Mode ? 'A4' : 'Scroll'}</span>
      </button>
    </div>
  </div>
</div>

<div class="overlay" class:show={drawerOpen} on:click={closeDrawer} role="presentation"></div>

<div class="app" class:shifted={appShifted}>
  <div class="topbar">
    <div class="topbar-left">
      <button class="icon-btn" on:click={toggleDrawer}>
        {@html IC.menu}
      </button>
    </div>
    <div class="topbar-title" bind:this={topbarTitle} contenteditable="true" spellcheck="false" data-placeholder="Sem título" on:keydown={onTitleKeydown} on:contextmenu|preventDefault role="textbox" aria-label="Título"></div>
    <div class="topbar-right">
      <button class="icon-btn" on:click={() => editor?.chain().focus().undo().run()}>
        {@html IC.undo}
      </button>
      <button class="icon-btn" on:click={() => editor?.chain().focus().redo().run()}>
        {@html IC.redo}
      </button>
    </div>
  </div>

  <div class="canvas-scroll" bind:this={canvasScroll} on:click={onCanvasClick} role="presentation">
    <div class="page-wrapper scroll-mode" bind:this={pageWrapper}>
      <div class="page">
        <div bind:this={editorEl}></div>
      </div>
    </div>
  </div>
</div>

<nav class="floating-toolbar">
  <div class="toolbar-pill" class:ai-mode={aiMode}>
    {#if aiMode}
      <div class="ai-input-row">
        <input class="ai-input" bind:this={aiInputEl} bind:value={aiInput} placeholder="Pergunta à IA…" autocomplete="off" on:keydown={onAIKeydown} />
        {#if aiThinking}
          <div class="ai-thinking"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>
        {/if}
      </div>
    {:else}
      <div class="toolbar-track">
        <button class="tb-btn btn-A" on:mousedown|preventDefault on:click={e => openPopup('color-text', e.currentTarget)}>
          <span class="lbl">A</span><div class="bar" style="background:{colorBarBg}"></div>
        </button>
        <div class="tb-div"></div>
        <button class="tb-btn btn-B" class:active={boldActive}      on:click={tbBold}>      <span>B</span></button>
        <button class="tb-btn btn-I" class:active={italicActive}    on:click={tbItalic}>    <span>I</span></button>
        <button class="tb-btn btn-U" class:active={underlineActive} on:click={tbUnderline}> <span>U</span></button>
        <button class="tb-btn btn-S" class:active={strikeActive}    on:click={tbStrike}>    <span>S</span></button>
        <div class="tb-div"></div>
        <button class="tb-chip" class:open={activePopup==='font'} on:mousedown|preventDefault on:click={e => openPopup('font', e.currentTarget)}>
          <span>{fontLabel}</span>{@html IC.chevDown}
        </button>
        <button class="tb-chip" style="margin-left:3px" class:open={activePopup==='size'} on:mousedown|preventDefault on:click={e => openPopup('size', e.currentTarget)}>
          <span>{sizeLabel}</span>{@html IC.chevDown}
        </button>
        <div class="tb-div"></div>
        <button class="tb-chip" class:open={activePopup==='styles'} on:mousedown|preventDefault on:click={e => openPopup('styles', e.currentTarget)}>
          <span>Estilos</span>{@html IC.chevDown}
        </button>
        <div class="tb-div"></div>
        <button class="tb-btn" class:active={alignActive==='left'}    on:click={() => tbAlign('left')}>    {@html IC.alignL}</button>
        <button class="tb-btn" class:active={alignActive==='center'}  on:click={() => tbAlign('center')}>  {@html IC.alignC}</button>
        <button class="tb-btn" class:active={alignActive==='right'}   on:click={() => tbAlign('right')}>   {@html IC.alignR}</button>
        <button class="tb-btn" class:active={alignActive==='justify'} on:click={() => tbAlign('justify')}> {@html IC.alignJ}</button>
        <div class="tb-div"></div>
        <button class="tb-btn" on:click={tbList}>        {@html IC.listUl}</button>
        <button class="tb-btn" on:click={tbListOrdered}> {@html IC.listOl}</button>
        <button class="tb-btn" on:click={tbIndent}>      {@html IC.indent}</button>
        <button class="tb-btn" on:click={tbOutdent}>     {@html IC.outdent}</button>
        <div class="tb-div"></div>
        <button class="tb-chip" class:open={activePopup==='insert'} on:mousedown|preventDefault on:click={e => openPopup('insert', e.currentTarget)}>
          <span>Inserir</span>{@html IC.plus}
        </button>
        <div class="tb-div"></div>
        <button class="tb-chip" class:open={activePopup==='format'} on:mousedown|preventDefault on:click={e => openPopup('format', e.currentTarget)}>
          <span>Formatar</span>{@html IC.settings}
        </button>
      </div>
    {/if}
    <button class="btn-confirm" class:mode-check={!aiMode} class:mode-send={aiMode} on:mousedown|preventDefault on:click={onConfirm}>
      {#if aiThinking}
        <div class="ai-thinking"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>
      {:else if aiMode}
        {@html IC.send}
      {:else}
        {@html IC.check}
      {/if}
    </button>
  </div>
</nav>

{#if activePopup}
  <div class="popup-mask" on:click={closePopup} role="presentation"></div>
  <div class="popup-card" style={popupStyle}>
    <div class="popup-inner">
      {#if activePopup === 'color-text'}
        <div class="popup-header">Cor do texto</div>
        <div class="color-grid">
          {#each COLORS as c}
            <div class="color-swatch" style="background:{c};{c==='#ffffff'?'border:2px solid rgba(0,0,0,.15)':''}" on:mousedown|preventDefault on:click={() => applyColor(c)} role="button" tabindex="0" on:keydown={e => e.key==='Enter' && applyColor(c)}></div>
          {/each}
        </div>
        <div class="hex-row">
          <div style="width:26px;height:26px;background:{hexPreview};border-radius:6px;border:1.5px solid rgba(0,0,0,.12);flex-shrink:0"></div>
          <input class="hex-input" bind:value={hexInput} maxlength="7" on:input={onHexInput} />
          <button class="hex-apply" on:mousedown|preventDefault on:click={applyHex}>✓</button>
        </div>
      {:else if activePopup === 'font'}
        <div class="popup-header">Tipo de letra</div>
        <div class="font-search"><input placeholder="Pesquisar…" bind:value={fontSearch} /></div>
        <div class="font-list">
          {#each filteredFonts as f}
            <button class="font-item" class:active={f.v === curFont} on:mousedown|preventDefault on:click={() => applyFont(f)}>
              <span style="font-family:{f.v};font-size:14px;flex:1">{f.l}</span>
            </button>
          {/each}
        </div>
      {:else if activePopup === 'size'}
        <div class="popup-header">Tamanho</div>
        <div class="size-stepper">
          <button class="step-btn" on:mousedown|preventDefault on:click={sizeDown}>−</button>
          <div class="step-val">{sizeStepper}</div>
          <button class="step-btn" on:mousedown|preventDefault on:click={sizeUp}>+</button>
        </div>
        <div class="size-presets">
          {#each SZP as s}
            <button class="size-preset" class:active={s === curSz} on:mousedown|preventDefault on:click={() => { setSize(s); closePopup(); }}>{s}</button>
          {/each}
        </div>
      {:else if activePopup === 'styles'}
        <div class="popup-header">Estilo de parágrafo</div>
        {#each STLS as s}
          <button class="style-item" on:mousedown|preventDefault on:click={() => applyStyle(s.cmd)}>
            <span style="font-size:13px;color:var(--text-muted);width:15px">{s.icon}</span>
            <span>{s.l}</span>
          </button>
        {/each}
      {:else if activePopup === 'insert'}
        <div class="popup-header">Inserir</div>
        <div class="popup-section">
          <button class="popup-item" on:mousedown|preventDefault on:click={insertLink}>  {@html IC.link}     Link</button>
          <button class="popup-item" on:mousedown|preventDefault on:click={insertImage}> {@html IC.image}    Imagem</button>
          <button class="popup-item" on:mousedown|preventDefault on:click={insertTable}> {@html IC.table}    Tabela 3×3</button>
        </div>
        <div class="popup-section">
          <button class="popup-item" on:mousedown|preventDefault on:click={insertHr}>   {@html IC.minus}    Linha divisória</button>
          <button class="popup-item" on:mousedown|preventDefault on:click={insertDate}> {@html IC.calendar} Data e hora</button>
        </div>
        <div class="popup-section">
          <div class="popup-section-label">Caixas de destaque</div>
          <button class="popup-item" on:mousedown|preventDefault on:click={() => insertCallout('warn')}>{@html IC.warning}     Aviso</button>
          <button class="popup-item" on:mousedown|preventDefault on:click={() => insertCallout('info')}>{@html IC.info}        Informação</button>
          <button class="popup-item" on:mousedown|preventDefault on:click={() => insertCallout('ok')}>  {@html IC.checkCircle} Sucesso</button>
          <button class="popup-item" on:mousedown|preventDefault on:click={() => insertCallout('err')}> {@html IC.xCircle}     Erro</button>
        </div>
      {:else if activePopup === 'format'}
        <div class="popup-header">Formatar</div>
        <div class="popup-section">
          <div class="popup-section-label">Maiúsculas</div>
          <button class="popup-item" on:mousedown|preventDefault on:click={() => fmtCase('upper')}>MAIÚSCULAS</button>
          <button class="popup-item" on:mousedown|preventDefault on:click={() => fmtCase('lower')}>minúsculas</button>
          <button class="popup-item" on:mousedown|preventDefault on:click={() => fmtCase('title')}>Primeira Maiúscula</button>
        </div>
        <div class="popup-section">
          <div class="popup-section-label">Inline</div>
          <button class="popup-item" on:mousedown|preventDefault on:click={fmtSup}>X² Sobrescrito</button>
          <button class="popup-item" on:mousedown|preventDefault on:click={fmtSub}>X₂ Subscrito</button>
          <button class="popup-item" on:mousedown|preventDefault on:click={fmtCode}>&lt;/&gt; Código inline</button>
        </div>
        <div class="popup-section">
          <div class="popup-section-label">Espaçamento de linha</div>
          <button class="popup-item" on:mousedown|preventDefault on:click={() => fmtLineHeight('1')}>1.0 — Compacto</button>
          <button class="popup-item" on:mousedown|preventDefault on:click={() => fmtLineHeight('1.5')}>1.5 — Normal</button>
          <button class="popup-item" on:mousedown|preventDefault on:click={() => fmtLineHeight('2')}>2.0 — Espaçado</button>
        </div>
        <div class="popup-section">
          <button class="popup-item danger" on:mousedown|preventDefault on:click={fmtClear}>{@html IC.trash} Limpar formatação</button>
        </div>
      {/if}
    </div>
    <div class="popup-arrow" style="left:{popupArrowLeft}"></div>
  </div>
{/if}

{#if selMenuVisible}
  <div class="sel-menu" class:show={selMenuVisible} style="{selMenuStyle};--ax:{selMenuArrowX}">
    <div class="sel-row">
      <button class="sel-btn" on:mousedown|preventDefault on:click={selCut}>      {@html IC.scissors}  Cortar</button>
      <button class="sel-btn" on:mousedown|preventDefault on:click={selCopy}>     {@html IC.copy}      Copiar</button>
      <button class="sel-btn" on:mousedown|preventDefault on:click={selPaste}>    {@html IC.clipboard} Colar</button>
      <button class="sel-btn" on:mousedown|preventDefault on:click={selAll}>      {@html IC.selectAll} Sel. tudo</button>
      <button class="sel-btn" on:mousedown|preventDefault on:click={selBold}>     <strong>B</strong></button>
      <button class="sel-btn" on:mousedown|preventDefault on:click={selItalic}>   <em>I</em></button>
      <button class="sel-btn" on:mousedown|preventDefault on:click={selUnderline}><u>U</u></button>
      <button class="sel-btn" on:mousedown|preventDefault on:click={selUpper}>    AA</button>
      <button class="sel-btn" on:mousedown|preventDefault on:click={selLink}>     {@html IC.link} Link</button>
      <button class="sel-btn danger" on:mousedown|preventDefault on:click={selDelete}>{@html IC.trash}</button>
    </div>
  </div>
{/if}

{#if imgBarVisible}
  <div class="img-bar" id="imgBarEl" style="{imgBarStyle};--ax:{imgBarArrowX}">
    <div class="ib-row">
      <button class="ib-btn" on:mousedown|preventDefault on:click={() => ibFloat('fl-n')}>Inline</button>
      <button class="ib-btn" on:mousedown|preventDefault on:click={() => ibFloat('fl-l')}>Esq.</button>
      <button class="ib-btn" on:mousedown|preventDefault on:click={() => ibFloat('fl-r')}>Dir.</button>
      <button class="ib-btn" on:mousedown|preventDefault on:click={ibMore}>···</button>
    </div>
  </div>
{/if}

{#if imgMoreVisible}
  <div class="img-more-pop">
    <div class="popup-header">Imagem</div>
    <div class="popup-section">
      <button class="popup-item" on:mousedown|preventDefault on:click={() => imgMoreAction('border')}>  {@html IC.border}    Borda</button>
      <button class="popup-item" on:mousedown|preventDefault on:click={() => imgMoreAction('shadow')}>  {@html IC.shadow}    Sombra</button>
      <button class="popup-item" on:mousedown|preventDefault on:click={() => imgMoreAction('radius')}>  {@html IC.radius}    Arredondado</button>
      <button class="popup-item" on:mousedown|preventDefault on:click={() => imgMoreAction('opacity')}> {@html IC.opacity}   Opacidade 50%</button>
      <button class="popup-item" on:mousedown|preventDefault on:click={() => imgMoreAction('replace')}> {@html IC.refreshCw} Substituir</button>
      <button class="popup-item danger" on:mousedown|preventDefault on:click={() => imgMoreAction('delete')}>{@html IC.trash} Apagar imagem</button>
    </div>
  </div>
{/if}

<style>
  :global(.ProseMirror) {
    outline: none;
    min-height: 100%;
    padding: 0;
    -webkit-user-select: text;
    user-select: text;
    cursor: text;
  }
  :global(.ProseMirror > p.is-editor-empty:first-child::before) {
    content: 'Começa a escrever…';
    float: left;
    color: var(--text-muted);
    pointer-events: none;
    height: 0;
  }
  :global(.ProseMirror table) { border-collapse: collapse; width: 100%; margin: 8px 0; }
  :global(.ProseMirror td, .ProseMirror th) { border: 1.5px solid #ccc; padding: 6px 10px; min-width: 40px; position: relative; }
  :global(.ProseMirror th) { background: #f3f4f6; font-weight: 600; }
  :global(.ProseMirror img) { max-width: 100%; height: auto; display: block; cursor: pointer; }
  :global(.ProseMirror-selectednode img) { outline: 2px solid var(--accent); }
  :global(.ProseMirror blockquote) { border-left: 4px solid var(--border); padding-left: 14px; color: var(--text-sub); margin: 8px 0; }
  :global(.ProseMirror code) { background: #f0eeeb; padding: 1px 5px; font-family: monospace; font-size: .88em; border-radius: 4px; }
  :global(.ProseMirror pre) { background: #1e1e2e; color: #cdd6f4; padding: 14px 16px; border-radius: 8px; font-family: monospace; font-size: .88em; overflow-x: auto; margin: 8px 0; }
  :global(.popup-item) { display: flex; align-items: center; gap: 8px; }
  :global(.sel-btn)    { display: flex; align-items: center; gap: 4px; }
</style>
