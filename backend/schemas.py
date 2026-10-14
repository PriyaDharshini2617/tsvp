"""
Pydantic Data Schemas and Validators for TSVP Backend
"""

from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field, model_validator, field_validator
from datetime import datetime, timezone


class PatientInput(BaseModel):
    """
    Standardized Patient Input Schema.
    Accepts snake_case, camelCase, and nested {basic, vitals, lifestyle} payloads.
    """
    age: int
    sex: str
    systolic_bp: int
    diastolic_bp: int
    cholesterol: int
    cholesterol_unit: str = "mg/dL"
    blood_sugar: int
    blood_sugar_unit: str = "mg/dL"
    bmi: float
    smoking: str
    diabetes: str
    physical_activity: str
    family_history: str
    clinical_notes: Optional[str] = ""

    @model_validator(mode="before")
    @classmethod
    def normalize_input(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data

        normalized = dict(data)

        # Unroll nested structures if passed as { basic, vitals, lifestyle, notes }
        if "basic" in normalized and isinstance(normalized["basic"], dict):
            basic = normalized["basic"]
            if "age" in basic and "age" not in normalized:
                normalized["age"] = basic["age"]
            if "sex" in basic and "sex" not in normalized:
                normalized["sex"] = basic["sex"]

        if "vitals" in normalized and isinstance(normalized["vitals"], dict):
            vitals = normalized["vitals"]
            if "systolicBP" in vitals:
                normalized["systolic_bp"] = vitals["systolicBP"]
            elif "systolic_bp" in vitals:
                normalized["systolic_bp"] = vitals["systolic_bp"]

            if "diastolicBP" in vitals:
                normalized["diastolic_bp"] = vitals["diastolicBP"]
            elif "diastolic_bp" in vitals:
                normalized["diastolic_bp"] = vitals["diastolic_bp"]

            if "cholesterol" in vitals:
                normalized["cholesterol"] = vitals["cholesterol"]
            if "cholesterolUnit" in vitals:
                normalized["cholesterol_unit"] = vitals["cholesterolUnit"]
            elif "cholesterol_unit" in vitals:
                normalized["cholesterol_unit"] = vitals["cholesterol_unit"]

            if "bloodSugar" in vitals:
                normalized["blood_sugar"] = vitals["bloodSugar"]
            elif "blood_sugar" in vitals:
                normalized["blood_sugar"] = vitals["blood_sugar"]

            if "bloodSugarUnit" in vitals:
                normalized["blood_sugar_unit"] = vitals["bloodSugarUnit"]
            elif "blood_sugar_unit" in vitals:
                normalized["blood_sugar_unit"] = vitals["blood_sugar_unit"]

            if "bmi" in vitals:
                normalized["bmi"] = vitals["bmi"]

        if "lifestyle" in normalized and isinstance(normalized["lifestyle"], dict):
            lifestyle = normalized["lifestyle"]
            if "smoking" in lifestyle:
                normalized["smoking"] = lifestyle["smoking"]
            if "diabetes" in lifestyle:
                normalized["diabetes"] = lifestyle["diabetes"]
            if "activity" in lifestyle:
                normalized["physical_activity"] = lifestyle["activity"]
            elif "physical_activity" in lifestyle:
                normalized["physical_activity"] = lifestyle["physical_activity"]
            if "familyHistory" in lifestyle:
                normalized["family_history"] = lifestyle["familyHistory"]
            elif "family_history" in lifestyle:
                normalized["family_history"] = lifestyle["family_history"]

        # Support flat camelCase aliases
        alias_map = {
            "systolicBP": "systolic_bp",
            "diastolicBP": "diastolic_bp",
            "bloodSugar": "blood_sugar",
            "bloodSugarUnit": "blood_sugar_unit",
            "cholesterolUnit": "cholesterol_unit",
            "activity": "physical_activity",
            "familyHistory": "family_history",
            "notes": "clinical_notes",
        }
        for camel, snake in alias_map.items():
            if camel in normalized and snake not in normalized:
                normalized[snake] = normalized[camel]

        return normalized

    @field_validator("age")
    @classmethod
    def validate_age(cls, v: int) -> int:
        if v < 18 or v > 120:
            raise ValueError(f"Age must be an adult age between 18 and 120 years. Received {v}.")
        return v

    @field_validator("sex")
    @classmethod
    def validate_sex(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Biological sex must be provided.")
        return s

    @field_validator("systolic_bp")
    @classmethod
    def validate_systolic(cls, v: int) -> int:
        if v < 60 or v > 260:
            raise ValueError(f"Systolic blood pressure must be within physiological range 60-260 mmHg. Received {v}.")
        return v

    @field_validator("diastolic_bp")
    @classmethod
    def validate_diastolic(cls, v: int) -> int:
        if v < 40 or v > 160:
            raise ValueError(f"Diastolic blood pressure must be within physiological range 40-160 mmHg. Received {v}.")
        return v

    @field_validator("cholesterol")
    @classmethod
    def validate_cholesterol(cls, v: int) -> int:
        if v < 70 or v > 500:
            raise ValueError(f"Total cholesterol must be within range 70-500 mg/dL. Received {v}.")
        return v

    @field_validator("blood_sugar")
    @classmethod
    def validate_blood_sugar(cls, v: int) -> int:
        if v < 40 or v > 450:
            raise ValueError(f"Blood glucose must be within range 40-450 mg/dL. Received {v}.")
        return v

    @field_validator("bmi")
    @classmethod
    def validate_bmi(cls, v: float) -> float:
        if v < 12.0 or v > 70.0:
            raise ValueError(f"BMI must be within valid range 12.0-70.0 kg/m. Received {v}.")
        return round(float(v), 1)

    @field_validator("smoking")
    @classmethod
    def validate_smoking(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Smoking status is required.")
        return s

    @field_validator("diabetes")
    @classmethod
    def validate_diabetes(cls, v: str) -> str:
        s = v.strip()
        if s.lower() not in ["yes", "no"]:
            raise ValueError("Diabetes status must be specified as 'Yes' or 'No'.")
        return "Yes" if s.lower() == "yes" else "No"

    @field_validator("physical_activity")
    @classmethod
    def validate_activity(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Physical activity level is required.")
        return s

    @field_validator("family_history")
    @classmethod
    def validate_family_history(cls, v: str) -> str:
        s = v.strip()
        if s.lower() not in ["yes", "no"]:
            raise ValueError("Family history status must be specified as 'Yes' or 'No'.")
        return "Yes" if s.lower() == "yes" else "No"

    @model_validator(mode="after")
    def validate_pressure_relationship(self) -> "PatientInput":
        if self.diastolic_bp >= self.systolic_bp:
            raise ValueError(
                f"Diastolic blood pressure ({self.diastolic_bp} mmHg) must be lower than systolic blood pressure ({self.systolic_bp} mmHg)."
            )
        return self


class RiskFactorItem(BaseModel):
    category: str
    factor: str
    status: str
    severity: str  # "optimal", "advisory", "elevated", "high"
    educational_explanation: str


class RecommendationItem(BaseModel):
    title: str
    reason: str
    practical_action: str
    professional_followup: Optional[str] = None
    category: str
    priority: str = "routine"  # "routine", "moderate", "high"


class ValidatedPatientData(BaseModel):
    # Structured representations for compatibility with existing frontend
    basic: Dict[str, Any]
    vitals: Dict[str, Any]
    lifestyle: Dict[str, Any]
    notes: Optional[str] = ""
    # Flat top-level accessors
    age: int
    sex: str
    systolicBP: int
    diastolicBP: int
    cholesterol: int
    cholesterolUnit: str
    bloodSugar: int
    bloodSugarUnit: str
    bmi: float
    smoking: str
    diabetes: str
    activity: str
    familyHistory: str


class AnalysisResponse(BaseModel):
    status: str = "success"
    analysis_type: str = "educational_risk_factor_analysis"
    is_clinical_prediction: bool = False
    disclaimer: str
    validated_patient_data: ValidatedPatientData
    risk_factors: List[RiskFactorItem]
    educational_explanations: List[str]
    recommendations: List[RecommendationItem]
    limitations: List[str]


class RecommendationsResponse(BaseModel):
    status: str = "success"
    disclaimer: str
    recommendations: List[RecommendationItem]


class HealthResponse(BaseModel):
    status: str = "healthy"
    system: str = "TSVP Medical Backend (FastAPI)"
    version: str = "1.0.0"
    model_configured: bool = False
    educational_mode: bool = True
    timestamp: str
