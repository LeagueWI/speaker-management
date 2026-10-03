# League Speaker Management
## Master Operations & Administration Guide

**Version 2.0 | October 3, 2026**

**Production application:** https://speaker-management.eeagon.workers.dev  
**Source repository:** https://github.com/LeagueWI/speaker-management

This guide is the operating manual for the League Speaker Management application. It is written so a staff member can run the application day to day without understanding the code, while also documenting the technical structure needed for troubleshooting and future handoff.

> Before handing this to another staff member, confirm that person can authenticate through Cloudflare Access. Access is controlled at the Cloudflare layer, not inside the application.

---

# 1. The six things to know first

1. **Events, sessions, and speakers are shared data.** They are stored in Jotform through a protected Cloudflare Worker, not in one person's browser.
2. **Sessions are now first-class records.** The data model is Event → Session → Speaker. A session owns its title, date, time, room, owner, and notes.
3. **Speakers are assigned to a Session ID.** A three-person panel is one Session record plus three Speaker records assigned to that same session.
4. **Edit the session once to change it for everyone.** Changing a session title, date, time, or room automatically changes what every assigned speaker displays.
5. **Deleting a session deletes its assigned speaker records. Deleting an event deletes its sessions and speakers.** Read confirmations carefully and export a backup before destructive cleanup.
6. **Direct Jotform email sending is not yet enabled.** The Email Center can compose, merge, preview, and open messages in the normal email client. “Send through Jotform” remains disabled until the dispatcher autoresponder is configured and tested.

---

# 2. What the application is and where everything lives

The application has four operational layers:

**Browser interface → Cloudflare Worker → Jotform API → Jotform submissions**

- **Browser interface:** the pages staff use to manage events, sessions, speakers, imports, exports, and email preparation.
- **Cloudflare Worker:** serves the application and securely handles read/write requests. It keeps the Jotform API key out of the browser.
- **Jotform:** acts as the shared data store. Staff should normally not edit backend submissions directly.
- **GitHub:** stores application code and version history. It does not store operational speaker data or the Jotform API key.

## Production components

| Component | Current value / purpose |
|---|---|
| Production URL | `https://speaker-management.eeagon.workers.dev` |
| GitHub repository | `LeagueWI/speaker-management` |
| Production branch | `main` |
| Cloudflare build command | `bash build-worker.sh` |
| Cloudflare deploy command | `npx wrangler deploy` |
| Cloudflare access scope | All traffic |
| Current Access authentication model | Cloudflare account |
| Access session duration | Up to 7 days before re-authentication |
| Jotform data form | `League Speaker Management Data` — ID `262756516354160` |
| Jotform email dispatcher form | `League Speaker Email Dispatcher` — ID `262755955143162` |
| Runtime secret | `JOTFORM_API_KEY` in Cloudflare Variables & Secrets |

The GitHub repository is currently public. Never commit speaker data, passwords, API keys, or other private operational information.

---

# 3. Data model

## Event

An Event is the top-level container for a conference, training, meeting, or other program.

Fields:
- Event name
- Start date
- End date
- Location
- Status: Planning, Active, Complete, Archived
- Internal owner

## Session

A Session belongs to one Event and is the authoritative source for shared session details.

Fields:
- Event
- Session ID
- Session title
- Session date
- Session time
- Room
- Internal owner
- Notes

**Important:** Staff should not type a session title independently for every speaker. Create the session once, then assign speakers to it.

## Speaker

A Speaker record represents one person assigned to one session.

Fields:
- Event
- Session ID
- First name
- Last name
- Email
- Title
- Organization
- Speaker status
- Bio status
- Headshot status
- Slides status
- Registration status
- Logistics status
- AV needs
- Internal owner
- Notes

### Common examples

**Three-person panel**
- One Event
- One Session
- Three Speaker records assigned to that Session ID

**One person presenting twice**
- One person can have two Speaker records, each assigned to a different Session ID.

**Speaker replacement**
- The Session stays.
- Remove or edit the departing speaker record.
- Add or assign the replacement to the same Session.

---

# 4. Accessing the application

1. Open `https://speaker-management.eeagon.workers.dev`.
2. Complete the Cloudflare Access authentication prompt.
3. Confirm the top-right indicator says **Shared data connected**.
4. If another staff member may have changed data while your page was open, use **Refresh** on the Dashboard before beginning work.

## If someone cannot get in

Access is controlled by Cloudflare, not by the application. Do not disable Cloudflare Access as a workaround; it protects both the dashboard and the `/api/*` endpoints.

---

# 5. Dashboard

The Dashboard summarizes the shared data set.

