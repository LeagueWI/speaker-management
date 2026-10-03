# League Speaker Management

A reusable, multi-event speaker-management prototype for the LeagueWI GitHub account.

## MVP capabilities

- Admin dashboard with cross-event readiness counts
- Multiple concurrent events
- Add, edit, filter, and delete speaker records
- Excel template download
- Excel bulk import with update matching
- Excel export of current speaker and event data
- Email center with reusable templates and merge fields
- Working `mailto:` email handoff for individual or non-personalized group messages
- Secure email-service integration hook for a future Microsoft 365 / Graph / Power Automate / Azure Function endpoint

## Import matching rule

An imported row updates an existing speaker when these three values match:

1. Event Name
2. Speaker Email
3. Session Title

Blank cells in an update file do not erase populated values already stored in the application.

## Expected speaker import headers

- Event Name
- Event Start Date
- Event End Date
- Event Location
- Event Status
- Event Owner
- First Name
- Last Name
- Email
- Title
- Organization
- Speaker Status
- Session Title
- Session Date
- Session Time
- Room
- Bio Status
- Headshot Status
- Slides Status
- AV Needs
- Registration Status
- Logistics Status
- Internal Owner
- Notes

## Data and security

The MVP stores data in browser `localStorage`. This intentionally avoids committing speaker personally identifiable information to a public GitHub repository while the workflow is being tested.

This is not the final shared data architecture. A production version should use a secure shared backend, likely Microsoft 365 / SharePoint / Dataverse / Azure or another approved League system.

Do not place passwords, Microsoft credentials, API secrets, or private speaker data directly in this repository.

## Email architecture

The page can currently open prepared messages in the user's default mail client. Direct sending requires a secure server-side endpoint.

The application expects that future endpoint to accept a `POST` payload shaped like:

```json
{
  "fromName": "League of Wisconsin Municipalities",
  "fromEmail": "example@lwm-info.org",
  "messages": [
    {
      "to": "speaker@example.org",
      "subject": "Final logistics for Event Name",
      "body": "...",
      "speakerId": "spk_...",
      "eventId": "evt_..."
    }
  ]
}
```

The endpoint should perform authentication and sending server-side. Do not expose service credentials in the browser.

## Likely next iterations

1. Private/shared production data store
2. Microsoft 365 direct email sending and sent-message logging
3. Deadline and reminder rules
4. File links for bios, headshots, slides, and agreements
5. Speaker-facing submission form
6. Per-event email templates and event defaults
7. Activity history / audit trail
8. Role-based access
9. Automated readiness and exception reporting
10. Generation of speaker briefings, moderator briefs, and run-of-show outputs
