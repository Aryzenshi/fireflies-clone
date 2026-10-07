"""Deterministic extractive summary service.

The assignment allows summaries to be seeded, mocked or LLM-generated.  This
module implements a *deterministic extractive* strategy: it never calls an
external API, always returns the same result for the same transcript, and is
easy to explain in an interview.

``SummaryService`` is a Protocol so an LLM-backed adapter (or a seeded summary)
can be swapped in later without touching the API contract or the repositories.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Protocol, Sequence

# --------------------------------------------------------------------------- #
# Result types
# --------------------------------------------------------------------------- #


@dataclass(slots=True)
class SummarySection:
    title: str
    timestamp_seconds: int | None
    bullets: list[str]


@dataclass(slots=True)
class SuggestedActionItem:
    title: str
    assignee: str | None = None
    due_date: str | None = None


@dataclass(slots=True)
class SummaryResult:
    overview: str
    key_points: list[str] = field(default_factory=list)
    sections: list[SummarySection] = field(default_factory=list)
    topics: list[str] = field(default_factory=list)
    action_items: list[SuggestedActionItem] = field(default_factory=list)


class SummaryService(Protocol):
    def build_summary(
        self,
        transcript: Sequence[dict[str, object]],
        *,
        meeting_title: str = "Meeting",
        reference_date: object | None = None,
    ) -> SummaryResult:  # pragma: no cover - protocol definition
        ...


# --------------------------------------------------------------------------- #
# Text utilities
# --------------------------------------------------------------------------- #
STOPWORDS = {
    "a", "about", "actually", "after", "again", "against", "all", "also", "am", "an", "and", "any",
    "are", "around", "as", "at", "back", "be", "because", "been", "before", "being", "below",
    "between", "both", "but", "by", "can", "cant", "come", "could", "did", "do", "does", "doing",
    "dont", "down", "during", "each", "even", "ever", "every", "few", "for", "from", "further",
    "get", "gets", "getting", "go", "going", "good", "got", "had", "has", "have", "having", "he",
    "her", "here", "hers", "herself", "him", "himself", "his", "how", "however", "i", "if", "im",
    "in", "into", "is", "isnt", "it", "its", "itself", "ive", "just", "kind", "know", "let", "lets",
    "like", "likely", "little", "look", "lot", "make", "makes", "many", "may", "me", "might", "mine",
    "more", "most", "much", "must", "my", "myself", "need", "needs", "no", "nor", "not", "now", "of",
    "off", "on", "once", "one", "only", "or", "other", "ought", "our", "ours", "ourselves", "out",
    "over", "own", "perhaps", "put", "quite", "rather", "really", "right", "same", "say", "see",
    "she", "should", "since", "so", "some", "something", "still", "such", "sure", "take", "than",
    "that", "thats", "the", "their", "theirs", "them", "themselves", "then", "there", "these",
    "they", "thing", "things", "think", "this", "those", "though", "through", "thus", "time", "to",
    "too", "two", "under", "until", "up", "upon", "us", "use", "used", "using", "very", "want",
    "was", "we", "well", "were", "what", "whats", "when", "where", "whether", "which", "while",
    "who", "whom", "why", "will", "with", "within", "without", "would", "yeah", "yes", "yet", "you",
    "your", "yours", "yourself", "yourselves", "okay", "ok", "hey", "guys", "guys.", "s", "t",
}

DECISION_CUES = (
    "we will", "we are going to", "we decided", "decision", "agreed", "let's", "lets", "plan is",
    "we should", "we need to", "important", "priority", "next step", "the goal", "we're going to",
)
ACTION_CUES = (
    "i'll", "i will", "can you", "could you", "please", "need to", "needs to", "action item",
    "follow up", "follow-up", "take care of", "send over", "share the", "set up", "will handle",
    "let's make sure", "make sure", "follow through", "own",
)

_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")
_WEEKDAYS = {
    "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6,
}


def tokenize(text: str) -> list[str]:
    return [token for token in re.findall(r"[a-zA-Z][a-zA-Z'\-]+", text.lower()) if token not in STOPWORDS]


def sentences_of(text: str) -> list[str]:
    return [part.strip() for part in _SENTENCE_SPLIT.split(text.strip()) if part.strip()]


def keyword_scores(text: str) -> dict[str, int]:
    scores: dict[str, int] = {}
    for token in tokenize(text):
        if len(token) < 4:
            continue
        scores[token] = scores.get(token, 0) + 1
    return scores


def title_case(token: str) -> str:
    return token[:1].upper() + token[1:]


# --------------------------------------------------------------------------- #
# Service
# --------------------------------------------------------------------------- #
class DeterministicSummaryService:
    """Extractive summary generation derived purely from the transcript text."""

    def __init__(self, *, max_key_points: int = 5, max_topics: int = 6, max_sections: int = 4,
                 max_action_items: int = 5) -> None:
        self.max_key_points = max_key_points
        self.max_topics = max_topics
        self.max_sections = max_sections
        self.max_action_items = max_action_items

    # -- public ---------------------------------------------------------- #
    def build_summary(
        self,
        transcript: Sequence[dict[str, object]],
        *,
        meeting_title: str = "Meeting",
        reference_date: object | None = None,
    ) -> SummaryResult:
        segments = [
            {
                "speaker": str(item.get("speaker") or "Speaker"),
                "start_seconds": int(item.get("start_seconds") or 0),
                "end_seconds": int(item.get("end_seconds") or 0),
                "text": str(item.get("text") or ""),
            }
            for item in transcript
        ]
        if not segments:
            return SummaryResult(
                overview=f"{meeting_title} has no transcript yet, so no summary could be generated.",
                key_points=[],
                sections=[],
                topics=[],
                action_items=[],
            )

        utterances = self._utterances(segments)
        speakers = self._speakers(segments)
        duration_minutes = max(1, round((segments[-1]["end_seconds"]) / 60)) if segments else 1

        scored = self._score_utterances(utterances)
        overview = self._build_overview(meeting_title, speakers, duration_minutes, scored, utterances)
        key_points = self._build_key_points(scored, overview)
        sections = self._build_sections(utterances, segments)
        topics = self._build_topics(utterances, sections)
        action_items = self._build_action_items(utterances, reference_date)

        return SummaryResult(
            overview=overview,
            key_points=key_points,
            sections=sections,
            topics=topics,
            action_items=action_items,
        )

    # -- internals ------------------------------------------------------- #
    @staticmethod
    def _utterances(segments: Sequence[dict[str, object]]) -> list[dict[str, object]]:
        utterances: list[dict[str, object]] = []
        for segment in segments:
            for sentence in sentences_of(str(segment["text"])):
                if len(sentence) < 12:
                    continue
                utterances.append(
                    {
                        "speaker": segment["speaker"],
                        "start_seconds": segment["start_seconds"],
                        "end_seconds": segment["end_seconds"],
                        "sentence": sentence,
                    }
                )
        return utterances

    @staticmethod
    def _speakers(segments: Sequence[dict[str, object]]) -> list[str]:
        names: list[str] = []
        for segment in segments:
            speaker = str(segment["speaker"])
            if speaker not in names:
                names.append(speaker)
        return names

    def _score_utterances(self, utterances: Sequence[dict[str, object]]) -> list[tuple[float, int, str, str]]:
        corpus = " ".join(str(item["sentence"]) for item in utterances)
        frequencies = keyword_scores(corpus)
        ranked: list[tuple[float, int, str, str]] = []
        for index, utterance in enumerate(utterances):
            sentence = str(utterance["sentence"])
            tokens = tokenize(sentence)
            if not tokens:
                continue
            informativeness = sum(frequencies.get(token, 0) for token in set(tokens)) / (len(set(tokens)) + 4)
            decision_bonus = sum(1.6 for cue in DECISION_CUES if cue in sentence.lower())
            action_bonus = sum(0.8 for cue in ACTION_CUES if cue in sentence.lower())
            length_penalty = 0.0 if 40 <= len(sentence) <= 220 else 0.6
            score = informativeness + decision_bonus + action_bonus - length_penalty
            ranked.append((round(score, 4), index, sentence, str(utterance["speaker"])))
        # Highest score first, original order as tie-breaker (fully deterministic).
        ranked.sort(key=lambda item: (-item[0], item[1]))
        return ranked

    def _build_overview(
        self,
        meeting_title: str,
        speakers: list[str],
        duration_minutes: int,
        scored: Sequence[tuple[float, int, str, str]],
        utterances: Sequence[dict[str, object]],
    ) -> str:
        if not utterances:
            return f"{meeting_title} has no readable transcript content to summarise."
        speaker_summary = ", ".join(speakers[:3])
        if len(speakers) > 3:
            speaker_summary += f" and {len(speakers) - 3} more"
        top = [item for item in scored[:2]]
        top.sort(key=lambda item: item[1])
        body = " ".join(item[2] for item in top)
        return (
            f"{meeting_title} was a {duration_minutes}-minute conversation between "
            f"{speaker_summary or 'the attendees'}. {body}"
        ).strip()

    def _build_key_points(self, scored: Sequence[tuple[float, int, str, str]], overview: str) -> list[str]:
        points: list[str] = []
        seen: set[str] = set()
        for _, _, sentence, speaker in scored:
            normalized = sentence.lower()
            if normalized in seen or sentence in overview:
                continue
            seen.add(normalized)
            points.append(f"{sentence} ({speaker.split()[0]})")
            if len(points) >= self.max_key_points:
                break
        if not points:
            for _, _, sentence, _ in list(scored)[: self.max_key_points]:
                points.append(sentence)
        return points

    def _build_sections(
        self,
        utterances: Sequence[dict[str, object]],
        segments: Sequence[dict[str, object]],
    ) -> list[SummarySection]:
        if not utterances:
            return []
        bucket_count = min(self.max_sections, max(1, len(utterances) // 4))
        per_bucket = max(1, len(utterances) // bucket_count)
        sections: list[SummarySection] = []
        for bucket_index in range(bucket_count):
            start = bucket_index * per_bucket
            end = len(utterances) if bucket_index == bucket_count - 1 else (bucket_index + 1) * per_bucket
            chunk = list(utterances[start:end])
            if not chunk:
                continue
            chunk_text = " ".join(str(item["sentence"]) for item in chunk)
            topic = self._dominant_topic(chunk_text) or f"Part {bucket_index + 1}"
            bullets = [str(item["sentence"]) for item in chunk[:2]]
            sections.append(
                SummarySection(
                    title=title_case(topic) if topic.islower() else topic,
                    timestamp_seconds=int(chunk[0]["start_seconds"]),
                    bullets=bullets,
                )
            )
        if not sections and segments:
            sections.append(
                SummarySection(
                    title=title_case(self._dominant_topic(str(segments[0]["text"])) or "Overview"),
                    timestamp_seconds=int(segments[0]["start_seconds"]),
                    bullets=[str(segments[0]["text"])[:180]],
                )
            )
        return sections

    def _build_topics(self, utterances: Sequence[dict[str, object]], sections: Sequence[SummarySection]) -> list[str]:
        corpus = " ".join(str(item["sentence"]) for item in utterances)
        frequencies = keyword_scores(corpus)
        ranked = sorted(frequencies.items(), key=lambda item: (-item[1], item[0]))
        topics: list[str] = []
        for token, count in ranked:
            if count < 2:
                continue
            label = title_case(token)
            if label not in topics:
                topics.append(label)
            if len(topics) >= self.max_topics:
                break
        if len(topics) < 3:
            for section in sections:
                label = section.title.split()[0]
                if label not in topics:
                    topics.append(label)
        return topics[: self.max_topics]

    @staticmethod
    def _dominant_topic(text: str) -> str | None:
        frequencies = keyword_scores(text)
        if not frequencies:
            return None
        best = sorted(frequencies.items(), key=lambda item: (-item[1], item[0]))
        return best[0][0]

    def _build_action_items(
        self,
        utterances: Sequence[dict[str, object]],
        reference_date: object | None,
    ) -> list[SuggestedActionItem]:
        items: list[SuggestedActionItem] = []
        seen: set[str] = set()
        for utterance in utterances:
            sentence = str(utterance["sentence"])
            lowered = sentence.lower()
            if len(sentence) > 220:
                continue
            if not any(cue in lowered for cue in ACTION_CUES) and not re.search(r"\b(will|going to)\b", lowered):
                continue
            title = self._clean_action_title(sentence)
            key = title.lower()
            if key in seen or len(title) < 10:
                continue
            seen.add(key)
            items.append(
                SuggestedActionItem(
                    title=title,
                    assignee=self._guess_assignee(sentence, str(utterance["speaker"])),
                    due_date=self._guess_due_date(sentence, reference_date),
                )
            )
            if len(items) >= self.max_action_items:
                break
        return items

    @staticmethod
    def _clean_action_title(sentence: str) -> str:
        cleaned = re.sub(r"^(so|okay|ok|alright|and|but|well|yeah|right|then)\b[,:\s]*", "", sentence.strip(), flags=re.IGNORECASE)
        cleaned = re.sub(r"^i'?ll\s+", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"^we'?ll\s+", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"^(i|we)\s+(will|are going to|should)\s+", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"^can you\s+", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"^please\s+", "", cleaned, flags=re.IGNORECASE)
        cleaned = cleaned.rstrip(".")
        if cleaned:
            cleaned = cleaned[0].upper() + cleaned[1:]
        return cleaned[:240]

    @staticmethod
    def _guess_assignee(sentence: str, speaker: str) -> str | None:
        lowered = sentence.lower()
        if re.search(r"\bi'?ll\b|\bi will\b|\bi can\b|\bi'?m going to\b", lowered):
            return speaker
        return speaker if "you" in lowered or "please" in lowered else None

    @staticmethod
    def _guess_due_date(sentence: str, reference_date: object | None) -> str | None:
        from datetime import date, timedelta

        today = reference_date if isinstance(reference_date, date) else date.today()
        lowered = sentence.lower()
        if "tomorrow" in lowered:
            return (today + timedelta(days=1)).isoformat()
        if "end of day" in lowered or "eod" in lowered or "today" in lowered:
            return today.isoformat()
        if "next week" in lowered:
            return (today + timedelta(days=7 - today.weekday())).isoformat()
        for weekday, index in _WEEKDAYS.items():
            if f"by {weekday}" in lowered or f"on {weekday}" in lowered:
                delta = (index - today.weekday()) % 7
                delta = delta or 7
                return (today + timedelta(days=delta)).isoformat()
        return None


summary_service: SummaryService = DeterministicSummaryService()
