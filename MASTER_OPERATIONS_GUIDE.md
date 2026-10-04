# League Speaker Management
## Master Operations & Administration Guide

**Version 3.0 | October 4, 2026**

**Production dashboard:** https://speaker-management.eeagon.workers.dev  
**Diagnostic page:** https://speaker-management.eeagon.workers.dev/bridge-test.html  
**Source repository:** https://github.com/LeagueWI/speaker-management

This is the master operating guide for the League Speaker Management application. It is written so a League staff member can run the system day to day without needing to understand the code, while also documenting enough technical detail for troubleshooting, maintenance, and future handoff.

> **Access requirement:** The production application must remain protected by Cloudflare Access. The intended staff policy is **Email domain = `lwm-info.org`**, **Scope = All traffic**, with a session duration of up to 7 days. If a League colleague with an `@lwm-info.org` address cannot authenticate, check the Cloudflare Access policy rather than disabling protection.

---

# 1. The seven things to know first

1. **Events, sessions, and speakers are shared data.** They are stored in Jotform through a protected Cloudflare Worker, not in one person's browser.
2. **The data model is Event -> Session -> Speaker.** Sessions are authoritative records for session title, date, time, room, owner, and notes.
3. **Speakers are assigned to Session IDs.** A three-person panel is one Session record plus three Speaker records assigned to that session.
4. **Edit the Session once to change it for every assigned speaker.** Do not maintain duplicate copies of title/date/time/room on individual speaker records.
5. **Deleting a Session deletes its assigned Speaker records. Deleting an Event deletes its Sessions and Speakers.** Export a backup before destructive cleanup.
6. **Program Flow documents can be generated directly from the current Event, Session, and Speaker data.** Each Event can use the starter Word template or its own uploaded `.docx` template.
7. **Direct Jotform email sending is not yet enabled.** The Email Center can compose, merge, preview, and open messages in the user's normal email client.

---

# 2. What the application is and where everything lives

The application has five operational layers:

**League staff browser -> Cloudflare Access -> Cloudflare Worker -> Jotform / Cloudflare KV -> generated outputs**

- **Browser interface:** the dashboard staff use to manage events, sessions, speakers, imports, exports, Program Flow documents, and email preparation.
- **Cloudflare Access:** controls who can reach the dashboard and API routes.
- **Cloudflare Worker:** serves the application and securely handles API requests. It keeps the Jotform API key out of browser code.
- **Jotform:** shared operational data store for Event, Session, Speaker, and Communication records.
- **Cloudflare KV:** shared storage for Event-specific Program Flow Word templates.
- **GitHub:** source code and version history only. It should not contain operational speaker data or secrets.

## Production components

| Component | Current value / purpose |
|---|---|
| Production dashboard | `https://speaker-management.eeagon.workers.dev` |
| Diagnostic page | `https://speaker-management.eeagon.workers.dev/bridge-test.html` |
| GitHub repository | `LeagueWI/speaker-management` |
| Production branch | `main` |
| Cloudflare build command | `bash build-worker.sh` |
| Cloudflare deploy command | `npx wrangler deploy` |
| Cloudflare Access scope | `All traffic` |
| Staff authentication policy | Email domain `lwm-info.org` |
| Access session duration | Up to 7 days before re-authentication |
| Jotform data form | `League Speaker Management Data` - ID `262756516354160` |
| Jotform email dispatcher | `League Speaker Email Dispatcher` - ID `262755955143162` |
| Runtime secret | `JOTFORM_API_KEY` in Cloudflare Variables & Secrets |
| Program Flow storage | Cloudflare KV binding `PROGRAM_TEMPLATES` |

The GitHub repository is currently public. Never commit speaker data, API keys, passwords, or other private operational information.

---

# 3. Accessing the dashboard and giving colleagues access

## Normal staff access

1. Open `https://speaker-management.eeagon.workers.dev`.
2. Complete the Cloudflare Access authentication prompt using a League `@lwm-info.org` email address.
3. Confirm the top-right indicator says **Shared data connected**.
4. If another staff member may have made changes while the page was open, select **Refresh** on the Dashboard before beginning work.

