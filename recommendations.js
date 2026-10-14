/**
 * TSVP — The Smart Vascular Predictor
 * Page 4: Personalized Recommendations Controller
 * Evidence-based clinical evaluation engine based on actual patient inputs.
 */

(function () {
    'use strict';

    // -------------------------------------------------------------------------
    // 1. Preset Test Profiles for Verification & Testing
    // -------------------------------------------------------------------------
    const PRESET_PROFILES = {
        'elevated': {
            basic: { age: 54, sex: 'Male' },
            vitals: {
                systolicBP: 148,
                diastolicBP: 94,
                cholesterol: 245,
                bloodSugar: 132,
                bmi: 30.6
            },
            lifestyle: {
                smoking: 'Current',
                diabetes: 'Yes',
                activity: 'Low',
                familyHistory: 'Yes'
            },
            notes: 'Occasional mild shortness of breath during exertion; taking prescribed lisinopril.'
        },
        'optimal': {
            basic: { age: 34, sex: 'Female' },
            vitals: {
                systolicBP: 116,
                diastolicBP: 74,
                cholesterol: 178,
                bloodSugar: 86,
                bmi: 22.4
            },
            lifestyle: {
                smoking: 'Never',
                diabetes: 'No',
                activity: 'High',
                familyHistory: 'No'
            },
            notes: 'No chronic conditions or symptoms. Regular marathon training.'
        },
        'metabolic': {
            basic: { age: 48, sex: 'Male' },
            vitals: {
                systolicBP: 128,
                diastolicBP: 82,
                cholesterol: 218,
                bloodSugar: 114,
                bmi: 28.6
            },
            lifestyle: {
                smoking: 'Former',
                diabetes: 'No',
                activity: 'Moderate',
                familyHistory: 'Yes'
            },
            notes: 'Borderline fasting blood glucose on last routine checkup.'
        }
    };

    // -------------------------------------------------------------------------
    // 2. DOM Elements Cache
    // -------------------------------------------------------------------------
    const elTelemetrySourceLabel = document.getElementById('telemetrySourceLabel');
    const elTelemetrySourceDot = document.getElementById('telemetrySourceDot');
    const elTelemetryMetricsGrid = document.getElementById('telemetryMetricsGrid');
    const elTelemetryNotice = document.getElementById('telemetryNotice');
    const elExecutiveSummarySection = document.getElementById('executiveSummarySection');
    const elFocusPillsRow = document.getElementById('focusPillsRow');
    const elSummaryStatusBar = document.getElementById('summaryStatusBar');
    const elEmergencyAlertSection = document.getElementById('emergencyAlertSection');
    const elEmergencyAlertText = document.getElementById('emergencyAlertText');
    const elRecommendationsCountTag = document.getElementById('recommendationsCountTag');
    const elRecommendationsStream = document.getElementById('recommendationsStream');
    const elChecklistItemsGrid = document.getElementById('checklistItemsGrid');
    const elChecklistProgressText = document.getElementById('checklistProgressText');
    const elChecklistProgressFill = document.getElementById('checklistProgressFill');
    const elChecklistProgressBarTrack = document.getElementById('checklistProgressBarTrack');
    const elBtnResetChecklist = document.getElementById('btnResetChecklist');
    const elQuestionsList = document.getElementById('questionsList');
    const elBtnCopyQuestions = document.getElementById('btnCopyQuestions');
    const elBtnCopyQuestionsText = document.getElementById('btnCopyQuestionsText');
    const elBtnPrintPlan = document.getElementById('btnPrintPlan');
    const elToast = document.getElementById('recToast');

    // Switcher Buttons
    const btnProfileSubmitted = document.getElementById('btnProfileSubmitted');
    const btnProfileElevated = document.getElementById('btnProfileElevated');
    const btnProfileOptimal = document.getElementById('btnProfileOptimal');
    const btnProfileMetabolic = document.getElementById('btnProfileMetabolic');

    // State Variables
    let submittedTelemetry = null;
    let savedBackendAnalysis = null;
    let currentProfile = null;
    let activePresetKey = 'submitted'; // 'submitted' | 'elevated' | 'optimal' | 'metabolic'
    let currentEvaluations = [];
    let currentChecklistTasks = [];

    // -------------------------------------------------------------------------
    // 3. Load & Ingest Telemetry Data
    // -------------------------------------------------------------------------
    function loadSavedTelemetry() {
        // Read actual backend response from sessionStorage if available
        try {
            const rawAnalysis = sessionStorage.getItem('tsvp_analysis_result');
            if (rawAnalysis) {
                const parsedAnalysis = JSON.parse(rawAnalysis);
                if (parsedAnalysis && Array.isArray(parsedAnalysis.recommendations) && parsedAnalysis.recommendations.length > 0) {
                    savedBackendAnalysis = parsedAnalysis;
                }
            }
        } catch (e) {
            console.warn('Error reading sessionStorage for tsvp_analysis_result:', e);
        }

        try {
            const raw = sessionStorage.getItem('tsvp_patient_telemetry') || 
                        sessionStorage.getItem('tsvp_patient_data');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && (parsed.vitals || parsed.systolicBP)) {
                    submittedTelemetry = parsed;
                    return;
                }
            }
        } catch (e) {
            console.warn('Error reading sessionStorage for tsvp_patient_telemetry:', e);
        }

        // If patient telemetry not directly found, check if backend analysis has validated_patient_data
        if (savedBackendAnalysis && savedBackendAnalysis.validated_patient_data) {
            submittedTelemetry = savedBackendAnalysis.validated_patient_data;
            return;
        }

        // Default demonstration telemetry if user directly visited recommendations.html
        submittedTelemetry = {
            isDemoFallback: true,
            basic: { age: 52, sex: 'Male' },
            vitals: {
                systolicBP: 138,
                diastolicBP: 88,
                cholesterol: 224,
                bloodSugar: 112,
                bmi: 27.8
            },
            lifestyle: {
                smoking: 'Former',
                diabetes: 'No',
                activity: 'Low',
                familyHistory: 'Yes'
            },
            notes: 'Family history of early coronary heart disease; mild fatigue on long stair climbs.'
        };
    }

    // -------------------------------------------------------------------------
    // 4. Clinical Evaluation Engine (Strictly Non-Generic)
    // -------------------------------------------------------------------------
    function evaluatePatientTelemetry(data) {
        const evaluations = [];
        const basic = data.basic || {};
        const vitals = data.vitals || {};
        const lifestyle = data.lifestyle || {};
        const notes = (data.notes || '').trim();

        const sys = Number(vitals.systolicBP);
        const dia = Number(vitals.diastolicBP);
        const chol = Number(vitals.cholesterol);
        const sugar = Number(vitals.bloodSugar);
        const bmi = Number(vitals.bmi);
        const age = Number(basic.age) || 45;
        const sex = basic.sex || 'Unspecified';
        const smoking = lifestyle.smoking || 'Never';
        const diabetes = lifestyle.diabetes || 'No';
        const activity = lifestyle.activity || 'Moderate';
        const familyHistory = lifestyle.familyHistory || 'No';

        // ---------------------------------------------------------------------
        // Check A: Critical Symptom Flags in Clinical Notes
        // ---------------------------------------------------------------------
        const redFlagKeywords = ['chest pain', 'angina', 'tightness', 'crushing', 'radiating', 'shortness of breath', 'syncope', 'fainting', 'severe palpitations'];
        const notesLower = notes.toLowerCase();
        const detectedRedFlags = redFlagKeywords.filter(k => notesLower.includes(k));

        if (detectedRedFlags.length > 0) {
            evaluations.push({
                id: 'eval-clinical-redflag',
                category: 'Clinical Warning',
                categoryIcon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
                title: 'Reported Symptoms Require Clinical Caution',
                priority: 'high',
                priorityLabel: 'High Priority &bull; Urgent Attention',
                focusTag: 'Symptom Evaluation',
                noticed: `Clinical notes record potentially significant symptoms: "${notes}" (flagged keywords: ${detectedRedFlags.join(', ')}).`,
                matters: 'Symptoms such as unexplained chest tightness, dyspnea, or radiating discomfort may indicate acute or unstable myocardial ischemia or other serious cardiopulmonary conditions requiring timely evaluation.',
                canDo: 'Avoid strenuous physical exertion until cleared by a physician. Keep a written log of when symptoms occur, their duration, and what activities trigger or alleviate them.',
                nextStep: 'Seek prompt medical evaluation. If experiencing acute or worsening chest pressure, pain spreading to the arm or jaw, or difficulty breathing, call emergency medical services (911 / 999 / 112) immediately.',
                task: 'Schedule immediate clinical evaluation for reported cardiopulmonary symptoms.'
            });
        }

        // ---------------------------------------------------------------------
        // Check B: Blood Pressure
        // ---------------------------------------------------------------------
        if (!isNaN(sys) && !isNaN(dia)) {
            if (sys >= 180 || dia >= 120) {
                // Crisis Range
                evaluations.push({
                    id: 'eval-bp-crisis',
                    category: 'Blood Pressure',
                    categoryIcon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
                    title: 'Markedly Elevated Blood Pressure',
                    priority: 'high',
                    priorityLabel: 'High Priority &bull; Severe Range',
                    focusTag: 'Blood Pressure (Crisis Range)',
                    noticed: `Entered Blood Pressure is ${sys} / ${dia} mmHg (exceeds the 180 / 120 mmHg threshold).`,
                    matters: 'Severely elevated blood pressure can cause acute mechanical stress on coronary arteries, the aorta, cerebral vessels, and the left ventricle, carrying risk of acute end-organ compromise.',
                    canDo: 'Rest quietly in a seated position for 5 minutes and repeat measurement using a calibrated upper-arm cuff. Avoid physical exertion, caffeine, and tobacco.',
                    nextStep: 'Seek immediate medical attention. If this reading is confirmed upon resting re-measurement or accompanied by headache, chest discomfort, or visual changes, proceed to an emergency department or call emergency services. Do not alter prescribed medications without direct medical instructions.',
                    task: 'Repeat blood pressure measurement after 5 minutes of seated rest and seek emergency care if sustained.'
                });
            } else if (sys >= 140 || dia >= 90) {
                // Stage 2
                evaluations.push({
                    id: 'eval-bp-stage2',
                    category: 'Blood Pressure',
                    categoryIcon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
                    title: 'Elevated Blood Pressure (Stage 2 Range)',
                    priority: 'high',
                    priorityLabel: 'High Priority &bull; Stage 2',
                    focusTag: 'Blood Pressure Optimization',
                    noticed: `Recorded Systolic ${sys} mmHg and Diastolic ${dia} mmHg (Stage 2 Hypertension range &ge; 140/90 mmHg).`,
                    matters: 'Persistent arterial pressures at or above 140/90 mmHg exert ongoing mechanical shear stress on arterial endothelium, accelerating atheroma development, increasing arterial stiffness, and forcing the left ventricle to pump against excessive systemic vascular resistance.',
                    canDo: 'Record repeat measurements twice daily (morning before eating/medications and evening before dinner) using proper technique (rested 5 minutes, arm supported at heart level, feet flat on floor). Follow a heart-healthy nutritional pattern such as DASH, reducing dietary sodium to less than 2,000 mg daily.',
                    nextStep: 'Discuss persistently elevated readings with a qualified healthcare professional to establish a formal diagnosis and care plan. Important: Do not alter, reduce, or stop any prescribed blood pressure medications on your own.',
                    task: 'Log morning and evening resting blood pressure readings for 7 consecutive days to share with your physician.'
                });
            } else if (sys >= 130 || dia >= 80) {
                // Stage 1
                evaluations.push({
                    id: 'eval-bp-stage1',
                    category: 'Blood Pressure',
                    categoryIcon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
                    title: 'Mildly Elevated Blood Pressure (Stage 1 Range)',
                    priority: 'moderate',
                    priorityLabel: 'Moderate Priority &bull; Stage 1',
                    focusTag: 'Blood Pressure Monitoring',
                    noticed: `Recorded Systolic ${sys} mmHg and Diastolic ${dia} mmHg (Stage 1 range: 130-139 / 80-89 mmHg).`,
                    matters: 'Blood pressure in this range indicates early vascular resistance and increased hydraulic workload on your circulatory vessels over time, which can contribute to cumulative endothelial wear.',
                    canDo: 'Incorporate potassium-rich vegetables (leafy greens, avocados) into daily meals, curtail high-sodium processed foods, maintain moderate physical activity, and practice daily stress reduction.',
                    nextStep: 'Confirm readings across several days with a calibrated home monitor and review your readings with your primary healthcare provider. Do not alter any prescribed medications without medical advice.',
                    task: 'Adopt the DASH dietary pattern and reduce daily sodium intake to below 2,300 mg.'
                });
            } else if (sys >= 120 && dia < 80) {
                // Elevated
                evaluations.push({
                    id: 'eval-bp-elevated',
                    category: 'Blood Pressure',
                    categoryIcon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
                    title: 'Pre-Hypertensive Systolic Elevation',
                    priority: 'moderate',
                    priorityLabel: 'Moderate Attention',
                    focusTag: 'Blood Pressure Awareness',
                    noticed: `Systolic BP of ${sys} mmHg with Diastolic ${dia} mmHg (Elevated Systolic category: 120-129 / < 80 mmHg).`,
                    matters: 'An elevated systolic reading signals emerging arterial resistance. Without proactive lifestyle adjustments, this category frequently progresses toward hypertension over subsequent years.',
                    canDo: 'Focus on sodium moderation, regular aerobic exercise, good sleep hygiene (7-9 hours), and mindful hydration.',
                    nextStep: 'Recheck blood pressure within 3 to 6 months to monitor trends and review with your clinician during your next routine exam.',
                    task: 'Perform periodic monthly blood pressure checks to ensure systolic pressure remains below 130 mmHg.'
                });
            } else {
                // Optimal BP
                evaluations.push({
                    id: 'eval-bp-optimal',
                    category: 'Blood Pressure',
                    categoryIcon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
                    title: 'Optimal Blood Pressure Range',
                    priority: 'optimal',
                    priorityLabel: 'Optimal Range &bull; Maintenance',
                    focusTag: 'Blood Pressure Maintenance',
                    noticed: `Submitted Blood Pressure is ${sys} / ${dia} mmHg, which falls comfortably within the desirable normal range (< 120 / < 80 mmHg).`,
                    matters: 'Maintaining blood pressure in this optimal zone preserves microvascular endothelial function, protects renal glomeruli, and avoids unnecessary left ventricular hypertrophy.',
                    canDo: 'Continue your current supportive habits: a balanced whole-foods diet, regular physical activity, and routine stress management.',
                    nextStep: 'Continue periodic monitoring during your annual wellness checks, as blood pressure naturally fluctuates with aging and environmental factors.',
                    task: 'Maintain current heart-healthy habits and verify blood pressure at your annual physical.'
                });
            }
        }

        // ---------------------------------------------------------------------
        // Check C: Cholesterol
        // ---------------------------------------------------------------------
        if (!isNaN(chol)) {
            const cholMmol = (chol / 38.67).toFixed(1);
            if (chol >= 240) {
                // High Cholesterol
                evaluations.push({
                    id: 'eval-chol-high',
                    category: 'Lipid Profile',
                    categoryIcon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
                    title: 'Elevated Total Cholesterol Reading',
                    priority: 'high',
                    priorityLabel: 'High Priority &bull; Elevated',
                    focusTag: 'Lipid Profile Review',
                    noticed: `Total Cholesterol measurement of ${chol} mg/dL (approx. ${cholMmol} mmol/L), which falls in the elevated reference tier (&ge; 240 mg/dL).`,
                    matters: 'Total cholesterol reflects circulating sterols, but cardiovascular risk specifically hinges on the concentration of atherogenic ApoB and LDL particles that penetrate arterial walls to trigger plaque formation. A single total cholesterol value cannot distinguish LDL from protective HDL.',
                    canDo: 'Increase soluble dietary fiber (oats, barley, beans, lentils, psyllium husk, chia seeds); replace saturated fats (butter, fatty meats, palm oil) with polyunsaturated and monounsaturated fats (extra virgin olive oil, nuts, avocados, salmon); eliminate trans fats.',
                    nextStep: 'Discuss this result with a healthcare professional to request a comprehensive fasting lipid panel (including LDL-C, HDL-C, Triglycerides, and ideally ApoB or Lp(a)) to assess overall atherogenic risk within your individual clinical context.',
                    task: 'Schedule a comprehensive fasting lipid panel consultation with your primary care provider.'
                });
            } else if (chol >= 200) {
                // Borderline Cholesterol
                evaluations.push({
                    id: 'eval-chol-borderline',
                    category: 'Lipid Profile',
                    categoryIcon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
                    title: 'Borderline Elevated Total Cholesterol',
                    priority: 'moderate',
                    priorityLabel: 'Moderate Priority &bull; Borderline',
                    focusTag: 'Lipid Profile Assessment',
                    noticed: `Total Cholesterol measurement of ${chol} mg/dL (approx. ${cholMmol} mmol/L), located in the borderline elevated tier (200 - 239 mg/dL).`,
                    matters: 'Borderline total cholesterol warrants attention because an unfavorable sub-fraction balance (e.g. elevated small dense LDL particles alongside low HDL) may elevate long-term atherosclerotic risk even when total cholesterol is only mildly elevated.',
                    canDo: 'Prioritize soluble fiber (aim for 25-35 grams total dietary fiber daily), incorporate plant sterols, and replace saturated cooking fats with extra virgin olive oil.',
                    nextStep: 'Review this result with your healthcare professional to see if fractionated lipid testing (LDL, HDL, triglycerides) is recommended.',
                    task: 'Incorporate 2 daily servings of soluble fiber (oats, legumes, or flaxseed) into your meal plan.'
                });
            } else {
                // Desirable Cholesterol
                evaluations.push({
                    id: 'eval-chol-optimal',
                    category: 'Lipid Profile',
                    categoryIcon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
                    title: 'Desirable Total Cholesterol Level',
                    priority: 'optimal',
                    priorityLabel: 'Optimal Tier &bull; Maintenance',
                    focusTag: 'Lipid Maintenance',
                    noticed: `Total Cholesterol reading of ${chol} mg/dL (approx. ${cholMmol} mmol/L) is within the desirable reference range (< 200 mg/dL).`,
                    matters: 'Desirable total cholesterol indicates favorable circulating lipid mass, helping protect coronary endothelial integrity against atheromatous infiltration.',
                    canDo: 'Maintain an unrefined whole-food dietary pattern rich in omega-3 fatty acids, vegetables, and unsaturated fats.',
                    nextStep: 'Continue routine periodic lipid surveillance as recommended by your physician.',
                    task: 'Maintain heart-healthy dietary fats and complete routine lipid panel screening as scheduled.'
                });
            }
        }

        // ---------------------------------------------------------------------
        // Check D: Blood Sugar & Diabetes
        // ---------------------------------------------------------------------
        if (!isNaN(sugar)) {
            const sugarMmol = (sugar / 18.01).toFixed(1);
            if (diabetes === 'Yes') {
                evaluations.push({
                    id: 'eval-sugar-diabetes',
                    category: 'Glycemic Regulation',
                    categoryIcon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
                    title: 'Active Diabetes Management & Cardiovascular Health',
                    priority: 'high',
                    priorityLabel: 'High Priority &bull; Clinical Care',
                    focusTag: 'Glycemic Control & Follow-Up',
                    noticed: `Reported clinical diagnosis of Diabetes with fasting blood sugar of ${sugar} mg/dL (approx. ${sugarMmol} mmol/L).`,
                    matters: 'Diabetes is considered a major cardiovascular risk modifier because chronic hyperglycemia induces microvascular endothelial dysfunction, accelerates arterial calcification, and enhances oxidative stress across vascular networks.',
                    canDo: 'Follow a balanced nutritional plan emphasizing low-glycemic, fiber-rich carbohydrates paired with lean proteins and healthy fats; engage in light 10-15 minute post-meal physical activity to facilitate glucose uptake into muscular tissue.',
                    nextStep: 'Maintain regular follow-up with your endocrinologist or primary care physician for comprehensive surveillance (including quarterly/biannual HbA1c, renal microalbumin testing, and annual retinal exams). Important: Never alter prescribed medications without medical authorization.',
                    task: 'Review recent glucose logs and HbA1c targets at your next dedicated diabetes consultation.'
                });
            } else if (sugar >= 126) {
                evaluations.push({
                    id: 'eval-sugar-elevated',
                    category: 'Glycemic Regulation',
                    categoryIcon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
                    title: 'Elevated Fasting Blood Sugar Reading',
                    priority: 'high',
                    priorityLabel: 'High Priority &bull; Elevated',
                    focusTag: 'Fasting Glucose Evaluation',
                    noticed: `Recorded fasting blood glucose of ${sugar} mg/dL (approx. ${sugarMmol} mmol/L), which meets or exceeds the 126 mg/dL clinical screening threshold.`,
                    matters: 'Markedly elevated fasting glucose levels can indicate impaired insulin sensitivity and metabolic dysregulation, creating biochemical strain on endothelial membranes throughout your vascular tree.',
                    canDo: 'Focus on balanced meals with unrefined complex carbohydrates; avoid sugar-sweetened beverages and concentrated fruit juices; take a brisk 15-minute walk after meals.',
                    nextStep: 'Discuss this result with a healthcare professional for clinical diagnostic confirmation (e.g. repeat fasting plasma glucose and laboratory HbA1c test). Important: This questionnaire reading does not constitute a medical diagnosis, and you should not change medications independently.',
                    task: 'Schedule formal laboratory fasting plasma glucose and HbA1c testing with your clinician.'
                });
            } else if (sugar >= 100) {
                evaluations.push({
                    id: 'eval-sugar-prediabetes',
                    category: 'Glycemic Regulation',
                    categoryIcon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
                    title: 'Impaired Fasting Glucose (Prediabetes Tier)',
                    priority: 'moderate',
                    priorityLabel: 'Moderate Priority &bull; Prediabetes Tier',
                    focusTag: 'Metabolic Health Support',
                    noticed: `Fasting blood glucose of ${sugar} mg/dL (approx. ${sugarMmol} mmol/L), which falls in the impaired fasting glucose range (100 - 125 mg/dL).`,
                    matters: 'Fasting glucose in this range reflects early insulin resistance. While prediabetes elevates future cardiovascular vulnerability, this phase is exceptionally responsive to sustainable lifestyle adjustments.',
                    canDo: 'Reduce refined starches and added sugars; incorporate daily movement breaks; combine strength training with aerobic exercise to improve muscular insulin receptor sensitivity.',
                    nextStep: 'Request an HbA1c test from your healthcare professional to evaluate your 3-month average glycemic control.',
                    task: 'Take a 15-minute brisk walk after lunch or dinner 5 days this week to enhance post-meal glucose clearance.'
                });
            } else {
                evaluations.push({
                    id: 'eval-sugar-optimal',
                    category: 'Glycemic Regulation',
                    categoryIcon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
                    title: 'Optimal Fasting Blood Glucose',
                    priority: 'optimal',
                    priorityLabel: 'Optimal Tier &bull; Maintenance',
                    focusTag: 'Glucose Maintenance',
                    noticed: `Fasting blood sugar is ${sugar} mg/dL (approx. ${sugarMmol} mmol/L), within the normal physiological fasting range (< 100 mg/dL).`,
                    matters: 'Normal fasting glucose indicates robust insulin sensitivity and minimal glycation damage to vascular walls.',
                    canDo: 'Continue balanced dietary habits prioritizing whole foods, fiber, and regular physical activity.',
                    nextStep: 'Maintain routine annual screening to ensure metabolic stability over time.',
                    task: 'Continue balanced nutrition and active lifestyle supporting metabolic wellness.'
                });
            }
        }

        // ---------------------------------------------------------------------
        // Check E: Body Mass Index (BMI)
        // ---------------------------------------------------------------------
        if (!isNaN(bmi)) {
            if (bmi >= 30.0) {
                evaluations.push({
                    id: 'eval-bmi-elevated',
                    category: 'Body Composition Screening',
                    categoryIcon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
                    title: 'Elevated Body Mass Index (BMI)',
                    priority: 'moderate',
                    priorityLabel: 'Moderate Priority &bull; Screening Note',
                    focusTag: 'Body Composition & Nutrition',
                    noticed: `Submitted Body Mass Index (BMI) is ${bmi} kg/m² (&ge; 30.0 kg/m² category).`,
                    matters: 'BMI is an epidemiological screening ratio based strictly on height and weight, not a clinical diagnosis of health or individual body composition (it cannot differentiate visceral adipose tissue from muscle mass). However, significant visceral adiposity can produce systemic pro-inflammatory cytokines and increase cardiac output requirements.',
                    canDo: 'Focus on realistic, sustainable lifestyle behaviors without restrictive or extreme crash diets. Emphasize whole nutrient-dense foods, mindful meal cadence, progressive daily movement, stress management, and restorative sleep.',
                    nextStep: 'Collaborate with a healthcare professional or registered dietitian for an individualized assessment, including waist-to-height ratio, metabolic blood markers, and sustainable habit coaching.',
                    task: 'Consult a primary care provider or dietitian to establish positive, sustainable lifestyle and nutrition goals.'
                });
            } else if (bmi >= 25.0) {
                evaluations.push({
                    id: 'eval-bmi-overweight',
                    category: 'Body Composition Screening',
                    categoryIcon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
                    title: 'Mildly Elevated Body Mass Index (BMI)',
                    priority: 'moderate',
                    priorityLabel: 'Moderate Attention',
                    focusTag: 'Lifestyle & Habit Support',
                    noticed: `Submitted BMI is ${bmi} kg/m² (falls in the 25.0 - 29.9 kg/m² screening bracket).`,
                    matters: 'BMI provides a broad population-level estimate rather than a direct measure of body fat distribution or cardiac health. Focus on overall cardiovascular conditioning and metabolic markers rather than the scale alone.',
                    canDo: 'Adopt positive lifestyle habits: replace refined convenience snacks with whole fruits and nuts, stay well hydrated, and incorporate consistent daily walking.',
                    nextStep: 'Review overall health metrics (blood pressure, lipid panel, waist circumference) with your clinician during your next routine exam.',
                    task: 'Incorporate 30 minutes of moderate daily movement and replace sugary drinks with water or herbal tea.'
                });
            } else if (bmi >= 18.5) {
                evaluations.push({
                    id: 'eval-bmi-normal',
                    category: 'Body Composition Screening',
                    categoryIcon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
                    title: 'Normal Body Mass Index Range',
                    priority: 'optimal',
                    priorityLabel: 'Normal Range &bull; Maintenance',
                    focusTag: 'Weight Maintenance',
                    noticed: `Submitted BMI of ${bmi} kg/m² is within the standard healthy reference range (18.5 - 24.9 kg/m²).`,
                    matters: 'Maintaining a healthy body mass index helps keep baseline resting myocardial workload and systemic vascular resistance within normal limits.',
                    canDo: 'Maintain an active routine combining aerobic conditioning with functional resistance training, supported by wholesome balanced nutrition.',
                    nextStep: 'Continue current wellness habits and schedule periodic annual checkups.',
                    task: 'Continue balanced dietary and physical activity patterns that support your healthy BMI.'
                });
            } else {
                evaluations.push({
                    id: 'eval-bmi-underweight',
                    category: 'Body Composition Screening',
                    categoryIcon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
                    title: 'Lower-Than-Average Body Mass Index',
                    priority: 'moderate',
                    priorityLabel: 'Moderate Attention',
                    focusTag: 'Nutritional Balance',
                    noticed: `Submitted BMI of ${bmi} kg/m² is below the standard reference baseline (< 18.5 kg/m²).`,
                    matters: 'BMI below the typical range may reflect reduced lean muscle mass or nutritional deficits that warrant balanced dietary evaluation.',
                    canDo: 'Focus on nutrient-dense meals including healthy fats (avocados, nuts, seeds, olive oil) and sufficient protein.',
                    nextStep: 'Discuss with a healthcare provider to ensure nutritional adequacy and rule out underlying metabolic causes.',
                    task: 'Review overall nutritional intake and caloric density with a healthcare professional.'
                });
            }
        }

        // ---------------------------------------------------------------------
        // Check F: Smoking Status
        // ---------------------------------------------------------------------
        if (smoking === 'Current') {
            evaluations.push({
                id: 'eval-smoking-current',
                category: 'Tobacco Exposure',
                categoryIcon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
                title: 'Active Tobacco Exposure & Vascular Health',
                priority: 'high',
                priorityLabel: 'High Priority &bull; Major Risk Modifier',
                focusTag: 'Smoking Cessation Support',
                noticed: 'Reported smoking status: Current smoker.',
                matters: 'Combustion products and nicotine directly damage vascular endothelium, induce chronic arterial inflammation, increase platelet stickiness (thrombosis risk), and accelerate coronary atheroma destabilization while acutely raising heart rate and blood pressure.',
                canDo: 'Identify personal triggers and routines associated with smoking; choose a specific target quit date; explore evidence-based cessation aids (nicotine replacement therapy, prescription non-nicotine medications); access free confidential professional support (National Quitline: 1-800-QUIT-NOW / NHS Smokefree).',
                nextStep: 'Schedule a dedicated discussion with your healthcare professional to develop a personalized, medically supported cessation strategy. Cardiovascular risk begins falling within days to weeks of stopping.',
                task: 'Call the National Quitline (1-800-QUIT-NOW) or discuss evidence-based cessation therapies with your doctor.'
            });
        } else if (smoking === 'Former') {
            evaluations.push({
                id: 'eval-smoking-former',
                category: 'Tobacco Exposure',
                categoryIcon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
                title: 'Former Smoker & Sustained Vascular Recovery',
                priority: 'optimal',
                priorityLabel: 'Positive Milestone &bull; Ongoing Recovery',
                focusTag: 'Smoke-Free Maintenance',
                noticed: 'Reported smoking status: Former smoker (successfully quit).',
                matters: 'Quitting smoking is one of the most powerful steps for cardiovascular recovery. Over time, arterial compliance improves, endothelial inflammatory markers normalize, and coronary heart disease risk drops toward that of a non-smoker.',
                canDo: 'Maintain your smoke-free commitment, protect your respiratory health from secondhand smoke, and celebrate this major health milestone.',
                nextStep: 'Continue regular preventive checkups to track your ongoing cardiovascular health gains.',
                task: 'Maintain your smoke-free status and avoid environments with heavy secondhand smoke.'
            });
        } else {
            evaluations.push({
                id: 'eval-smoking-never',
                category: 'Tobacco Exposure',
                categoryIcon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
                title: 'Non-Smoker Vascular Protection',
                priority: 'optimal',
                priorityLabel: 'Protective Baseline',
                focusTag: 'Tobacco-Free Protection',
                noticed: 'Reported smoking status: Never smoked.',
                matters: 'Never smoking preserves endothelial cellular health and protects coronary and cerebral blood vessels from combustion-related oxidative stress and thrombosis.',
                canDo: 'Continue avoiding tobacco and nicotine products, including electronic cigarettes, and minimize exposure to secondhand smoke.',
                nextStep: 'Continue standard wellness checkups.',
                task: 'Maintain your lifelong smoke-free status and avoid secondhand smoke exposure.'
            });
        }

        // ---------------------------------------------------------------------
        // Check G: Physical Activity
        // ---------------------------------------------------------------------
        if (activity === 'Low') {
            evaluations.push({
                id: 'eval-activity-low',
                category: 'Physical Activity',
                categoryIcon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
                title: 'Sedentary or Low Physical Activity Level',
                priority: 'high',
                priorityLabel: 'High Priority &bull; Modifiable Habit',
                focusTag: 'Physical Activity Initiation',
                noticed: 'Reported physical activity: Low (< 60 minutes of moderate activity per week).',
                matters: 'Physical inactivity is an independent risk factor for vascular stiffness, reduced endothelial nitric oxide bioavailability, and lower insulin-mediated glucose disposal in skeletal muscle.',
                canDo: 'Start with manageable, comfortable activities such as short 10-15 minute daily walks; take regular movement breaks during prolonged sitting; gradually build toward the guideline recommendation of 150 minutes of moderate aerobic activity weekly according to your current abilities.',
                nextStep: 'If you have been inactive or have chronic health conditions, check in with a healthcare professional before beginning a new moderate-to-vigorous exercise program.',
                task: 'Take a daily 10-minute brisk walk after lunch or dinner, gradually increasing to 20-30 minutes.'
            });
        } else if (activity === 'Moderate') {
            evaluations.push({
                id: 'eval-activity-moderate',
                category: 'Physical Activity',
                categoryIcon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
                title: 'Moderate Regular Physical Activity',
                priority: 'optimal',
                priorityLabel: 'Healthy Habit &bull; Progression',
                focusTag: 'Activity Optimization',
                noticed: 'Reported physical activity: Moderate (60 - 150 minutes per week).',
                matters: 'Consistent moderate movement supports arterial elasticity, raises protective HDL cholesterol, and helps regulate resting blood pressure and metabolic rate.',
                canDo: 'Aim to reach or exceed 150 minutes of moderate aerobic activity weekly, and incorporate 2 sessions of strength/resistance exercise targeting major muscle groups.',
                nextStep: 'Maintain regular activity and track your aerobic stamina over time.',
                task: 'Add 2 weekly resistance or bodyweight training sessions to complement your aerobic activity.'
            });
        } else {
            evaluations.push({
                id: 'eval-activity-high',
                category: 'Physical Activity',
                categoryIcon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
                title: 'High Physical Activity Level',
                priority: 'optimal',
                priorityLabel: 'Optimal Routine &bull; Cardioprotective',
                focusTag: 'High Activity Maintenance',
                noticed: 'Reported physical activity: High (> 150 minutes per week).',
                matters: 'Sustained vigorous/moderate physical activity provides significant cardiovascular conditioning, enhances myocardial capillary density, and maintains low resting heart rates.',
                canDo: 'Maintain your diverse workout routine, ensuring adequate hydration, balanced nutrition, and restorative recovery.',
                nextStep: 'Continue your active lifestyle and routine periodic health screenings.',
                task: 'Maintain your excellent activity regimen and prioritize adequate rest and recovery.'
            });
        }

        // ---------------------------------------------------------------------
        // Check H: Family History of CVD
        // ---------------------------------------------------------------------
        if (familyHistory === 'Yes') {
            evaluations.push({
                id: 'eval-family-history',
                category: 'Cardiovascular Genetics',
                categoryIcon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
                title: 'Family History of Cardiovascular Disease',
                priority: 'moderate',
                priorityLabel: 'Moderate Priority &bull; Genetic Context',
                focusTag: 'Preventive Screening Discussion',
                noticed: 'Reported family history of cardiovascular disease in first-degree relatives: Yes.',
                matters: 'A family history can contribute to cardiovascular risk through shared genetic factors governing lipid metabolism, vascular tone, or inflammatory pathways. However, genetics are not destiny—proactive lifestyle habits and early clinical surveillance provide substantial cardioprotection.',
                canDo: 'Commit to proactive, lifelong modifiable habits: non-smoking, plant-forward nutrition, daily movement, and strict blood pressure and lipid monitoring.',
                nextStep: 'Discuss relevant screening with a healthcare professional (such as early baseline lipid fractions, Lipoprotein(a) [Lp(a)], or a Coronary Artery Calcium [CAC] scan).',
                task: 'Ask your healthcare provider about targeted cardiovascular screening based on your family history.'
            });
        } else {
            evaluations.push({
                id: 'eval-family-optimal',
                category: 'Cardiovascular Genetics',
                categoryIcon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
                title: 'No Reported Family History of Premature CVD',
                priority: 'optimal',
                priorityLabel: 'Favorable Genetic Context',
                focusTag: 'Genetic Baseline',
                noticed: 'Reported family history of cardiovascular disease: No.',
                matters: 'Absence of early family history provides a favorable baseline, though modifiable lifestyle habits and clinical numbers remain the predominant drivers of lifetime vascular wellness.',
                canDo: 'Continue maintaining active, heart-healthy habits.',
                nextStep: 'Routine periodic health surveillance.',
                task: 'Continue regular preventive health checkups.'
            });
        }

        // ---------------------------------------------------------------------
        // Check I: Medication / Clinical Notes
        // ---------------------------------------------------------------------
        if (notes && detectedRedFlags.length === 0) {
            const medKeywords = ['lisinopril', 'amlodipine', 'statin', 'atorvastatin', 'rosuvastatin', 'metformin', 'aspirin', 'losartan', 'metoprolol', 'medication', 'prescribed', 'pill'];
            const mentionsMeds = medKeywords.some(m => notesLower.includes(m));

            if (mentionsMeds) {
                evaluations.push({
                    id: 'eval-notes-meds',
                    category: 'Medication Management',
                    categoryIcon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12h6M12 9v6"/></svg>',
                    title: 'Current Medication Adherence & Safety',
                    priority: 'moderate',
                    priorityLabel: 'Medication Adherence Note',
                    focusTag: 'Medication Consultation',
                    noticed: `Clinical notes record current medication information: "${notes}".`,
                    matters: 'Cardiovascular and metabolic medications are carefully calibrated to manage arterial pressure, circulating sterols, or glucose homeostasis.',
                    canDo: 'Maintain an accurate, up-to-date medication list (including dosages and schedules); use a pill organizer or digital reminder to avoid missed doses.',
                    nextStep: 'Never stop, reduce, or alter your prescribed medication doses based on home questionnaire results without direct physician guidance.',
                    task: 'Maintain an up-to-date medication list and review with your prescribing doctor at every visit.'
                });
            } else {
                evaluations.push({
                    id: 'eval-notes-general',
                    category: 'Patient Reported Notes',
                    categoryIcon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
                    title: 'Clinical Notes Evaluation',
                    priority: 'optimal',
                    priorityLabel: 'Patient History Note',
                    focusTag: 'Clinical Notes Review',
                    noticed: `You noted: "${notes}".`,
                    matters: 'Personal health context, symptoms, or surgical history provide essential clinical nuance when interpreting physiological vital signs.',
                    canDo: 'Keep a personal health journal detailing any changes in stamina or wellbeing.',
                    nextStep: 'Share these clinical notes with your healthcare provider during your next consultation.',
                    task: 'Bring your personal health journal notes to your next appointment.'
                });
            }
        }

        // ---------------------------------------------------------------------
        // Check J: Demographics (Age / Biological Sex)
        // ---------------------------------------------------------------------
        if (age >= 50 || (sex === 'Male' && age >= 45) || (sex === 'Female' && age >= 55)) {
            evaluations.push({
                id: 'eval-demographics',
                category: 'Demographic Context',
                categoryIcon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
                title: 'Age & Sex Cardiovascular Surveillance Context',
                priority: 'optimal',
                priorityLabel: 'Surveillance Guidance',
                focusTag: 'Routine Surveillance',
                noticed: `Evaluated age ${age} years (${sex}).`,
                matters: 'Cardiovascular surveillance guidelines recommend more frequent comprehensive risk evaluations for individuals in this demographic bracket, as vascular wall compliance naturally shifts across decades.',
                canDo: 'Ensure annual checks of blood pressure, full lipid profile, fasting glucose, and kidney function.',
                nextStep: 'Schedule your comprehensive annual cardiovascular wellness evaluation.',
                task: 'Ensure annual comprehensive cardiovascular wellness checkups are maintained.'
            });
        }

        // ---------------------------------------------------------------------
        // Priority Sorting: High Priority -> Moderate Priority -> Optimal Tier
        // ---------------------------------------------------------------------
        const priorityOrder = { 'high': 1, 'moderate': 2, 'optimal': 3 };
        evaluations.sort((a, b) => (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4));

        return evaluations;
    }

    // -------------------------------------------------------------------------
    // 5. Render Patient Telemetry Snapshot Grid
    // -------------------------------------------------------------------------
    function renderTelemetryGrid(data) {
        if (!elTelemetryMetricsGrid) return;

        const basic = data.basic || {};
        const vitals = data.vitals || {};
        const lifestyle = data.lifestyle || {};

        const sys = vitals.systolicBP || '--';
        const dia = vitals.diastolicBP || '--';
        const chol = vitals.cholesterol || '--';
        const sugar = vitals.bloodSugar || '--';
        const bmi = vitals.bmi || '--';
        const age = basic.age || '--';
        const sex = basic.sex || 'Unspecified';
        const smoking = lifestyle.smoking || 'Unspecified';
        const diabetes = lifestyle.diabetes || 'No';
        const activity = lifestyle.activity || 'Unspecified';
        const famHist = lifestyle.familyHistory || 'No';

        // Helper for status badge
        const getBpBadge = (s, d) => {
            if (s === '--') return { text: 'N/A', cls: 'badge-neutral' };
            if (s >= 140 || d >= 90) return { text: 'Stage 2', cls: 'badge-elevated' };
            if (s >= 130 || d >= 80) return { text: 'Stage 1', cls: 'badge-attention' };
            if (s >= 120) return { text: 'Elevated', cls: 'badge-attention' };
            return { text: 'Normal', cls: 'badge-optimal' };
        };

        const getCholBadge = (c) => {
            if (c === '--') return { text: 'N/A', cls: 'badge-neutral' };
            if (c >= 240) return { text: 'High', cls: 'badge-elevated' };
            if (c >= 200) return { text: 'Borderline', cls: 'badge-attention' };
            return { text: 'Desirable', cls: 'badge-optimal' };
        };

        const getSugarBadge = (g, d) => {
            if (d === 'Yes') return { text: 'Diabetes', cls: 'badge-elevated' };
            if (g === '--') return { text: 'N/A', cls: 'badge-neutral' };
            if (g >= 126) return { text: 'Elevated', cls: 'badge-elevated' };
            if (g >= 100) return { text: 'Prediabetes', cls: 'badge-attention' };
            return { text: 'Normal', cls: 'badge-optimal' };
        };

        const getBmiBadge = (b) => {
            if (b === '--') return { text: 'N/A', cls: 'badge-neutral' };
            if (b >= 30) return { text: 'Class I+ Obesity', cls: 'badge-attention' };
            if (b >= 25) return { text: 'Overweight', cls: 'badge-attention' };
            if (b >= 18.5) return { text: 'Normal', cls: 'badge-optimal' };
            return { text: 'Underweight', cls: 'badge-attention' };
        };

        const bpBadge = getBpBadge(sys, dia);
        const cholBadge = getCholBadge(chol);
        const sugarBadge = getSugarBadge(sugar, diabetes);
        const bmiBadge = getBmiBadge(bmi);

        elTelemetryMetricsGrid.innerHTML = `
            <div class="metric-cell">
                <span class="metric-lbl">Demographics</span>
                <span class="metric-val">${age} <span class="metric-unit">YRS</span></span>
                <span class="metric-badge badge-neutral">${sex}</span>
            </div>

            <div class="metric-cell">
                <span class="metric-lbl">Blood Pressure</span>
                <span class="metric-val">${sys}/${dia} <span class="metric-unit">mmHg</span></span>
                <span class="metric-badge ${bpBadge.cls}">${bpBadge.text}</span>
            </div>

            <div class="metric-cell">
                <span class="metric-lbl">Total Cholesterol</span>
                <span class="metric-val">${chol} <span class="metric-unit">mg/dL</span></span>
                <span class="metric-badge ${cholBadge.cls}">${cholBadge.text}</span>
            </div>

            <div class="metric-cell">
                <span class="metric-lbl">Fasting Glucose</span>
                <span class="metric-val">${sugar} <span class="metric-unit">mg/dL</span></span>
                <span class="metric-badge ${sugarBadge.cls}">${sugarBadge.text}</span>
            </div>

            <div class="metric-cell">
                <span class="metric-lbl">Body Mass Index</span>
                <span class="metric-val">${bmi} <span class="metric-unit">kg/m²</span></span>
                <span class="metric-badge ${bmiBadge.cls}">${bmiBadge.text}</span>
            </div>

            <div class="metric-cell">
                <span class="metric-lbl">Smoking Status</span>
                <span class="metric-val" style="font-size:0.88rem;">${smoking}</span>
                <span class="metric-badge ${smoking === 'Current' ? 'badge-elevated' : 'badge-optimal'}">${smoking === 'Current' ? 'Action Needed' : 'Protected'}</span>
            </div>

            <div class="metric-cell">
                <span class="metric-lbl">Physical Activity</span>
                <span class="metric-val" style="font-size:0.88rem;">${activity}</span>
                <span class="metric-badge ${activity === 'Low' ? 'badge-elevated' : 'badge-optimal'}">${activity === 'Low' ? '< 60 m/wk' : 'Active'}</span>
            </div>

            <div class="metric-cell">
                <span class="metric-lbl">Family CVD History</span>
                <span class="metric-val" style="font-size:0.88rem;">${famHist}</span>
                <span class="metric-badge ${famHist === 'Yes' ? 'badge-attention' : 'badge-optimal'}">${famHist === 'Yes' ? 'Risk Factor' : 'No Early History'}</span>
            </div>
        `;
    }

    // -------------------------------------------------------------------------
    // 6. Render Executive Summary & Focus Area Pills
    // -------------------------------------------------------------------------
    function renderExecutiveSummary(evaluations) {
        if (!elFocusPillsRow || !elSummaryStatusBar) return;

        const highPriority = evaluations.filter(e => e.priority === 'high');
        const modPriority = evaluations.filter(e => e.priority === 'moderate');
        const optimal = evaluations.filter(e => e.priority === 'optimal');

        // Focus tags (prioritize high and moderate)
        const focusItems = [...highPriority, ...modPriority];
        if (focusItems.length === 0) {
            // Entirely optimal
            elFocusPillsRow.innerHTML = `
                <div class="focus-pill-tag priority-optimal">
                    <span>&#10003; Baseline Cardiovascular Parameters Optimal</span>
                </div>
                <div class="focus-pill-tag priority-optimal">
                    <span>&#10003; Long-Term Longevity &amp; Habit Preservation</span>
                </div>
            `;
            elSummaryStatusBar.innerHTML = `
                <strong>Healthy Baseline Identified:</strong> All your submitted measurements fall comfortably within desirable reference ranges. No acute risk flags were detected. Your personalized plan below focuses on cardiovascular longevity, nutrition, and ongoing health maintenance.
            `;
            return;
        }

        // Render focus pills
        elFocusPillsRow.innerHTML = focusItems.map(item => `
            <div class="focus-pill-tag priority-${item.priority}">
                <span>&bull;</span>
                <span>${item.focusTag}</span>
            </div>
        `).join('');

        const countText = highPriority.length > 0 
            ? `<span style="color:#ff6b81; font-weight:700;">${highPriority.length} primary focus area${highPriority.length > 1 ? 's' : ''} requiring clinical follow-up</span>`
            : `<span style="color:#ffc93c; font-weight:700;">${modPriority.length} modifiable area${modPriority.length > 1 ? 's' : ''} identified for preventive improvement</span>`;

        elSummaryStatusBar.innerHTML = `
            <strong>Analysis Overview:</strong> Found ${countText} based on your specific submitted readings. High-priority recommendations appear first below, followed by supportive habit improvements.
        `;
    }

    // -------------------------------------------------------------------------
    // 7. Render Recommendation Cards (Strict 4-Quadrant Design)
    // -------------------------------------------------------------------------
    function renderRecommendationCards(evaluations) {
        if (!elRecommendationsStream) return;

        if (elRecommendationsCountTag) {
            elRecommendationsCountTag.textContent = `${evaluations.length} Personalized Recommendations`;
        }

        elRecommendationsStream.innerHTML = evaluations.map((item, index) => `
            <article class="rec-card card-priority-${item.priority}" id="${item.id}" aria-labelledby="heading-${item.id}">
                <!-- Card Header -->
                <div class="rec-card-header">
                    <div class="card-title-group">
                        <div class="card-category-icon" aria-hidden="true">
                            ${item.categoryIcon}
                        </div>
                        <div>
                            <span class="card-sub-category">${item.category}</span>
                            <h3 class="card-heading-title" id="heading-${item.id}">${item.title}</h3>
                        </div>
                    </div>
                    <span class="card-priority-badge badge-priority-${item.priority}">
                        ${item.priorityLabel}
                    </span>
                </div>

                <!-- 4 Obligatory Sections Grid -->
                <div class="rec-card-quadrant">
                    <!-- 1. What We Noticed -->
                    <div class="quadrant-box">
                        <div class="box-label-row">
                            <span class="box-icon icon-noticed">1</span>
                            <h4 class="box-label-title">WHAT WE NOTICED</h4>
                        </div>
                        <p class="box-content-text">
                            ${item.noticed}
                        </p>
                    </div>

                    <!-- 2. Why It Matters -->
                    <div class="quadrant-box">
                        <div class="box-label-row">
                            <span class="box-icon icon-matters">2</span>
                            <h4 class="box-label-title">WHY IT MATTERS</h4>
                        </div>
                        <p class="box-content-text">
                            ${item.matters}
                        </p>
                    </div>

                    <!-- 3. What You Can Do -->
                    <div class="quadrant-box">
                        <div class="box-label-row">
                            <span class="box-icon icon-action">3</span>
                            <h4 class="box-label-title">WHAT YOU CAN DO</h4>
                        </div>
                        <p class="box-content-text">
                            ${item.canDo}
                        </p>
                    </div>

                    <!-- 4. Your Next Step -->
                    <div class="quadrant-box">
                        <div class="box-label-row">
                            <span class="box-icon icon-next">4</span>
                            <h4 class="box-label-title">YOUR NEXT STEP</h4>
                        </div>
                        <p class="box-content-text">
                            ${item.nextStep}
                        </p>
                    </div>
                </div>

                <!-- Card Bottom Checkbox Action Strip -->
                <div class="rec-card-action-bar">
                    <label class="quick-task-label">
                        <input type="checkbox" class="task-checkbox-custom card-action-checkbox" data-task-id="${item.id}" id="check-${item.id}">
                        <span class="task-checked-text"><strong>Action Item:</strong> ${item.task}</span>
                    </label>
                </div>
            </article>
        `).join('');

        // Wire up card action checkboxes to synchronize with action plan checklist
        document.querySelectorAll('.card-action-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const taskId = e.target.getAttribute('data-task-id');
                toggleChecklistTask(taskId, e.target.checked);
            });
        });
    }

    // -------------------------------------------------------------------------
    // 8. Interactive Action Plan Checklist Logic
    // -------------------------------------------------------------------------
    function buildChecklistTasks(evaluations) {
        return evaluations.map(e => ({
            id: e.id,
            category: e.category,
            text: e.task,
            priority: e.priority
        }));
    }

    function getSavedChecklistState() {
        try {
            const raw = sessionStorage.getItem('tsvp_action_checklist_state');
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function saveChecklistState(state) {
        try {
            sessionStorage.setItem('tsvp_action_checklist_state', JSON.stringify(state));
        } catch (e) {
            console.warn('Could not save checklist state:', e);
        }
    }

    function renderChecklist(tasks) {
        if (!elChecklistItemsGrid) return;
        currentChecklistTasks = tasks;
        const savedState = getSavedChecklistState();

        elChecklistItemsGrid.innerHTML = tasks.map(task => {
            const isChecked = !!savedState[task.id];
            return `
                <div class="checklist-item-card ${isChecked ? 'is-completed' : ''}" id="checklist-card-${task.id}">
                    <input type="checkbox" class="task-checkbox-custom main-checklist-cb" data-task-id="${task.id}" ${isChecked ? 'checked' : ''} id="main-cb-${task.id}">
                    <div class="item-content">
                        <div class="item-category-tag">${task.category}</div>
                        <p class="item-text">${task.text}</p>
                    </div>
                </div>
            `;
        }).join('');

        // Sync card action checkboxes
        tasks.forEach(task => {
            const cardCb = document.getElementById(`check-${task.id}`);
            if (cardCb) cardCb.checked = !!savedState[task.id];
        });

        // Attach event listeners
        document.querySelectorAll('.main-checklist-cb').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const taskId = e.target.getAttribute('data-task-id');
                toggleChecklistTask(taskId, e.target.checked);
            });
        });

        // Also make whole card clickable
        document.querySelectorAll('.checklist-item-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.tagName.toLowerCase() === 'input') return;
                const cb = card.querySelector('.main-checklist-cb');
                if (cb) {
                    cb.checked = !cb.checked;
                    toggleChecklistTask(cb.getAttribute('data-task-id'), cb.checked);
                }
            });
        });

        updateChecklistProgress();
    }

    function toggleChecklistTask(taskId, isChecked) {
        const state = getSavedChecklistState();
        if (isChecked) {
            state[taskId] = true;
        } else {
            delete state[taskId];
        }
        saveChecklistState(state);

        // Update main checklist UI
        const mainCb = document.getElementById(`main-cb-${taskId}`);
        if (mainCb) mainCb.checked = isChecked;

        const cardContainer = document.getElementById(`checklist-card-${taskId}`);
        if (cardContainer) {
            cardContainer.classList.toggle('is-completed', isChecked);
        }

        // Update rec-card action checkbox
        const cardCb = document.getElementById(`check-${taskId}`);
        if (cardCb) cardCb.checked = isChecked;

        updateChecklistProgress();
    }

    function updateChecklistProgress() {
        if (!elChecklistProgressText || !elChecklistProgressFill) return;
        const state = getSavedChecklistState();
        const total = currentChecklistTasks.length;
        if (total === 0) return;

        let completed = 0;
        currentChecklistTasks.forEach(t => {
            if (state[t.id]) completed++;
        });

        const percent = Math.round((completed / total) * 100);
        elChecklistProgressText.textContent = `${completed} of ${total} actions completed &bull; ${percent}%`;
        elChecklistProgressFill.style.width = `${percent}%`;

        if (elChecklistProgressBarTrack) {
            elChecklistProgressBarTrack.setAttribute('aria-valuenow', percent);
        }
    }

    if (elBtnResetChecklist) {
        elBtnResetChecklist.addEventListener('click', () => {
            saveChecklistState({});
            document.querySelectorAll('.main-checklist-cb').forEach(cb => cb.checked = false);
            document.querySelectorAll('.card-action-checkbox').forEach(cb => cb.checked = false);
            document.querySelectorAll('.checklist-item-card').forEach(c => c.classList.remove('is-completed'));
            updateChecklistProgress();
            showToast('Checklist reset.');
        });
    }

    // -------------------------------------------------------------------------
    // 9. Questions to Ask Your Healthcare Professional
    // -------------------------------------------------------------------------
    function generateDoctorQuestions(data) {
        const questions = [];
        const vitals = data.vitals || {};
        const lifestyle = data.lifestyle || {};

        const sys = Number(vitals.systolicBP);
        const dia = Number(vitals.diastolicBP);
        const chol = Number(vitals.cholesterol);
        const sugar = Number(vitals.bloodSugar);
        const bmi = Number(vitals.bmi);

        // BP
        if (sys >= 130 || dia >= 80) {
            questions.push({
                flag: `Blood Pressure (${sys}/${dia} mmHg)`,
                text: `Given my home blood pressure readings around ${sys}/${dia} mmHg, what is my ideal target blood pressure, and should we consider 24-hour ambulatory monitoring or diagnostic confirmation?`
            });
        } else {
            questions.push({
                flag: 'Blood Pressure Maintenance',
                text: 'How frequently should I track my blood pressure at home to ensure it remains in this optimal range as I age?'
            });
        }

        // Cholesterol
        if (chol >= 200) {
            questions.push({
                flag: `Lipid Profile (${chol} mg/dL)`,
                text: `Would checking an advanced lipid panel—including Apolipoprotein B (ApoB), Lipoprotein(a) [Lp(a)], and LDL particle number—give us a clearer picture of my atherogenic plaque risk than Total Cholesterol alone?`
            });
        } else {
            questions.push({
                flag: 'Lipid Health',
                text: 'Is my current full lipid fraction balance (LDL, HDL, triglycerides) as favorable as my total cholesterol reading suggests?'
            });
        }

        // Glucose / Diabetes
        if (lifestyle.diabetes === 'Yes' || sugar >= 100) {
            questions.push({
                flag: `Glycemic Control (${sugar} mg/dL fasting)`,
                text: `Would you recommend ordering an updated laboratory HbA1c test and discussing tailored carbohydrate targets to keep my cardiovascular risk as low as possible?`
            });
        }

        // Family History
        if (lifestyle.familyHistory === 'Yes') {
            questions.push({
                flag: 'Family CVD History',
                text: 'Considering my family history of early cardiovascular disease, would a Coronary Artery Calcium (CAC) scan or earlier non-invasive screening be helpful in my preventive plan?'
            });
        }

        // Smoking
        if (lifestyle.smoking === 'Current') {
            questions.push({
                flag: 'Smoking Cessation',
                text: 'What evidence-based cessation aids, prescription therapies, or counseling programs do you recommend to help me quit permanently and protect my heart?'
            });
        }

        // Physical Activity / BMI
        if (lifestyle.activity === 'Low' || bmi >= 28) {
            questions.push({
                flag: 'Exercise & Weight Support',
                text: 'Are there any specific heart-rate limits or precautions I should observe as I ramp up from a sedentary baseline to 150 minutes of moderate aerobic activity weekly?'
            });
        }

        // Standard Universal Catch-all
        questions.push({
            flag: 'Holistic Prevention',
            text: 'Based on my combined measurements today, what is the single highest-yield lifestyle change I can make this month to protect my vascular health?'
        });

        return questions;
    }

    function renderDoctorQuestions(questions) {
        if (!elQuestionsList) return;
        elQuestionsList.innerHTML = questions.map((q, i) => `
            <li class="question-item">
                <strong>Question ${i + 1}:</strong> "${q.text}"
                <span class="question-flag-note">Triggered by: ${q.flag}</span>
            </li>
        `).join('');
    }

    if (elBtnCopyQuestions) {
        elBtnCopyQuestions.addEventListener('click', () => {
            const questions = generateDoctorQuestions(currentProfile);
            const textToCopy = questions.map((q, i) => `${i + 1}. [${q.flag}] ${q.text}`).join('\n\n');

            navigator.clipboard.writeText(textToCopy).then(() => {
                showToast('Questions copied to clipboard!');
                if (elBtnCopyQuestionsText) {
                    const original = elBtnCopyQuestionsText.textContent;
                    elBtnCopyQuestionsText.textContent = 'COPIED!';
                    setTimeout(() => {
                        elBtnCopyQuestionsText.textContent = original;
                    }, 2000);
                }
            }).catch(err => {
                console.warn('Clipboard copy failed:', err);
                showToast('Could not access clipboard.');
            });
        });
    }

    // -------------------------------------------------------------------------
    // 10. Print / Export Action
    // -------------------------------------------------------------------------
    if (elBtnPrintPlan) {
        elBtnPrintPlan.addEventListener('click', () => {
            window.print();
        });
    }

    // -------------------------------------------------------------------------
    // 11. Toast Feedback Helper
    // -------------------------------------------------------------------------
    function showToast(message) {
        if (!elToast) return;
        elToast.textContent = message;
        elToast.hidden = false;
        setTimeout(() => {
            elToast.hidden = true;
        }, 3000);
    }

    // -------------------------------------------------------------------------
    // 12. Helper to Map Backend Recommendations to Card Evaluator Format
    // -------------------------------------------------------------------------
    function getCategoryIcon(category) {
        const cat = (category || '').toLowerCase();
        if (cat.includes('pressure') || cat.includes('hemodynamic')) {
            return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>';
        } else if (cat.includes('lipid') || cat.includes('cholesterol')) {
            return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';
        } else if (cat.includes('glucose') || cat.includes('sugar') || cat.includes('metabolic') || cat.includes('glycem')) {
            return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>';
        } else if (cat.includes('weight') || cat.includes('bmi') || cat.includes('mass') || cat.includes('anthropometric')) {
            return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></svg>';
        } else if (cat.includes('tobacco') || cat.includes('smoking')) {
            return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        } else if (cat.includes('activity') || cat.includes('exercise')) {
            return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
        } else if (cat.includes('genetic') || cat.includes('family') || cat.includes('hereditary')) {
            return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>';
        } else if (cat.includes('safety') || cat.includes('alert') || cat.includes('warning') || cat.includes('symptom')) {
            return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
        } else {
            return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>';
        }
    }

    function mapBackendRecommendations(backendRecs, backendRiskFactors = []) {
        return backendRecs.map((rec, index) => {
            const p = (rec.priority || '').toLowerCase();
            const priorityKey = (p === 'high' || p === 'urgent' || p === 'alert')
                ? 'high'
                : (p === 'moderate' || p === 'elevated' || p === 'advisory' ? 'moderate' : 'optimal');

            const priorityLabel = (priorityKey === 'high')
                ? 'High Priority • Action Needed'
                : (priorityKey === 'moderate' ? 'Moderate Priority • Preventive' : 'Routine • Maintenance');

            const category = rec.category || 'Cardiovascular Wellness';
            const categoryLower = category.toLowerCase();
            const titleLower = (rec.title || '').toLowerCase();

            // Match risk factor explanation for contextual "Why It Matters" quadrant
            const matchedRf = backendRiskFactors.find(rf => {
                const rfCat = (rf.category || '').toLowerCase();
                const rfFac = (rf.factor || '').toLowerCase();
                return rfCat.includes(categoryLower) || categoryLower.includes(rfCat) ||
                       titleLower.includes(rfFac) || rfFac.includes(categoryLower);
            });

            const mattersText = matchedRf?.educational_explanation ||
                `Addressing ${category.toLowerCase()} considerations supports arterial endothelial health, balanced systemic vascular resistance, and long-term myocardial workload efficiency.`;

            return {
                id: `eval-backend-${index + 1}`,
                category: category,
                categoryIcon: getCategoryIcon(category),
                title: rec.title,
                priority: priorityKey,
                priorityLabel: priorityLabel,
                focusTag: category,
                noticed: rec.reason,
                matters: mattersText,
                canDo: rec.practical_action,
                nextStep: rec.professional_followup || 'Discuss these educational observations with your healthcare provider during routine follow-up.',
                task: rec.practical_action
            };
        });
    }

    // -------------------------------------------------------------------------
    // 13. Profile Switcher & Controller Coordinator
    // -------------------------------------------------------------------------
    function applyProfile(profileData, keyName) {
        currentProfile = profileData;
        activePresetKey = keyName;

        // Update Source Tag
        if (elTelemetrySourceLabel && elTelemetrySourceDot) {
            if (keyName === 'submitted') {
                if (profileData.isDemoFallback && !savedBackendAnalysis) {
                    elTelemetrySourceLabel.textContent = 'REPRESENTATIVE PATIENT TELEMETRY';
                    elTelemetrySourceDot.className = 'source-indicator indicator-preset';
                    if (elTelemetryNotice) elTelemetryNotice.hidden = false;
                } else {
                    elTelemetrySourceLabel.textContent = savedBackendAnalysis
                        ? 'ACTUAL SUBMITTED PATIENT TELEMETRY (BACKEND ANALYZED)'
                        : 'ACTUAL SUBMITTED PATIENT TELEMETRY';
                    elTelemetrySourceDot.className = 'source-indicator';
                    if (elTelemetryNotice) elTelemetryNotice.hidden = true;
                }
            } else {
                elTelemetrySourceLabel.textContent = `TEST PROFILE EVALUATED (${keyName.toUpperCase()})`;
                elTelemetrySourceDot.className = 'source-indicator indicator-preset';
                if (elTelemetryNotice) elTelemetryNotice.hidden = true;
            }
        }

        // Highlight Active Pill
        [btnProfileSubmitted, btnProfileElevated, btnProfileOptimal, btnProfileMetabolic].forEach(btn => {
            if (btn) btn.classList.remove('active');
        });
        if (keyName === 'submitted' && btnProfileSubmitted) btnProfileSubmitted.classList.add('active');
        if (keyName === 'elevated' && btnProfileElevated) btnProfileElevated.classList.add('active');
        if (keyName === 'optimal' && btnProfileOptimal) btnProfileOptimal.classList.add('active');
        if (keyName === 'metabolic' && btnProfileMetabolic) btnProfileMetabolic.classList.add('active');

        // Check for Emergency Red Flags (via clinical notes or backend alerts)
        const notes = (profileData.notes || '').toLowerCase();
        const redFlags = ['chest pain', 'angina', 'tightness', 'crushing', 'radiating', 'shortness of breath', 'syncope', 'fainting'];
        let hasRedFlags = redFlags.some(rf => notes.includes(rf));
        if (keyName === 'submitted' && savedBackendAnalysis && Array.isArray(savedBackendAnalysis.recommendations)) {
            const hasBackendAlert = savedBackendAnalysis.recommendations.some(r => 
                (r.category || '').toLowerCase().includes('safety') || (r.title || '').toLowerCase().includes('immediate')
            );
            if (hasBackendAlert) hasRedFlags = true;
        }

        if (elEmergencyAlertSection) {
            elEmergencyAlertSection.hidden = !hasRedFlags;
        }

        // Render Telemetry Ribbon
        renderTelemetryGrid(profileData);

        // Render Backend Recommendations if present on submitted telemetry, otherwise fallback to frontend rule evaluation
        if (keyName === 'submitted' && savedBackendAnalysis && Array.isArray(savedBackendAnalysis.recommendations) && savedBackendAnalysis.recommendations.length > 0) {
            currentEvaluations = mapBackendRecommendations(savedBackendAnalysis.recommendations, savedBackendAnalysis.risk_factors || []);
        } else {
            currentEvaluations = evaluatePatientTelemetry(profileData);
        }

        // Render Executive Summary
        renderExecutiveSummary(currentEvaluations);

        // Render Recommendation Cards
        renderRecommendationCards(currentEvaluations);

        // Render Checklist
        const tasks = buildChecklistTasks(currentEvaluations);
        renderChecklist(tasks);

        // Render Questions for Doctor
        const questions = generateDoctorQuestions(profileData);
        renderDoctorQuestions(questions);
    }

    // Attach Switcher Event Listeners
    if (btnProfileSubmitted) {
        btnProfileSubmitted.addEventListener('click', () => {
            applyProfile(submittedTelemetry, 'submitted');
            showToast('Loaded patient profile data.');
        });
    }

    if (btnProfileElevated) {
        btnProfileElevated.addEventListener('click', () => {
            applyProfile(PRESET_PROFILES.elevated, 'elevated');
            showToast('Loaded Elevated Risk test profile.');
        });
    }

    if (btnProfileOptimal) {
        btnProfileOptimal.addEventListener('click', () => {
            applyProfile(PRESET_PROFILES.optimal, 'optimal');
            showToast('Loaded Optimal / Normal test profile.');
        });
    }

    if (btnProfileMetabolic) {
        btnProfileMetabolic.addEventListener('click', () => {
            applyProfile(PRESET_PROFILES.metabolic, 'metabolic');
            showToast('Loaded Prediabetes & BMI test profile.');
        });
    }

    // -------------------------------------------------------------------------
    // 13. Initialization
    // -------------------------------------------------------------------------
    loadSavedTelemetry();
    applyProfile(submittedTelemetry, 'submitted');

})();