Top cards:
- **Active events:** Planning or Active events.
- **Sessions:** total authoritative session records.
- **Speakers:** total speaker assignments.
- **Needs attention:** active speaker records missing at least one readiness requirement. The card also notes how many speaker records are ready.

## Readiness rules

A speaker readiness item counts as complete when:

| Item | Complete values |
|---|---|
| Bio | Received or Approved |
| Headshot | Received or Approved |
| Slides | Not required, Received, or Approved |
| Registration | Complete or Not required |
| Logistics | Sent or Acknowledged |

Records with Speaker Status `Declined` or `Complete` are excluded from Needs Attention.

---

# 6. Event management

## Create an event

1. Go to **Events**.
2. Select **+ Add event**.
3. Enter the Event name.
4. Add dates, location, status, and owner.
5. Select **Save event**.

## Change an event name, date, location, status, or owner

1. Go to **Events**.
2. Select **Edit**.
3. Make the change.
4. Select **Save event**.

Changing an Event does not automatically change individual Session dates. If the entire event moves, update the Event dates and then update the affected Sessions.

## Rename an event

Use **Events → Edit**. Existing Sessions and Speakers remain linked internally by Event ID.

For future Excel work, use the new Event name.

## Complete vs. Archive vs. Delete

- **Complete:** event is over but remains in the system.
- **Archived:** preserve history while removing it from normal active workflow.
- **Delete:** remove the Event and all linked Sessions and Speakers.

## Delete an event

1. Export a backup first if the Event contains real data.
2. Go to **Events**.
3. Select **Delete**.
4. Read the confirmation. It reports how many Sessions and Speakers will also be removed.
5. Confirm only when all linked records should be deleted.

The delete operation is sequential, not a database transaction. If an error occurs during deletion, refresh before taking another action.

---

# 7. Session management

## Create a session

1. Create the Event first.
2. Go to **Sessions**.
3. Select **+ Add session**.
4. Choose the Event.
5. Enter the Session title.
6. Add date, time, room, owner, and notes.
7. Select **Save session**.

## Why session details live here

The Session record is the one authoritative place for:
- title
- date
- time
- room

Do not repeat or maintain those values independently on each Speaker. This prevents panels from drifting into slightly different titles or schedules.

## Change a session title

1. Go to **Sessions**.
2. Find the Session.
3. Select **Edit**.
4. Change the title.
5. Save.

All assigned speakers will immediately display the new title because they reference the Session ID.

## Change a session date, time, or room

Use **Sessions → Edit**. Change the value once and save.

There is no need to edit every panelist.

## Move a session to a different event

1. Go to **Sessions → Edit**.
2. Change the Event.
3. If speakers are assigned, the application will ask you to confirm moving those Speaker records with the Session.
4. Confirm only when the Session and its speakers truly belong under the new Event.

## Remove one speaker but keep the session

Delete the Speaker record from **Speakers**. The Session remains.

## Remove an entire session

1. Export a backup if needed.
2. Go to **Sessions**.
3. Select **Delete**.
4. The confirmation reports how many Speaker records are assigned.
5. Confirm.

Deleting a Session removes that Session and every Speaker record assigned to it.

## Correct a duplicate session

If an import created two Sessions that should be one:

1. Decide which Session is the correct authoritative record.
2. Go to **Speakers**.
3. Edit each Speaker assigned to the duplicate Session.
4. Change the Session dropdown to the correct Session.
5. Save each Speaker.
6. Return to **Sessions**.
7. Confirm the duplicate now shows zero speakers.
8. Delete the duplicate Session.

Do not delete the duplicate first if it still has speakers, because deleting a Session also deletes its assigned speakers.

---

# 8. Speaker management

## Add a speaker

1. Confirm the Event exists.
2. Confirm the Session exists.
3. Go to **Speakers** or use **+ Add speaker**.
4. Choose the Event.
5. Choose the Session from that Event.
6. Enter First name, Last name, and Email.
7. Complete status and readiness fields.
8. Save.

The application does not ask you to retype the Session title/date/time/room. Those values come from the selected Session.

## Edit a speaker

Use **Speakers → Edit** to change:
- name
- email
- title / organization
- Event
- Session assignment
- Speaker status
- Bio / Headshot / Slides / Registration / Logistics status
- AV needs
- owner
- notes

## Move a speaker to another session

1. Open the Speaker with **Edit**.
2. Choose the Event if needed.
3. Choose the target Session.
4. Save.

This is the correct way to fix a speaker who was assigned to the wrong Session.

## Replace a speaker

Two acceptable workflows:

**Preserve the original record as history**
- Mark the original Speaker `Declined`.
- Add the replacement to the same Session.

