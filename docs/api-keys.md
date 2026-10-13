# API keys: what they are for and how to connect them

Flight Chaser runs with no key and no account. It starts with live traffic, terrain, imagery and weather.

Three free keys are optional. Each one makes one thing better. This document says how to get each key, where to put
it, how to check it, and what went wrong when we did it.

| Key | Makes better | Without it | Where it goes | Cost |
|---|---|---|---|---|
| ArcGIS API key | The ground picture: Esri World Imagery, 0.3 m at large airports | EOX Sentinel-2, 10 m | The browser (Settings), or `.env.local` | Free up to 2,000,000 tiles each month |
| Cesium ion token | The terrain: Cesium World Terrain | Re:Earth terrain | The browser (Settings), or `.env.local` | Free for personal use |
| EUMETSAT key and secret | The clouds in the chase: the satellite's own pixels, 2 to 11 minutes sooner | The same clouds from EUMETSAT's keyless pictures | `.env.local` on the server only | Free |

If you want one key only, get the ArcGIS key. It changes the picture the most.

## 1. Where a key lives

There are two places. Choose one for each key.

**The browser.** Open Settings (the gear button) → API keys. Paste the key and press Save. Then reload the page.

- The key stays in that browser. It goes only to its own provider.
- A key saved here has priority over `.env.local`.
- The setup guide does the same with instructions for each step. It opens on the first start. To open it again, use
  Settings → API keys → Setup guide, or add `?setup=1` to the address.

**The file `.env.local`.** It is in the project folder and git ignores it.

1. If `.env.local` does not exist, copy the example: `cp .env.example .env.local`
2. Open `.env.local` in an editor. Set the variable. Write no quotes and no spaces round the `=`.
3. Stop the app with Ctrl+C. Start it again (`flight-chaser`, `npm start` or `make`). The app reads `.env.local` only when it starts.

| Key | Variable |
|---|---|
| ArcGIS API key | `VITE_ARCGIS_KEY` |
| Cesium ion token | `VITE_CESIUM_ION_TOKEN` |
| EUMETSAT key | `EUMETSAT_KEY` |
| EUMETSAT secret | `EUMETSAT_SECRET` |

The EUMETSAT pair works only in `.env.local`. Only the server uses it. The Settings dialog does not have it.

## 2. ArcGIS API key

1. Create an **ArcGIS Location Platform** account: <https://location.arcgis.com/sign-up/>
2. Open the dashboard: <https://location.arcgis.com/>. Open My portal.
3. Select Content → New item → Developer credentials → API key credentials.
4. Select Public application. Then select No item access.
5. Under Privileges, tick **Basemap styles service**.
6. Set an expiration date. A key lasts 1 year at most. Give the key a title.
7. Generate the key. Copy it immediately. The page shows it one time only.
8. Save the key (section 1).

Check: Save in Settings asks Esri about the key and says what is wrong before it saves. After the reload, open the
first panel on the rail (Aircraft in view and live status). It shows `Imagery: Esri`.

What went wrong for us:

| Problem | Cause | Fix |
|---|---|---|
| The account has no page for API keys | The account was a public ArcGIS Online account. That type cannot make API keys | Sign up at `location.arcgis.com`, not at `arcgis.com`. The account type must be ArcGIS Location Platform. |
| We lost the key after we made it | The page shows a key one time | Generate a new key in the same credentials item. |
| Settings says "This key lacks the Basemap styles service privilege" | We missed step 5 | Edit the credentials, tick the privilege, generate the key again. |
| The key is in `.env.local` and the picture is still coarse | We did not start the app again | Stop the app and start it. |
| The picture was sharp and became coarse | The key expired, or the free tiles of the month ran out | The status panel shows `Imagery: EOX` and the reason. Generate a new key, or wait for the next month. |
| Some tiles are missing far from cities at the closest zoom | Esri has no picture there at that zoom | This is not a defect. The app enlarges the nearest picture. |

Esri's tile server accepts a wrong key for some requests without an error. Do not use the picture as the proof. Use
the check in Settings and the line in the status panel.

## 3. Cesium ion token

1. Create a Cesium ion account: <https://ion.cesium.com/signup/>
2. Open Access Tokens: <https://ion.cesium.com/tokens>
3. Copy the Default Token.
4. Save the token (section 1).

