import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

/**
 * End-to-end verification of the mandatory assignment workflows.
 * Run against a running backend + frontend (see playwright.config.ts).
 */

const API = "http://127.0.0.1:8000/api";

/**
 * Reset the workspace to the seeded dataset so library assertions are
 * deterministic: drop non-seed meetings and any action items left behind by
 * earlier E2E runs.
 */
test.beforeAll(async ({ request }) => {
  const response = await request.get(`${API}/meetings?limit=200`);
  const body = await response.json();
  for (const item of body.items ?? []) {
    if (item.source_type !== "seed") {
      await request.delete(`${API}/meetings/${item.id}`);
      continue;
    }
    const detail = await (await request.get(`${API}/meetings/${item.id}`)).json();
    for (const actionItem of detail.action_items ?? []) {
      if (String(actionItem.title).startsWith("E2E")) {
        await request.delete(`${API}/action-items/${actionItem.id}`);
      }
    }
    // strip tags a crashed run may have left behind
    const leftoverTags = (detail.tags ?? []).filter((tag: string) => tag.startsWith("e2e-"));
    if (leftoverTags.length > 0) {
      const cleaned = detail.tags.filter((tag: string) => !tag.startsWith("e2e-"));
      await request.patch(`${API}/meetings/${item.id}`, { data: { tags: cleaned } });
    }
  }
});

async function firstSeededMeetingId(page: Page): Promise<string> {
  const response = await page.request.get(`${API}/meetings?sort=recent&limit=1`);
  const body = await response.json();
  return body.items[0].id as string;
}

test.describe("meetings library", () => {
  test("lists seeded meetings with title, date, duration and participants", async ({ page }) => {
    await page.goto("/meetings");
    await expect(page.getByRole("heading", { name: "Meetings", level: 1 }).first()).toBeVisible();
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
    await expect(page.getByText("Weekly Product Sync").first()).toBeVisible();
    // duration column (mm:ss)
    await expect(rows.first().locator("td").nth(2)).toHaveText(/^\d+:\d{2}$/);
    // date column
    const firstRowText = await rows.first().innerText();
    expect(firstRowText).toMatch(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun), [A-Z][a-z]{2} \d+/);
  });

  test("search, participant filter, date filter and sorting change the result set", async ({ page }) => {
    await page.goto("/meetings");
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(6); // the six seeded meetings
    const totalRows = 6;

    // search by title: "sprint" also appears inside other transcripts, so compare with the API
    await page.getByPlaceholder(/^Search meetings, participants/).first().fill("sprint");
    await expect(page).toHaveURL(/q=sprint/);
    const sprintTotal = (await (await page.request.get(`${API}/meetings?q=sprint&limit=50`)).json()).total;
    await expect(rows).toHaveCount(sprintTotal);
    await expect(page.getByText("Sprint Planning", { exact: false })).toBeVisible();

    // search reaches inside transcripts: "bouncing" only exists in spoken lines
    await page.getByPlaceholder(/^Search meetings, participants/).first().fill("bouncing");
    await expect(rows).toHaveCount(1);
    await expect(page.getByText("Weekly Product Sync", { exact: false })).toBeVisible();
    await page.getByPlaceholder(/^Search meetings, participants/).first().fill("submarine periscope");
    await expect(rows).toHaveCount(0);
    await expect(page.getByText(/No meetings match/i)).toBeVisible();

    // clear the search before applying the next filter
    await page.getByPlaceholder(/^Search meetings, participants/).first().fill("");
    await expect(page).not.toHaveURL(/q=/);
    await expect(rows).toHaveCount(6);

    // participant filter
    await page.getByRole("button", { name: /All participants/ }).click();
    await page.getByPlaceholder("Filter participants").fill("Maya");
    await page.getByRole("button", { name: /Maya Chen/ }).click();
    await expect(page).toHaveURL(/participant=Maya\+Chen/);
    await expect(rows).toHaveCount(4); // Maya appears in four seeded meetings

    // reset
    await page.getByRole("button", { name: "Reset filters" }).first().click();
    await expect(rows).toHaveCount(totalRows);

    // date filter
    await page.getByRole("button", { name: /Any time/ }).click();
    await page.getByRole("button", { name: "Last 7 days" }).click();
    await expect(page).toHaveURL(/range=7d/);
    await expect(rows).toHaveCount(4); // four meetings fall inside the last seven days

    // sorting (reset the date filter first so the full library is in play)
    await page.getByRole("button", { name: "Reset filters" }).first().click();
    await expect(rows).toHaveCount(totalRows);
    await page.getByRole("button", { name: /Recent first/ }).click();
    await page.getByRole("button", { name: "Oldest first" }).click();
    await expect(page).toHaveURL(/sort=oldest/);
    await expect(rows).toHaveCount(6);
    await expect(rows.first()).toContainText("Incident Review — Transcript Delay");
  });

  test("empty state appears for a query with no matches", async ({ page }) => {
    await page.goto("/meetings?q=zzzznothingmatches");
    await expect(page.getByText("No meetings match your filters")).toBeVisible();
    await page.getByRole("button", { name: "Reset filters" }).first().click();
    await expect(page.locator("tbody tr").first()).toBeVisible();
  });
});