**Remove the original entirely**
- Delete the original Speaker.
- Add the replacement to the same Session.

Use the first method when the invitation/decline history matters.

## Remove a speaker

1. Go to **Speakers**.
2. Find the person.
3. Select **Delete**.
4. Confirm.

Only that Speaker record is deleted. The Session remains.

---

# 9. Capitalization, spelling, and duplicate prevention

## Manual entry

When staff add Speakers manually, Session names cannot drift because the Speaker chooses an existing Session from a dropdown.

These variations in speaker names do not create separate identity logic by themselves:
- `Jane Smith`
- `jane smith`
- `JANE SMITH`

The displayed capitalization remains whatever staff entered.

## Excel import

The preferred stable key is **Session ID**.

When Session ID is present:
- the importer uses the Session ID even if the Session title has changed.

When Session ID is blank:
- the importer falls back to normalized Session Title matching within the Event.
- capitalization is ignored.
- punctuation is ignored.
- extra spaces are ignored.
- `&` and `and` are treated the same.

Examples that match through normalization:
- `Data Centers & Local Government`
- `data centers and local government`
- `Data Centers and Local Government!`

A genuinely different or misspelled title may create a new Session. The importer checks for similar existing titles and displays **Possible duplicate sessions to review** when similarity is high.

Use the Sessions page to resolve any flagged duplicates.

---

# 10. Excel template and import

## Download the template

Go to **Import / Export → Download Excel template**.

The template headers are:

1. Event Name
2. Event Start Date
3. Event End Date
4. Event Location
5. Event Status
6. Event Owner
7. Session ID
8. Session Title
9. Session Date
10. Session Time
11. Room
12. First Name
13. Last Name
14. Email
15. Title
16. Organization
17. Speaker Status
18. Bio Status
19. Headshot Status
20. Slides Status
21. AV Needs
22. Registration Status
23. Logistics Status
24. Internal Owner
25. Notes

Required import values:
- Event Name
- Session Title
- First Name
- Last Name
- Email

## Session ID behavior

For a new Event/Session, Session ID may be blank. The application generates one.

After records exist, **export current data before making bulk updates**. The export contains Session ID so later imports have a stable key even if the title changes.

## Import matching

Preferred matching:
- Event by Event Name
- Session by Session ID
- Speaker by Event + Email + Session ID

Fallback when Session ID is blank:
- Event by Event Name
- Session by normalized Event + Session Title
- Speaker by Event + Email + resulting Session ID

## Blank cell behavior

Blank imported cells do not erase existing populated values during updates.

If you need to intentionally clear a populated field, use the UI rather than relying on a blank Excel cell.

## Possible duplicate warnings

After import, review any warning that says a new Session title is highly similar to an existing Session title.

A warning does not automatically merge the records because two legitimately different sessions can have similar names.

---

# 11. Export and backup

Go to **Import / Export → Export speaker data**.

The workbook contains:
- **Speakers** worksheet
- **Sessions** worksheet
- **Events** worksheet

The Speakers sheet also repeats the linked Session ID and session schedule data for convenience.

## Recommended backup practice

Export before:
- deleting an Event
- deleting a Session with assigned speakers
- a large Excel update
- major schedule restructuring

Use dated filenames and keep the exported workbook in the appropriate League file location.

---

# 12. Email Center

The Email Center can:
- filter recipients by Event and Speaker Status
- select/deselect speakers
- use built-in templates
- merge session information into messages
- preview the first selected message
- open a message in the normal email client

Merge fields:
- `{{first_name}}`
- `{{last_name}}`
- `{{event_name}}`
- `{{session_title}}`
- `{{session_date}}`
- `{{session_time}}`
- `{{room}}`

Because session details come from the Session record, one schedule edit automatically changes future email merge output for all assigned speakers.

Direct Jotform sending remains disabled pending autoresponder configuration and testing.

---

# 13. Multi-user working rules

The data is shared, but the interface is not a live collaborative document.

Recommended practice:
- Refresh before beginning a work block.
- Refresh after another person says they made substantial changes.
- Avoid having two people edit the same Event/Session/Speaker at the same moment.
- Export before high-volume cleanup.
- If something looks stale, refresh before re-entering data.

---

# 14. Troubleshooting

## “Shared data connected” is not showing

1. Refresh the browser.
2. Confirm Cloudflare Access login is valid.
3. Go to **Settings** and use **Refresh shared data**.
4. If still failing, test `/api/health`.
5. Confirm the Cloudflare secret `JOTFORM_API_KEY` still exists.

## Speaker cannot be added

A Speaker requires:
- an Event
- at least one Session under that Event

Create the Session first.

