"""Tests for Aadhaar number masking helpers."""

from app.services.masking import extract_last4, scrub_full_aadhaar


def test_extract_last4_with_spaces():
    assert extract_last4("My Aadhaar is 1234 5678 9012") == "9012"


def test_extract_last4_compact():
    assert extract_last4("123456789012") == "9012"


def test_extract_last4_returns_none_for_missing():
    assert extract_last4("no number here") is None
    assert extract_last4("") is None


def test_scrub_full_aadhaar_masks_grouped():
    text = "Aadhaar No: 1234 5678 9012\nDOB: 1990-05-12"
    out = scrub_full_aadhaar(text)
    assert "1234 5678 9012" not in out
    assert "XXXX XXXX 9012" in out


def test_scrub_full_aadhaar_handles_multiple_occurrences():
    text = "1111 2222 3333 and 4444 5555 6666"
    out = scrub_full_aadhaar(text)
    assert "XXXX XXXX 3333" in out
    assert "XXXX XXXX 6666" in out
    assert "1111 2222 3333" not in out
    assert "4444 5555 6666" not in out