## Cloudflare Access configuration

The production Worker should be protected with:

- **Protect with Cloudflare Access:** On
- **Scope:** All traffic
- **Authentication policy:** Email domain
- **Allowed domain:** `lwm-info.org`
- **Session duration:** 7 days is appropriate

This allows League colleagues to authenticate without being added as Cloudflare account members.

## If a League colleague cannot get in

1. Confirm the user is signing in with an `@lwm-info.org` address.
2. In Cloudflare, open the `speaker-management` Worker and review its Access policy.
3. Confirm the policy is **Email domain = lwm-info.org**, not only **Cloudflare account**.
4. Confirm the scope is **All traffic**.
5. Do not disable Cloudflare Access as a workaround. It protects both the dashboard and the `/api/*` routes that read and write data.

---

# 4. Data model

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

A Session belongs to one Event and is the authoritative record for shared schedule information.

Fields:
- Event
- Session ID
- Session title
- Session date
- Session time
- Room
- Internal owner
- Notes

**Rule:** Maintain title/date/time/room on the Session record, not independently on each Speaker.

## Speaker

A Speaker record represents one person assigned to one Session.

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

## Program Flow template

Each Event may also have one uploaded Word Program Flow template. The template is stored separately from Jotform in Cloudflare KV and is keyed to the Event's internal ID.

Common examples:

**Three-person panel**
- One Event
- One Session
- Three Speaker records assigned to the same Session ID

**One person presenting twice**
- Two Speaker records, each assigned to a different Session ID

**Speaker replacement**
- The Session stays in place
- Mark the original speaker Declined or delete that Speaker record
- Add the replacement to the same Session

---

# 5. Dashboard

The Dashboard summarizes the shared data set.

Top cards:
- **Active events:** Events with status Planning or Active
- **Sessions:** total authoritative Session records
- **Speakers:** total Speaker assignments
- **Needs attention:** Speaker records missing at least one readiness requirement; the card also shows how many are ready

The Event readiness table shows each Event's dates, status, Session count, Speaker count, ready count, and needs-attention count.

## Readiness rules

| Readiness item | Counts as complete |
|---|---|
| Bio | Received or Approved |
| Headshot | Received or Approved |
| Slides | Not required, Received, or Approved |
| Registration | Complete or Not required |
| Logistics | Sent or Acknowledged |

Records with Speaker Status `Declined` or `Complete` are excluded from Needs Attention.

Use the **Needs attention** table as the working queue for missing Bio, Headshot, Slides, Registration, or Logistics.

---

# 6. Event management

## Create an Event

1. Go to **Events**.
2. Select **+ Add event**.
3. Enter the Event name.
4. Add start date, end date, location, status, and owner as appropriate.
5. Select **Save event**.

## Change an Event name, date, location, status, or owner

1. Go to **Events**.
2. Find the Event and select **Edit**.
3. Change the necessary fields.
4. Select **Save event**.

## Event dates versus Session dates

Event start/end dates and Session dates are separate. Changing the Event date does not automatically move Sessions.

If an Event moves:
1. Update the Event dates.
2. Go to **Sessions**.
3. Update the affected Session dates/times.
4. Because Speakers reference Sessions, speaker displays and future email merge output will follow the updated Session data automatically.

## Rename an Event safely

Use **Events -> Edit**. Existing Sessions and Speakers stay linked internally by Event ID.

For future Excel imports, use the new Event name.

**Do not try to rename an existing Event only through Excel.** The import process finds Events by name and may create a new Event instead of renaming the old one.

## Complete vs. Archived vs. Delete

- **Complete:** the Event is over but remains available as history.
- **Archived:** preserve the Event while moving it out of normal active workflow.
- **Delete:** remove the Event, its Sessions, and all linked Speaker records.

## Delete an Event

1. Export a backup first if the Event contains real data.
2. Go to **Events**.
3. Select **Delete**.
4. Read the confirmation. It reports the number of Sessions and Speakers that will also be deleted.
5. Confirm only when all linked records should be removed.

The delete is sequential rather than one database transaction. If a delete reports an error, refresh before taking another action because some linked records may already have been removed.

