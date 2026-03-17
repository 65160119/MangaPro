import React from 'react'

// Global Owlbook design tokens & modal styles, shared across pages
export default function OwlbookStyles() {
  return (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

    :root {
      --owl-bg:          #110b22;
      --owl-bg-2:        #16102c;
      --owl-surface:     #1f1438;
      --owl-surface-2:   #281a48;
      --owl-border:      #3a2468;
      --owl-purple-50:   #3a2468;
      --owl-purple-100:  #4a2e80;
      --owl-purple-200:  #6644b0;
      --owl-purple-400:  #aa84ee;
      --owl-purple-500:  #bea0f8;
      --owl-purple-600:  #cfb8ff;
      --owl-purple-700:  #e8d8ff;
      --owl-text:        #f0eaff;
      --owl-text-sub:    #b89af0;
      --owl-text-faint:  #6a4e98;
      --owl-accent:      #c084fc;
      --owl-tag-bg:      #32206a;
      --owl-tag-text:    #d4b8ff;
      --owl-gold:        #f4c842;
      --owl-red:         #f07080;
      --owl-shadow:      0 2px 20px rgba(0,0,0,0.55);
      --owl-shadow-lg:   0 8px 48px rgba(0,0,0,0.72);
    }

    body {
      margin: 0;
      background: var(--owl-bg);
      color: var(--owl-text);
      font-family: 'DM Sans', sans-serif;
    }

    .owl-catalog * { font-family: 'DM Sans', sans-serif; color: var(--owl-text); box-sizing: border-box; }
    .owl-catalog { background: var(--owl-bg); min-height: 100vh; padding: 24px 36px; }

    /* ── Search bar ── */
    .owl-search-row { display: flex; align-items: center; gap: 10px; margin-bottom: 32px; flex-wrap: wrap; }
    .owl-input {
      padding: 10px 16px; border-radius: 12px;
      border: 1.5px solid var(--owl-border); background: var(--owl-surface);
      font-size: 14px; color: var(--owl-text); outline: none; transition: border 0.2s, box-shadow 0.2s;
      min-width: 260px;
    }
    .owl-input:focus { border-color: var(--owl-accent); box-shadow: 0 0 0 3px rgba(192,132,252,0.18); }
    .owl-input::placeholder { color: var(--owl-text-faint); }

    /* ── Custom dropdown (replaces native <select>) ── */
    .owl-dropdown { position: relative; display: inline-block; }
    .owl-dropdown-btn {
      padding: 10px 36px 10px 14px; border-radius: 12px;
      border: 1.5px solid var(--owl-border); background: var(--owl-surface);
      font-size: 14px; color: var(--owl-text); outline: none; cursor: pointer;
      font-family: 'DM Sans', sans-serif; text-align: left; white-space: nowrap;
      transition: border 0.2s; min-width: 160px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23c084fc' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: right 12px center;
    }
    .owl-dropdown-btn:hover, .owl-dropdown-btn.open { border-color: var(--owl-accent); }
    .owl-dropdown-menu {
      position: absolute; top: calc(100% + 6px); left: 0; z-index: 200;
      background: var(--owl-surface); border: 1.5px solid var(--owl-border);
      border-radius: 12px; min-width: 100%; max-height: 320px; overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0,0,0,0.55); padding: 4px;
    }
    .owl-dropdown-menu::-webkit-scrollbar { width: 4px; }
    .owl-dropdown-menu::-webkit-scrollbar-thumb { background: var(--owl-border); border-radius: 4px; }
    .owl-dropdown-item {
      padding: 9px 14px; border-radius: 8px; font-size: 14px;
      color: var(--owl-text); cursor: pointer; white-space: nowrap;
      transition: background 0.12s;
    }
    .owl-dropdown-item:hover { background: var(--owl-surface-2); }
    .owl-dropdown-item.selected { background: var(--owl-purple-100); color: var(--owl-accent); font-weight: 600; }

    /* ── Clear filter button ── */
    .owl-btn-clear {
      margin-left: 8px; padding: 9px 14px; border-radius: 12px;
      border: 1.5px solid var(--owl-border); background: var(--owl-surface);
      color: var(--owl-text-sub); font-size: 13px; font-family: 'DM Sans', sans-serif;
      cursor: pointer; white-space: nowrap; transition: all 0.15s;
    }
    .owl-btn-clear:hover { border-color: var(--owl-red); color: var(--owl-red); }

    /* ── Section headings ── */
    .owl-section { margin-bottom: 36px; position: relative; }
    .owl-section-title {
      font-family: 'DM Serif Display', serif; font-size: 1.35rem;
      color: var(--owl-purple-600); margin: 0 0 14px 0; display: flex; align-items: center; gap: 8px;
    }
    .owl-section-title::before {
      content: ''; display: inline-block; width: 4px; height: 20px;
      border-radius: 4px; background: linear-gradient(to bottom, var(--owl-accent), var(--owl-purple-400));
    }

    /* ── Shelf scroll ── */
    .owl-shelf { display: flex; gap: 14px; overflow-x: auto; padding: 4px 0 12px; align-items: flex-start; scroll-snap-type: x mandatory; }
    .owl-shelf::-webkit-scrollbar { height: 4px; }
    .owl-shelf::-webkit-scrollbar-track { background: var(--owl-surface); border-radius: 4px; }
    .owl-shelf::-webkit-scrollbar-thumb { background: var(--owl-border); border-radius: 4px; }

    /* ── Manga card ── */
    .owl-card {
      flex: 0 0 156px; background: var(--owl-surface); border-radius: 12px;
      border: 1.5px solid var(--owl-border); overflow: hidden; cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
      position: relative; scroll-snap-align: start;
    }
    .owl-card:hover { transform: translateY(-5px); box-shadow: 0 12px 36px rgba(0,0,0,0.6); border-color: var(--owl-accent); }
    .owl-card-img { width: 100%; height: 200px; object-fit: cover; display: block; background: var(--owl-surface-2); }
    .owl-card-img-placeholder { width: 100%; height: 200px; background: var(--owl-surface-2); display: flex; align-items: center; justify-content: center; color: var(--owl-text-faint); font-size: 13px; }
    .owl-card-body { padding: 8px 10px 10px; background: var(--owl-surface); }
    .owl-card-title { font-size: 12.5px; font-weight: 600; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 2.7em; color: var(--owl-text); }

    /* ── Latest card ── */
    .owl-latest-card { flex: 0 0 148px; cursor: pointer; transition: transform 0.2s; scroll-snap-align: start; }
    .owl-latest-card:hover { transform: translateY(-3px); }
    .owl-latest-img { width: 100%; height: 210px; object-fit: cover; border-radius: 10px; display: block; background: var(--owl-surface-2); }
    .owl-latest-title { font-size: 12.5px; font-weight: 600; margin-top: 6px; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; color: var(--owl-text); }
    .owl-latest-date { font-size: 11px; color: var(--owl-text-sub); margin-top: 2px; }

    /* ── Tag pill ── */
    .owl-tag { display: inline-block; padding: 3px 9px; border-radius: 20px; background: var(--owl-tag-bg); color: var(--owl-tag-text); font-size: 11.5px; font-weight: 500; margin-right: 4px; margin-bottom: 4px; }

    /* ── Fav button small ── */
    .owl-fav-sm {
      position: absolute; top: 8px; right: 8px; z-index: 20;
      border: none; background: rgba(26,15,46,0.85); padding: 5px 7px;
      border-radius: 8px; cursor: pointer; font-size: 15px; line-height: 1;
      box-shadow: 0 1px 4px rgba(0,0,0,0.4); transition: transform 0.15s;
    }
    .owl-fav-sm:hover { transform: scale(1.2); }

    /* ── Modal overlay ── */
    .owl-overlay { position: fixed; inset: 0; background: rgba(10,5,20,0.75); display: flex; align-items: center; justify-content: center; z-index: 60; backdrop-filter: blur(4px); }
    .owl-modal {
      width: 920px; max-width: 96vw; max-height: 92vh; overflow-y: auto;
      background: var(--owl-bg-2); border-radius: 18px; padding: 28px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.7); border: 1.5px solid var(--owl-border);
    }
    .owl-modal::-webkit-scrollbar { width: 6px; }
    .owl-modal::-webkit-scrollbar-thumb { background: var(--owl-border); border-radius: 3px; }

    .owl-modal-title { font-family: 'DM Serif Display', serif; font-size: 1.6rem; color: var(--owl-purple-700); margin: 0 0 4px; line-height: 1.25; }
    .owl-close-btn { border: none; background: var(--owl-surface); color: var(--owl-text-sub); width: 34px; height: 34px; border-radius: 10px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
    .owl-close-btn:hover { background: var(--owl-surface-2); color: var(--owl-accent); }

    /* ── Action buttons ── */
    .owl-btn { padding: 7px 14px; border-radius: 10px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; border: 1.5px solid transparent; font-family: 'DM Sans', sans-serif; }
    .owl-btn-add { background: var(--owl-surface); border-color: var(--owl-border); color: var(--owl-accent); }
    .owl-btn-add:hover { background: var(--owl-surface-2); border-color: var(--owl-accent); }
    .owl-btn-fav { background: var(--owl-surface); border-color: var(--owl-border); color: var(--owl-red); }
    .owl-btn-fav:hover { border-color: var(--owl-red); background: rgba(240,112,128,0.1); }
    .owl-btn-fav.active { background: rgba(240,112,128,0.15); border-color: var(--owl-red); }

    /* ── Detail tabs ── */
    .owl-tabs { display: flex; gap: 4px; margin: 16px 0 12px; border-bottom: 2px solid var(--owl-border); }
    .owl-tab { padding: 8px 16px; font-size: 13.5px; font-weight: 500; cursor: pointer; border: none; background: transparent; color: var(--owl-text-faint); border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.15s; }
    .owl-tab.active { color: var(--owl-accent); border-bottom-color: var(--owl-accent); }
    .owl-tab:hover:not(.active) { color: var(--owl-text-sub); }

    /* ── Store links ── */
    .owl-store-link {
      padding: 6px 13px; border-radius: 8px; text-decoration: none; font-size: 12.5px;
      font-weight: 600; color: #fff; transition: opacity 0.15s, transform 0.15s;
    }
    .owl-store-link:hover { opacity: 0.85; transform: translateY(-1px); }

    /* ── Progress bars ── */
    .owl-progress-label { font-size: 13px; font-weight: 600; margin-bottom: 2px; color: var(--owl-text); }
    .owl-progress-bar-bg { height: 12px; background: var(--owl-surface); border-radius: 6px; overflow: hidden; border: 1px solid var(--owl-border); }
    .owl-progress-bar-fill { height: 100%; border-radius: 6px; transition: width 0.4s ease; }
    .owl-progress-row { margin-bottom: 14px; cursor: default; }
    .owl-progress-row.clickable { cursor: pointer; }
    .owl-progress-row.clickable:hover .owl-progress-bar-fill { filter: brightness(1.15); }

    /* ── Sub-modal (fav users) ── */
    .owl-sub-overlay { position: fixed; inset: 0; background: rgba(10,5,20,0.6); display: flex; align-items: center; justify-content: center; z-index: 70; }
    .owl-sub-modal { width: 340px; max-width: 92vw; background: var(--owl-bg-2); border-radius: 14px; padding: 18px; box-shadow: 0 16px 48px rgba(0,0,0,0.6); border: 1.5px solid var(--owl-border); }

    .owl-rating-row { display: flex; align-items: center; gap: 10px; margin-top: 8px; }

    /* ── Top rated card ── */
    .owl-top-card { flex: 0 0 128px; cursor: pointer; scroll-snap-align: start; transition: transform 0.2s; }
    .owl-top-card:hover { transform: translateY(-3px); }
    .owl-top-img { width: 100%; height: 172px; object-fit: cover; border-radius: 10px; display: block; background: var(--owl-surface-2); }
    .owl-top-title { font-size: 12px; font-weight: 600; margin-top: 5px; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; color: var(--owl-text); }
    .owl-top-score { font-size: 11px; color: var(--owl-gold); font-weight: 600; margin-top: 2px; }

    .owl-divider { border: none; border-top: 1px solid var(--owl-border); margin: 8px 0 20px; opacity: 0.6; }

    /* ── Field key/value in modal ── */
    .owl-field-key { font-size: 12px; font-weight: 600; color: var(--owl-text-faint); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
    .owl-field-val { font-size: 14px; color: var(--owl-text); margin-bottom: 12px; line-height: 1.5; }

    /* ── Loading ── */
    .owl-loader-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 32px 0; }
    .owl-loader-wrap-full { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; min-height: 100vh; }
    .owl-loader-img { width: 72px; height: 72px; object-fit: contain; animation: owl-bob 1.5s ease-in-out infinite; }
    .owl-loader-img-lg { width: 90px; height: 90px; object-fit: contain; animation: owl-bob 1.5s ease-in-out infinite; }
    .owl-loader-text { font-size: 13px; color: var(--owl-text-sub); }
    @keyframes owl-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    @keyframes owl-bob { 0%,100%{transform:translateY(0);opacity:1} 50%{transform:translateY(-8px);opacity:0.75} }
    .owl-loading { color: var(--owl-text-sub); font-size: 14px; padding: 40px; text-align: center; animation: owl-pulse 1.5s infinite; }
    `}</style>
  )
}