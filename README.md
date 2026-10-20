# Join the Network: GDHCN onboarding simulation

A browser game that teaches how a country onboards to the WHO Global Digital Health Certification Network (GDHCN). The player is **Country XC**, a sample country, and takes it from a first email to live on the production Trust Network Gateway. Each moment is a choice; wrong choices send things back, sometimes several steps later, the way they would in real onboarding.

Built for the GDHCN onboarding workshop (Kigali) and for ministry teams to replay and demonstrate afterwards.

## Live

- **Game:** https://gdhcn-join-the-network.netlify.app (Netlify project `gdhcn-join-the-network`, team carlsbox)
- **Feedback sheet:** https://docs.google.com/spreadsheets/d/170X9_25-5S-s1FZbN8kieRopElHTl72NMmo2o3YUr0Y/edit
- **Receiver:** Apps Script project "GDHCN game feedback receiver" (standalone), web app deployment "Game feedback v1"

**Deploys are automatic:** the Netlify project is linked to `carlsbox/gdhcn-onboarding-game`, so every push to `main` builds (`npm run build`, see `netlify.toml`) and publishes. The feedback URL is in `.env.production`.

## Run it

```bash
npm install
npm run dev        # http://localhost:5199
npm run build      # static files in dist/, host anywhere
```

`dist/` uses relative paths, so it can sit in any folder on a web server.

Facilitators can jump to a phase from **⚙ Settings** in the top bar or with a URL hash: `#phase=A` to `#phase=E`.

### Dev mode (reviewers)

Open the game once with `#dev` in the URL (for example `http://localhost:5199/#dev`). That unlocks a **Dev mode** toggle under ⚙ Settings, remembered in that browser. With it on:

- every stop on the bottom progress strip is clickable and opens that moment as if all earlier steps went right (`#m=7` does the same);
- **⏭ End** in the top bar skips to the debrief and the completion splash (`#end`);
- each wrong choice gets a red *preview* link that shows its set-back panel, including delayed ones, without costing days.

### Use cases

**▶ Use cases** in the top bar opens a gallery of the use-case films, with a page for each: *Mary's Yellow Card* (digital ICVP) and *Amina's Journey* (maternal care, International Patient Summary). Each page has the film, a summary, how the GDHCN helps, and why the use case matters. Deep links: `#usecases`, `#usecase/icvp`, `#usecase/maternal`. The pages open over whatever is on screen, so a game in progress isn't lost.

To add a use case, put a 720p MP4 and a poster JPG in `public/video/` and add an entry to `src/usecases/data.ts`. The current films were compressed from the 1080p masters with `ffmpeg -i master.mp4 -vf scale=-2:720 -c:v libx264 -preset slow -crf 30 -maxrate 700k -bufsize 1400k -tune animation -c:a aac -b:a 80k -movflags +faststart out.mp4` (about 6–7 MB each).

"GDHCN" in the top-left of the bar returns to the start screen. About this simulation (under ⚙ Settings) carries a small "Built by OS Forge" credit.

### Easter eggs (keep quiet)

- **The sad cat** peeks over the corner of about one set-back panel in three (every one in dev mode). Its mood follows the run's detours: unimpressed at 0–1, drooping at 2–4, under a rain cloud from 5. Clicking it gives a synthesised "mrrp" and a one-line tip.
- **The crowned cat** sits on the completion badge after a run with zero detours.
- **Three hidden cats** in the 3D world, only visible by orbiting: behind the offline SCA vault, asleep on the PROD gateway, and behind the Secretariat dome. Clicking one shows "Cat n of 3 found"; About then shows the count. All code is in `src/ui/cat.ts` and `cat()` in `src/world/models.ts`.

### End of the game

After the debrief, **Finish** opens a completion splash with links to the live WHO GDHCN page, the SMART Trust guide, the onboarding process and checklist, the smart-trust and tng-participant-template repositories, and gdhcn-support@who.int.

### Make it your country

On the title screen, type your country's name. The 2–3 letter code fills itself in (editable) and drives the ministry sign and email domain (`health.ke`). Repository names use the ISO 3-letter code, as the onboarding checklist requires (`tng-ken-uat`; the sample country becomes `tng-xxc-uat`). **Advanced: name your team** renames the four representatives; emails and initials follow. Choices are remembered in the browser; *Reset to the sample country* restores Country XC.

### Demo mode

