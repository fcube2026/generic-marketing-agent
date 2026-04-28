"""Tests for the Aadhaar field parser (purely on canned OCR lines)."""

from app.services.ocr import parse_aadhaar


def test_parse_aadhaar_full_card():
    lines = [
        "Government of India",
        "Ramesh Kumar Sharma",
        "DOB: 12/05/1990",
        "MALE",
        "1234 5678 9012",
        "Address: 42 MG Road, Bengaluru, Karnataka, 560001",
    ]
    f = parse_aadhaar(lines)
    assert f.full_name == "Ramesh Kumar Sharma"
    assert f.dob == "1990-05-12"
    assert f.gender == "MALE"
    assert f.aadhaar_last4 == "9012"
    assert f.address and "MG Road" in f.address
    # raw_text must never contain the unmasked Aadhaar number
    assert "1234 5678 9012" not in f.raw_text
    assert "XXXX XXXX 9012" in f.raw_text


def test_parse_aadhaar_year_only_dob():
    lines = ["Anita Singh", "Year of Birth: 1985", "FEMALE", "9999 8888 7777"]
    f = parse_aadhaar(lines)
    assert f.dob == "1985-01-01"
    assert f.gender == "FEMALE"
    assert f.aadhaar_last4 == "7777"


def test_parse_aadhaar_partial():
    """Even when most fields are missing, parser returns rather than raises."""
    f = parse_aadhaar(["unreadable noise %%%"])
    assert f.full_name is None
    assert f.dob is None
    assert f.gender is None
    assert f.aadhaar_last4 is None