test.describe("meeting notepad", () => {
  test.setTimeout(90_000);

  test("renders summary, topics, action items and transcript", async ({ page }) => {
    const meetingId = await firstSeededMeetingId(page);
    await page.goto(`/meetings/${meetingId}`);

    await expect(page.getByRole("heading", { name: "AI Notes" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Key points" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Action items" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Chapters & outline" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Topics" })).toBeVisible();

    const transcript = page.getByTestId("transcript-list");
    await expect(transcript).toBeVisible();
    await expect(transcript.locator("li")).toHaveCount(20);
    // speaker label + timestamp
    await expect(transcript.getByText("Aaron Kantor").first()).toBeVisible();
    await expect(transcript.getByText("00:00").first()).toBeVisible();
  });

  test("clicking a transcript line seeks the player (transcript -> player)", async ({ page }) => {
    const meetingId = await firstSeededMeetingId(page);
    await page.goto(`/meetings/${meetingId}`);
    const transcript = page.getByTestId("transcript-list");
    const seekBar = page.getByRole("slider", { name: "Seek within meeting" });

    await expect(seekBar).toHaveAttribute("aria-valuenow", "0");

    // click the 6th transcript row (starts at a later timestamp)
    await transcript.locator("li").nth(5).click();
    await expect(seekBar).not.toHaveAttribute("aria-valuenow", "0");
    const value = Number(await seekBar.getAttribute("aria-valuenow"));
    expect(value).toBeGreaterThan(0);

    // the clicked line becomes active (purple left border + soft background)
    const activeLine = transcript.locator("li").nth(5);
    await expect(activeLine).toHaveClass(/bg-primary-soft/);
  });

  test("player position drives the active transcript line (player -> transcript)", async ({ page }) => {
    const meetingId = await firstSeededMeetingId(page);
    await page.goto(`/meetings/${meetingId}`);
    const transcript = page.getByTestId("transcript-list");
    const seekBar = page.getByRole("slider", { name: "Seek within meeting" });

    // seek far into the meeting with the keyboard
    await seekBar.focus();
    for (let index = 0; index < 12; index += 1) {
      await page.keyboard.press("ArrowRight");
    }
    await expect(seekBar).toHaveAttribute("aria-valuenow", "60");

    const activeCount = await transcript.locator("li.bg-primary-soft").count();
    expect(activeCount).toBe(1);
    // the active row must be the segment that contains t = 60s (from the API payload)
    const detail = await (await page.request.get(`${API}/meetings/${meetingId}`)).json();
    const expected = detail.transcript.segments
      .filter((segment: { start_seconds: number }) => segment.start_seconds <= 60)
      .pop();
    await expect(transcript.locator(`li[data-segment-id="${expected.id}"]`)).toHaveClass(/bg-primary-soft/);

    // pressing play advances the clock and keeps following the transcript
    await page.getByRole("button", { name: /Play from current position|Pause playback/ }).click();
    await page.waitForTimeout(1400);
    const now = Number(await seekBar.getAttribute("aria-valuenow"));
    expect(now).toBeGreaterThan(60);
    await page.getByRole("button", { name: "Pause playback" }).click();
  });

  test("transcript search highlights matches and keeps rows clickable", async ({ page }) => {
    const meetingId = await firstSeededMeetingId(page);
    await page.goto(`/meetings/${meetingId}`);

    await page.getByRole("button", { name: "Search transcript" }).click();
    const search = page.getByLabel("Search within transcript");
    await search.fill("onboarding");

    const marks = page.getByTestId("transcript-list").locator("mark");
    await expect(marks.first()).toBeVisible();
    const markCount = await marks.count();
    expect(markCount).toBeGreaterThan(1);

    // counter + navigation
    await expect(page.getByText(`1/${markCount}`, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Next match" }).click();
    await expect(page.getByText(`2/${markCount}`, { exact: true })).toBeVisible();

    // searching must not break transcript interaction
    const seekBar = page.getByRole("slider", { name: "Seek within meeting" });
    await page.getByTestId("transcript-list").locator("li").nth(3).click();
    await expect(seekBar).not.toHaveAttribute("aria-valuenow", "0");
  });

    test("action item completion and edits persist across a reload", async ({ page }) => {
    const meetingId = await firstSeededMeetingId(page);
    const before = await (await page.request.get(`${API}/meetings/${meetingId}`)).json();
    const first = before.action_items[0];

    await page.goto(`/meetings/${meetingId}`);

    // 1. complete/uncomplete the first action item through the UI
    const checkbox = page.getByRole("checkbox", { name: new RegExp(`(Complete|Reopen) ${first.title}`) });
    await checkbox.click();
    await expect(page.getByRole("status").filter({ hasText: /Action item (completed|reopened)/ })).toBeVisible();

    // 2. add a new action item
    await page.getByRole("button", { name: "Add item" }).click();
    await page.getByLabel("Task").fill("E2E: verify persistence");
    await page.getByLabel("Assignee").fill("Aaron Kantor");
    await page.getByRole("button", { name: "Create item" }).click();
    await expect(page.locator("li", { hasText: "E2E: verify persistence" })).toBeVisible();

    // 3. reload: both changes must still be there
    await page.reload();
    const after = await (await page.request.get(`${API}/meetings/${meetingId}`)).json();
    const toggled = after.action_items.find((item: { id: string }) => item.id === first.id);
    expect(toggled.completed).toBe(!first.completed);

    const created = after.action_items.find((item: { title: string }) => item.title === "E2E: verify persistence");
    expect(created).toBeTruthy();
    expect(created.completed).toBe(false);
    await expect(page.locator("li", { hasText: "E2E: verify persistence" })).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: new RegExp(`(Complete|Reopen) ${first.title}`) }),
    ).toBeChecked({ checked: !first.completed });

    // 4. delete the new item through the UI and confirm it is gone
    const createdRow = page.locator("li", { hasText: "E2E: verify persistence" }).first();
    await createdRow.hover();
    await createdRow.getByRole("button", { name: /Delete E2E/ }).click();
    await page.getByRole("button", { name: "Delete item" }).click();
    await expect(page.locator("li", { hasText: "E2E: verify persistence" })).toHaveCount(0);

    // 5. restore the seeded state
    await page.request.patch(`${API}/action-items/${first.id}`, { data: { completed: first.completed } });
  });

test("meeting title and participants edits persist", async ({ page }) => {
    // create a throwaway meeting through the API so the seeded data stays untouched
    const create = await page.request.post(`${API}/meetings`, {
      data: {
        title: "E2E metadata meeting",
        participants: ["Ada Lovelace"],
        transcript_text: "00:00 Ada Lovelace: Let's test the metadata edit flow.\n00:10 Ada Lovelace: I will confirm it persists.",
      },
    });
    const meeting = await create.json();

    try {
      await page.goto(`/meetings/${meeting.id}`);
      // inline rename
      await page.getByRole("button", { name: /E2E metadata meeting/ }).first().click();
      const titleInput = page.getByLabel("Meeting title");
      await titleInput.fill("E2E renamed meeting");
      await titleInput.press("Enter");
      await expect(page.getByRole("status").filter({ hasText: "Meeting renamed" })).toBeVisible();

      await page.reload();
      await expect(page.getByRole("button", { name: /E2E renamed meeting/ }).first()).toBeVisible();

      // participants via the details modal
      await page.getByRole("button", { name: "More meeting actions" }).click();
      await page.getByRole("menuitem", { name: "Edit meeting details" }).click();
      await page.getByLabel("Participants").fill("Grace Hopper");
      await page.getByLabel("Participants").press("Enter");
      await page.getByRole("button", { name: "Save changes" }).click();
      await expect(page.getByRole("status").filter({ hasText: "Meeting updated" })).toBeVisible();

      await page.reload();
      const participants = await (await page.request.get(`${API}/meetings/${meeting.id}`)).json();
      expect(participants.participants.map((p: { name: string }) => p.name)).toEqual(
        expect.arrayContaining(["Ada Lovelace", "Grace Hopper"]),
      );
    } finally {
      await page.request.delete(`${API}/meetings/${meeting.id}`);
    }
  });

  test("transcript line editing persists", async ({ page }) => {
    const create = await page.request.post(`${API}/meetings`, {
      data: {
        title: "E2E transcript edit",
        transcript_text: "00:00 Ada Lovelace: First line to edit.\n00:20 Grace Hopper: Second line stays.",
      },
    });
    const meeting = await create.json();

    try {
      await page.goto(`/meetings/${meeting.id}`);
      const row = page.getByTestId("transcript-list").locator("li").first();
      await row.hover();
      await row.getByRole("button", { name: "Edit transcript line" }).click();
      await page.getByTestId("transcript-list").locator("textarea").fill("Corrected first line by E2E.");
      await page.getByRole("button", { name: "Save line" }).click();
      await expect(page.getByRole("status").filter({ hasText: "Transcript line updated" })).toBeVisible();

      await page.reload();
      await expect(page.getByTestId("transcript-list").getByText("Corrected first line by E2E.")).toBeVisible();
    } finally {
      await page.request.delete(`${API}/meetings/${meeting.id}`);
    }
  });

  test("keyboard shortcuts control playback without stealing typing", async ({ page }) => {
    const meetingId = await firstSeededMeetingId(page);
    await page.goto(`/meetings/${meetingId}`);

    const playButton = page.getByRole("button", { name: /Play from current position|Pause playback/ });
    await expect(playButton).toHaveAttribute("aria-label", "Play from current position");

    // Space toggles play/pause while focus is on the document (no click first:
    // clicking the logo would navigate away, clicking a row would seek).
    await page.keyboard.press("Space");
    await expect(playButton).toHaveAttribute("aria-label", "Pause playback");
    await page.keyboard.press("Space");
    await expect(playButton).toHaveAttribute("aria-label", "Play from current position");

    // Arrow keys on the focused seek bar step 5 seconds.
    const slider = page.locator('[role="slider"]').first();
    await slider.focus();
    const start = Number(await slider.getAttribute("aria-valuenow"));
    await page.keyboard.press("ArrowRight");
    await expect(slider).toHaveAttribute("aria-valuenow", String(start + 5));

    // Typing (including spaces) in the transcript search must never trigger playback.
    await page.getByRole("button", { name: "Search transcript" }).click();
    const search = page.getByLabel("Search within transcript");
    await search.click();
    await search.pressSequentially("a b");
    await expect(search).toHaveValue("a b");
    await expect(playButton).toHaveAttribute("aria-label", "Play from current position");
  });

  test("exporting a meeting downloads the notes and transcript", async ({ page }) => {
    const meetingId = await firstSeededMeetingId(page);
    const detail = await (await page.request.get(`${API}/meetings/${meetingId}`)).json();
    await page.goto(`/meetings/${meetingId}`);

    // Hide the chat button so it doesn't overlap the Export button in the player bar.
    await page.getByRole("button", { name: "Chat" }).evaluate((b) => (b.style.display = "none")).catch(() => {});

    // Markdown download: the trigger is a real download, so assert filename + content.
    const [markdownDownload] = await Promise.all([
      page.waitForEvent("download"),
      (async () => {
        await page.getByRole("button", { name: /^Export / }).click();
        await page.getByRole("menuitem", { name: /Markdown/ }).click();
      })(),
    ]);
    expect(markdownDownload.suggestedFilename()).toMatch(/\.md$/);
    const markdownPath = await markdownDownload.path();
    const markdown = readFileSync(markdownPath, "utf8");
    expect(markdown).toContain(`# ${detail.title}`);
    expect(markdown).toContain("## Transcript");
    expect(markdown).toContain(detail.transcript.segments[0].text);
    await expect(page.getByRole("status").filter({ hasText: "Export ready" })).toBeVisible();

    // Plain-text variant uses the same data with no Markdown syntax.
    const [txtDownload] = await Promise.all([
      page.waitForEvent("download"),
      (async () => {
        await page.getByRole("button", { name: /^Export / }).click();
        await page.getByRole("menuitem", { name: /Plain text/ }).click();
      })(),
    ]);
    expect(txtDownload.suggestedFilename()).toMatch(/\.txt$/);
    const txt = readFileSync(await txtDownload.path(), "utf8");
    expect(txt).toContain("TRANSCRIPT");
    expect(txt).not.toContain("## ");

    // PDF variant
    const [pdfDownload] = await Promise.all([
      page.waitForEvent("download"),
      (async () => {
        await page.getByRole("button", { name: /^Export / }).click();
        await page.getByRole("menuitem", { name: /PDF/ }).click();
      })(),
    ]);
    expect(pdfDownload.suggestedFilename()).toMatch(/\.pdf$/);
    const pdfPath = await pdfDownload.path();
    const pdf = readFileSync(pdfPath);
    expect(pdf.length).toBeGreaterThan(0);
    // basic signature check for PDF
    expect(pdf.subarray(0, 5).toString("utf8")).toBe("%PDF-");
  });

  test("tags can be added, used as a filter and removed", async ({ page }) => {
    const meetingId = await firstSeededMeetingId(page);
    const detail = await (await page.request.get(`${API}/meetings/${meetingId}`)).json();
    const tag = "e2e-tag";

    // The restore call is registered before any assertion so a mid-test failure
    // cannot leave the e2e tag behind in the database.
    try {
      await page.goto(`/meetings/${meetingId}`);

      // add a tag through the meeting details modal
      await page.getByRole("button", { name: "More meeting actions" }).click();
      await page.getByRole("menuitem", { name: "Edit meeting details" }).click();
      const tagsInput = page.getByLabel("Tags");
      await tagsInput.fill(tag);
      await tagsInput.press("Enter");
      await expect(page.getByText(tag, { exact: true }).first()).toBeVisible();
      await page.getByRole("button", { name: "Save changes" }).click();
      await expect(page.getByRole("status").filter({ hasText: "Meeting updated" })).toBeVisible();

      // persisted on the server
      const saved = await (await page.request.get(`${API}/meetings/${meetingId}`)).json();
      expect(saved.tags).toContain(tag);

      // the library lists the tag directory entry and filters by it
      await page.goto("/meetings");
      await page.getByRole("button", { name: "Filter by tag" }).click();
      await page.getByRole("button", { name: new RegExp(`^${tag} 1$`) }).click();
      await expect(page).toHaveURL(new RegExp(`tag=${tag}`));
      await expect(page.locator("tbody tr")).toHaveCount(1);
      await expect(page.locator("tbody tr").first()).toContainText(detail.title);

      // the tag chip in the row clears back to the unfiltered library
      await page.getByRole("button", { name: "Clear tag filter" }).click();
      await expect(page).not.toHaveURL(/tag=/);
      await expect(page.locator("tbody tr")).toHaveCount(6);
    } finally {
      // tidy up: remove the tag so the seeded dataset stays pristine
      await page.request.patch(`${API}/meetings/${meetingId}`, { data: { tags: detail.tags } });
    }


    const restored = await (await page.request.get(`${API}/meetings/${meetingId}`)).json();
    expect(restored.tags).toEqual(detail.tags);
  });

  test("comments can be anchored to a transcript line and jump the player", async ({ page }) => {
    const meetingId = await firstSeededMeetingId(page);
    const before = await (await page.request.get(`${API}/meetings/${meetingId}`)).json();

    await page.goto(`/meetings/${meetingId}`);

    try {
      // start from a clean slate for this meeting
      for (const comment of before.comments as { id: string }[]) {
        await page.request.delete(`${API}/comments/${comment.id}`);
      }
      await page.reload();

      // 1. comment on the third transcript line through its hover action
      const thirdLine = page.locator("li[data-segment-id]").nth(2);
      const segmentId = await thirdLine.getAttribute("data-segment-id");
      await thirdLine.hover();
      await thirdLine.getByRole("button", { name: /^Comment on this line/ }).click();
      const composer = page.getByRole("dialog");
      await expect(composer.getByText("Comment on this line")).toBeVisible();
      await composer.getByLabel("Comment").fill("E2E: check this decision with support.");
      await composer.getByRole("button", { name: "Save comment" }).click();
      await expect(page.getByRole("status").filter({ hasText: "Comment added" })).toBeVisible();

      // 2. it is stored with its anchor and shown as a highlight on the line
      const saved = await (await page.request.get(`${API}/meetings/${meetingId}`)).json();
      const created = saved.comments.find(
        (comment: { body: string }) => comment.body === "E2E: check this decision with support.",
      );
      expect(created).toBeTruthy();
      expect(created.segment_id).toBe(segmentId);
      expect(created.anchor_start_seconds).toBeGreaterThan(0);

      const panel = page.getByRole("region", { name: "Comments" });
      await expect(panel.getByText("E2E: check this decision with support.")).toBeVisible();
      await expect(thirdLine.getByText(/1 comment/)).toBeVisible();

      // 3. the timestamp chip seeks the shared player
      await page.getByRole("slider", { name: "Seek within meeting" }).focus();
      await page.keyboard.press("Home");
      const chip = panel.getByRole("button", { name: /^Play from \d/ });
      await chip.click();
      await expect(page.getByRole("slider", { name: "Seek within meeting" })).toHaveAttribute(
        "aria-valuenow",
        String(created.anchor_start_seconds),
      );

      // 4. editing and deleting through the panel persists
      await panel.getByRole("button", { name: /^Edit comment by/ }).click();
      const editor = panel.locator("textarea");
      await editor.fill("E2E: edited comment body.");
      await panel.getByRole("button", { name: "Save" }).click();
      await expect(page.getByRole("status").filter({ hasText: "Comment updated" })).toBeVisible();
      const afterEdit = await (await page.request.get(`${API}/meetings/${meetingId}`)).json();
      expect(afterEdit.comments[0].body).toBe("E2E: edited comment body.");

      await panel.getByRole("button", { name: /^Delete comment by/ }).click();
      // the row action and the confirmation share a label: scope to the dialog
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Delete comment" })
        .click();
      await expect(panel.getByText("E2E: edited comment body.")).toHaveCount(0);

      const afterDelete = await (await page.request.get(`${API}/meetings/${meetingId}`)).json();
      expect(afterDelete.comments).toEqual([]);
    } finally {
      // leave the seeded meeting exactly as it was found
      const current = await (await page.request.get(`${API}/meetings/${meetingId}`)).json();
      for (const comment of current.comments as { id: string }[]) {
        await page.request.delete(`${API}/comments/${comment.id}`);
      }
    }
  });

  test("share dialog copies a link", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const meetingId = await firstSeededMeetingId(page);
    await page.goto(`/meetings/${meetingId}`);

    await page.getByRole("button", { name: "Share", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Anyone with link can access")).toBeVisible();
    await dialog.getByRole("button", { name: /Copy Link/ }).click();
    await expect(page.getByRole("status").filter({ hasText: "Link copied" })).toBeVisible();
    await dialog.getByRole("button", { name: "Close dialog" }).click();
    await expect(dialog).toBeHidden();
  });
});

