/**
 * GRM Liveroom — calendar → website schedule
 *
 * Lives in a Google Apps Script project owned by grmproductionstudio@gmail.com.
 * Whenever an event in the "GRM Liveroom" calendar is created, changed or
 * deleted (and once an hour as a safety net), it writes the taken times for
 * the next 8 weeks to data/schedule.json in the website's GitHub repository.
 * GitHub Pages republishes within about a minute and the slot shows as TAKEN.
 *
 * Only start and end times leave the calendar: titles, descriptions and
 * guests never reach the website.
 *
 * One-time setup (see the walkthrough):
 *   1. Project Settings → Script Properties → add GITHUB_TOKEN = the access key.
 *   2. Project Settings → Time zone → (GMT+01:00) Central European Time — Belgrade.
 *   3. Run `setup` once and allow the permissions it asks for.
 */

var CONFIG = {
  CALENDAR_NAME: 'GRM Liveroom',
  REPO: 'tomzeetj-dgn/GRM',
  PATH: 'data/schedule.json',
  BRANCH: 'main',
  WEEKS_AHEAD: 9,          // covers this week + the 7 the site lets visitors see, with room to spare
  TZ: 'Europe/Belgrade'
};

/** Run once: creates the two triggers and does a first sync. */
function setup() {
  var cal = getCalendar_();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'syncSchedule' || t.getHandlerFunction() === 'onCalendarChange') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onCalendarChange').forUserCalendar(cal.getId()).onEventUpdated().create();
  ScriptApp.newTrigger('syncSchedule').timeBased().everyHours(1).create();
  syncSchedule();
}

/** Calendar trigger: wait a moment so several quick edits publish as one. */
function onCalendarChange() {
  Utilities.sleep(15000);
  syncSchedule();
}

function syncSchedule() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(60000)) return;
  try {
    var json = JSON.stringify({ updated: fmt_(new Date()), slots: collectSlots_() }, null, 2) + '\n';
    publish_(json);
  } finally {
    lock.releaseLock();
  }
}

/** Taken times as local Belgrade wall-clock strings, split at midnight. */
function collectSlots_() {
  var cal = getCalendar_();
  var now = new Date();
  var from = new Date(now.getTime() - 8 * 864e5);
  var to = new Date(now.getTime() + CONFIG.WEEKS_AHEAD * 7 * 864e5);
  var out = {};
  cal.getEvents(from, to).forEach(function (ev) {
    var s, e;
    if (ev.isAllDayEvent()) { s = ev.getAllDayStartDate(); e = ev.getAllDayEndDate(); }
    else { s = ev.getStartTime(); e = ev.getEndTime(); }
    while (s < e) {
      var dayEnd = nextMidnight_(s);
      var pieceEnd = e < dayEnd ? e : dayEnd;
      var slot = { s: fmt_(s), e: fmt_(pieceEnd) };
      out[slot.s + '|' + slot.e] = slot;
      s = pieceEnd;
    }
  });
  return Object.keys(out).sort().map(function (k) { return out[k]; });
}

function nextMidnight_(d) {
  var day = Utilities.formatDate(d, CONFIG.TZ, 'yyyy-MM-dd');
  var probe = new Date(d.getTime());
  while (Utilities.formatDate(probe, CONFIG.TZ, 'yyyy-MM-dd') === day) probe = new Date(probe.getTime() + 15 * 60000);
  // step back to the exact local midnight
  var hm = Utilities.formatDate(probe, CONFIG.TZ, 'HH:mm').split(':');
  return new Date(probe.getTime() - (Number(hm[0]) * 60 + Number(hm[1])) * 60000);
}

function fmt_(d) { return Utilities.formatDate(d, CONFIG.TZ, "yyyy-MM-dd'T'HH:mm"); }

function getCalendar_() {
  var cals = CalendarApp.getCalendarsByName(CONFIG.CALENDAR_NAME);
  if (!cals.length) throw new Error('No calendar named "' + CONFIG.CALENDAR_NAME + '" in this account.');
  return cals[0];
}

/** Commit the file only when the taken times actually changed. */
function publish_(json) {
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('Missing GITHUB_TOKEN in Script Properties.');
  var url = 'https://api.github.com/repos/' + CONFIG.REPO + '/contents/' + CONFIG.PATH;
  var headers = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };

  for (var attempt = 0; attempt < 2; attempt++) {
    var sha = null, current = null;
    var got = UrlFetchApp.fetch(url + '?ref=' + CONFIG.BRANCH, { headers: headers, muteHttpExceptions: true });
    if (got.getResponseCode() === 200) {
      var meta = JSON.parse(got.getContentText());
      sha = meta.sha;
      current = Utilities.newBlob(Utilities.base64Decode(meta.content.replace(/\n/g, ''))).getDataAsString('UTF-8');
    } else if (got.getResponseCode() !== 404) {
      throw new Error('GitHub read failed: ' + got.getResponseCode() + ' ' + got.getContentText());
    }
    if (current && sameSlots_(current, json)) return;   // nothing changed: no commit, no rebuild

    var body = { message: 'Liveroom: schedule update', content: Utilities.base64Encode(json, Utilities.Charset.UTF_8), branch: CONFIG.BRANCH };
    if (sha) body.sha = sha;
    var put = UrlFetchApp.fetch(url, { method: 'put', headers: headers, contentType: 'application/json', payload: JSON.stringify(body), muteHttpExceptions: true });
    var code = put.getResponseCode();
    if (code === 200 || code === 201) return;
    if (code !== 409 && code !== 422) throw new Error('GitHub write failed: ' + code + ' ' + put.getContentText());
    Utilities.sleep(2000);   // someone else committed in between: read again and retry once
  }
}

function sameSlots_(a, b) {
  try { return JSON.stringify(JSON.parse(a).slots) === JSON.stringify(JSON.parse(b).slots); }
  catch (e) { return false; }
}
