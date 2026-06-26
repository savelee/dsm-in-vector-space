"""SQLAlchemy and Pydantic-like dataclass models for DSM-5 diagnostic data."""

from dataclasses import dataclass, field
from typing import List, Dict, Any


@dataclass
class Symptom:
    """Represents a single clinical symptom."""

    symptom_id: str
    symptom_name: str
    description: str

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Symptom":
        """Creates a Symptom from a dictionary."""
        symptom_id = data["symptom_id"]
        symptom_name = data.get("symptom_name")
        if not symptom_name:
            symptom_name = symptom_id.replace("SYM_", "").replace("_", " ").title()
        # Supporting both description and symptom_description properties
        description = data.get("description", data.get("symptom_description", ""))
        return cls(
            symptom_id=symptom_id,
            symptom_name=symptom_name,
            description=description,
        )

    def to_dict(self) -> Dict[str, Any]:
        """Converts the Symptom to a dictionary."""
        return {
            "symptom_id": self.symptom_id,
            "symptom_name": self.symptom_name,
            "description": self.description,
        }


@dataclass
class DSM5Diagnosis:
    """Represents a DSM-5 diagnosis, supporting legacy and modernized formats."""

    diagnosis_id: str
    diagnosis_name: str
    diagnostic_code: str
    chapter_category: str
    threshold_count: str
    duration_rule: str
    symptoms: List[Symptom] = field(default_factory=list)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DSM5Diagnosis":
        """Creates a DSM5Diagnosis from a dictionary, automatically normalizing legacy formats.

        Supports both:
        - Modern format: {"symptoms": [{"symptom_id": "...", "symptom_name": "...", "description": "..."}]}
        - Legacy format: {"symptom_ids": [{"SYM_ID": "description"}]}
        """
        symptoms_list = []

        # Handle modernized format
        if "symptoms" in data:
            symptoms_list = [Symptom.from_dict(s) for s in data["symptoms"]]
        # Handle legacy format
        elif "symptom_ids" in data:
            legacy_symptoms = data["symptom_ids"]
            if isinstance(legacy_symptoms, list):
                for item in legacy_symptoms:
                    if isinstance(item, dict):
                        for sym_id, desc in item.items():
                            symptoms_list.append(
                                Symptom(
                                    symptom_id=sym_id,
                                    symptom_name=sym_id.replace("SYM_", "").replace("_", " ").title(),
                                    description=desc,
                                )
                            )
                    elif isinstance(item, str):
                        symptoms_list.append(
                            Symptom(
                                symptom_id=item,
                                symptom_name=item.replace("SYM_", "").replace("_", " ").title(),
                                description="",
                            )
                        )

        return cls(
            diagnosis_id=data["diagnosis_id"],
            diagnosis_name=data["diagnosis_name"],
            diagnostic_code=data["diagnostic_code"],
            chapter_category=data["chapter_category"],
            threshold_count=data["threshold_count"],
            duration_rule=data["duration_rule"],
            symptoms=symptoms_list,
        )

    def to_dict(self) -> Dict[str, Any]:
        """Converts the Diagnosis to a dictionary in the modernized format."""
        return {
            "diagnosis_id": self.diagnosis_id,
            "diagnosis_name": self.diagnosis_name,
            "diagnostic_code": self.diagnostic_code,
            "chapter_category": self.chapter_category,
            "threshold_count": self.threshold_count,
            "duration_rule": self.duration_rule,
            "symptoms": [s.to_dict() for s in self.symptoms],
        }