## Session dropdown is empty

Check that:
- the correct Event is selected
- a Session exists under that Event

## A panelist shows the wrong title/time/room

Do not edit the Speaker. Edit the Session.

## Two versions of the same session appear

Reassign speakers to the correct Session, then delete the empty duplicate.

## Excel import creates a possible-duplicate warning

Review the Sessions page. Do not assume the warning is an error; similar titles can be legitimate.

## A destructive delete partially fails

Refresh immediately. Determine which records remain before retrying.

---

# 15. Technical structure for future administrators

## Static application files

- `app.html` — main interface
- `app.js` — browser behavior, session/speaker/event CRUD, import/export, migration logic
- `styles.css` — visual styles
- `build-worker.sh` — copies production static assets into `/public`
- `wrangler.jsonc` — Cloudflare Worker configuration

## Worker/API files

- `src/index.js` — Worker entry point and API router
- `functions/api/health.js` — connection status
- `functions/api/setup.js` — Jotform setup helper
- `functions/api/state.js` — returns Events, Sessions, Speakers, and Communications
- `functions/api/record.js` — create/update/delete one record
- `functions/api/batch.js` — create/update batches
- `functions/api/email.js` — Jotform email-dispatch submission endpoint
- `functions/api/lib/jotform.js` — shared Jotform API helpers

## Current Jotform storage strategy

The data form stores generic record envelopes:
- Record Type (`event`, `session`, `speaker`, `communication`)
- Record ID
- JSON payload
- Updated timestamp

This lets the application add Session records without requiring a new Jotform form schema.

## Migration from the original model

The original application stored session title/date/time/room directly on Speaker records.

The current application automatically detects legacy Speaker records that do not have a Session ID, creates Session records from them, links the Speakers to those Session IDs, and removes the stale per-speaker session fields from the updated payload.

After migration, staff should review the Sessions page once for any historical title/schedule inconsistencies.

---

# 16. Change management and deployment

The Cloudflare Worker is connected to the GitHub `main` branch.

Normal code-change workflow:
1. Change code in `LeagueWI/speaker-management`.
2. Commit to `main`.
3. Cloudflare automatically runs `bash build-worker.sh`.
4. Cloudflare deploys with `npx wrangler deploy`.
5. Test the production application.

Do not place the Jotform API key in GitHub. It belongs only in Cloudflare Variables & Secrets.

---

# 17. Jarrod handoff checklist

Before Jarrod independently runs the application, confirm he can:

- Sign in through Cloudflare Access.
- Confirm **Shared data connected**.
- Create, edit, complete, archive, and safely delete an Event.
- Create and edit a Session.
- Change a Session title/date/time/room and understand that assigned Speakers inherit it.
- Add a Speaker to an existing Session.
- Move a Speaker to a different Session.
- Remove one Speaker without deleting the Session.
- Delete a Session and understand that assigned Speakers are deleted with it.
- Download the Excel template.
- Export current data and preserve Session IDs.
- Import updates and interpret possible-duplicate Session warnings.
- Use Dashboard readiness status.
- Prepare and preview email messages.
- Export a backup before destructive or large-scale changes.
- Refresh shared data before reconciling an apparent discrepancy.

---

# 18. Quick task reference

| Need to do | Where | Action |
|---|---|---|
| Add event | Events | + Add event |
| Change event date | Events | Edit |
| Add session | Sessions | + Add session |
| Rename session | Sessions | Edit once |
| Change session time/room | Sessions | Edit once |
| Add panelist | Speakers | + Add speaker → choose Session |
| Remove one panelist | Speakers | Delete |
| Replace panelist | Speakers | Decline/delete old + add new to same Session |
| Move speaker to another panel | Speakers | Edit → choose different Session |
| Remove whole session | Sessions | Delete; assigned Speakers are also deleted |
| Correct duplicate session | Speakers + Sessions | Reassign Speakers, then delete empty duplicate |
| Bulk add/update | Import / Export | Download/export → edit → import |
| Preserve stable session matching | Excel | Keep Session ID column |
| Back up | Import / Export | Export speaker data |
| Refresh after another user works | Dashboard | Refresh |
| Change title/date/time/room for all panelists | Sessions | Edit the Session, not each Speaker |

---

# 19. Current limitations / next development

Current known limitations:
- Direct Jotform email sending is not enabled.
- No file-upload storage for bios/headshots/slides inside the app.
- No audit-history screen showing who changed a record and when.
- No undo/recycle bin in the dashboard.
- Cloudflare Access user administration is outside the app.
- Similar-title detection warns about possible duplicates but intentionally does not auto-merge them.

These limitations should be considered before further expansion.
