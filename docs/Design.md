# Fireflies Meeting Notes Clone — Design Specification

## 1. Design objective

Recreate the visual language and information architecture visible in the supplied Fireflies.ai screenshots, while keeping the implementation original.

The screenshots establish these recurring patterns:

- Dark blue vertical sidebar on the left.
- White content canvas.
- Compact top application bar.
- Purple as the primary interaction/accent color.
- Rounded cards/inputs with light borders.
- Large whitespace and high information density only where useful.
- Small, muted secondary text.
- Lightweight icons next to navigation labels.
- Modals centered over a dimmed page.
- Meeting detail organized as a two-panel workspace: AI notes/summary and transcript.

Current Fireflies documentation also describes the Notepad as a two-panel meeting workspace with AI summary/notes on the left and transcript on the right. Use this as confirmation of the screenshot-derived layout, not as a reason to add bonus features outside the assignment scope. citeturn629797search2

## 2. Global shell

### Desktop layout

```text
┌───────────────┬──────────────────────────────────────────────────────────┐
│ Sidebar       │ Topbar                                                   │
│  ~140–160 px  ├──────────────────────────────────────────────────────────┤
│               │                                                          │
│               │ Main content                                             │
│               │                                                          │
└───────────────┴──────────────────────────────────────────────────────────┘
```

The sidebar remains fixed while the main content scrolls.

### Sidebar

Visual direction:

- Background: deep blue/blue-slate, approximately `#334563`.
- Width: 148 px at desktop reference size; allow 150–170 px depending on typography.
- White/light-gray labels.
- Active route gets a subtly lighter background and a purple vertical indicator on the right edge.
- Logo at top with a simple original icon mark and `fireflies.ai`-style wordmark treatment; do not scrape proprietary asset files.
- Footer contains Upgrade / referral/profile-style blocks as visual placeholders.

Navigation shown for visual fidelity:

```text
Home
Meetings
Meeting Status
Playlist
Uploads
────────────────
Integrations
Apps
Topic Tracker
Analytics
────────────────
Team
Upgrade
Settings
Platform Rules
```

Only Home, Meetings, Uploads, and Settings need functional behavior in v1. Other routes should open a consistent `Coming Soon` placeholder.

## 3. Topbar

The screenshot shows a compact horizontal application bar with:

- Page title or section label.
- Global search field.
- Small utility icons.
- Upgrade/plan indicator.
- Usage counters.
- Add/create button.
- Profile avatar.

For v1:

- Global search may be visual-only on non-meeting pages.
- On Meetings page it should route/filter into the meeting list, but transcript-wide global search is bonus and should not be built.
- Usage counters can be static placeholders.
- Profile avatar opens a tiny placeholder menu or no-op menu.

## 4. Meetings library screen

### Layout

Use a centered max-width content region with a title row followed by search/filter controls and a table/list.

Recommended structure:

```text
Meetings
┌─────────────────────────────────────────────────────────────────────┐
│ Search meetings...      Participant ▼   Date ▼      + New meeting   │
└─────────────────────────────────────────────────────────────────────┘

Recent meetings
┌──────┬──────────────────────────┬────────────┬──────────┬──────────┐
│      │ Meeting                  │ Date       │ Duration │ People   │
├──────┼──────────────────────────┼────────────┼──────────┼──────────┤
│ ...  │ Weekly Product Sync      │ Jun 07     │ 29:10    │ 4        │
│ ...  │ Design Review            │ Jun 06     │ 41:32    │ 3        │
└──────┴──────────────────────────┴────────────┴──────────┴──────────┘
```

The assignment requires title, date, duration, participants, search/filter, and recency sorting. fileciteturn0file0L26-L32

### Empty/loading states

Use:

- Skeleton rows while loading.
- `No meetings found` with a clear reset-filter control.
- `No meetings yet` with `Create meeting` CTA if the database is empty.

## 5. Meeting detail / Notepad screen

The meeting page is the most important screen.

Current Fireflies documentation describes the Notepad as a workspace containing AI-generated summary, full transcript, recording, analytics, and action items, with summary/notes on the left and transcript on the right. For this assignment, implement the summary, transcript, player, and action items portions only. citeturn629797search2

### Recommended viewport composition

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ ← Meetings   Meeting title                              Edit  Share  … │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌───────────────────────────────┐ ┌───────────────────────────────────┐ │
│ │ SUMMARY / NOTES               │ │ TRANSCRIPT                        │ │
│ │                               │ │                                   │ │
│ │ Overview                      │ │ Search transcript...              │ │
│ │ paragraph...                  │ │                                   │ │
│ │                               │ │ 00:00  AARON                      │ │
│ │ Key points                    │ │       Hello everyone...           │ │
│ │ • point                      │ │                                   │ │
│ │ • point                      │ │ 00:12  MAYA                       │ │
│ │                               │ │       Today we need to...         │ │
│ │ Action items                 │ │                                   │ │
│ │ □ Maya — Send design         │ │ ...                               │ │
│ │                               │ │                                   │ │
│ │ Topics / chapters             │ │                                   │ │
│ └───────────────────────────────┘ └───────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ media controls                    00:00 ────────●────── 29:10       │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

The implementation may place the player above the two panels instead of below them if that better matches the reference while keeping all required interactions.

## 6. Meeting header

Show:

- Meeting title.
- Date/time.
- Host/owner.
- Participant avatars/count.
- Edit action.
- Share action.
- Overflow/delete action.

The supplied reference screenshot demonstrates a centered share modal over the meeting page; its visual language should be reproduced with an original modal implementation. The share modal can be a v1 placeholder with link-copy interaction only, because real collaboration permissions are out of scope.

