"""Unit tests for database schemas and validators."""

from db.models import DSM5Diagnosis


def test_modern_schema_validation():
    """Tests validation of a modernized JSON payload."""
    data = {
        "diagnosis_id": "DX_TEST",
        "diagnosis_name": "Test Disorder",
        "diagnostic_code": "F99.9",
        "chapter_category": "Test Category",
        "threshold_count": "1 symptom required",
        "duration_rule": "At least 1 month",
        "symptoms": [
            {
                "symptom_id": "SYM_TEST_1",
                "description": "Test symptom description",
            }
        ],
    }

    schema = DSM5Diagnosis.from_dict(data)
    assert schema.diagnosis_id == "DX_TEST"
    assert len(schema.symptoms) == 1
    assert schema.symptoms[0].symptom_id == "SYM_TEST_1"
    assert schema.symptoms[0].description == "Test symptom description"


def test_legacy_schema_normalization():
    """Tests that legacy 'symptom_ids' format is correctly normalized to 'symptoms'."""
    data = {
        "diagnosis_id": "DX_TEST_LEGACY",
        "diagnosis_name": "Legacy Test Disorder",
        "diagnostic_code": "F99.8",
        "chapter_category": "Test Category",
        "threshold_count": "2 symptoms required",
        "duration_rule": "At least 2 weeks",
        "symptom_ids": [
            {"SYM_LEGACY_1": "Description of legacy symptom 1"},
            {"SYM_LEGACY_2": "Description of legacy symptom 2"},
        ],
    }

    schema = DSM5Diagnosis.from_dict(data)
    assert schema.diagnosis_id == "DX_TEST_LEGACY"
    assert len(schema.symptoms) == 2

    # Verify normalization results
    assert schema.symptoms[0].symptom_id == "SYM_LEGACY_1"
    assert schema.symptoms[0].description == "Description of legacy symptom 1"
    assert schema.symptoms[1].symptom_id == "SYM_LEGACY_2"
    assert schema.symptoms[1].description == "Description of legacy symptom 2"

    # Verify output dictionary format
    model_dict = schema.to_dict()
    assert "symptoms" in model_dict
    assert "symptom_ids" not in model_dict
