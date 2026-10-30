> **Legacy workflow, superseded.** The visual Program Flow Editor replaces the Program Blocks and track-setup UI. Existing data is retained. Use [PROGRAM_FLOW_EDITOR_GUIDE.md](PROGRAM_FLOW_EDITOR_GUIDE.md) for the current workflow.

# Program Structure and Structured Word Programs

This enhancement adds configurable program layouts, scheduled program blocks, and editable multi-column Word agendas without replacing the existing Event → Session → Speaker model.

## What changes

- **Event → Edit → Program layouts**: Add any named layout, such as "Concurrent Breakouts" with Track 1 and Track 2, or "Learning Roundtables" with three named columns. Each column may have a default room.
- **Events → Program Structure**: Choose an event, then create program blocks with title, date, time, order, layout, type, and notes.
- **Sessions → Add/Edit**: Assign a session to a block and, for multi-column layouts, choose its track/column. The block's date and time are authoritative and populate the session's date and time.
- **Events → Program Flow**: Choose "Structured conference program" to generate a Word file with landscape pages, day headings, gray section bands, editable cells, breaks, full-width activities, and concurrent sessions. Choose "Existing Word template" to keep using current `{#sessions}` tags and uploaded templates.

## Initial setup for Spring Exchange

1. Export a dated workbook from Import / Export as a backup.
2. Edit the 2027 Spring Exchange event. In **Program layouts**, add a two-column layout named **Concurrent Breakouts** with **Track 1** and **Track 2**. Add a three-column layout named **Learning Roundtables** with three named roundtable columns. Save the event.
3. In **Program Structure**, select the event. Add Thursday's opening general session as a full-width scheduled session block, three breakout blocks using Concurrent Breakouts, and lunch/keynote as a full-width block. Add registration, breaks, reception and other non-speaker activities using **Activity / break / meal**.
4. Add Friday's roundtables as two program blocks using Learning Roundtables. Add Friday's general sessions and closing luncheon as full-width blocks.
5. Create or edit the Sessions under their respective program blocks. Select Track 1, Track 2, or the appropriate roundtable column. Add and manage speakers as before.
6. In Program Flow select **Structured conference program**, generate the Word document, and inspect the schedule, page breaks, rooms and speakers. Adjust wording and styling directly in Word as needed.

## Data storage and compatibility

- Event `programLayouts` is an array on the existing event's `payloadJson`. Each layout has stable ID, name, and columns with stable IDs, names, and optional rooms.
- A new `program-block` Jotform record type stores block ID, Event ID, date, time, title, kind, layout ID, order and notes. This uses the existing generic Jotform data form, and **does not require additional Jotform questions, forms or credentials**.
- Session records acquire optional `blockId` and `columnId` fields. Existing sessions remain valid and appear in the Word output even when unassigned to a block.
- Event or Session edits preserve their new metadata. Changing a block's date/time updates assigned session records so the speaker-email merge continues to use the correct values.
- Deleting a block detaches its sessions without deleting sessions or speakers. Deleting an event removes its program blocks too. Archived events retain their blocks unless permanently deleted.
- The exported workbook includes block/column IDs in the speaker and session sheets, layout configuration JSON in the Events sheet, and a Program Blocks sheet. The import tool still processes its **first sheet only**. To change layouts or blocks, use the dashboard; the additional export sheets are useful as backup and reference. The speaker importer accepts optional existing Program Block ID and Column ID.
- Existing uploaded Program Flow templates are unchanged and remain available in **Existing Word template** mode.

## Important boundaries

- Structured Word mode generates its own editable table with consistent gray shading and red break/section accents. It **does not** apply the uploaded custom Word template's exact styles. Use the standard mode for a template whose formatting must be preserved exactly.
- The structured Word renderer supports up to 12 columns. For unusually wide layouts, review Word pagination and readability.
- No drag-and-drop agenda editor or session conflict detection is included. Use dates, times and the Order field to control display.
- Large Jotform batches are not transactions. Before major schedule restructuring, export a backup.
- The application runs on Cloudflare Workers. Merging to `main` triggers the production build and deployment. Review and test this branch before merging.

## Verification checklist

- Create two- and three-column Event layouts and save/reopen them.
- Create activity, full-width, and concurrent program blocks. Confirm they are stored after refresh.
- Assign a Session and speaker to a track. Update the block time; confirm both the Session and Email Center show the revised time.
- Generate structured Word and verify gray day headings, breaks, track columns, three-column roundtables, speaker lists, and blank track placeholders.
- Generate an existing custom template in standard mode and verify all `{#sessions}` tags still populate.
- Export a workbook and review the Program Blocks, Sessions and Events sheets.
- Archive an event and verify its program structure is retained.
- Verify no speaker statuses, communication records, or email templates have changed.

## Technical files

- `program-structure.js`: Event layout editor, Program Blocks UI, Session assignment controls, and synchronization.
- `structured-word.js`: Builds editable Word document table XML using PizZip and the existing DOCX starter package.
- `app.js`, `app.html`, `styles.css`: Integrates the new controls and preserves Event/Session metadata.
- `functions/api/state.js`: Returns program-block records from Jotform.
- `program-flow.js`, `lazy-tools.js`: Selects and loads structured Word generation.
- `archive-tools.js`: Deletes blocks alongside permanently deleted archived events.
- `tests/structured-word.test.cjs`: Word content and merged-cell checks, executed in the build script.

No live event or speaker data is migrated by this code change. Program Block setup is optional and can be completed one event at a time.
