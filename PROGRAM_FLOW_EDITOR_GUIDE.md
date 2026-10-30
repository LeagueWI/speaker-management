# Program Flow Editor

The program flow is now assembled from your existing Session records. Staff do not need to create Program Blocks, define tracks, or duplicate room assignments.

## Everyday workflow

1. Go to **Events → Program Flow Editor** and select an event. The first draft automatically groups sessions with matching dates and times.
2. Review the preview. General sessions appear full width; sessions sharing the same date and time appear side by side.
3. Use the **up/down arrows** to reposition a schedule row. Use the **Move or group…** menu on a session to separate it into its own row or combine it with another row at the same date/time. Use **left/right** arrows to reorder side-by-side sessions.
4. Optional: enter a **Section heading** (for example, Breakout Sessions 1) or **Column label** directly in the preview. The program flow supports any event structure; no predefined track count is necessary.
5. Use **+ Agenda item** for registration, breaks, meals, or networking. Use **+ Section heading** for a standalone section title.
6. Click **Save layout** to preserve the presentation. Click **Export Word** to generate an editable landscape .docx with table rows, day headings, concurrent sessions, speakers, rooms, and a Room / Notes column. Export automatically saves unsaved layout changes.

The source of truth for title, session date/time, room, and speaker assignments remains the **Sessions** and **Speakers** pages. Updating those records updates their content in the program the next time you refresh.

## What happens to previous data

The earlier Program Blocks and Event program layouts are **not deleted**. The first program draft automatically carries over previously entered activity blocks, and uses existing concurrent block titles as section headings when possible. This is a non-destructive copy into the presentation layer. They remain stored in Jotform, and the new editor can still resolve inherited track rooms on historical sessions. The Program Structure setup interface is removed from the visible workflow.

The saved presentation itself is held in a new Jotform `program-flow` record, keyed by the existing Event ID, containing only row order, optional headings, manual grouping, and agenda-only items. It does not change Session IDs, dates, times, speaker assignments, or the event record.

The **Rebuild from sessions** button clears only the editor layout and creates a new proposed schedule from existing sessions. It requires confirmation, and will discard manually added program-only items and headings. It does not remove any underlying Session or Speaker records.

Existing uploaded DOCX templates are still available in the collapsed **Use an existing Word template (optional)** area. They use the original repeating `{#sessions}` substitution tags and are separate from the visual editor's Word format.

## Limits and safeguards

- Simultaneous sessions group automatically only when their date and displayed time range match after punctuation and spacing normalization. A different scheduled time is not silently combined.
- Sessions may be moved into a different row only when the display rows share the same date and time. A moved session's date and time in the underlying record are not changed.
- Multi-column groups with more than twelve sessions are split into additional Word rows to maintain readability. Large groups still need visual review.
- Agenda-only items do not generate speaker records.
- Word output contains editable tables and can be refined further in Word. It uses the program's built-in styling, not the exact formatting of a separate uploaded template.
- The layout is automatically reconciled with newly created and removed sessions when the event is opened or refreshed. Saved custom ordering is otherwise retained.
- Jotform writes are not transactional; use Import / Export to back up core records before major updates.
- This feature is independent of the previous Program Block records, and no live records are changed during deployment.

## Functional acceptance checklist

- Open an event with existing sessions and confirm it produces an automatic chronological program.
- Verify two concurrent sessions show side by side, and three parallel roundtables occupy three columns.
- Split a concurrent group, then group the sessions back together.
- Add a break and a section heading, reorder them, save, refresh, and confirm they remain.
- Change an existing session title, room, or speaker, refresh the program, and confirm the updated details appear without losing manual arrangement.
- Export to Word and inspect the result, including long titles and pagination.
- Verify the old Word template remains available under the optional section.
