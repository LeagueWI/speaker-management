## Program Flow Editor

Use **Events → Program Flow Editor** to automatically group existing sessions by date/time, rearrange concurrent sessions, add section headings and agenda-only items, save a per-event layout, and export a Word program. This workflow does not require Program Blocks or Event program layouts. Existing configured blocks and layouts remain stored but the setup UI is hidden. Your old Word templates remain available under **Use an existing Word template (optional)**.

See [PROGRAM_FLOW_EDITOR_GUIDE.md](PROGRAM_FLOW_EDITOR_GUIDE.md) for the current workflow.

## Program Structure (new)

Conference programs can now define named track/roundtable layouts at the Event level and group Sessions in scheduled Program Blocks. Use **Events → Program Structure** and choose **Structured conference program** under Program Flow to generate an editable multi-column Word agenda. Existing uploaded Word templates continue to work in standard mode.

See [PROGRAM_STRUCTURE_GUIDE.md](PROGRAM_STRUCTURE_GUIDE.md) for setup, data model, compatibility, and test steps.

# League Speaker Management

A protected, multi-event speaker-management application for the League of Wisconsin Municipalities.

## Production

- Application: `https://speaker-management.eeagon.workers.dev`
- Source: `LeagueWI/speaker-management`
- Production branch: `main`
- Hosting/runtime: Cloudflare Workers + static assets
- Shared data store: Jotform through a server-side Cloudflare bridge
- Access: Cloudflare Access

## Data model

The application uses three primary shared record types:

1. **Event** — conference/program container.
2. **Session** — authoritative title, date, time, room, owner, and notes for one session.
3. **Speaker** — one person assigned to one Session ID, with speaker-specific contact information and readiness statuses.

This means a three-person panel has **one Session record and three Speaker records**. Editing the session title/date/time/room once updates what all assigned speakers display.

## Main capabilities

- Cross-event dashboard and readiness counts
- Multiple concurrent events
- First-class session management
- Add/edit/delete events, sessions, and speakers
- Reassign a speaker to a different session
- Excel template download
- Excel bulk import and update
- Stable `Session ID` carried through export/import
- Normalized session-title matching when Session ID is not supplied
- Possible-duplicate session warnings for similar imported titles
- Excel export with Speakers, Sessions, and Events worksheets
- Email preparation with templates and merge fields
- Protected Cloudflare → Jotform API bridge

## Import matching

Preferred update path:

- **Session:** `Session ID`
- If Session ID is blank, session lookup falls back to normalized `Event + Session Title` matching. Case, punctuation, whitespace, and `&` versus `and` do not affect that fallback match.
- **Speaker:** `Event + Speaker Email + Session ID`

Blank imported cells do not erase populated values already stored in the application.

The template includes these headers:

- Event Name
- Event Start Date
- Event End Date
- Event Location
- Event Status
- Event Owner
- Session ID
- Session Title
- Session Date
- Session Time
- Room
- First Name
- Last Name
- Email
- Title
- Organization
- Speaker Status
- Bio Status
- Headshot Status
- Slides Status
- AV Needs
- Registration Status
- Logistics Status
- Internal Owner
- Notes

## Security

Operational event/session/speaker records are stored in Jotform, not GitHub or browser localStorage. The Jotform API key is a Cloudflare runtime secret named `JOTFORM_API_KEY` and must never be committed to this repository or placed in browser code.

The GitHub repository is currently public, so do not commit speaker data, API keys, credentials, or other private operational information.

## Email status

The Email Center can compose, merge, preview, and open messages in the user's normal email client. Direct Jotform sending remains disabled until the Jotform dispatcher autoresponder is configured and tested.

## Operations guide

See `MASTER_OPERATIONS_GUIDE.md` for the staff operating manual, data conventions, deletion behavior, import rules, troubleshooting, and technical handoff information.
