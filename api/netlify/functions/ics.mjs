// Serves the calendar invite with a fresh UID per download. Calendars like Google treat the UID as a
// global event id, so one shared UID can link guests' copies together (showing another guest as creator).
export default async () => {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Rishi//Invite//EN',
    'BEGIN:VEVENT',
    `UID:${crypto.randomUUID()}@happybirthdayrishi.com`,
    `DTSTAMP:${stamp}`,
    'DTSTART:20261122T190000Z',
    'DTEND:20261122T210000Z',
    "SUMMARY:Rishi's first birthday",
    'LOCATION:2459 NE Daphne St\\, Issaquah\\, WA',
    'DESCRIPTION:One very hungry little caterpillar is turning one!',
    'END:VEVENT',
    'END:VCALENDAR',
    ''
  ].join('\r\n');
  return new Response(ics, { headers: {
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': 'inline; filename=rishi-first-birthday.ics',
    'Cache-Control': 'no-store'
  } });
};

export const config = { path: '/rishi.ics' };