---

# 7. Session management

## Create a Session

1. Create the Event first.
2. Go to **Sessions**.
3. Select **+ Add session**.
4. Choose the Event.
5. Enter the Session title.
6. Add date, time, room, owner, and notes.
7. Select **Save session**.

## Change a Session title, date, time, room, owner, or notes

1. Go to **Sessions**.
2. Find the Session.
3. Select **Edit**.
4. Make the change.
5. Save.

All assigned Speakers will immediately display the updated Session information.

## Move a Session to a different Event

1. Open **Sessions -> Edit**.
2. Change the Event.
3. If Speakers are assigned, the application asks whether the linked Speaker records should move with the Session.
4. Confirm only when the Session and its speakers truly belong under the new Event.

## Remove one Speaker but keep the Session

Delete the Speaker from the **Speakers** page. The Session remains.

## Remove an entire Session

1. Export a backup if needed.
2. Go to **Sessions**.
3. Select **Delete**.
4. Read the confirmation; it reports how many Speaker records are assigned.
5. Confirm.

Deleting a Session deletes the Session and every Speaker record assigned to it.

## Correct a duplicate Session

If an import created two Sessions that should be one:
1. Decide which Session is the correct authoritative record.
2. Go to **Speakers**.
3. Edit each Speaker assigned to the duplicate Session.
4. Reassign that Speaker to the correct Session.
5. Return to **Sessions**.
6. Confirm the duplicate now has zero speakers.
7. Delete the duplicate Session.

Do not delete a duplicate Session while it still has Speakers unless you intend to delete those Speaker records too.

---

# 8. Speaker management

## Add a Speaker

1. Confirm the Event exists.
2. Confirm the Session exists.
3. Go to **Speakers** or use **+ Add speaker**.
4. Choose the Event.
5. Choose a Session from that Event.
6. Enter First name, Last name, and Email.
7. Complete the status, readiness, AV, owner, and notes fields as appropriate.
8. Select **Save speaker**.

The application does not ask staff to retype Session title/date/time/room. Those values come from the selected Session.

## Edit a Speaker

Use **Speakers -> Edit** to change:
- first/last name
- email
- title / organization
- Event
- Session assignment
- Speaker status
- Bio / Headshot / Slides / Registration / Logistics status
- AV needs
- owner
- notes

## Move a Speaker to another Session

1. Open the Speaker with **Edit**.
2. Change the Event if needed.
3. Choose the target Session.
4. Save.

The selected Session must belong to the selected Event.

## Replace a Speaker

**Preserve invitation history:**
- Mark the original Speaker `Declined`.
- Add the replacement to the same Session.

**Remove the original entirely:**
- Delete the original Speaker.
- Add the replacement to the same Session.

## Remove a Speaker

1. Go to **Speakers**.
2. Find the correct record.
3. Select **Delete**.
4. Confirm.

Only that Speaker record is removed. The Session remains.

---

# 9. Program Flow Word documents

Program Flow tools are located on the **Events** page above the Event table.

The Program Flow feature generates an editable `.docx` using the current dashboard data for the selected Event.

## What the Program Flow pulls automatically

For the selected Event, the generator can populate:
- Event name
- Event location
- Event date range
- Session date
- Session time
- Session title / activity
- Room
- Assigned speakers

Sessions are ordered by date, then time, then title. Speakers with Speaker Status `Declined` are excluded from the generated Program Flow.

The default Program Flow does **not** automatically create track grids, production cues, meals, breaks, buses, or other non-Session program elements unless those are represented as Sessions or placed as static content in the custom Word template.

## Generate using the starter template

1. Go to **Events**.
2. In **Program Flow**, choose the Event.
3. If no custom template is stored, the status reads that the starter template will be used.
4. Select **Generate populated Program Flow**.
5. Open the downloaded Word file and review it.

## Download and customize the starter template

1. Go to **Events -> Program Flow**.
2. Select **Download starter template**.
3. Open the `.docx` in Word.
4. Restyle fonts, colors, logo, headers, footers, column widths, boilerplate, and static instructions as needed.
5. Preserve the template tags that should continue to populate.
6. Save as `.docx`.
7. Return to the dashboard, choose the Event, select the file, and click **Upload / replace template**.