Check: Save in Settings asks Cesium about the token before it saves. With the token, the app uses Cesium World
Terrain.

- With an ion token and no ArcGIS key, the ground picture is Bing imagery through ion.
- If you make your own token in place of the Default Token, permit it to read asset 1 (Cesium World Terrain). Without
  that, Settings says "This token cannot open Cesium World Terrain (asset 1)".

## 4. EUMETSAT key and secret

This pair is for the server. Without it the app shows the same clouds from EUMETSAT's keyless pictures.
[weather.md](weather.md) says what changes.

1. Create an account at the EO Portal: <https://eoportal.eumetsat.int/>. Confirm the email address.
2. Sign in. Open the data licences in the account. Accept the licence for **Meteosat** data.
3. Open <https://api.eumetsat.int/api-key/>. Copy the consumer key and the consumer secret.
4. Put both in `.env.local`:
   ```
   EUMETSAT_KEY=<consumer key>
   EUMETSAT_SECRET=<consumer secret>
   ```
5. Stop the app and start it.

Check: chase an aircraft over Europe, Africa or the Middle East with the weather on. Wait 30 seconds after the server
starts. Open the browser console and type `weather3d.satellite`. The answer has `raw: true` when the frame came through
the key.

What went wrong for us:

| Problem | Cause | Fix |
|---|---|---|
| The key page says "Unable to get or create subscriptions for user" | The account was new. We accepted the licence, but the key service did not know the account yet | Wait some hours. Sign out, sign in, open the page again. Ours worked later the same day. |
| The app's terminal says "the key was refused (HTTP 401)" | The key and the secret are exchanged, one is cut short, or only one is set | Copy both again. Both are necessary. |
| The two variables do not work after we added them with `>>` | The last line of `.env.local` had no line end, so two variables are on one line | Open the file in an editor. Put each variable on its own line. |
| The first clouds after a start come late | The first request gets a token, searches and downloads 2 files | Wait 30 seconds. After that the frames are in memory. |
| `raw` is not `true` | The server started before we set the key, or the aircraft is outside the satellite's view | Start the app again. The satellite sees Europe, Africa and the Middle East. |

EUMETSAT's terms: no commercial or operational use, and no redistribution of the original data. The server writes
none of the data to disk.

## 5. Two settings that are not keys

| Variable | What it is | When you need it |
|---|---|---|
| `CONTACT` | Your email address or a URL. The server sends it in its User-Agent | Only for `make live LIVE_SOURCE=adsblol` and the recorders. adsb.lol requires it. |
| `NTFY_URL` | An [ntfy](https://ntfy.sh) topic that receives each new alert | Only for alerts on your phone. The topic is a password: anybody who knows it can read the alerts. Use a long random name. |

## 6. Keep the keys safe

1. Do not commit `.env.local`. Git ignores it. Do not put a key in any other file.
2. **Do not publish a build made with keys in `.env.local`.** `npm run build` writes each `VITE_` value into the
   JavaScript in `dist/`. For a public copy, build without them. Each visitor then adds their own keys in Settings.
3. Do not put a key in a link, a screenshot, an issue or a chat.
4. If a key leaks, delete it at the provider and make a new one.
5. Other devices that can open your app's address also get the `VITE_` keys of `.env.local`. Keys saved in Settings
   stay in one browser.

For an AI agent that works in this repository:

- The user makes each account and copies each key. Do not sign up, sign in or accept a licence for the user.
- Do not print a key, and do not read `.env.local` aloud. To see whether a variable is set, test for its name only:
  `grep -c '^EUMETSAT_KEY=.' .env.local`
- Tell the user which variable to set and in which file. The user pastes the value.

## 7. Quick checks

| Question | How to find the answer |
|---|---|
| Which imagery is in use? | The first panel on the rail: `Imagery: Esri`, `Imagery: EOX · <reason>`, or `Imagery: Bing`. |
| Is a browser key valid? | Settings → API keys. The line under the field says "Saved in this browser" or the reason it failed. |
| Did the app read `.env.local`? | Only after the app starts again. A key saved in Settings has priority. |
| Does the satellite key work? | Browser console: `weather3d.satellite` has `raw: true`. |
| Does the app work with no key? | Yes. Remove the keys and reload. Nothing else changes. |
