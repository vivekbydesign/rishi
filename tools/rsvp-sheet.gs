/**
 * Rishi's RSVPs → a private Google Sheet (only you can see it).
 *
 * Setup (about 2 minutes):
 *  1. Create a new Google Sheet, e.g. "Rishi RSVPs".
 *  2. Extensions → Apps Script. Replace everything with this file. Save.
 *  3. Deploy → New deployment → type "Web app".
 *       Execute as: Me    ·    Who has access: Anyone
 *     (Guests can only ADD rows. Nobody but you can open the sheet.)
 *  4. Copy the Web app URL and paste it into config.js → window.RSVP_ENDPOINT.
 *
 * Each guest's phone has an id, so if they tap "Change" their row is updated, not duplicated.
 */
const HEAD = ['Updated', 'Name', 'Coming?', 'Grown-ups', 'Little ones', 'Note', 'Id'];

function doPost(e) {
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const r = JSON.parse(e.postData.contents);
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sh.getLastRow() === 0) { sh.appendRow(HEAD); sh.setFrozenRows(1); sh.getRange(1, 1, 1, HEAD.length).setFontWeight('bold'); }
    const clean = v => String(v == null ? '' : v).replace(/^[=+\-@]/, "'").slice(0, 200);
    const row = [new Date(), clean(r.name), r.go === 'yes' ? 'Yes' : 'No', +r.a || 0, +r.k || 0, clean(r.note), clean(r.id)];
    const ids = sh.getLastRow() > 1 ? sh.getRange(2, 7, sh.getLastRow() - 1, 1).getValues().map(x => x[0]) : [];
    const i = r.id ? ids.indexOf(String(r.id)) : -1;
    if (i >= 0) sh.getRange(i + 2, 1, 1, row.length).setValues([row]); else sh.appendRow(row);
    return ContentService.createTextOutput('ok');
  } finally { lock.releaseLock(); }
}
