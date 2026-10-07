"""Transcript parsing for TXT / VTT / JSON uploads and pasted text.

The parser is deliberately dependency-free and deterministic so that imports are
reproducible and easy to unit test.  It returns plain dictionaries:

    {"speaker": str, "start_seconds": int, "end_seconds": int, "text": str}

Real speech-to-text is explicitly out of scope for the assignment; uploaded or
pasted *transcript text* is the supported ingestion path.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

from app.core.errors import TranscriptParseError, UnsupportedFileTypeError

SUPPORTED_EXTENSIONS = {".txt", ".vtt", ".json"}
SUPPORTED_LABEL = "TXT, VTT or JSON"

# 00:12 / 00:00:12 / 1:02:03  (optionally wrapped in [] or ())
_TIMESTAMP = r"(?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?"
_TIMESTAMP_LINE = re.compile(rf"^\s*[\[\(]?({_TIMESTAMP})[\]\)]?\s*[-–—:]?\s*(.*)$")
_CUE_LINE = re.compile(rf"^({_TIMESTAMP})\s*-->\s*({_TIMESTAMP})")
_VOICE_TAG = re.compile(r"^<v\s+([^>]+)>(.*)$", re.IGNORECASE)

def extract_speaker_and_text(raw_text: str) -> tuple[str | None, str]:
    vtt_match = _VOICE_TAG.match(raw_text)
    if vtt_match:
        return vtt_match.group(1).strip(), _clean_text(vtt_match.group(2))
    
    clean = _clean_text(raw_text)
    
    bracket_match = re.match(r"^\[([A-Za-z0-9][A-Za-z0-9 .'\-]{1,39})\]\s*(.*)$", clean)
    if bracket_match:
        return bracket_match.group(1).strip(), bracket_match.group(2).strip()
        
    prefix_match = re.match(r"^([A-Za-z0-9][A-Za-z0-9 .'\-]{1,39})\s*([:\-–])\s+(.*)$", clean)
    if prefix_match:
        speaker = prefix_match.group(1).strip()
        sep = prefix_match.group(2)
        text = prefix_match.group(3).strip()
        words = speaker.split()
        if len(words) <= 4:
            if sep in {"-", "–"}:
                # For hyphens, avoid matching prose like "Let's discuss - the project"
                if len(words) == 1 or speaker.istitle() or speaker.isupper():
                    return speaker, text
            else:
                return speaker, text
            
    return None, clean

def is_standalone_speaker(text: str) -> bool:
    if not (2 <= len(text) <= 40): return False
    if text[-1] in {'.', ',', '!', '?', ';'}: return False
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9 .'\-]*", text): return False
    words = text.split()
    if not (1 <= len(words) <= 4): return False
    lower = text.lower()
    if lower in {"i agree", "yes", "no", "ok", "okay", "hello", "hi", "thanks", "thank you", "right", "exactly", "sure", "yep", "speaker", "unknown"}:
        return False
    return True
_TAG = re.compile(r"<[^>]+>")
_AVG_WORDS_PER_SECOND = 2.4


@dataclass(slots=True)
class ParsedSegment:
    speaker: str
    start_seconds: int
    end_seconds: int
    text: str

    def as_dict(self) -> dict[str, Any]:
        return {
            "speaker": self.speaker,
            "start_seconds": self.start_seconds,
            "end_seconds": self.end_seconds,
            "text": self.text,
        }


def timestamp_to_seconds(value: str) -> int:
    """Convert ``mm:ss`` / ``hh:mm:ss`` / ``hh:mm:ss.mmm`` to whole seconds."""

    cleaned = value.strip().replace(",", ".")
    parts = cleaned.split(":")
    try:
        numbers = [float(part) for part in parts]
    except ValueError as exc:  # pragma: no cover - guarded by regex
        raise TranscriptParseError(f"Invalid timestamp '{value}'") from exc
    if len(numbers) == 3:
        hours, minutes, seconds = numbers
    elif len(numbers) == 2:
        hours, minutes, seconds = 0.0, numbers[0], numbers[1]
    elif len(numbers) == 1:
        hours, minutes, seconds = 0.0, 0.0, numbers[0]
    else:
        raise TranscriptParseError(f"Invalid timestamp '{value}'")
    return int(hours * 3600 + minutes * 60 + seconds)


def seconds_to_timestamp(seconds: int) -> str:
    minutes, secs = divmod(max(0, int(seconds)), 60)
    hours, minutes = divmod(minutes, 60)
    if hours:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"


def estimate_duration(text: str) -> int:
    words = len([w for w in text.split() if w.strip()])
    return max(2, round(words / _AVG_WORDS_PER_SECOND))


def _clean_text(raw: str) -> str:
    return " ".join(_TAG.sub("", raw).split())


# --------------------------------------------------------------------------- #
# Format specific parsers
# --------------------------------------------------------------------------- #
def parse_vtt(content: str) -> list[ParsedSegment]:
    """Parse a WebVTT file (speaker taken from ``<v Name>`` tags or ``Name:`` prefix)."""

    blocks = re.split(r"\r?\n\s*\r?\n", content.strip())
    segments: list[ParsedSegment] = []
    for block in blocks:
        lines = [line for line in block.splitlines() if line.strip()]
        if not lines or lines[0].strip().upper().startswith("WEBVTT"):
            continue
        cue_index = next((i for i, line in enumerate(lines) if _CUE_LINE.match(line.strip())), None)
        if cue_index is None:
            continue
        match = _CUE_LINE.match(lines[cue_index].strip())
        assert match is not None
        start = timestamp_to_seconds(match.group(1))
        end = timestamp_to_seconds(match.group(2))
        body = " ".join(lines[cue_index + 1 :])
        speaker_cand, text = extract_speaker_and_text(body.strip())
        speaker = speaker_cand or "Speaker"
        if text:
            segments.append(ParsedSegment(speaker=speaker, start_seconds=start, end_seconds=max(end, start + 1), text=text))
    if not segments:
        raise TranscriptParseError("No subtitle cues with timestamps were found in the VTT file.")
    return segments


def parse_json(content: str) -> list[ParsedSegment]:
    """Parse a JSON transcript: either a list of segment objects or ``{"segments": [...]}``."""

    try:
        payload = json.loads(content)
    except json.JSONDecodeError as exc:
        raise TranscriptParseError(f"Invalid JSON transcript: {exc.msg} (line {exc.lineno})") from exc

    if isinstance(payload, dict):
        for key in ("segments", "transcript", "items", "data", "utterances"):
            if isinstance(payload.get(key), list):
                payload = payload[key]
                break
    if not isinstance(payload, list):
        raise TranscriptParseError(
            'JSON transcripts must be a list of segments or an object with a "segments" array.'
        )

    segments: list[ParsedSegment] = []
    for index, raw in enumerate(payload, start=1):
        if not isinstance(raw, dict):
            raise TranscriptParseError(f"Segment {index} is not an object.")
        text = str(
            raw.get("text")
            or raw.get("content")
            or raw.get("sentence")
            or raw.get("utterance")
            or ""
        ).strip()
        if not text:
            continue
        speaker = str(
            raw.get("speaker")
            or raw.get("speaker_name")
            or raw.get("name")
            or raw.get("user")
            or ""
        ).strip()
        
        speaker_cand, text_clean = extract_speaker_and_text(text)
        if not speaker and speaker_cand:
            speaker = speaker_cand
            text = text_clean
            
        speaker = speaker or "Speaker"
        start_raw = raw.get("start_seconds", raw.get("start", raw.get("startTime", raw.get("start_time", 0))))
        end_raw = raw.get("end_seconds", raw.get("end", raw.get("endTime", raw.get("end_time", None))))
        start = _coerce_seconds(start_raw)
        end = _coerce_seconds(end_raw) if end_raw is not None else 0
        if end <= start:
            end = start + estimate_duration(text)
        segments.append(ParsedSegment(speaker=speaker or "Speaker", start_seconds=start, end_seconds=end, text=text))

    if not segments:
        raise TranscriptParseError("The JSON transcript did not contain any readable segments.")
    return segments


def _coerce_seconds(value: Any) -> int:
    if value is None:
        return 0
    if isinstance(value, (int, float)):
        return int(round(float(value)))
    text = str(value).strip()
    if not text:
        return 0
    if re.fullmatch(r"\d+(\.\d+)?", text):
        return int(round(float(text)))
    return timestamp_to_seconds(text)


def parse_txt(content: str) -> list[ParsedSegment]:
    """Parse plain-text transcripts.

    Supported shapes (auto-detected):

    * ``00:12 Speaker: text`` / ``[00:12] Speaker: text``
    * ``Speaker: text`` (timings are estimated from word counts)
    * timestamp-only lines followed by the spoken text on the next line
    """

    lines = [line.strip() for line in content.splitlines()]
    has_leading_timestamps = any(
        re.match(rf"^[\[\(]?{_TIMESTAMP}[\]\)]?", line) for line in lines if line
    )

    draft: list[dict[str, Any]] = []
    running_end = 0
    last_speaker: str | None = None

    for line in lines:
        if not line:
            continue
        if line.lower().startswith(("webvtt", "kind:", "language:")):
            continue

        rest = line
        start: int | None = None
        stamp_match = _TIMESTAMP_LINE.match(line)
        if stamp_match and re.match(rf"^[\[\(]?({_TIMESTAMP})[\]\)]?", line):
            start = timestamp_to_seconds(stamp_match.group(1))
            rest = stamp_match.group(2).strip()

        speaker, text = extract_speaker_and_text(rest)
        
        if speaker:
            last_speaker = speaker
        elif start is None and not has_leading_timestamps and is_standalone_speaker(text):
            last_speaker = text.strip()
            draft.append({"speaker": last_speaker, "start_seconds": int(running_end), "text": ""})
            continue
        elif draft and start is None and not has_leading_timestamps:
            # Timestamp-free transcript: treat this as a continuation of the previous line.
            draft[-1]["text"] = f"{draft[-1]['text']} {text}".strip()
            continue

        if not text:
            continue

        if start is None:
            start = running_end
            
        last_speaker = last_speaker or "Speaker"
        draft.append({"speaker": last_speaker, "start_seconds": int(start), "text": text})
        running_end = int(start) + estimate_duration(text)

    if not draft:
        raise TranscriptParseError("No readable transcript lines were found in the TXT file.")

    segments: list[ParsedSegment] = []
    for index, item in enumerate(draft):
        text = str(item["text"])
        start = int(item["start_seconds"])
        estimated_end = start + estimate_duration(text)
        next_start = int(draft[index + 1]["start_seconds"]) if index + 1 < len(draft) else None
        end = estimated_end if next_start is None else min(estimated_end, max(next_start, start + 1))
        segments.append(
            ParsedSegment(
                speaker=str(item["speaker"]),
                start_seconds=start,
                end_seconds=max(end, start + 1),
                text=text,
            )
        )
    return segments


# --------------------------------------------------------------------------- #
# Public API
# --------------------------------------------------------------------------- #
def normalize_segments(segments: Iterable[ParsedSegment]) -> list[dict[str, Any]]:
    """Sort, de-duplicate and make timings monotonic."""

    ordered = sorted(segments, key=lambda item: (item.start_seconds, item.text))
    normalized: list[dict[str, Any]] = []
    speaker_map: dict[str, str] = {}
    
    for segment in ordered:
        text = " ".join(segment.text.split())
        if not text:
            continue
            
        raw_speaker = (segment.speaker or "Speaker").strip()
        if raw_speaker.lower() not in {"speaker", "unknown"}:
            if raw_speaker.lower() not in speaker_map:
                speaker_map[raw_speaker.lower()] = raw_speaker
            raw_speaker = speaker_map[raw_speaker.lower()]
        else:
            raw_speaker = "Speaker"
            
        start = max(0, int(segment.start_seconds))
        end = max(start + 1, int(segment.end_seconds))
        if normalized and start < normalized[-1]["end_seconds"]:
            start = normalized[-1]["end_seconds"]
            end = max(end, start + 1)
        normalized.append({"speaker": raw_speaker, "start_seconds": start, "end_seconds": end, "text": text})
    if not normalized:
        raise TranscriptParseError("The transcript did not contain any usable segments.")
    return normalized


def detect_format(filename: str | None, content: str) -> str:
    if filename:
        suffix = Path(filename).suffix.lower()
        if suffix in SUPPORTED_EXTENSIONS:
            return suffix.lstrip(".")
    stripped = content.lstrip()
    if stripped.startswith("{") or stripped.startswith("["):
        return "json"
    if stripped.upper().startswith("WEBVTT") or "-->" in content[:2000]:
        return "vtt"
    return "txt"


def parse_transcript(content: str, filename: str | None = None) -> list[dict[str, Any]]:
    """Parse ``content`` into normalised transcript segments."""

    if not content or not content.strip():
        raise TranscriptParseError("The transcript is empty.")

    if filename:
        suffix = Path(filename).suffix.lower()
        if suffix and suffix not in SUPPORTED_EXTENSIONS:
            raise UnsupportedFileTypeError(
                f"Unsupported file type '{suffix}'. Supported types: {SUPPORTED_LABEL}."
            )

    fmt = detect_format(filename, content)
    if fmt == "json":
        return normalize_segments(parse_json(content))
    if fmt == "vtt":
        return normalize_segments(parse_vtt(content))
    return normalize_segments(parse_txt(content))


def duration_from_segments(segments: list[dict[str, Any]]) -> int:
    return int(max((int(segment["end_seconds"]) for segment in segments), default=0))


def participants_from_segments(segments: list[dict[str, Any]]) -> list[str]:
    names: list[str] = []
    seen_lower: set[str] = set()
    for segment in segments:
        speaker = str(segment.get("speaker") or "").strip()
        if speaker and speaker.lower() not in {"speaker", "unknown"}:
            if speaker.lower() not in seen_lower:
                seen_lower.add(speaker.lower())
                names.append(speaker)
    return names
