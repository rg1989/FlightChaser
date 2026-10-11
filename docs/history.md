# The past: flown paths and History

- **Flown path:** select an aircraft and its whole leg so far shows behind it, coloured by altitude; dotted where no
  receiver heard it, and from its origin airport when the route is known.
- **History** (the rail's clock button, or `?hist=<unix s>`): the map as it was at any time of the last ~42 days (what
  adsb.lol keeps), every aircraft in view on a replay clock with its type's silhouette, and a time bar (play, scrub over
  the day, the day before and after, 1×/10×/60×, Go to, Live) that shows a loader while the time under it loads. A
  selected aircraft brings its day: its flights in amber on the bar, and where it was at any time (flying, on the ground,
  or faded where it was last heard). Chase in 3-D works in the past too. Aircraft types: the Mictronics database (ODC-By
  1.0, credit below). Design: [`.planning/history-design.md`](../.planning/history-design.md),
  [`.planning/history-ux-design.md`](../.planning/history-ux-design.md).
- **A flight by its number** (the search box): type a ticket number (`W4 3257`) or a callsign (`WMT7403`). The box says
  what the flight is and its route, where it flies now, and the days it flew: the last 14 at first, and "Search older
  days" reads on, as far as adsb.lol keeps. Pick the flight in the air and the map goes to it, its path so far behind it.
  Pick a past flight and it is replayed alone on the map, from end to end: the time bar is that flight, from its first
  point heard to its last, with both moments written under its ends (`?fl=<first s>,<last s>,<callsign>` in the link).
  The lookup starts 0.6 s after the last key and the search of the past 1.2 s after that, so a number half typed is not
  searched. A number nobody knows lists the known ones a typing slip away, marked "similar". Text that reads as an
  aircraft type too (`A320`) is looked up only when asked.
- **The pill** in the search bar (top left on a phone) says **Live**, or in the past the day and time the map shows.
  There it turns to an × under the pointer: a press returns to live, the map where it is.
- **How a past flight is found.** A ticket number is not what an aircraft sends: adsbdb.com gives its route and airline,
  and the airline's callsign list (vradarserver/standing-data) the callsigns it flies that route under (W4 3257 flies as
  WMT7403). For Ben Gurion flights the airport's flight board says which of them is the number's. Each half hour adsb.lol
  keeps is one file of 12 to 25 MB; its first megabyte or so names every aircraft in the air as the half hour begins, so
  the server asks for that part only. It reads the newest day at even steps, then the days before at the times of day the
  flight was found, and takes each flight's ends from its aircraft's trace. It reads only while a page asks.
- A live server keeps the newest hour of the past in memory (two half-hour files, ~25 MB per 30 min while it runs); older
  half hours are fetched when the replay needs them and dropped again. Nothing is written to disk.
