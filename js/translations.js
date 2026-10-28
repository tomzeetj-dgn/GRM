/* ============================================================
   GRM — translations
   One source of truth for every localizable user-facing string.

   Structure: { en: { key: value }, sr: { key: value } }
   - `en` mirrors the current English copy exactly. It is the
     canonical fallback, so the English site is unchanged.
   - `sr` is Serbian (Latin script). Populated for the approved
     global + Home layer so switching visibly localizes the site.
     Missing keys fall back to `en` per-key (never undefined /
     blank / raw key names), so deeper copy stays English until
     its Serbian values are approved in a later pass.
   - Keys are semantic (nav.home, studio.hero.h1, …) and shared
     across pages, so nothing is duplicated.
   ============================================================ */
(function () {
  "use strict";

  var en = {
    /* ---- shared chrome (header / mobile menu / footer) ---- */
    "common.skip": "Skip to content",
    "common.scroll": "Scroll",
    "brand.home": "GRM HOUSE",
    "brand.footer": "GRM",

    "nav.home": "Home",
    "nav.production": "Production",
    "nav.label": "Label",
    "nav.liveroom": "Liveroom",
    "nav.openMenu": "Open menu",
    "nav.closeMenu": "Close menu",

    "a11y.headerBrand": "GRM — back to top",
    "a11y.primaryNav": "Primary",
    "a11y.mobileNav": "Mobile",
    "a11y.language": "Language",
    "a11y.panel.studio": "GRM Studio",
    "a11y.panel.label": "GRM Label",
    "a11y.panel.liveroom": "GRM Liveroom",
    "a11y.social": "Social links",
    "a11y.social.instagram": "GRM on Instagram",
    "a11y.social.youtube": "GRM on YouTube",
    "a11y.social.tiktok": "GRM on TikTok",

    "footer.lede": "An umbrella house in Belgrade — recording & production, a record label, and a live rehearsal room under one GRM.",
    "footer.col.grm": "GRM",
    "footer.col.contact": "Contact",
    "footer.col.follow": "Follow",
    "footer.city": "Belgrade, Serbia",
    "footer.rights": "GRM — All rights reserved",
    "footer.backToTop": "Back to top",

    "contact.email": "Email",
    "contact.phone": "Phone",
    "contact.address": "Address",

    /* ---- home ---- */
    "meta.home.title": "GRM — Studio · Label · Liveroom",
    "meta.home.desc": "GRM is an umbrella brand in Belgrade — a recording and production studio, a record label, and a live rehearsal room. Three worlds under one roof.",
    "meta.home.ogTitle": "GRM — Studio · Label · Liveroom",
    "meta.home.ogDesc": "GRM Studio · GRM Label · GRM Liveroom — three worlds in Belgrade.",

    "home.hero.aria": "GRM — Studio, Label, Liveroom",
    "home.panel.studio.aria": "GRM Studio — recording, composition, production, mixing and mastering",
    "home.panel.studio.title": "Studio",
    "home.panel.studio.desc": "Audio / Video Production",
    "home.panel.studio.name": "Production",
    "home.panel.studio.tag": "Audio/Video Production",
    "home.panel.label.aria": "GRM Label — GRM's record label",
    "home.panel.label.title": "Label",
    "home.panel.label.desc": "Artists & Releases",
    "home.panel.label.name": "Label",
    "home.panel.label.tag": "GRM's record label",
    "home.panel.liveroom.aria": "GRM Liveroom — rehearsal space for musicians and bands",
    "home.panel.liveroom.title": "Liveroom",
    "home.panel.liveroom.desc": "Live Events & Rehearsals",
    "home.panel.liveroom.name": "Liveroom",
    "home.panel.liveroom.tag": "Rehearsal space for musicians and bands",

    /* ---- production (studio) ---- */
    "meta.studio.title": "GRM Production — Visual · Sound",
    "meta.studio.desc": "GRM Production is the production side of GRM — film, photography, video editing, VFX, color grading and motion graphics, shown through the work.",
    "meta.studio.ogTitle": "GRM Production — Visual · Sound",
    "meta.studio.ogDesc": "Film, photography and motion under one GRM — the production side of the house.",

    "studio.hero.logoAlt": "GRM Production",
    "studio.hero.title": "PRODUCTION",
    "studio.hero.h1": "AUDIO/VIDEO PRODUCTION",
    "studio.sound.aria": "GRM Production — Sound",
    "studio.sound.name": "SOUND",
    "studio.strip.aria": "GRM Sound production strip — recording, composition, beat making, engineering",
    "studio.photo.recording.title": "Recording",
    "studio.photo.recording.desc": "Vocals, instruments and performances captured with clarity.",
    "studio.photo.recording.alt": "Person recording vocals at a studio microphone",
    "studio.photo.composition.title": "Composition",
    "studio.photo.composition.desc": "Ideas developed into melody, harmony and arrangement.",
    "studio.photo.composition.alt": "Person composing music at a keyboard",
    "studio.photo.beat.title": "Beat Making",
    "studio.photo.beat.desc": "Original beats shaped around the artist and the track.",
    "studio.photo.beat.alt": "Producer making music at a production workstation",
    "studio.photo.engineering.title": "Engineering",
    "studio.photo.engineering.desc": "Mixing and mastering that bring the record into focus.",
    "studio.photo.engineering.alt": "Audio engineer working at a mixing desk",
    "studio.archive.aria": "GRM Sound — release archive",
    "studio.visual.aria": "GRM Production — Visual",
    "studio.showreel.aria": "GRM Production showreel",
    "studio.visual.name": "VISUAL",
    "studio.visual.caps": "FILM · PHOTOGRAPHY · EDITING · VFX · COLOR · MOTION",
    "studio.visual.link": "VIEW OUR WORK",
    "studio.cta.mediaAlt": "Top view of a vinyl record on a turntable, lit with warm bronze highlights.",
    "studio.cta.eyebrow": "Sound meets visual —",
    "studio.cta.line1": "Ideas",
    "studio.cta.line2": "In good hands.",

    /* ---- label ---- */
    "meta.label.title": "GRM Label — the label",
    "meta.label.desc": "GRM Label is the record-label side of GRM — artists, releases and music from the GRM house.",
    "meta.label.ogTitle": "GRM Label — the label",
    "meta.label.ogDesc": "Artists, releases and music — GRM's record label.",

    "label.hero.logoAlt": "GRM Label",
    "label.hero.title": "LABEL",
    "label.hero.h1": "THE RECORD LABEL",
    "label.about.eyebrow": "About the label",
    "label.about.titleA": "More than",
    "label.about.titleB": "a ",
    "label.about.titleC": "label.",
    "label.people.title": "Behind GRM.",
    "label.people.photoAlt": "Đorđe Grgurović – Grzi, Rajko Bogosavljević – Džu and Milan Subotić – Igla in white quarter-zips; Džu holds a small potted plant",
    "label.people.bio.grzi": "Grzi came up through record shops, fanzines and freelance promotion, and now runs GRM’s day-to-day — schedules, artist relations, budgets and rights.",
    "label.people.bio.dzu": "Džu started GRM on a simple belief that small labels can move culture, and as creative director he shapes who signs and how every record should feel.",
    "label.people.bio.igla": "A motion designer and video editor since 2014, Igla co-founded GRM House, where he leads video production and runs the Liveroom.",
    "label.releases.eyebrow": "03 / Selected releases",
    "label.releases.title": "Selected releases.",
    "label.releases.note": "Six records from the house — real GRM covers, written, mixed & mastered in-house.",
    "label.releases.footnote": "13 releases on the catalogue · 10 artists · written, mixed & mastered in-house.",

    /* ---- liveroom ---- */
    "meta.liveroom.title": "GRM Liveroom — rehearsal space for musicians and bands",
    "meta.liveroom.desc": "GRM Liveroom is the rehearsal side of GRM — a prepared, quiet space for bands to work the set properly.",
    "meta.liveroom.ogTitle": "GRM Liveroom — rehearsal space",
    "meta.liveroom.ogDesc": "Rehearsal space for musicians and bands — GRM's live room.",

    "liveroom.hero.logoAlt": "GRM Liveroom",
    "liveroom.hero.title": "LIVEROOM",
    "liveroom.hero.h1": "REHEARSAL SPACE FOR MUSICIANS AND BANDS",
    "liveroom.room.eyebrow": "Liveroom",
    "liveroom.room.note": "Built for rehearsals. Plug in, turn up and play.",
    "liveroom.room.img1Alt": "GRM Liveroom control room",
    "liveroom.room.img2Alt": "GRM Liveroom drum kit",
    "liveroom.room.img3Alt": "GRM Liveroom Markbass amplifier",
    "liveroom.room.img4Alt": "GRM Liveroom microphone",
    "liveroom.schedule.eyebrow": "Room schedule",
    "liveroom.schedule.prev": "Previous week",
    "liveroom.schedule.next": "Next week",
    "liveroom.schedule.time": "TIME",
    "liveroom.schedule.mon": "MON",
    "liveroom.schedule.tue": "TUE",
    "liveroom.schedule.wed": "WED",
    "liveroom.schedule.thu": "THU",
    "liveroom.schedule.fri": "FRI",
    "liveroom.schedule.sat": "SAT",
    "liveroom.schedule.sun": "SUN",
    "liveroom.schedule.today": "TODAY",
    "liveroom.schedule.taken": "TAKEN",
    "liveroom.schedule.takenAria": "Taken {day} {from} to {to}",
    "liveroom.schedule.dayNames": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    "liveroom.room.title": "The<br><em>room</em>",
    "liveroom.util.location": "LOCATION",
    "liveroom.util.book": "BOOK A REHEARSAL",
    "liveroom.util.locationAria": "GRM Liveroom location: Blagoja Parovića 19a, Beograd",
    "liveroom.util.bookAria": "Call GRM Liveroom to book a rehearsal: +381 63 646 5666",

    /* ---- dynamic: schedule week / month labels ---- */
    "schedule.thisWeek": "THIS WEEK",
    "schedule.nextWeek": "NEXT WEEK",
    "schedule.lastWeek": "LAST WEEK",
    "schedule.inWeeks": "IN {n} WEEKS",
    "schedule.weeksAgo": "{n} WEEKS AGO",
    "schedule.numberWords": ["ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN"],
    "schedule.months": ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
  };

  /* Serbian (Latin) — global + Home layer (approved values).
     Prose / brand names / deeper page copy intentionally not present:
     they fall back to `en` until approved in a later pass. */
  var sr = {
    /* ---- shared chrome: UI labels (no prose) ---- */
    "common.skip": "Preskoči na sadržaj",
    "common.scroll": "Skrol",
    "nav.home": "Početna",
    "nav.production": "Produkcija",
    "nav.label": "Label",
    "nav.liveroom": "Liveroom",
    "nav.openMenu": "Otvori meni",
    "nav.closeMenu": "Zatvori meni",
    "a11y.headerBrand": "GRM — nazad na vrh",
    "a11y.primaryNav": "Glavna navigacija",
    "a11y.mobileNav": "Mobilna navigacija",
    "a11y.language": "Jezik",
    "a11y.social": "Društvene mreže",
    "a11y.social.instagram": "GRM na Instagramu",
    "a11y.social.youtube": "GRM na YouTube-u",
    "a11y.social.tiktok": "GRM na TikTok-u",
    "footer.col.contact": "Kontakt",
    "footer.col.follow": "Prati",
    "footer.city": "Beograd, Srbija",
    "footer.backToTop": "Nazad na vrh",
    /* ---- Liveroom page + shared schedule / footer ---- */
    "meta.liveroom.title": "GRM Liveroom — prostor za probe za muzičare i bendove",
    "meta.liveroom.desc": "GRM Liveroom je prostor za probe u okviru GRM-a — pripremljen i miran prostor u kom bendovi mogu da ozbiljno izvežbaju set.",
    "meta.liveroom.ogTitle": "GRM Liveroom — prostor za probe",
    "meta.liveroom.ogDesc": "Prostor za probe za muzičare i bendove — GRM-ov live room.",
    "liveroom.hero.logoAlt": "GRM Liveroom",
    "liveroom.hero.h1": "PROSTOR ZA PROBE ZA MUZIČARE I BENDOVE",
    "liveroom.room.eyebrow": "Liveroom",
    "liveroom.room.title": "Naš<br><em>prostor</em>",
    "liveroom.room.note": "Napravljen za probe. Uključi se, pojačaj i sviraj.",
    "liveroom.room.img1Alt": "GRM Liveroom — kontrolna soba",
    "liveroom.room.img2Alt": "GRM Liveroom — bubnjevi",
    "liveroom.room.img3Alt": "GRM Liveroom — Markbass pojačalo",
    "liveroom.room.img4Alt": "GRM Liveroom — mikrofon",
    "liveroom.schedule.eyebrow": "Raspored termina",
    "liveroom.schedule.prev": "Prethodna nedelja",
    "liveroom.schedule.next": "Sledeća nedelja",
    "liveroom.schedule.time": "VREME",
    "liveroom.schedule.mon": "PON",
    "liveroom.schedule.tue": "UTO",
    "liveroom.schedule.wed": "SRE",
    "liveroom.schedule.thu": "ČET",
    "liveroom.schedule.fri": "PET",
    "liveroom.schedule.sat": "SUB",
    "liveroom.schedule.sun": "NED",
    "liveroom.schedule.today": "DANAS",
    "liveroom.schedule.taken": "ZAUZETO",
    "liveroom.schedule.takenAria": "Zauzeto: {day}, od {from} do {to}",
    "liveroom.schedule.dayNames": ["ponedeljak", "utorak", "sreda", "četvrtak", "petak", "subota", "nedelja"],
    "liveroom.util.location": "LOKACIJA",
    "liveroom.util.locationAria": "Lokacija GRM Liveroom-a: Blagoja Parovića 19a, Beograd",
    "liveroom.util.book": "ZAKAŽI PROBU",
    "liveroom.util.bookAria": "Pozovi GRM Liveroom i zakaži probu: +381 63 646 5666",
    "schedule.thisWeek": "OVE NEDELJE",
    "schedule.nextWeek": "SLEDEĆE NEDELJE",
    "schedule.lastWeek": "PROŠLE NEDELJE",
    "schedule.inWeeks": "ZA {n} NEDELJA",
    "schedule.inWeeksFew": "ZA {n} NEDELJE",
    "schedule.weeksAgo": "PRE {n} NEDELJA",
    "schedule.weeksAgoFew": "PRE {n} NEDELJE",
    "schedule.numberWords": ["NULA", "JEDNU", "DVE", "TRI", "ČETIRI", "PET", "ŠEST", "SEDAM", "OSAM", "DEVET", "DESET", "JEDANAEST", "DVANAEST", "TRINAEST", "ČETRNAEST", "PETNAEST", "ŠESNAEST"],
    "schedule.months": ["JAN", "FEB", "MAR", "APR", "MAJ", "JUN", "JUL", "AVG", "SEP", "OKT", "NOV", "DEC"],
    "footer.lede": "Krovna kuća u Beogradu — snimanje i produkcija, izdavačka kuća i prostor za probe, sve pod jednim GRM-om.",
    "footer.col.grm": "GRM",
    "footer.rights": "GRM — Sva prava zadržana",
    "contact.phone": "Telefon",
    "contact.address": "Adresa",

    /* ---- home: page metadata (wired to i18n) ---- */
    "meta.home.title": "GRM — Studio · Label · Liveroom",
    "meta.home.desc": "GRM je krovni brend u Beogradu — studio za snimanje i produkciju, izdavačka kuća i prostor za probe. Tri sveta pod jednim krovom.",
    "meta.home.ogTitle": "GRM — Studio · Label · Liveroom",
    "meta.home.ogDesc": "GRM Studio · GRM Label · GRM Liveroom — tri sveta u Beogradu.",

    /* ---- home: hero + panel a11y labels ---- */
    "home.hero.aria": "GRM — Studio, Label, Liveroom",
    "home.panel.studio.aria": "GRM Studio — snimanje, kompozicija, produkcija, miks i mastering",
    "home.panel.label.aria": "GRM Label — GRM-ova izdavačka kuća",
    "home.panel.liveroom.aria": "GRM Liveroom — prostor za probe muzičara i bendova",

    /* ---- home: mobile titles + descriptors (approved) ---- */
    "home.panel.studio.title": "Produkcija",
    "home.panel.studio.desc": "Audio / Video Produkcija",
    "home.panel.liveroom.title": "Liveroom",
    "home.panel.liveroom.desc": "Nastupi & Probe",
    "home.panel.label.title": "Label",
    "home.panel.label.desc": "Izvođači & Izdanja",

    /* ---- home: desktop panel hover names (the mark carries the brand, so the
       division name stands alone; SR "PRODUCTION" = PRODUKCIJA) ---- */
    "home.panel.studio.name": "Produkcija",
    "home.panel.label.name": "Label",
    "home.panel.liveroom.name": "Liveroom",

    /* ---- home: desktop panel tag (studio only — matches approved value;
       label/liveroom tags are prose and stay English this pass) ---- */
    "home.panel.studio.tag": "Audio/Video Produkcija",

    /* ---- destination hero titles (the GRM mark carries the brand, so the
       division name stands alone; SR "PRODUCTION" = PRODUKCIJA) ---- */
    "studio.hero.title": "PRODUKCIJA",
    "label.hero.title": "LABEL",
    "liveroom.hero.title": "LIVEROOM",

    /* ---- label · Behind GRM — expertise credit labels (compact industry
       terms, kept short so no tag clips or wraps awkwardly in SR) ---- */
    "label.people.photoAlt": "Đorđe Grgurović – Grzi, Rajko Bogosavljević – Džu i Milan Subotić – Igla u belim duksevima; Džu drži malu saksiju sa biljkom",
    "label.people.bio.grzi": "Grzi je stasao uz prodavnice ploča, fanzine i frilens promociju, a danas vodi svakodnevni rad GRM-a — rasporede, odnose sa izvođačima, budžete i prava.",
    "label.people.bio.dzu": "Džu je pokrenuo GRM verujući da mali izdavači mogu da pomeraju kulturu, a kao kreativni direktor odlučuje ko potpisuje i kakav osećaj svaka ploča treba da nosi.",
    "label.people.bio.igla": "Motion dizajner i video montažer od 2014. godine, Igla je suosnivač GRM House-a, gde vodi video-produkciju i Liveroom.",
  };

  window.GRM_TRANSLATIONS = { en: en, sr: sr };
})();