**▶ Watch the demo** on the title screen (or `#demo` in the URL) plays the ideal path in nine beats, about four minutes, with no choices and no errors: apply, make the keys, public keys to GitHub, the Letter of Application, identity checks, tng-bot collecting the keys, air-gapped PROD signing, UAT testing, go live. Each beat shows a caption with its WHO step reference and is narrated by **Naomi** (Higgsfield Seed Audio, speech rate 15, the narrator of *Mary's Yellow Card*). The demo is deliberately generic: it always says "The Country" and refers to the team by role (Business Owner, Key Master, Legal representative, Technical lead), so the recorded narration always matches. Custom names apply only in the game.

Controls: pause, previous, next, jump to any beat (dots), and 🔊 to mute or unmute. Narration is on by default; if the browser blocks autoplay (for example, opening `#demo` directly) the demo runs silently with a *Tap for sound* button. The end card offers *Play it yourself*.

Beat 2 shows four role tiles (Business Owner, Legal representative, Technical lead, Key Master) that light up as Naomi names each role, then add the Key Master's certificates and the offline vault. Their cue times are in `CAST` in `src/demo/Demo.ts`, taken from the pauses in the beat-02 clip; re-time them if that clip is regenerated.

The narration clips live in `public/audio/demo/beat-01.mp3` to `beat-09.mp3`. If you change a caption in `src/demo/Demo.ts`, regenerate that clip so the audio still matches:

```bash
higgsfield generate create seed_audio --prompt "<caption text>" --voice_type preset --voice_id caeba733-3c17-43db-863e-69c7025512cd --speech_rate 15 --format wav --wait --json
```

then convert it with `ffmpeg -i take.wav -ac 1 -b:a 64k beat-NN.mp3`. In the spoken prompt, write tng-bot as "T N G bot" so it is read out letter by letter.

## Reviewer feedback

Every screen has a **💬 Feedback** tab on the left edge. A reviewer picks a type (accuracy, unclear, bug, idea, works well), writes a comment and optionally adds name, organisation and email. The game attaches where they were (game moment, demo beat, title or debrief, with WHO step references), their country setting, game days and detours, then posts it to the Google Sheet **Join the Network (GDHCN game) · reviewer feedback** (tab `Feedback`, one row per comment, `Status` column for triage).

The sheet is reached through a small Apps Script web app, `apps-script/feedback.gs` (it caps field lengths, blocks formula injection and has a honeypot for bots). Set it up once:

1. Open the sheet → **Extensions → Apps Script**, replace the code with `apps-script/feedback.gs`, save.
2. **Deploy → New deployment → Web app**. Execute as **Me**, Who has access **Anyone**. Authorise when asked.
3. Copy the `/exec` URL into `.env` as `VITE_FEEDBACK_URL=…` (see `.env.example`) and rebuild.

Without the URL the tab still opens but says feedback is not connected.

## How it is organised

| File | What it holds |
|---|---|
| `src/game/scenario.ts` | **All game content.** 18 moments, their choices, consequences, WHO step references and takeaways, written with `{country}`, `{keymaster}` and similar tokens. Edit this to change the story. |
| `src/game/settings.ts` | Country, code and team names: defaults, saving, and filling the tokens. |
| `src/demo/Demo.ts` | The nine demo beats, their captions and controls. Narration clips in `public/audio/demo/`. |
| `src/game/types.ts` | The shape of a moment, choice and consequence. |
| `src/game/Game.ts` | The flow: play a moment, set back on wrong calls, run delayed checks, debrief. |
| `src/world/World.ts` | The three.js world: territories, roads, parcels, camera. |
| `src/world/models.ts` | Buildings and shared materials (soft-glow look). |
| `src/world/Bot.ts` | tng-bot, an original character. |
| `src/ui/ui.ts`, `src/style.css` | Top bar, HUD, desk panel, progress strip, debrief, completion splash. |
| `src/ui/dev.ts` | Dev mode unlock and jumps. |
| `src/usecases/data.ts`, `page.ts` | Use-case films: content, gallery and pages. |

### The world

- **Country XC** (amber boundary): Ministry of Health (people, paperwork) and the country backend (private keys, the offline SCA vault).
- **Trust Network Gateway** (teal): UAT and PROD gateways. PROD is roped off until the dry run passes.
- **WHO** (blue): GDHCN Secretariat and Operations, with the air-gapped signing room for the WHO Trust Anchor.
- **GitHub** (purple, neutral island): the country's private repos, read by tng-bot.
- **Expiry dashboard** (WHO island, south): the WHO-run certificate expiry dashboards (DEV, UAT, PROD). Used in the last moment: the dashboard shows the dates, but tracking and renewal stay with the country.
- **Paper road** (dotted orange arc): email and letters go straight from Ministry to Secretariat. **Data roads** (solid) carry keys.

### Delayed consequences

Four wrong choices look fine at the time and fail later, at the point WHO's process would catch them:

| Choice | Caught at |
|---|---|
| Windows' built-in cURL (Schannel) | UAT connectivity test (step 61) |
| One certificate set for UAT and PROD | WHO verification of the PROD request (steps 39–42) |
| Personal email in the GPG key | GPG email check against the Letter (steps 21–22) |
| Tag created on the GitHub website | tng-bot signature check |

## Source and accuracy

Content follows the WHO SMART Trust Implementation Guide (https://smart.who.int/trust; checked against v1.7.5 of the source repository, October 2026), mainly the onboarding process ([1]–[80]), the onboarding checklist and certificate governance. In any discrepancy the IG, and the GDHCN Administrative and Operational Framework for definitions, are the authority.

Simplifications to know about:

- Steps are grouped into 18 moments.
- Some checks are shown at a convenient point in the story (for example, reused certificates caught during WHO's PROD verification).
- "Game days" are illustrative, not WHO timelines.
- Country XC and its people (Dr Zawadi Nkosi, Kwame Mensah, Sara Diallo, Tendai Banda) are fictional.
- The IG text differs on the bot's repository permission (read in the process page, Write in the checklist), so the game does not mention it.
- The WHO emblem is not used.