test.describe("meeting CRUD + import", () => {
  test.setTimeout(90_000);

  test("creating a meeting from a pasted transcript opens the notepad", async ({ page }) => {
    await page.goto("/meetings");
    await page.getByRole("button", { name: "New meeting" }).click();

    await page.getByLabel("Meeting title").fill("E2E pasted transcript meeting");
    await page.getByLabel("Participants").fill("Test Speaker");
    await page.getByLabel("Participants").press("Enter");
    await page.getByLabel("Transcript content").fill(
      "00:00 Test Speaker: We should ship the release today.\n00:20 Test Speaker: I'll send the summary by Friday.",
    );
    await page.getByRole("button", { name: "Create meeting" }).click();

    await expect(page).toHaveURL(/\/meetings\/mtg_/);
    await expect(page.getByRole("heading", { name: "AI Notes" })).toBeVisible();
    await expect(page.getByTestId("transcript-list").locator("li")).toHaveCount(2);

    // cleanup
    const meetingId = page.url().split("/").pop() as string;
    await page.request.delete(`${API}/meetings/${meetingId}`);
  });

  test("imports TXT, VTT and JSON files and surfaces a bad file type", async ({ page }) => {
    const files = [
      { name: "e2e-notes.txt", mimeType: "text/plain", buffer: Buffer.from("00:00 Ada Lovelace: TXT import works.\n00:12 Ada Lovelace: Second line here.") },
      { name: "e2e-captions.vtt", mimeType: "text/vtt", buffer: Buffer.from("WEBVTT\n\n00:00:00.000 --> 00:00:06.000\n<v Grace Hopper>VTT import works.\n") },
      { name: "e2e-notes.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ segments: [{ speaker: "Ada Lovelace", start: 0, end: 5, text: "JSON import works." }] })) },
    ];

    for (const file of files) {
      await page.goto("/uploads");
      await page.getByLabel("Meeting title").fill(`E2E import ${file.name}`);
      await page.locator('input[type="file"]').setInputFiles(file);
      await expect(page.getByText(file.name)).toBeVisible();
      await page.getByRole("button", { name: /Generate transcript/ }).click();
      await expect(page).toHaveURL(/\/meetings\/mtg_/);
      await expect(page.getByTestId("transcript-list").locator("li").first()).toBeVisible();
      const meetingId = page.url().split("/").pop() as string;
      await page.request.delete(`${API}/meetings/${meetingId}`);
    }

    // unsupported file type is rejected with a toast + inline error
    await page.goto("/uploads");
    await page.locator('input[type="file"]').setInputFiles({
      name: "recording.mp3",
      mimeType: "audio/mpeg",
      buffer: Buffer.from("not audio"),
    });
    await expect(page.getByText(/Unsupported file type/)).toBeVisible();
  });

  test("deleting a meeting asks for confirmation and removes it", async ({ page }) => {
    const create = await page.request.post(`${API}/meetings`, {
      data: { title: "E2E delete me", transcript_text: "00:00 Ada Lovelace: This meeting will be deleted." },
    });
    const meeting = await create.json();

    await page.goto("/meetings?q=E2E%20delete%20me");
    const row = page.locator("tbody tr").first();
    await expect(row).toContainText("E2E delete me");
    await row.getByRole("button", { name: /Actions for/ }).click();
    await page.getByRole("menuitem", { name: "Delete meeting" }).click();
    await expect(page.getByRole("dialog").getByText("Delete this meeting?")).toBeVisible();
    await page.getByRole("button", { name: "Delete meeting", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Meeting deleted" })).toBeVisible();

    const check = await page.request.get(`${API}/meetings/${meeting.id}`);
    expect(check.status()).toBe(404);
  });

  test("transcript replacement regenerates the AI notes", async ({ page }) => {
    const create = await page.request.post(`${API}/meetings`, {
      data: { title: "E2E replace transcript", transcript_text: "00:00 Ada Lovelace: Original line one.\n00:30 Ada Lovelace: Original line two." },
    });
    const meeting = await create.json();

    try {
      await page.goto(`/meetings/${meeting.id}`);
      await expect(page.getByTestId("transcript-list").locator("li")).toHaveCount(2);

      await page.getByRole("button", { name: "More meeting actions" }).click();
      await page.getByRole("menuitem", { name: "Replace transcript" }).click();
      await page.getByLabel("Transcript content").fill(
        "00:00 Grace Hopper: Replacement line one.\n00:15 Grace Hopper: Replacement line two.\n00:40 Grace Hopper: Replacement line three.",
      );
      await page.getByRole("button", { name: /Replace & regenerate/ }).click();
      await expect(page.getByRole("status").filter({ hasText: "Transcript replaced" })).toBeVisible();
      await expect(page.getByTestId("transcript-list").locator("li")).toHaveCount(3);

      await page.reload();
      await expect(page.getByTestId("transcript-list").getByText("Replacement line three.")).toBeVisible();
    } finally {
      await page.request.delete(`${API}/meetings/${meeting.id}`);
    }
  });
});

test("no console errors or hydration warnings on the main routes", async ({ page }) => {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      const text = message.text();
      // React logs hydration mismatches and key warnings through console.error/warn.
      if (/hydrat|did not match|Warning:|Minified React error/i.test(text)) {
        problems.push(`${message.type()}: ${text}`);
      }
    }
  });

  const meetingId = await firstSeededMeetingId(page);
  for (const route of ["/", "/meetings", `/meetings/${meetingId}`, "/uploads", "/settings", "/coming-soon/integrations"]) {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
    await page.waitForTimeout(400); // let client-side data fetches settle
  }
  expect(problems).toEqual([]);
});