Templates must be `.docx` files under 10 MB.

## Supported template tags

Event-level tags:
- `{event_name}`
- `{event_location}`
- `{event_dates}`

Session loop and fields:
- `{#sessions}` - starts the repeating Session row/block
- `{session_date}`
- `{session_time}`
- `{session_title}`
- `{room}`
- `{speakers}`
- `{/sessions}` - ends the repeating Session row/block

The starter template puts the opening and closing Session loop tags in the repeating table row. Keep `{#sessions}`, `{/sessions}`, and `{session_title}` intact; the uploader validates that those core tags exist.

`{speakers}` produces the assigned speaker list, one speaker per line, using available Name, Title, and Organization.

## Download the stored Event template

1. Choose the Event.
2. Select **Download uploaded template**.
3. Edit it in Word if needed.
4. Re-upload it with **Upload / replace template**.

## Remove an Event's custom template

1. Choose the Event.
2. Select **Remove template**.
3. Confirm.

The Event then falls back to the standard starter template. Removing the template does not delete Event, Session, or Speaker data.

## Program Flow storage and refresh behavior

- Each Event has at most one current custom template.
- Uploaded templates are shared across authorized users because they are stored in Cloudflare KV, not in a browser.
- The generated output always pulls the current Event/Session/Speaker data at generation time.
- If Session details or speaker assignments change, generate the Program Flow again to produce a current document.

---

# 10. Status conventions

## Event Status

- **Planning:** still being built
- **Active:** currently in active execution/coordination
- **Complete:** finished; retain as history
- **Archived:** retained but out of normal active workflow

## Speaker Status

- **Invited:** invitation sent or participation not yet confirmed
- **Confirmed:** participating
- **Declined:** not participating; retained as history
- **Ready:** operational requirements are complete
- **Complete:** post-event/finished record

## Readiness fields

Use the dropdown values consistently. The dashboard logic relies on the exact status values.

---

# 11. Excel import and export

## Safest bulk workflow

1. Go to **Import / Export**.
2. Export current data and save a dated backup.
3. If starting from scratch, download the Excel template.
4. Make edits in Excel.
5. Preserve Session IDs for existing Sessions whenever possible.
6. Upload the workbook.
7. Review the import summary and any duplicate-session warnings.
8. Refresh and spot-check affected Events, Sessions, and Speakers.

## Template headers

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

The importer processes the **first worksheet** in the uploaded workbook.

Required headers/values:
- Event Name
- Session Title
- First Name
- Last Name
- Email

Rows missing required values are skipped.

## Matching logic

**Event:** matched case-insensitively by Event Name.

**Session - preferred:** if Session ID is present, the importer uses that Session ID. If that Session ID belongs to a different Event, the import stops with an error.

**Session - fallback:** if Session ID is blank, the importer looks for a Session with the same normalized title within the Event. Normalization ignores capitalization, punctuation, extra spaces, apostrophes, and treats `&` like `and`.

**Speaker:** matched by Event + Speaker Email + Session ID.

## Renaming through Excel

- **Event name:** use the dashboard, not Excel, because Event matching is name-based.
- **Session title:** safest through the dashboard. It can also be changed through Excel **if the existing Session ID is retained**.
- **Speaker email:** changing email can cause the importer to treat the person as a different Speaker record. Use the dashboard for identity changes when possible.

## Duplicate-session warnings

When Session ID is blank and a new title is at least approximately 88% similar to an existing Session title, the importer creates the new Session but warns that it may be a duplicate.

Review those warnings on the **Sessions** page and merge manually if needed.

## Blank-cell behavior

Blank imported cells do not erase existing values on updates.

To intentionally clear an existing field, edit the record in the dashboard and save the blank value there.

## Event and Session creation through import

If an Event Name does not exist, the importer can create the Event.

If a Session cannot be matched by Session ID or normalized title, the importer creates a Session.

The main Speaker import can populate/update Session title, date, time, and room. Session owner and Session notes should be managed from the **Sessions** page.