## 7. Media player

Use a dark media rectangle or compact player bar.

Required:

- Play/pause.
- Current time.
- Total duration.
- Seek bar.
- Playback speed control may be included because it is small and useful, but it is not required.
- Clicking a transcript line updates playback position.
- Seeking updates active transcript segment.

A real recording file is optional under the assignment; a simulated player is acceptable. fileciteturn0file0L33-L39

## 8. Transcript panel

### Visual style

- Right panel on desktop.
- Soft border-left or vertical divider.
- Search field at the top.
- Compact transcript rows.
- Timestamp in small muted text.
- Speaker name above or beside the text.
- Active row gets subtle purple-tinted background/left indicator.
- Search matches receive a yellow-ish or purple highlight, but do not overuse color.

### Interaction

```text
click transcript row
  -> move player to row.start
  -> mark row active

player currentTime changes
  -> determine active row
  -> highlight active row
```

The assignment explicitly requires both directions of synchronization and highlighted transcript search matches. fileciteturn0file0L33-L39

## 9. Summary panel

Render sections in this order:

1. Overview
2. Key points / notes
3. Action items
4. Topics / outline / chapters

Use concise typography with strong section headers and generous spacing. Do not render huge AI cards; the original feel is document-like and productivity-oriented.

The assignment explicitly requires summary, action items, and key topics/outline/chapters. fileciteturn0file0L40-L44

## 10. Action items

Each action item should have:

- Checkbox.
- Task title.
- Optional assignee.
- Optional due date.
- Completed state.
- Edit affordance.

Interaction:

- Click checkbox -> persist completion.
- Add -> create via API.
- Edit -> inline edit or modal.
- Delete -> confirmation.

The assignment requires add/edit/complete action items and persistence. fileciteturn0file0L45-L51

## 11. Create meeting / Upload screen

Follow the supplied upload screenshot closely:

- Same dark sidebar.
- Very large centered heading.
- Short explanatory subtitle.
- Large bordered drag-and-drop area.
- Upload icon centered above/before dropzone.
- Light gray border and white background.
- Secondary helper/question icon near lower edge.

Functional adaptation for v1:

- Drag/drop or file picker for `.txt`, `.vtt`, `.json`.
- A paste-transcript tab/section.
- Metadata inputs for title and participants.
- Create button.
- On success, redirect to the meeting detail page.

The assignment explicitly allows meeting creation by uploading or pasting a transcript. fileciteturn0file0L45-L51

## 12. Modal design

Use a reusable modal primitive:

- Background overlay around 45–60% black opacity.
- White panel.
- 10–14 px border radius.
- Close icon top-right.
- Title and small metadata line.
- Tabs where appropriate.
- Purple active tab underline.
- Compact controls.

The supplied share screenshot shows this visual pattern and should be treated as the reference for modal density and spacing.

## 13. Toasts

Use a small, fixed notification container in the bottom-right.

Examples:

- `Meeting created`
- `Meeting updated`
- `Action item completed`
- `Meeting deleted`
- `Transcript imported`
- `Could not save changes`

The assignment explicitly calls for notifications/toasts. fileciteturn0file0L52-L59

## 14. Typography

Aim for a modern SaaS sans-serif stack:

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Suggested hierarchy:

- App/page title: 20–28 px, weight 600–700.
- Section title: 14–16 px, weight 600.
- Body: 13–14 px.
- Secondary metadata: 11–12 px.
- Sidebar labels: 12–13 px.

Keep line-height around 1.35–1.55 for readable transcript text.

## 15. Color system

These are approximations designed to match the supplied screenshots, not claims about Fireflies' internal design tokens.

```text
--sidebar:          #334563
--sidebar-hover:    #3D5277
--sidebar-text:     #E7ECF4
--canvas:           #FFFFFF
--surface:          #F8F9FB
--surface-muted:    #F2F4F7
--border:           #E5E7EB
--text:             #17181C
--text-muted:       #7B8190
--primary:          #6958E8
--primary-soft:     #F0EDFF
--danger:            #D84B5B
--success:           #40A36C
```

Do not use gradients for the core application. Use flat surfaces, subtle borders, and restrained shadows.

## 16. Spacing and sizing

Use an 8 px base spacing system:

```text
4, 8, 12, 16, 20, 24, 32, 40, 48
```

Cards/panels: 12–16 px radius.
Inputs: 8–10 px radius.
Buttons: 8–10 px radius.
Primary content max width: ~1280 px on wide screens.

## 17. Responsive behavior

Desktop-first because the supplied references are desktop UI.

At < 900 px:

- Collapse sidebar to icon rail or drawer.
- Stack summary and transcript panels vertically.
- Keep player sticky above transcript if possible.

At < 640 px:

- Hide secondary topbar utility text.
- Use icon-only actions.
- Make transcript and summary tabs instead of two simultaneous panes.

Responsive support is secondary to fidelity at the desktop reference resolution.

## 18. Accessibility

Required minimum:

- Buttons are actual `<button>` elements.
- Form controls have labels/aria-labels.
- Keyboard focus is visible.
- Dialogs trap focus.
- Transcript rows are keyboard-activatable.
- Color is never the only completion/status signal.

## 19. Visual QA target

The coding agent must compare the final UI against the supplied screenshots at approximately their reference viewport dimensions (860 px width screenshots). The goal is not pixel-perfect reproduction of browser anti-aliasing; the goal is structural fidelity:

- same sidebar proportion,
- same content density,
- same modal geometry,
- same visual hierarchy,
- same spacing rhythm,
- same interaction affordances.
