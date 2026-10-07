"""Transcript parser unit tests (TXT / VTT / JSON)."""

from __future__ import annotations

import pytest

from app.core.errors import TranscriptParseError, UnsupportedFileTypeError
from app.services.transcript_parser import (
    detect_format,
    duration_from_segments,
    parse_transcript,
    participants_from_segments,
    seconds_to_timestamp,
    timestamp_to_seconds,
)

VTT_FIXTURE = """WEBVTT

00:00:00.000 --> 00:00:05.400
<v Ada Lovelace>Welcome to the review, let's start with the release plan.

00:00:05.400 --> 00:00:12.000
<v Grace Hopper>I'll send the updated schedule by Friday.
"""

JSON_LIST_FIXTURE = """
[
  {"speaker": "Ada Lovelace", "start": 0, "end": 6, "text": "Welcome to the review."},
  {"speaker": "Grace Hopper", "start": 6, "end": 14, "text": "The scheduler is green now."}
]
"""

JSON_OBJECT_FIXTURE = """
{"segments": [
  {"speaker_name": "Ada Lovelace", "start_seconds": 0, "end_seconds": 5, "text": "Kicking off."},
  {"speaker_name": "Grace Hopper", "startTime": "00:09", "text": "Patch is ready."}
]}
"""

TXT_FIXTURE = """[00:00] Ada Lovelace: Welcome everyone, we should review the release plan.
[00:12] Grace Hopper: I'll send the updated schedule by Friday.
[00:31] Ada Lovelace: Please also double-check the compiler patch.
"""

TXT_NO_TIMESTAMPS = """Ada Lovelace: The build passed overnight.
Grace Hopper: I will publish the report tomorrow.
"""


def test_timestamp_helpers() -> None:
    assert timestamp_to_seconds("00:12") == 12
    assert timestamp_to_seconds("01:02:03") == 3723
    assert timestamp_to_seconds("00:00:07.500") == 7
    assert seconds_to_timestamp(3723) == "1:02:03"
    assert seconds_to_timestamp(72) == "01:12"


def test_detect_format() -> None:
    assert detect_format("notes.txt", "hello") == "txt"
    assert detect_format("captions.vtt", "WEBVTT") == "vtt"
    assert detect_format("transcript.json", "[]") == "json"
    assert detect_format(None, '{"segments": []}') == "json"


def test_parse_txt_with_timestamps() -> None:
    segments = parse_transcript(TXT_FIXTURE, filename="sync.txt")
    assert len(segments) == 3
    assert segments[0]["speaker"] == "Ada Lovelace"
    assert segments[0]["start_seconds"] == 0
    assert segments[1]["start_seconds"] == 12
    assert segments[1]["text"].startswith("I'll send")
    assert all(segment["end_seconds"] > segment["start_seconds"] for segment in segments)
    assert duration_from_segments(segments) > 30


def test_parse_txt_without_timestamps_estimates_sequential_timings() -> None:
    segments = parse_transcript(TXT_NO_TIMESTAMPS)
    assert len(segments) == 2
    assert segments[0]["start_seconds"] == 0
    assert segments[1]["start_seconds"] >= segments[0]["end_seconds"]


def test_parse_vtt() -> None:
    segments = parse_transcript(VTT_FIXTURE, filename="captions.vtt")
    assert len(segments) == 2
    assert segments[0]["speaker"] == "Ada Lovelace"
    assert segments[0]["start_seconds"] == 0
    assert segments[0]["end_seconds"] == 5
    assert segments[1]["start_seconds"] == 5
    assert participants_from_segments(segments) == ["Ada Lovelace", "Grace Hopper"]


def test_parse_json_list() -> None:
    segments = parse_transcript(JSON_LIST_FIXTURE, filename="t.json")
    assert len(segments) == 2
    assert segments[1]["start_seconds"] == 6


def test_parse_json_object_with_alternate_keys() -> None:
    segments = parse_transcript(JSON_OBJECT_FIXTURE, filename="t.json")
    assert len(segments) == 2
    assert segments[0]["speaker"] == "Ada Lovelace"
    assert segments[1]["start_seconds"] == 9
    assert segments[1]["end_seconds"] > 9


def test_unsupported_extension_is_rejected() -> None:
    with pytest.raises(UnsupportedFileTypeError):
        parse_transcript("whatever", filename="audio.mp3")


def test_invalid_json_raises_parse_error() -> None:
    with pytest.raises(TranscriptParseError):
        parse_transcript("{not json", filename="broken.json")


def test_empty_transcript_raises_parse_error() -> None:
    with pytest.raises(TranscriptParseError):
        parse_transcript("   ", filename="empty.txt")


def test_segments_are_normalised_and_monotonic() -> None:
    messy = (
        '{"segments": ['
        '{"speaker": "B", "start": 30, "end": 40, "text": "Second speaker."},'
        '{"speaker": "A", "start": 10, "end": 12, "text": "First speaker."},'
        '{"speaker": "A", "start": 10, "end": 12, "text": "First speaker."}'
        "]}"
    )
    segments = parse_transcript(messy, filename="messy.json")
    starts = [segment["start_seconds"] for segment in segments]
    assert starts == sorted(starts)
    assert len({segment["text"] for segment in segments}) == len(segments) - 1  # duplicate collapsed


def test_vtt_speaker_extraction_edge_cases() -> None:
    vtt = """WEBVTT
    
00:00:00.000 --> 00:00:05.400
<v Aaryav>Hello everyone.</v>

00:00:05.400 --> 00:00:10.000
<v Priya>Let's discuss the project.

00:00:10.000 --> 00:00:15.000
<v Rahul Sharma>I'll handle the backend.</v>

00:00:15.000 --> 00:00:20.000
<v aaryav>Wait, I have a question.

00:00:20.000 --> 00:00:25.000
Just a cue without a tag.
"""
    segments = parse_transcript(vtt, filename="test.vtt")
    
    assert segments[0]["speaker"] == "Aaryav"
    assert "Hello everyone." in segments[0]["text"]
    
    assert segments[1]["speaker"] == "Priya"
    assert "Let's discuss" in segments[1]["text"]
    
    assert segments[2]["speaker"] == "Rahul Sharma"
    
    assert segments[3]["speaker"] == "Aaryav" 
    
    assert segments[4]["speaker"] == "Speaker"
    
    participants = participants_from_segments(segments)
    assert participants == ["Aaryav", "Priya", "Rahul Sharma"]


def test_txt_speaker_extraction_edge_cases() -> None:
    txt = """Aaryav: Hello everyone.
Priya - Let's discuss the project.
[Rahul Sharma] I will handle the backend.
Aaryav
Wait, I have a question.

I am prose with a - hyphen in the middle.
And this is a note: do not extract me.
"""
    segments = parse_transcript(txt, filename="test.txt")
    
    assert segments[0]["speaker"] == "Aaryav"
    assert segments[0]["text"] == "Hello everyone."
    
    assert segments[1]["speaker"] == "Priya"
    assert segments[1]["text"] == "Let's discuss the project."
    
    assert segments[2]["speaker"] == "Rahul Sharma"
    assert segments[2]["text"] == "I will handle the backend."
    
    assert segments[3]["speaker"] == "Aaryav"
    assert segments[3]["text"] == "Wait, I have a question. I am prose with a - hyphen in the middle. And this is a note: do not extract me."
    
    participants = participants_from_segments(segments)
    assert participants == ["Aaryav", "Priya", "Rahul Sharma"]