## Export

**Export speaker data** creates a workbook with three worksheets:
- **Speakers**
- **Sessions**
- **Events**

The Speakers sheet repeats linked Session information for convenience and includes Session ID for stable future imports.

---

# 12. Email Center

## What works now

The Email Center can:
- filter recipients by Event and Speaker Status
- select or deselect recipients
- use Invitation, Materials Reminder, Final Logistics, Thank You, or Custom templates
- merge Event and Session information
- preview the first selected message
- open the prepared message in the user's normal email client

Merge fields:
- `{{first_name}}`
- `{{last_name}}`
- `{{event_name}}`
- `{{session_title}}`
- `{{session_date}}`
- `{{session_time}}`
- `{{room}}`

Because Session details come from the Session record, one schedule edit changes future email merge output for every assigned Speaker.

## Individual personalized email

1. Choose the Event.
2. Select the Speaker.
3. Choose/edit the template.
4. Preview.
5. Select **Open in email client**.
6. Review the draft before sending.

## Group email

If multiple recipients are selected and the message still contains merge fields, the application blocks the group handoff because a `mailto:` link cannot personalize a separate message for each recipient.

A multi-recipient handoff can use BCC only when no merge fields remain.

## Email defaults

From Name and Reply-To Email settings are convenience settings stored in the current browser. They are not shared operational records and do not currently control the sender account in the user's email application.

## Direct Jotform sending

The Jotform dispatcher exists, but **Send through Jotform** remains disabled until its autoresponder is configured and tested.

---

# 13. Multi-user working rules

The shared data and Program Flow templates are multi-user, but the interface is not a live collaborative document.

Recommended practice:
- Refresh before beginning a work block.
- Refresh after another person says they made substantial changes.
- Avoid two people editing the same Event, Session, or Speaker at the same time.
- Coordinate large Excel imports so one person owns the import at a time.
- Export before high-volume cleanup.
- If something looks stale, refresh before re-entering data.

There is no record locking. If two people edit the same record at nearly the same time, the later save can overwrite the earlier save.

---

# 14. Backup, recovery, and destructive changes

Export a dated workbook before:
- a large Excel import
- deleting an Event
- deleting a Session with assigned Speakers
- major schedule restructuring
- large-scale status cleanup

Suggested milestone backups:
- initial roster load
- after confirmations are substantially complete
- before final logistics
- immediately before the Event
- after the Event closes

GitHub rollback can restore application code, but it **does not** restore deleted or changed Jotform data or deleted Program Flow templates.

---

# 15. What not to do

- Do not put the Jotform API key in GitHub, Excel, email, or browser code.
- Do not disable Cloudflare Access on the production Worker.
- Do not restrict normal League access only to Cloudflare account members if the goal is domain-wide staff access.
- Do not manually rename/delete Jotform backend questions unless the application code is being updated at the same time.
- Do not delete the Jotform data form or email dispatcher form.
- Do not edit Session title/date/time/room independently on Speaker records; those details belong to the Session.
- Do not delete a Session just to remove one panelist; delete the Speaker record instead.
- Do not delete an Event just to remove it from current work; use Complete or Archived.
- Do not assume changing Event dates changes Session dates.
- Do not delete Program Flow template tags when restyling a custom template.
- Do not expect the root repository `index.html` to control production; the Worker build copies `app.html` to `public/index.html`.

---

# 16. Troubleshooting

## Shared data connected is not showing

1. Refresh the browser.
2. Confirm Cloudflare Access authentication is valid.
3. Go to **Settings** and use **Refresh shared data**.
4. Test `https://speaker-management.eeagon.workers.dev/api/health`.
5. If needed, confirm the Cloudflare runtime secret `JOTFORM_API_KEY` still exists.

## A League colleague is denied access

Check Cloudflare Access. The policy should allow the email domain `lwm-info.org` for **All traffic**.

## Speaker cannot be added

A Speaker requires both an Event and a Session. Create the Session first.

## Session dropdown is empty

Confirm the correct Event is selected and that at least one Session exists under that Event.

## A panelist shows the wrong title/time/room

Edit the Session, not the Speaker.

