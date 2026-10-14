"""
Evidence-Based Cardiovascular Educational Risk Factor Analyzer
Based on ACC/AHA and WHO educational guidelines.
Strictly does NOT fabricate diagnoses, organ damage, or clinical percentage predictions.
"""

from typing import List, Tuple
from .schemas import PatientInput, RiskFactorItem, ValidatedPatientData, AnalysisResponse, RecommendationItem
from .recommender import generate_educational_recommendations


DISCLAIMER_TEXT = (
    "EDUCATIONAL NOTICE: This analysis is an educational assessment of self-reported cardiovascular "
    "parameters evaluated against established general health guidelines (ACC/AHA and WHO). It is not a clinical "
    "diagnostic test, prediction tool, or substitute for individualized evaluation by a licensed healthcare professional. "
    "Questionnaire measurements do not prove or disprove arterial stenosis, plaque stability, or organ injury."
)


def analyze_patient_data(patient: PatientInput) -> AnalysisResponse:
    risk_factors: List[RiskFactorItem] = []
    educational_explanations: List[str] = []

    # 1. Blood Pressure Evaluation (ACC/AHA 2017 Guidelines)
    sys = patient.systolic_bp
    dia = patient.diastolic_bp

    if sys >= 180 or dia >= 120:
        bp_status = "Markedly Elevated Blood Pressure (Clinical Alert Range)"
        bp_severity = "high"
        bp_expl = (
            f"Systolic BP of {sys} mmHg and/or Diastolic BP of {dia} mmHg represents markedly high systemic vascular "
            "resistance. Chronic elevation places significant mechanical stress on vascular endothelia and the left ventricle."
        )
    elif sys >= 140 or dia >= 90:
        bp_status = "Stage 2 Hypertension Range"
        bp_severity = "high"
        bp_expl = (
            f"Blood pressure of {sys}/{dia} mmHg aligns with Stage 2 Hypertension criteria. Persistent pressures at this level "
            "increase hydraulic wall tension throughout the arterial tree, which may accelerate atherosclerotic remodeling over time."
        )
    elif sys >= 130 or dia >= 80:
        bp_status = "Stage 1 Hypertension Range"
        bp_severity = "elevated"
        bp_expl = (
            f"Blood pressure of {sys}/{dia} mmHg falls within the Stage 1 Hypertension category. Early intervention through lifestyle "
            "and dietary sodium balance can help prevent progressive vascular stiffness."
        )
    elif 120 <= sys < 130 and dia < 80:
        bp_status = "Elevated Blood Pressure"
        bp_severity = "advisory"
        bp_expl = (
            f"Systolic pressure of {sys} mmHg is slightly above optimal (<120 mmHg) while diastolic ({dia} mmHg) remains optimal. "
            "This suggests early arterial pulse wave changes that benefit from aerobic conditioning and hydration."
        )
    else:
        bp_status = "Normal / Optimal Blood Pressure"
        bp_severity = "optimal"
        bp_expl = (
            f"Blood pressure of {sys}/{dia} mmHg is within the optimal reference range (<120/<80 mmHg), indicating standard "
            "hydraulic workload on the myocardium and microvasculature."
        )

    risk_factors.append(RiskFactorItem(
        category="Vascular Hemodynamics",
        factor="Blood Pressure",
        status=bp_status,
        severity=bp_severity,
        educational_explanation=bp_expl
    ))
    educational_explanations.append(bp_expl)

    # 2. Total Cholesterol Evaluation (NCEP ATP III)
    chol = patient.cholesterol
    chol_unit = patient.cholesterol_unit or "mg/dL"

    if chol >= 240:
        chol_status = "Elevated Total Cholesterol Range"
        chol_severity = "high"
        chol_expl = (
            f"Total cholesterol of {chol} {chol_unit} is in the elevated range (>=240 mg/dL). Higher circulating circulating "
            "lipoproteins provide substrates for sub-endothelial accumulation when vascular permeability or inflammation is present."
        )
    elif chol >= 200:
        chol_status = "Borderline Elevated Cholesterol"
        chol_severity = "elevated"
        chol_expl = (
            f"Total cholesterol of {chol} {chol_unit} falls in the borderline category (200-239 mg/dL). A comprehensive lipid fraction panel "
            "(HDL, LDL, non-HDL, ApoB) is recommended to assess the precise atherogenic particle distribution."
        )
    else:
        chol_status = "Desirable Total Cholesterol"
        chol_severity = "optimal"
        chol_expl = (
            f"Total cholesterol of {chol} {chol_unit} is within the desirable range (<200 mg/dL), reflecting favorable overall circulating lipid mass."
        )

    risk_factors.append(RiskFactorItem(
        category="Lipid Profile",
        factor="Total Serum Cholesterol",
        status=chol_status,
        severity=chol_severity,
        educational_explanation=chol_expl
    ))
    educational_explanations.append(chol_expl)

    # 3. Blood Glucose Evaluation (ADA Reference)
    sugar = patient.blood_sugar
    sugar_unit = patient.blood_sugar_unit or "mg/dL"

    if sugar >= 126 or patient.diabetes == "Yes":
        sugar_status = "Elevated Blood Glucose / Diabetes Factor"
        sugar_severity = "high"
        sugar_expl = (
            f"Blood glucose of {sugar} {sugar_unit} (reported diabetes: {patient.diabetes}) reflects metabolic strain. Elevated systemic "
            "glucose induces advanced glycation end-products (AGEs) that degrade microvascular elasticity and promote endothelial dysfunction."
        )
    elif sugar >= 100:
        sugar_status = "Impaired Fasting Glucose Range"
        sugar_severity = "elevated"
        sugar_expl = (
            f"Blood glucose of {sugar} {sugar_unit} indicates borderline elevated fasting levels (100-125 mg/dL), representing early insulin "
            "resistance that responds favorably to targeted dietary carbohydrate quality and muscular activity."
        )
    else:
        sugar_status = "Normal Glycemic Parameter"
        sugar_severity = "optimal"
        sugar_expl = (
            f"Blood glucose of {sugar} {sugar_unit} is in the normal fasting window (<100 mg/dL), supporting stable endothelial cellular energetics."
        )

    risk_factors.append(RiskFactorItem(
        category="Metabolic Regulation",
        factor="Blood Sugar",
        status=sugar_status,
        severity=sugar_severity,
        educational_explanation=sugar_expl
    ))
    educational_explanations.append(sugar_expl)

    # 4. Body Mass Index (WHO Classification)
    bmi = patient.bmi
    if bmi >= 30.0:
        bmi_status = "Elevated BMI Category (Obesity Class)"
        bmi_severity = "high"
        bmi_expl = (
            f"BMI of {bmi} kg/m indicates elevated body mass. Adipose tissue expansion increases systemic circulatory volume demands and "
            "can release low-grade pro-inflammatory adipokines affecting vascular tone."
        )
    elif bmi >= 25.0:
        bmi_status = "Overweight Category"
        bmi_severity = "advisory"
        bmi_expl = (
            f"BMI of {bmi} kg/m is in the overweight range (25.0-29.9 kg/m). Modest weight modulation helps relieve mechanical cardiac "
            "workload and optimize insulin sensitivity."
        )
    elif bmi < 18.5:
        bmi_status = "Underweight Category"
        bmi_severity = "advisory"
        bmi_expl = f"BMI of {bmi} kg/m is below the standard adult weight range (<18.5 kg/m). Adequate caloric and nutrient intake is important."
    else:
        bmi_status = "Standard Adult BMI Range"
        bmi_severity = "optimal"
        bmi_expl = f"BMI of {bmi} kg/m is within the standard healthy reference range (18.5-24.9 kg/m)."

    risk_factors.append(RiskFactorItem(
        category="Anthropometrics",
        factor="Body Mass Index",
        status=bmi_status,
        severity=bmi_severity,
        educational_explanation=bmi_expl
    ))
    educational_explanations.append(bmi_expl)

    # 5. Tobacco & Smoking Status
    smk = patient.smoking.lower()
    if "current" in smk or "yes" in smk:
        smk_status = "Active Tobacco Exposure"
        smk_severity = "high"
        smk_expl = (
            "Active smoking exposes vascular endothelium directly to reactive oxygen species and carbon monoxide, inducing acute vasoconstriction, "
            "accelerating lipid oxidation, and increasing platelet reactivity."
        )
    elif "former" in smk:
        smk_status = "Past Tobacco Exposure"
        smk_severity = "advisory"
        smk_expl = (
            "Cessation of smoking significantly decreases cardiovascular risk over time. Endothelial recovery and platelet aggregation profiles "
            "continue to improve markedly year after year."
        )
    else:
        smk_status = "Non-Smoker"
        smk_severity = "optimal"
        smk_expl = "Absence of tobacco smoke protects vascular nitric oxide bioavailability and preserves baseline endothelial integrity."

    risk_factors.append(RiskFactorItem(
        category="Lifestyle Factors",
        factor="Tobacco Use",
        status=smk_status,
        severity=smk_severity,
        educational_explanation=smk_expl
    ))
    educational_explanations.append(smk_expl)

    # 6. Physical Activity
    act = patient.physical_activity.lower()
    if "sedentary" in act or "low" in act:
        act_status = "Low Physical Activity Level"
        act_severity = "elevated"
        act_expl = (
            "Sedentary habits correlate with reduced vascular shear stress, lower myocardial capillary density, and decreased mitochondrial efficiency."
        )
    elif "moderate" in act:
        act_status = "Moderate Physical Activity"
        act_severity = "optimal"
        act_expl = "Regular moderate activity stimulates protective endothelial nitric oxide synthase (eNOS) and supports healthy myocardial compliance."
    else:
        act_status = "Active Regular Training"
        act_severity = "optimal"
        act_expl = "High physical activity maintains robust microvascular reserve, optimal heart rate recovery, and metabolic flexibility."

    risk_factors.append(RiskFactorItem(
        category="Lifestyle Factors",
        factor="Physical Activity",
        status=act_status,
        severity=act_severity,
        educational_explanation=act_expl
    ))

    # 7. Family History
    fam = patient.family_history
    if fam == "Yes":
        fam_status = "Reported Family History of Cardiovascular Disease"
        fam_severity = "advisory"
        fam_expl = (
            "Genetic predispositions influence lipoprotein metabolism, arterial wall elasticity, and renal sodium handling. Family history "
            "underscores the value of vigilant baseline monitoring even when individual lifestyle measures are strong."
        )
    else:
        fam_status = "No Significant Reported Family History"
        fam_severity = "optimal"
        fam_expl = "No reported early cardiovascular disease in immediate relatives."

    risk_factors.append(RiskFactorItem(
        category="Hereditary Background",
        factor="Family History",
        status=fam_status,
        severity=fam_severity,
        educational_explanation=fam_expl
    ))

    # Generate personalized recommendations
    recs = generate_educational_recommendations(patient)

    # Document explicit limitations
    limitations = [
        "Self-reported parameters: Measurements are recorded from user input and have not been calibrated by clinical laboratory testing.",
        "Lipid fractionations unavailable: Total cholesterol alone does not provide HDL, LDL particle count, or ApoB data.",
        "No anatomical proof: Questionnaire responses cannot detect actual plaque location, coronary calcium, or arterial lumen patency.",
        "Non-prescriptive: This system does not diagnose conditions, calculate statistical 10-year percentage probabilities, or prescribe medications.",
        "Physician consultation: Individual cardiovascular health requires formal clinical evaluation, 12-lead ECG, and comprehensive diagnostic panels."
    ]

    # Package validated patient data matching frontend structure
    val_data = ValidatedPatientData(
        basic={"age": patient.age, "sex": patient.sex},
        vitals={
            "systolicBP": patient.systolic_bp,
            "diastolicBP": patient.diastolic_bp,
            "cholesterol": patient.cholesterol,
            "cholesterolUnit": patient.cholesterol_unit,
            "bloodSugar": patient.blood_sugar,
            "bloodSugarUnit": patient.blood_sugar_unit,
            "bmi": patient.bmi
        },
        lifestyle={
            "smoking": patient.smoking,
            "diabetes": patient.diabetes,
            "activity": patient.physical_activity,
            "familyHistory": patient.family_history
        },
        notes=patient.clinical_notes or "",
        age=patient.age,
        sex=patient.sex,
        systolicBP=patient.systolic_bp,
        diastolicBP=patient.diastolic_bp,
        cholesterol=patient.cholesterol,
        cholesterolUnit=patient.cholesterol_unit,
        bloodSugar=patient.blood_sugar,
        bloodSugarUnit=patient.blood_sugar_unit,
        bmi=patient.bmi,
        smoking=patient.smoking,
        diabetes=patient.diabetes,
        activity=patient.physical_activity,
        familyHistory=patient.family_history
    )

    return AnalysisResponse(
        status="success",
        analysis_type="educational_risk_factor_analysis",
        is_clinical_prediction=False,
        disclaimer=DISCLAIMER_TEXT,
        validated_patient_data=val_data,
        risk_factors=risk_factors,
        educational_explanations=educational_explanations,
        recommendations=recs,
        limitations=limitations
    )
