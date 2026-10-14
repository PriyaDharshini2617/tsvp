"""
Structured Educational Recommendation Generator
Creates personalized recommendations strictly aligned with actual patient measurements.
Does NOT prescribe medications or alter prescribed clinical treatments.
"""

from typing import List
from .schemas import PatientInput, RecommendationItem


def generate_educational_recommendations(patient: PatientInput) -> List[RecommendationItem]:
    recs: List[RecommendationItem] = []

    # 1. Acute Symptoms Alert in Clinical Notes
    if patient.clinical_notes:
        notes_lower = patient.clinical_notes.lower()
        red_flags = ["chest pain", "angina", "tightness", "crushing", "radiating", "shortness of breath", "fainting", "syncope"]
        flagged = [rf for rf in red_flags if rf in notes_lower]
        if flagged:
            recs.append(RecommendationItem(
                title="Immediate Clinical Evaluation for Reported Symptoms",
                reason=f"Clinical notes mention potential cardiopulmonary symptoms: '{patient.clinical_notes}' (flagged: {', '.join(flagged)}).",
                practical_action="Cease strenuous physical exertion until cleared by a physician. Maintain a detailed log of symptom frequency and triggers.",
                professional_followup="Schedule an evaluation with your healthcare provider promptly. If you experience severe crushing chest pain, pain radiating to the arm/jaw, or acute breathlessness, seek emergency medical care (call 911/emergency services) immediately.",
                category="Clinical Safety",
                priority="high"
            ))

    # 2. Blood Pressure Recommendations
    sys = patient.systolic_bp
    dia = patient.diastolic_bp

    if sys >= 140 or dia >= 90:
        recs.append(RecommendationItem(
            title="Systemic Hemodynamic Evaluation & Sodium Reduction Protocol",
            reason=f"Submitted blood pressure of {sys}/{dia} mmHg meets Stage 2 Hypertension classification criteria (>=140/90 mmHg).",
            practical_action="Log morning and evening blood pressure measurements after 5 minutes of seated quiet rest. Implement the DASH dietary pattern with sodium restricted to under 2,000 mg daily.",
            professional_followup="Present your 14-day home blood pressure log to your primary physician to determine if clinical diagnostic workup or therapy is indicated.",
            category="Blood Pressure",
            priority="high"
        ))
    elif sys >= 130 or dia >= 80:
        recs.append(RecommendationItem(
            title="Arterial Wall Compliance Support & Electrolyte Balance",
            reason=f"Submitted blood pressure of {sys}/{dia} mmHg falls within the Stage 1 Hypertension category.",
            practical_action="Increase dietary potassium intake through whole foods (leafy greens, sweet potatoes, legumes), practice slow paced breathing daily, and monitor trends weekly.",
            professional_followup="Have your resting blood pressure re-evaluated by a healthcare professional at your next routine checkup.",
            category="Blood Pressure",
            priority="moderate"
        ))
    elif 120 <= sys < 130 and dia < 80:
        recs.append(RecommendationItem(
            title="Preemptive Vascular Tone Maintenance",
            reason=f"Systolic blood pressure of {sys} mmHg is slightly elevated while diastolic ({dia} mmHg) remains optimal.",
            practical_action="Ensure adequate hydration (2-2.5L daily), limit caffeine intake before measurements, and engage in regular aerobic movement.",
            professional_followup="Check your blood pressure periodically at home or pharmacy kiosks every few months.",
            category="Blood Pressure",
            priority="routine"
        ))
    else:
        recs.append(RecommendationItem(
            title="Optimal Hemodynamic Maintenance",
            reason=f"Blood pressure of {sys}/{dia} mmHg is within the optimal reference range (<120/<80 mmHg).",
            practical_action="Continue current balanced nutrition and lifestyle practices that maintain healthy arterial elasticity.",
            professional_followup="Continue routine annual blood pressure checks during preventative health exams.",
            category="Blood Pressure",
            priority="routine"
        ))

    # 3. Cholesterol Recommendations
    chol = patient.cholesterol
    unit = patient.cholesterol_unit or "mg/dL"

    if chol >= 240:
        recs.append(RecommendationItem(
            title="Comprehensive Lipid Fractionation & Dietary Fiber Protocol",
            reason=f"Total serum cholesterol of {chol} {unit} is elevated (>=240 mg/dL).",
            practical_action="Increase daily soluble viscous fiber to 10-25g (oats, psyllium, legumes) and replace saturated dietary fats with polyphenol-rich extra virgin olive oil and nuts.",
            professional_followup="Request a comprehensive lipid fractionation panel (including LDL particle count, ApoB, and Lp(a)) from your physician.",
            category="Lipid Health",
            priority="high"
        ))
    elif chol >= 200:
        recs.append(RecommendationItem(
            title="Lipid Optimization & Soluble Fiber Strategy",
            reason=f"Total cholesterol of {chol} {unit} is in the borderline elevated range (200-239 mg/dL).",
            practical_action="Emphasize Mediterranean dietary principles, incorporating plant sterols and limiting ultra-processed trans fats.",
            professional_followup="Discuss follow-up lipid screening with your physician to evaluate your total cholesterol-to-HDL ratio.",
            category="Lipid Health",
            priority="moderate"
        ))
    else:
        recs.append(RecommendationItem(
            title="Healthy Lipid Profile Preservation",
            reason=f"Total cholesterol of {chol} {unit} is in the desirable reference window (<200 mg/dL).",
            practical_action="Maintain diverse dietary unsaturated fats, antioxidant-rich fruits, and vegetables to support endothelial health.",
            professional_followup="Follow standard preventive guidelines with a complete lipid panel every 3-5 years.",
            category="Lipid Health",
            priority="routine"
        ))

    # 4. Glucose & Metabolic Recommendations
    sugar = patient.blood_sugar
    s_unit = patient.blood_sugar_unit or "mg/dL"

    if sugar >= 126 or patient.diabetes == "Yes":
        recs.append(RecommendationItem(
            title="Glycemic Control & Endothelial Protection Strategy",
            reason=f"Blood sugar of {sugar} {s_unit} (Diabetes status: {patient.diabetes}) reflects metabolic stress on vascular microvessels.",
            practical_action="Take a 10-15 minute brisk stroll after main meals to facilitate non-insulin-mediated GLUT4 glucose uptake in skeletal muscles.",
            professional_followup="Coordinate closely with your healthcare provider for regular HbA1c testing, retinal screening, and renal microalbuminuria evaluations.",
            category="Metabolic Health",
            priority="high"
        ))
    elif sugar >= 100:
        recs.append(RecommendationItem(
            title="Insulin Sensitivity Restoration & Carbohydrate Pacing",
            reason=f"Blood glucose of {sugar} {s_unit} indicates impaired fasting glucose range (100-125 mg/dL).",
            practical_action="Replace refined high-glycemic carbohydrates with intact whole grains and combine carbohydrates with protein or healthy fats to flatten postprandial glucose curves.",
            professional_followup="Discuss an oral glucose tolerance test or baseline HbA1c test with your primary care provider.",
            category="Metabolic Health",
            priority="moderate"
        ))

    # 5. Body Composition & BMI
    bmi = patient.bmi
    if bmi >= 30.0:
        recs.append(RecommendationItem(
            title="Cardiac Volume De-Escalation & Nutritional Density",
            reason=f"Reported BMI of {bmi} kg/m reflects expanded adipose tissue volume and higher circulatory demand.",
            practical_action="Focus on sustainable whole-food caloric density, prioritizing 25-30g of protein per meal and resistance training to preserve lean skeletal muscle.",
            professional_followup="Review individualized metabolic and weight goals with a registered dietitian or physician.",
            category="Anthropometrics",
            priority="moderate"
        ))
    elif bmi >= 25.0:
        recs.append(RecommendationItem(
            title="Weight Modulation for Mechanical Myocardial Relief",
            reason=f"Reported BMI of {bmi} kg/m falls in the overweight reference range (25.0-29.9 kg/m).",
            practical_action="Target a modest 5% weight reduction over 6 months to meaningfully lower systemic inflammatory markers and improve insulin sensitivity.",
            professional_followup="Track waist circumference (ideally under half your height) alongside physician checkups.",
            category="Anthropometrics",
            priority="routine"
        ))

    # 6. Tobacco Use
    smk = patient.smoking.lower()
    if "current" in smk or "yes" in smk:
        recs.append(RecommendationItem(
            title="Tobacco Cessation & Endothelial Recovery Program",
            reason="Active smoking introduces reactive oxidant species that directly impair nitric oxide-mediated vasodilation.",
            practical_action="Access structured behavioral cessation resources, identify smoking triggers, and consult health professionals regarding evidence-based cessation pathways.",
            professional_followup="Consult your physician about clinically approved cessation options and personalized cardiovascular risk monitoring.",
            category="Lifestyle Intervention",
            priority="high"
        ))
    elif "former" in smk:
        recs.append(RecommendationItem(
            title="Sustained Vascular Repair Following Cessation",
            reason="Past tobacco exposure is associated with progressive cardiovascular recovery year after year.",
            practical_action="Maintain a completely tobacco-free environment and consume polyphenol-dense foods to support ongoing microvascular remodeling.",
            professional_followup="Ensure your physician has an accurate record of your past tobacco history for lung and cardiovascular surveillance.",
            category="Lifestyle Intervention",
            priority="routine"
        ))

    # 7. Physical Activity
    act = patient.physical_activity.lower()
    if "sedentary" in act or "low" in act:
        recs.append(RecommendationItem(
            title="Progressive Aerobic Conditioning & Shear-Stress Induction",
            reason="Low physical activity reduces endothelial shear stress, lowering basal vascular nitric oxide production.",
            practical_action="Establish a baseline of 150 minutes of moderate-intensity aerobic activity weekly (such as 30 minutes of brisk walking 5 days/week).",
            professional_followup="If initiating physical exercise after prolonged inactivity, review planned exercise intensity with your physician first.",
            category="Physical Activity",
            priority="moderate"
        ))
    else:
        recs.append(RecommendationItem(
            title="Cardiorespiratory Fitness & Microvascular Maintenance",
            reason=f"Reported regular physical activity ({patient.physical_activity}) actively supports myocardial compliance and metabolic resilience.",
            practical_action="Incorporate a mix of continuous aerobic training and progressive resistance training twice weekly.",
            professional_followup="Discuss heart rate recovery metrics with your healthcare provider during routine wellness exams.",
            category="Physical Activity",
            priority="routine"
        ))

    # 8. Family History
    if patient.family_history == "Yes":
        recs.append(RecommendationItem(
            title="Hereditary Cardiovascular Vigilance & Early Baseline Screening",
            reason="Reported family history of early cardiovascular disease underscores potential inherited predispositions in vascular elasticity or lipid metabolism.",
            practical_action="Maintain vigilant annual monitoring of standard cardiovascular biometrics and avoid assuming absence of symptoms equals absence of risk.",
            professional_followup="Discuss your family pedigree with your physician and ask whether advanced risk markers (such as Coronary Artery Calcium / CAC scoring or Lp(a)) are indicated.",
            category="Preventative Care",
            priority="moderate"
        ))

    return recs