## Two versions of the same Session appear

Reassign Speakers to the correct Session first, then delete the empty duplicate Session.

## Excel import shows possible duplicate Sessions

Review the warning and compare the Sessions. Similar titles may be legitimate; the system intentionally does not auto-merge them.

## A delete partially fails

Refresh immediately. Event and Session deletes remove linked records sequentially, so some records may already be gone.

## Program Flow says template is missing tags

Download the starter template again and compare your customized file. At minimum, preserve:
- `{#sessions}`
- `{session_title}`
- `{/sessions}`

Keep the other supported tags wherever you want their values to appear.

## Program Flow Upload button is disabled

Choose an Event first.

## Program Flow generation uses the wrong schedule or speakers

1. Refresh shared data.
2. Check the Event's Sessions page.
3. Check Speaker assignments/statuses.
4. Remember that Declined Speakers are intentionally omitted.
5. Generate the Program Flow again.

## Custom Program Flow template cannot be downloaded

Confirm the Event is selected and the Program Flow status says an uploaded template exists. If it does not, the Event is using the starter template.

---

# 17. Technical administration and maintenance

Routine Event/Speaker work should not require GitHub or Cloudflare administration. This section is for the application owner/support person.

## Production source files

- `app.html` - dashboard markup; copied to production as `public/index.html`
- `app.js` - Event/Session/Speaker CRUD, Excel, dashboard, Email Center
- `styles.css` - dashboard styling
- `program-flow.js` - Program Flow UI, DOCX validation, data merge, and generation
- `program-flow-starter.docx` - default Word template
- `src/index.js` - Worker router
- `functions/api/*` - backend API handlers
- `functions/api/program-template.js` - Program Flow template upload/download/delete API
- `functions/api/lib/jotform.js` - Jotform integration
- `build-worker.sh` - assembles static Worker assets
- `wrangler.jsonc` - Worker bindings and runtime configuration

The old GitHub Pages workflow has been removed. Cloudflare Workers Builds is the production deployment path.

## Deployment flow

1. A change is committed to `main` in `LeagueWI/speaker-management`.
2. Cloudflare Workers Builds detects the push.
3. Cloudflare runs `bash build-worker.sh`.
4. The script creates `/public`, copies the live dashboard files, and injects PizZip/Docxtemplater plus `program-flow.js` into the production page.
5. Cloudflare runs `npx wrangler deploy`.
6. Wrangler deploys the Worker and static assets.
7. The production URL updates after a successful build.

## Runtime configuration

`JOTFORM_API_KEY` is an encrypted Cloudflare Worker secret and must never be committed to GitHub.

Non-secret Jotform form IDs in `wrangler.jsonc`:
- `JOTFORM_DATA_FORM_ID = 262756516354160`
- `JOTFORM_EMAIL_FORM_ID = 262755955143162`

Program Flow templates use the Cloudflare KV binding:
- `PROGRAM_TEMPLATES`

## API routes

- `GET /api/health` - integration health
- `POST /api/setup` - backend setup utility; do not use casually after initial provisioning
- `GET /api/state` - shared Events/Sessions/Speakers/Communications
- `POST /api/record` - write one record
- `DELETE /api/record` - delete one record
- `POST /api/batch` - bulk writes/import
- `/api/email` - email-dispatch integration
- `GET/POST/DELETE /api/program-template` - Program Flow template metadata/download/upload/delete

## Jotform record structure

The shared data form stores generic records using:
- `recordType`
- `recordId`
- `payloadJson`
- `updatedAt`

Record types currently include Event, Session, Speaker, and Communication.

Manage operational data through the dashboard rather than manually editing the backend submissions.

## Program Flow generation architecture

- Custom `.docx` templates are stored in Cloudflare KV per Event.
- If an Event has no custom template, the static starter template is used.
- The dashboard loads current shared data, prepares Event/Session/Speaker merge data, and populates the Word file in the browser using PizZip + Docxtemplater.
- The finished `.docx` is downloaded to the user's computer and remains editable in Word.

## Diagnostic page

`https://speaker-management.eeagon.workers.dev/bridge-test.html`