test.describe("shell + placeholders", () => {
  test("sidebar navigation and placeholder pages work", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Good (morning|afternoon|evening)/);

    // Exactly one app sidebar landmark (the dashboard column is named separately)
    // and one copy of each nav link must exist - no duplicate mobile/desktop DOM.
    await expect(page.getByRole("complementary", { name: "Primary navigation" })).toHaveCount(1);
    await expect(page.getByRole("navigation", { name: "Primary" })).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Meetings", exact: true })).toHaveCount(1);

    await page.getByRole("link", { name: "Integrations" }).click();
    await expect(page).toHaveURL(/coming-soon\/integrations/);
    await expect(page.getByText("Coming soon").first()).toBeVisible();

    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByText("Placeholder").first()).toBeVisible();

    await page.getByRole("link", { name: "Uploads" }).click();
    await expect(page).toHaveURL(/\/uploads/);
    await expect(page.getByRole("heading", { name: /Upload a transcript file/ })).toBeVisible();
  });

  test("a missing meeting renders the error state and returns 404 JSON", async ({ page }) => {
    const response = await page.request.get(`${API}/meetings/does-not-exist`);
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ detail: "Meeting 'does-not-exist' was not found." });

    await page.goto("/meetings/does-not-exist");
    await expect(page.getByRole("heading", { name: "Could not load this meeting" })).toBeVisible();
    await expect(page.getByText("Meeting 'does-not-exist' was not found.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  });

  test("global search from the top bar filters the library", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Search meetings").first().fill("design");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/meetings\?q=design/);
    const designTotal = (await (await page.request.get(`${API}/meetings?q=design&limit=50`)).json()).total;
    await expect(page.locator("tbody tr")).toHaveCount(designTotal);
    await expect(page.getByText("Design Review", { exact: false }).first()).toBeVisible();
  });
});