Use it for troubleshooting only. The setup action should not be run casually because the backend forms already exist.

---

# 18. Current limitations / future enhancements

Current known limitations:
- No real-time multi-user locking
- No user-facing audit trail or undo
- Direct Jotform email sending not yet enabled
- Email default settings are browser-local
- No dashboard file storage for speaker bios, headshots, slides, or agreements
- Program Flow auto-population is limited to Event/Session/Speaker fields supported by the current template engine; tracks and production cues are not separate structured entities
- Program Flow custom templates are one-per-Event; there is no template version history in the dashboard
- Jotform state reading is subject to backend submission limits and API behavior
- The source repository is public, so no private operational data or secrets may be committed

---

# 19. Jarrod handoff checklist

Jarrod should be able to complete each item without assistance:

- [ ] Open `https://speaker-management.eeagon.workers.dev`
- [ ] Authenticate with an `@lwm-info.org` address
- [ ] Confirm **Shared data connected**
- [ ] Refresh shared data
- [ ] Create and edit an Event
- [ ] Explain that Event dates and Session dates are separate
- [ ] Create and edit a Session
- [ ] Explain that Session title/date/time/room are maintained once on the Session
- [ ] Move a Session to a different Event and understand the linked-Speaker confirmation
- [ ] Add/edit a Speaker and assign the correct Session
- [ ] Remove one Speaker without deleting the Session
- [ ] Remove an entire Session and understand that assigned Speakers will be deleted
- [ ] Complete/archive an Event instead of deleting it when history should be retained
- [ ] Export a dated backup
- [ ] Use Session ID correctly in Excel updates
- [ ] Review possible duplicate-session warnings after an import
- [ ] Use the Email Center preview/open-in-client workflow
- [ ] Download the Program Flow starter template
- [ ] Upload/replace an Event-specific Program Flow template
- [ ] Generate a populated Program Flow and verify Sessions/Speakers
- [ ] Preserve Program Flow template tags when restyling
- [ ] Know that direct Jotform sending is not yet enabled
- [ ] Know where to look first when the connection indicator is unhealthy

---

# 20. One-page task cheat sheet

| Task | Where | Key point |
|---|---|---|
| Open dashboard | `https://speaker-management.eeagon.workers.dev` | Sign in with League email |
| Refresh data | Dashboard / Settings | Refresh before major edits |
| Add Event | Events -> + Add event | Event is top-level record |
| Change Event date | Events -> Edit | Then update affected Sessions |
| Archive finished Event | Events -> Edit | Prefer Archived/Complete over Delete |
| Delete Event | Events -> Delete | Deletes its Sessions and Speakers |
| Add Session | Sessions -> + Add session | Session owns title/date/time/room |
| Change Session | Sessions -> Edit | One edit updates all assigned Speakers |
| Move Session | Sessions -> Edit | Confirm moving assigned Speakers |
| Delete Session | Sessions -> Delete | Deletes assigned Speakers |
| Add Speaker | Speakers -> + Add speaker | Event and Session must already exist |
| Move Speaker | Speakers -> Edit | Choose target Session |
| Remove one Speaker | Speakers -> Delete | Session remains |
| Replace Speaker | Mark old Declined + add replacement | Preserves invitation history |
| Export backup | Import / Export -> Export | Do before bulk/destructive work |
| Bulk import | Import / Export | Preserve Session IDs |
| Rename existing Event | Events -> Edit | Do not rename only through Excel |
| Rename existing Session | Sessions -> Edit | Or retain Session ID in Excel |
| Program Flow starter | Events -> Program Flow | Download starter template |
| Custom Program Flow | Events -> Program Flow | Upload `.docx` under 10 MB |
| Generate Program Flow | Events -> Program Flow | Pulls current Sessions/Speakers |
| Email a Speaker | Email Center | Preview, then open in email client |
| Connection problem | Settings / `/api/health` | Check Access and Jotform secret |
| Colleague cannot sign in | Cloudflare Access | Allow email domain `lwm-info.org` |

---

**League of Wisconsin Municipalities - Training & Member Services**  
**Version 3.0 | Last updated October 4, 2026**
