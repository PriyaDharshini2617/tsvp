/**
 * TSVP — The Smart Vascular Predictor
 * Page 3: 3D Cardiovascular Visualization Controller
 */

(function () {
    'use strict';

    // -------------------------------------------------------------------------
    // 1. Data Store & State
    // -------------------------------------------------------------------------
    let patientData = null;
    let scene, camera, renderer, controls;
    let externalModel = null;
    let internalModel = null;
    let currentModel = null;
    let currentViewMode = 'external'; // 'external' | 'internal'
    let highlightBeacon = null;
    let structureMaterials = new Map();
    let isAutoRotating = true;

    // Anatomical structure coordinate anchors (normalized to centered model space)
    const STRUCTURE_ANCHORS = {
        'all': { pos: [0, 0, 0], zoom: 5.0 },
        'aorta': { pos: [0.15, 0.85, -0.05], zoom: 3.8 },
        'pulmonary_artery': { pos: [-0.25, 0.65, 0.35], zoom: 3.8 },
        'superior_vena_cava': { pos: [0.65, 0.8, -0.25], zoom: 3.8 },
        'inferior_vena_cava': { pos: [0.55, -0.65, -0.25], zoom: 3.8 },
        'pulmonary_veins': { pos: [-0.65, 0.35, -0.45], zoom: 3.8 },
        'arteries': { pos: [0.0, 0.2, 0.6], zoom: 4.0 },
        'veins': { pos: [0.45, 0.1, -0.3], zoom: 4.0 },
        'chambers': { pos: [0.0, -0.2, 0.1], zoom: 3.5, requiresInternal: true },
        'valves': { pos: [0.05, 0.15, 0.0], zoom: 3.2, requiresInternal: true },
        'capillaries': { pos: [0, 0, 0], zoom: 5.0, showInset: true }
    };

    // Educational Descriptions per structure
    const STRUCTURE_INFO = {
        'all': {
            title: 'Whole Heart (Cor)',
            desc: 'The human heart is a four-chambered muscular organ that circulates blood throughout the body. Deoxygenated blood returns from systemic tissues through the venae cavae into the right atrium, passes into the right ventricle, and is pumped to the lungs for oxygenation. Oxygenated blood returns through pulmonary veins into the left atrium, moves to the left ventricle, and is forcefully ejected through the aorta to sustain systemic perfusion.'
        },
        'aorta': {
            title: 'Aorta (Ascending & Arch)',
            desc: 'The aorta is the largest artery in the human body, arising directly from the left ventricle. It receives high-pressure oxygenated blood during cardiac systole. The ascending aorta arches superiorly, giving rise to the brachiocephalic, left common carotid, and left subclavian arteries before descending into the thoracic and abdominal cavities.'
        },
        'pulmonary_artery': {
            title: 'Pulmonary Artery (Pulmonary Trunk)',
            desc: 'Arising from the right ventricle through the pulmonary semilunar valve, the pulmonary trunk branches into left and right pulmonary arteries. It is the only arterial vessel in adult human anatomy that carries deoxygenated blood, transporting it into the pulmonary capillary beds for gas exchange.'
        },
        'superior_vena_cava': {
            title: 'Superior Vena Cava (SVC)',
            desc: 'A large, thin-walled venous vessel that drains deoxygenated blood from the head, neck, upper extremities, and upper thorax directly into the superior aspect of the right atrium under low hydrostatic pressure.'
        },
        'inferior_vena_cava': {
            title: 'Inferior Vena Cava (IVC)',
            desc: 'The largest vein in the human body. It transports deoxygenated venous blood from the lower extremities, pelvic viscera, and abdominal organs up through the diaphragm into the postero-inferior aspect of the right atrium.'
        },
        'pulmonary_veins': {
            title: 'Pulmonary Veins (4 Vessels)',
            desc: 'Four pulmonary veins (two right, two left) transport freshly oxygenated blood from the pulmonary alveolar beds back to the posterior wall of the left atrium. These are the only veins in the adult body carrying oxygen-rich blood.'
        },
        'chambers': {
            title: 'Heart Chambers (Atria & Ventricles)',
            desc: 'The heart is divided into four distinct chambers: Right and Left Atria (thin-walled receiving chambers separated by the interatrial septum) and Right and Left Ventricles (thick-walled muscular pumping chambers separated by the interventricular septum). The left ventricle features substantially thicker myocardium to generate systemic arterial pressures.'
        },
        'valves': {
            title: 'Heart Valves (Atrioventricular & Semilunar)',
            desc: 'Four cardiac valves enforce unidirectional laminar blood flow: the Tricuspid (right AV) and Mitral (left AV, bicuspid) valves prevent ventricular regurgitation during systole; the Aortic and Pulmonary semilunar valves prevent diastolic backflow from the great outflow vessels.'
        },
        'arteries': {
            title: 'Arteries & Coronary Vascular Tree',
            desc: 'Arteries are thick, elastic conduit vessels that transport blood away from the heart under pulsatile pressure. The coronary arteries (left anterior descending, circumflex, and right coronary) originate at the aortic sinuses to supply the myocardium itself with oxygenated blood.'
        },
        'veins': {
            title: 'Systemic & Cardiac Veins',
            desc: 'Veins are capacitance vessels containing unidirectional venous valves that return deoxygenated blood back to the heart under low pressure. Deoxygenated myocardial blood collects into cardiac veins that drain into the coronary sinus before entering the right atrium.'
        },
        'capillaries': {
            title: 'Capillaries (Microvascular Network)',
            desc: 'Capillaries are microscopic vessels (5–10 μm diameter) consisting of a single layer of endothelial cells and basement membrane. They form an extensive microvascular exchange bed within all myocardial and body tissues, enabling oxygen, nutrient, and metabolite diffusion.'
        }
    };

    // -------------------------------------------------------------------------
    // 2. Telemetry Ingestion & Personalized Health Factors
    // -------------------------------------------------------------------------
    function initPatientTelemetry() {
        const raw = sessionStorage.getItem('tsvp_patient_telemetry') || 
                    sessionStorage.getItem('tsvp_patient_data');
        if (raw) {
            try {
                patientData = JSON.parse(raw);
            } catch (e) {
                console.warn('Failed to parse patient telemetry:', e);
            }
        }

        // If patient telemetry not directly found, check if tsvp_analysis_result contains validated_patient_data
        if (!patientData) {
            try {
                const rawAnalysis = sessionStorage.getItem('tsvp_analysis_result');
                if (rawAnalysis) {
                    const parsedAnalysis = JSON.parse(rawAnalysis);
                    if (parsedAnalysis && parsedAnalysis.validated_patient_data) {
                        patientData = parsedAnalysis.validated_patient_data;
                    }
                }
            } catch (err) {
                console.warn('Error reading validated_patient_data fallback:', err);
            }
        }

        // Fallback default sample if user navigates directly without submitting Page 2
        if (!patientData) {
            patientData = {
                isSampleBaseline: true,
                basic: { age: 52, sex: 'Sample Reference (Male)' },
                vitals: {
                    systolicBP: 128,
                    diastolicBP: 82,
                    cholesterol: 215,
                    cholesterolUnit: 'mg/dL',
                    bloodSugar: 98,
                    bloodSugarUnit: 'mg/dL',
                    bmi: 26.2
                },
                lifestyle: {
                    smoking: 'Former',
                    diabetes: 'No',
                    activity: 'Moderate',
                    familyHistory: 'Yes'
                },
                notes: 'Reference clinical profile for educational visualization demonstration.'
            };
        }

        renderTelemetryBanner(patientData);
        renderHealthFactors(patientData);
        renderExplanationData(patientData);
    }

    function renderTelemetryBanner(data) {
        const pillsRow = document.getElementById('telemetryPillsRow');
        const modeBadge = document.getElementById('telemetryModeBadge');

        if (modeBadge) {
            if (data.isSampleBaseline) {
                modeBadge.textContent = 'SAMPLE REFERENCE DATA (VISIT PAGE 2 TO ENTER YOURS)';
                modeBadge.style.borderColor = '#ffb703';
                modeBadge.style.color = '#ffc93c';
            } else {
                modeBadge.textContent = 'VERIFIED PATIENT DATA LOADED (FROM PAGE 2)';
                modeBadge.style.borderColor = '#00f3ff';
                modeBadge.style.color = '#38edff';
            }
        }

        if (pillsRow) {
            const age = data.basic?.age || data.age || '--';
            const sex = data.basic?.sex || data.sex || '--';
            const sys = data.vitals?.systolicBP || data.systolicBP || '--';
            const dia = data.vitals?.diastolicBP || data.diastolicBP || '--';
            const chol = data.vitals?.cholesterol || data.cholesterol || '--';
            const cholUnit = data.vitals?.cholesterolUnit || data.cholesterolUnit || 'mg/dL';
            const sugar = data.vitals?.bloodSugar || data.bloodSugar || '--';
            const sugarUnit = data.vitals?.bloodSugarUnit || data.bloodSugarUnit || 'mg/dL';
            const bmi = data.vitals?.bmi || data.bmi || '--';
            const smoking = data.lifestyle?.smoking || data.smoking || '--';
            const activity = data.lifestyle?.activity || data.activity || '--';

            pillsRow.innerHTML = `
                <span class="telemetry-pill"><strong>AGE:</strong> ${age} YRS</span>
                <span class="telemetry-pill"><strong>SEX:</strong> ${sex}</span>
                <span class="telemetry-pill"><strong>BP:</strong> ${sys}/${dia} mmHg</span>
                <span class="telemetry-pill"><strong>CHOL:</strong> ${chol} ${cholUnit}</span>
                <span class="telemetry-pill"><strong>GLUCOSE:</strong> ${sugar} ${sugarUnit}</span>
                <span class="telemetry-pill"><strong>BMI:</strong> ${bmi} kg/m²</span>
                <span class="telemetry-pill"><strong>SMOKING:</strong> ${smoking}</span>
                <span class="telemetry-pill"><strong>ACTIVITY:</strong> ${activity}</span>
            `;
        }
    }

    function renderHealthFactors(data) {
        const listContainer = document.getElementById('factorsScrollList');
        if (!listContainer) return;

        const cards = [];

        // 1. Attempt to read and parse actual backend response from sessionStorage
        let backendAnalysis = null;
        try {
            const rawAnalysis = sessionStorage.getItem('tsvp_analysis_result');
            if (rawAnalysis) {
                const parsed = JSON.parse(rawAnalysis);
                if (parsed && Array.isArray(parsed.risk_factors) && parsed.risk_factors.length > 0) {
                    backendAnalysis = parsed;
                }
            }
        } catch (e) {
            console.warn('Could not parse backend analysis result from sessionStorage:', e);
        }

        if (backendAnalysis) {
            // Render actual backend response risk_factors
            const vitals = data.vitals || (backendAnalysis.validated_patient_data ? backendAnalysis.validated_patient_data.vitals : {}) || {};
            const lifestyle = data.lifestyle || (backendAnalysis.validated_patient_data ? backendAnalysis.validated_patient_data.lifestyle : {}) || {};

            const sys = vitals.systolicBP || vitals.systolic_bp || data.systolicBP || '--';
            const dia = vitals.diastolicBP || vitals.diastolic_bp || data.diastolicBP || '--';
            const chol = vitals.cholesterol || data.cholesterol || '--';
            const cholUnit = vitals.cholesterolUnit || vitals.cholesterol_unit || data.cholesterolUnit || 'mg/dL';
            const sugar = vitals.bloodSugar || vitals.blood_sugar || data.bloodSugar || '--';
            const sugarUnit = vitals.bloodSugarUnit || vitals.blood_sugar_unit || data.bloodSugarUnit || 'mg/dL';
            const bmi = vitals.bmi || data.bmi || '--';
            const smoking = lifestyle.smoking || data.smoking || '--';
            const diabetes = lifestyle.diabetes || data.diabetes || 'No';
            const activity = lifestyle.activity || lifestyle.physical_activity || data.activity || '--';
            const familyHistory = lifestyle.familyHistory || lifestyle.family_history || data.familyHistory || 'No';

            backendAnalysis.risk_factors.forEach(rf => {
                const factorLower = (rf.factor || '').toLowerCase();
                const sev = (rf.severity || '').toLowerCase();

                let statusColor = 'cyan';
                if (sev === 'high' || sev === 'alert') {
                    statusColor = 'red';
                } else if (sev === 'elevated' || sev === 'advisory' || sev === 'moderate') {
                    statusColor = 'amber';
                }

                let displayVal = '';
                let targetStructure = 'all';
                let schematicNote = rf.category ? `Schematic: ${rf.category} model` : 'Schematic Cardiovascular Model';

                if (factorLower.includes('blood pressure') || factorLower.includes('hemodynamic')) {
                    displayVal = `${sys}/${dia} mmHg`;
                    targetStructure = 'arteries';
                    schematicNote = 'Schematic: Arterial wall tension & afterload model';
                } else if (factorLower.includes('cholesterol') || factorLower.includes('lipid')) {
                    displayVal = `${chol} ${cholUnit}`;
                    targetStructure = 'arteries';
                    schematicNote = 'Schematic: Endothelial lipid transport model';
                } else if (factorLower.includes('sugar') || factorLower.includes('glucose') || factorLower.includes('glycem')) {
                    displayVal = `${sugar} ${sugarUnit}${diabetes === 'Yes' ? ' (Diabetes: Yes)' : ''}`;
                    targetStructure = 'capillaries';
                    schematicNote = 'Schematic: Microvascular capillary bed resilience';
                } else if (factorLower.includes('mass') || factorLower.includes('bmi')) {
                    displayVal = `${bmi} kg/m²`;
                    targetStructure = 'chambers';
                    schematicNote = 'Schematic: Cardiac output & chamber workload';
                } else if (factorLower.includes('tobacco') || factorLower.includes('smok')) {
                    displayVal = smoking;
                    targetStructure = 'arteries';
                    schematicNote = 'Schematic: Arterial endothelial compliance';
                } else if (factorLower.includes('activity')) {
                    displayVal = activity;
                    targetStructure = 'all';
                    schematicNote = 'Schematic: Myocardial endurance & collateral flow';
                } else if (factorLower.includes('family')) {
                    displayVal = familyHistory;
                    targetStructure = 'all';
                    schematicNote = 'Note: Genetic background factor (not an anatomical defect)';
                } else {
                    displayVal = rf.status;
                    targetStructure = 'all';
                }

                cards.push({
                    name: rf.factor,
                    status: statusColor,
                    badge: rf.status,
                    value: displayVal,
                    explanation: rf.educational_explanation,
                    targetStructure: targetStructure,
                    schematicNote: schematicNote
                });
            });

            // Render backend educational explanations into #expGeneralEdu
            const expGeneralEdu = document.getElementById('expGeneralEdu');
            if (expGeneralEdu && Array.isArray(backendAnalysis.educational_explanations) && backendAnalysis.educational_explanations.length > 0) {
                expGeneralEdu.innerHTML = backendAnalysis.educational_explanations
                    .map(exp => `<p style="margin-bottom:0.75rem;">${exp}</p>`)
                    .join('');
            }
        } else {
            // FALLBACK TO EXISTING FRONTEND CALCULATIONS IF NO VALID BACKEND RESPONSE
            const vitals = data.vitals || {};
            const lifestyle = data.lifestyle || {};

            // 1. Blood Pressure Analysis
            const sys = vitals.systolicBP || 120;
            const dia = vitals.diastolicBP || 80;
            let bpStatus = 'cyan';
            let bpLabel = 'Optimal Reading';
            let bpDesc = 'Blood pressure is within optimal physiological limits (<120/80 mmHg), supporting healthy arterial wall compliance and minimizing left ventricular afterload.';

            if (sys >= 140 || dia >= 90) {
                bpStatus = 'red';
                bpLabel = 'Stage 2 Elevated Range';
                bpDesc = 'Persistent elevations in this range exert increased lateral mechanical pressure against arterial endothelium, increasing the cardiac workload required to eject blood from the left ventricle.';
            } else if (sys >= 130 || dia >= 80) {
                bpStatus = 'amber';
                bpLabel = 'Stage 1 Elevated Range';
                bpDesc = 'Measurements in this category reflect elevated systemic resistance, indicating that vascular walls experience higher pulsatile strain over time.';
            } else if (sys >= 120 && dia < 80) {
                bpStatus = 'amber';
                bpLabel = 'Elevated Systolic Range';
                bpDesc = 'Systolic pressure is slightly above ideal baseline, suggesting early arterial stiffness considerations without meeting hypertensive criteria.';
            }

            cards.push({
                name: 'Blood Pressure',
                status: bpStatus,
                badge: bpLabel,
                value: `${sys}/${dia} mmHg`,
                explanation: bpDesc,
                targetStructure: 'arteries',
                schematicNote: 'Schematic: Arterial wall tension & afterload model'
            });

            // 2. Cholesterol Analysis
            const chol = vitals.cholesterol || 190;
            let cholStatus = 'cyan';
            let cholLabel = 'Desirable Range';
            let cholDesc = 'Total serum cholesterol (<200 mg/dL) supports healthy lipid metabolism without elevated atherogenic particle concentrations in circulation.';

            if (chol >= 240) {
                cholStatus = 'red';
                cholLabel = 'High Cholesterol Range';
                cholDesc = 'Higher circulating levels can contribute to long-term lipid accumulation within coronary and systemic arterial tunica intima over many years.';
            } else if (chol >= 200) {
                cholStatus = 'amber';
                cholLabel = 'Borderline Elevated Range';
                cholDesc = 'Borderline concentrations (200–239 mg/dL) warrant dietary and lifestyle attention to support endothelial cell health and prevent atheroma formation.';
            }

            cards.push({
                name: 'Total Cholesterol',
                status: cholStatus,
                badge: cholLabel,
                value: `${chol} mg/dL`,
                explanation: cholDesc,
                targetStructure: 'arteries',
                schematicNote: 'Schematic: Endothelial lipid transport model'
            });

            // 3. Blood Sugar (Fasting Glucose)
            const sugar = vitals.bloodSugar || 95;
            let sugarStatus = 'cyan';
            let sugarLabel = 'Normal Fasting Glycemia';
            let sugarDesc = 'Fasting blood glucose (<100 mg/dL) indicates balanced metabolic insulin sensitivity and optimal vascular endothelial protection.';

            if (sugar >= 126 || lifestyle.diabetes === 'Yes') {
                sugarStatus = 'red';
                sugarLabel = lifestyle.diabetes === 'Yes' ? 'Diagnosed Diabetes' : 'Elevated Glucose Range';
                sugarDesc = 'Chronic hyperglycemia can promote advanced glycation end-products (AGEs), contributing to microvascular endothelial stiffness and capillary fragility.';
            } else if (sugar >= 100) {
                sugarStatus = 'amber';
                sugarLabel = 'Impaired Fasting Glucose';
                sugarDesc = 'Slightly elevated glucose reflects pre-diabetic metabolic stress, making physical activity and balanced nutrition key protective factors.';
            }

            cards.push({
                name: 'Blood Sugar & Diabetes',
                status: sugarStatus,
                badge: sugarLabel,
                value: `${sugar} mg/dL ${lifestyle.diabetes === 'Yes' ? '(Diabetes: Yes)' : ''}`,
                explanation: sugarDesc,
                targetStructure: 'capillaries',
                schematicNote: 'Schematic: Microvascular capillary bed resilience'
            });

            // 4. Body Mass Index (BMI)
            const bmi = vitals.bmi || 24.5;
            let bmiStatus = 'cyan';
            let bmiLabel = 'Healthy Weight Range';
            let bmiDesc = 'BMI within normal physiological limits (18.5–24.9 kg/m²) is associated with balanced venous return and optimal myocardial oxygen demand.';

            if (bmi >= 30) {
                bmiStatus = 'red';
                bmiLabel = 'Obesity Range';
                bmiDesc = 'Higher adipose mass increases systemic capillary bed volume, requiring elevated baseline cardiac output and higher circulating blood volume.';
            } else if (bmi >= 25) {
                bmiStatus = 'amber';
                bmiLabel = 'Overweight Range';
                bmiDesc = 'Moderate elevations in BMI gently increase systemic workload, which can be balanced through routine aerobic conditioning.';
            }

            cards.push({
                name: 'Body Mass Index (BMI)',
                status: bmiStatus,
                badge: bmiLabel,
                value: `${bmi} kg/m²`,
                explanation: bmiDesc,
                targetStructure: 'chambers',
                schematicNote: 'Schematic: Cardiac output & chamber workload'
            });

            // 5. Smoking Status
            const smoking = lifestyle.smoking || 'Never';
            let smokeStatus = 'cyan';
            let smokeLabel = 'Non-Smoker';
            let smokeDesc = 'Absence of inhaled tobacco combustion preserves vascular endothelial nitric oxide bioavailability and normal blood oxygenation.';

            if (smoking === 'Current') {
                smokeStatus = 'red';
                smokeLabel = 'Active Tobacco Exposure';
                smokeDesc = 'Combustion chemicals trigger sympathetic stimulation, temporary arterial vasoconstriction, and accelerated coronary plaque vulnerability.';
            } else if (smoking === 'Former') {
                smokeStatus = 'amber';
                smokeLabel = 'Former Smoker';
                smokeDesc = 'Vascular endothelium progressively recovers following cessation, substantially decreasing cardiovascular risk over time.';
            }

            cards.push({
                name: 'Smoking Status',
                status: smokeStatus,
                badge: smokeLabel,
                value: smoking,
                explanation: smokeDesc,
                targetStructure: 'arteries',
                schematicNote: 'Schematic: Arterial endothelial compliance'
            });

            // 6. Physical Activity
            const activity = lifestyle.activity || 'Moderate';
            let actStatus = 'cyan';
            let actLabel = 'Regular Conditioning';
            let actDesc = 'Routine physical activity enhances myocardial stroke volume efficiency, coronary collateral circulation, and lowers resting heart rate.';

            if (activity === 'Low') {
                actStatus = 'amber';
                actLabel = 'Sedentary Pattern';
                actDesc = 'Lower physical activity reduces cardiovascular conditioning efficiency, making progressive aerobic activity beneficial for vascular tone.';
            }

            cards.push({
                name: 'Physical Activity',
                status: actStatus,
                badge: actLabel,
                value: activity,
                explanation: actDesc,
                targetStructure: 'all',
                schematicNote: 'Schematic: Myocardial endurance & collateral flow'
            });

            // 7. Family History of CVD
            const famHistory = lifestyle.familyHistory || 'No';
            let famStatus = famHistory === 'Yes' ? 'amber' : 'cyan';
            let famLabel = famHistory === 'Yes' ? 'Familial Predisposition' : 'Standard Baseline';
            let famDesc = famHistory === 'Yes'
                ? 'Family history indicates genetic background factors that may influence lipid processing or vascular elasticity. This is an informational risk factor rather than a visible anatomical defect.'
                : 'No known immediate family history of premature cardiovascular disease reported.';

            cards.push({
                name: 'Family History of CVD',
                status: famStatus,
                badge: famLabel,
                value: famHistory,
                explanation: famDesc,
                targetStructure: 'all',
                schematicNote: 'Note: Genetic background factor (not an anatomical defect)'
            });
        }

        // Render Cards into DOM
        listContainer.innerHTML = cards.map(c => `
            <div class="factor-item-card status-${c.status}" data-structure="${c.targetStructure}">
                <div class="factor-card-top">
                    <span class="factor-name">${c.name}</span>
                    <span class="factor-badge badge-${c.status}">${c.badge}</span>
                </div>
                <div class="factor-value-row">${c.value}</div>
                <p class="factor-explanation">${c.explanation}</p>
                <div class="factor-structure-link">
                    <span>Focus 3D View: ${c.targetStructure.toUpperCase()}</span>
                </div>
                <span class="factor-schematic-pill">${c.schematicNote}</span>
            </div>
        `).join('');

        // Attach click listeners to highlight structures
        document.querySelectorAll('.factor-item-card').forEach(card => {
            card.addEventListener('click', () => {
                const target = card.getAttribute('data-structure');
                if (target) {
                    const select = document.getElementById('selectStructure');
                    if (select) {
                        select.value = target;
                        handleStructureSelection(target);
                    }
                }
            });
        });
    }

    function renderExplanationData(data) {
        const expEnteredSummary = document.getElementById('expEnteredSummary');
        if (expEnteredSummary) {
            const v = data.vitals || {};
            const l = data.lifestyle || {};
            const b = data.basic || {};
            expEnteredSummary.textContent = `Age: ${b.age || '--'} yrs | Sex: ${b.sex || '--'} | Blood Pressure: ${v.systolicBP || '--'}/${v.diastolicBP || '--'} mmHg | Total Cholesterol: ${v.cholesterol || '--'} mg/dL | Fasting Blood Sugar: ${v.bloodSugar || '--'} mg/dL | BMI: ${v.bmi || '--'} kg/m² | Smoking: ${l.smoking || '--'} | Diabetes: ${l.diabetes || '--'} | Physical Activity: ${l.activity || '--'} | Family History: ${l.familyHistory || '--'}`;
        }

        const expGeneralEdu = document.getElementById('expGeneralEdu');
        if (expGeneralEdu) {
            try {
                const rawAnalysis = sessionStorage.getItem('tsvp_analysis_result');
                if (rawAnalysis) {
                    const parsed = JSON.parse(rawAnalysis);
                    if (parsed && Array.isArray(parsed.educational_explanations) && parsed.educational_explanations.length > 0) {
                        expGeneralEdu.innerHTML = parsed.educational_explanations
                            .map(exp => `<p style="margin-bottom:0.75rem;">${exp}</p>`)
                            .join('');
                    }
                }
            } catch (e) {
                console.warn('Error rendering educational explanations in renderExplanationData:', e);
            }
        }
    }

    // -------------------------------------------------------------------------
    // 3. Three.js 3D Scene Initialization
    // -------------------------------------------------------------------------
    function initThreeScene() {
        const container = document.getElementById('threeHeartCanvas');
        if (!container) return;

        const width = container.clientWidth;
        const height = container.clientHeight;

        // Scene
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x020614, 0.04);

        // Camera with mobile portrait aspect adaptation
        const aspect = width / (height || 1);
        camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
        const initialZ = aspect < 1.15 ? 4.8 * Math.min(1.4, 1.15 / Math.max(aspect, 0.65)) : 4.8;
        camera.position.set(0, 0.3, initialZ);

        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.localClippingEnabled = true;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.25;
        container.appendChild(renderer.domElement);

        // Controls
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 2.5;
        controls.minDistance = 2.0;
        controls.maxDistance = 8.5;
        controls.target.set(0, 0, 0);

        // Lighting System
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
        scene.add(ambientLight);

        // Key Light (Clean White Directional)
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
        keyLight.position.set(4, 5, 5);
        scene.add(keyLight);

        // Cyan Rim Light (High-Tech Holographic Edge Glow)
        const cyanRimLight = new THREE.DirectionalLight(0x00f3ff, 1.8);
        cyanRimLight.position.set(-4, 3, -3);
        scene.add(cyanRimLight);

        // Crimson Biological Fill Light (From below-front)
        const redFillLight = new THREE.DirectionalLight(0xff1e42, 1.1);
        redFillLight.position.set(0, -4, 2);
        scene.add(redFillLight);

        // Glowing 3D Targeting Beacon
        createHighlightBeacon();

        // Load 3D Models
        loadHeartModels();

        // Animation Loop
        const clock = new THREE.Clock();
        function animate() {
            requestAnimationFrame(animate);
            const delta = clock.getDelta();

            controls.update();

            // Subtle biological idle pulse on the current model
            if (currentModel) {
                const time = clock.getElapsedTime();
                const pulse = Math.sin(time * 3.5) * 0.015;
                currentModel.scale.set(
                    currentModel.userData.baseScale + pulse,
                    currentModel.userData.baseScale + pulse,
                    currentModel.userData.baseScale + pulse
                );
            }

            // Beacon breathing animation
            if (highlightBeacon && highlightBeacon.visible) {
                const t = clock.getElapsedTime() * 4;
                highlightBeacon.scale.setScalar(1 + Math.sin(t) * 0.25);
            }

            renderer.render(scene, camera);
        }
        animate();

        // Resize Listener
        window.addEventListener('resize', onWindowResize);
    }

    function createHighlightBeacon() {
        const beaconGroup = new THREE.Group();
        beaconGroup.visible = false;

        // Glowing Sphere core
        const coreGeo = new THREE.SphereGeometry(0.12, 16, 16);
        const coreMat = new THREE.MeshBasicMaterial({
            color: 0x00f3ff,
            transparent: true,
            opacity: 0.95
        });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        beaconGroup.add(coreMesh);

        // Holographic Orbit Ring
        const ringGeo = new THREE.RingGeometry(0.18, 0.24, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00f3ff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.75
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        beaconGroup.add(ringMesh);

        scene.add(beaconGroup);
        highlightBeacon = beaconGroup;
    }

    function loadHeartModels() {
        const loader = new THREE.GLTFLoader();

        // Configure DRACOLoader if available
        if (typeof THREE.DRACOLoader !== 'undefined') {
            const dracoLoader = new THREE.DRACOLoader();
            dracoLoader.setDecoderPath('libs/draco/');
            dracoLoader.setDecoderConfig({ type: 'js' });
            loader.setDRACOLoader(dracoLoader);
        }

        const loadingOverlay = document.getElementById('viewportLoadingOverlay');
        const loaderText = document.getElementById('loaderStatusText');

        function hideLoadingOverlay() {
            if (loadingOverlay) {
                loadingOverlay.style.opacity = '0';
                setTimeout(() => { loadingOverlay.style.display = 'none'; }, 300);
            }
        }

        // Prefer assets/heart.glb as requested
        const externalUrl = 'assets/heart.glb';
        const internalUrl = 'assets/human-heart-internal.glb';

        if (loaderText) loaderText.textContent = 'LOADING 3D CARDIAC ANATOMY...';

        // 1. Load Primary Anatomical Heart Model (heart.glb)
        loader.load(
            externalUrl,
            function (gltf) {
                console.log('[TSVP 3D] Successfully loaded heart model:', externalUrl);
                externalModel = gltf.scene;
                normalizeModel(externalModel, 3.2);
                applySciFiMaterials(externalModel, false);
                externalModel.visible = true;
                scene.add(externalModel);
                currentModel = externalModel;
                hideLoadingOverlay();
                switchViewMode('external');
            },
            function (xhr) {
                if (xhr.lengthComputable && loaderText) {
                    const percent = Math.round((xhr.loaded / xhr.total) * 100);
                    loaderText.textContent = `LOADING 3D CARDIAC ANATOMY... ${percent}%`;
                }
            },
            function (err) {
                console.error('[TSVP 3D] Failed to load heart.glb, attempting fallback to heart-1_compressed.glb:', err);
                loader.load(
                    'assets/heart-1_compressed.glb',
                    function (gltf2) {
                        externalModel = gltf2.scene;
                        normalizeModel(externalModel, 3.2);
                        applySciFiMaterials(externalModel, false);
                        externalModel.visible = true;
                        scene.add(externalModel);
                        currentModel = externalModel;
                        hideLoadingOverlay();
                        switchViewMode('external');
                    },
                    undefined,
                    function (err2) {
                        console.error('[TSVP 3D] Failed to load fallback heart model:', err2);
                        hideLoadingOverlay();
                        createProceduralFallbackHeart();
                    }
                );
            }
        );

        // 2. Load Internal Bisected Model
        loader.load(
            internalUrl,
            function (gltf) {
                console.log('[TSVP 3D] Successfully loaded internal bisected heart model:', internalUrl);
                internalModel = gltf.scene;
                normalizeModel(internalModel, 3.2);
                applySciFiMaterials(internalModel, true);
                internalModel.visible = false;
                scene.add(internalModel);
            },
            undefined,
            function (err) {
                console.warn('[TSVP 3D] Internal cross-section model notice:', err);
            }
        );

        // Fallback timer ensures user is never stuck on loading screen
        setTimeout(() => {
            if (loadingOverlay && loadingOverlay.style.display !== 'none') {
                hideLoadingOverlay();
                if (!externalModel && !internalModel) {
                    createProceduralFallbackHeart();
                }
            }
        }, 4000);
    }

    function normalizeModel(model, targetSize) {
        // Reset scale and position
        model.scale.set(1, 1, 1);
        model.position.set(0, 0, 0);
        model.rotation.set(0, 0, 0);
        model.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = maxDim > 0 ? (targetSize / maxDim) : 1;

        model.scale.setScalar(scale);
        model.userData.baseScale = scale;

        // Re-center model precisely at origin
        box.setFromObject(model);
        box.getCenter(center);
        model.position.sub(center);
        model.updateMatrixWorld(true);
    }

    function applySciFiMaterials(model, isInternal) {
        model.traverse((child) => {
            if (child.isMesh) {
                structureMaterials.set(child, child.material);

                if (child.material) {
                    child.material.side = THREE.DoubleSide;
                    child.material.transparent = false;
                    child.material.opacity = 1.0;
                    if (child.material.roughness !== undefined) {
                        child.material.roughness = 0.35;
                    }
                    if (child.material.metalness !== undefined) {
                        child.material.metalness = 0.2;
                    }
                    if (child.material.emissive) {
                        child.material.emissive = new THREE.Color(isInternal ? 0x22050e : 0x0c1524);
                        child.material.emissiveIntensity = 0.35;
                    }
                }
            }
        });
    }

    // Procedural Fallback in case GLB loading fails on user device
    function createProceduralFallbackHeart() {
        const group = new THREE.Group();

        // Main Ventricles (Elongated crimson core)
        const ventGeo = new THREE.SphereGeometry(1.2, 32, 32);
        ventGeo.scale(0.9, 1.3, 0.85);
        const ventMat = new THREE.MeshStandardMaterial({
            color: 0xdc2626,
            roughness: 0.3,
            metalness: 0.2,
            emissive: 0x440510,
            emissiveIntensity: 0.4
        });
        const ventMesh = new THREE.Mesh(ventGeo, ventMat);
        group.add(ventMesh);

        // Aorta Arch (Curved tube in cyan/crimson)
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0.8, 0),
            new THREE.Vector3(0.2, 1.4, -0.1),
            new THREE.Vector3(0.6, 1.5, -0.3),
            new THREE.Vector3(0.8, 0.7, -0.4)
        ]);
        const aortaGeo = new THREE.TubeGeometry(curve, 20, 0.25, 16, false);
        const aortaMat = new THREE.MeshStandardMaterial({
            color: 0xff3b5c,
            roughness: 0.3,
            emissive: 0x00f3ff,
            emissiveIntensity: 0.3
        });
        const aortaMesh = new THREE.Mesh(aortaGeo, aortaMat);
        group.add(aortaMesh);

        // Pulmonary Trunk
        const curvePT = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-0.1, 0.7, 0.2),
            new THREE.Vector3(-0.3, 1.2, 0.3),
            new THREE.Vector3(-0.7, 1.3, 0.1)
        ]);
        const ptGeo = new THREE.TubeGeometry(curvePT, 16, 0.22, 16, false);
        const ptMat = new THREE.MeshStandardMaterial({ color: 0x0084ff, roughness: 0.3 });
        const ptMesh = new THREE.Mesh(ptGeo, ptMat);
        group.add(ptMesh);

        group.userData.baseScale = 1.0;
        externalModel = group;
        internalModel = group.clone();
        scene.add(group);
        currentModel = group;

        const errorOverlay = document.getElementById('viewportErrorOverlay');
        if (errorOverlay) {
            errorOverlay.removeAttribute('hidden');
            const msg = document.getElementById('errorMessageText');
            if (msg) msg.textContent = 'Using high-fidelity procedural 3D cardiovascular anatomy visualization.';
        }
    }

    function onWindowResize() {
        const container = document.getElementById('threeHeartCanvas');
        if (!container || !renderer || !camera) return;

        const width = container.clientWidth;
        const height = container.clientHeight;

        const aspect = width / (height || 1);
        camera.aspect = aspect;

        // Adapt camera distance for portrait mobile displays
        if (aspect < 1.15) {
            const distScale = Math.min(1.4, 1.15 / Math.max(aspect, 0.65));
            if (controls) {
                controls.minDistance = 2.0;
                controls.maxDistance = 10.0;
            }
            camera.position.z = 4.8 * distScale;
        } else {
            camera.position.z = 4.8;
        }

        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

    // -------------------------------------------------------------------------
    // 4. View Mode & Structure Selection Handlers
    // -------------------------------------------------------------------------
    function switchViewMode(mode) {
        currentViewMode = mode;
        const activeText = document.getElementById('hudActiveViewText');
        const btnExt = document.getElementById('btnViewExternal');
        const btnInt = document.getElementById('btnViewInternal');

        if (mode === 'internal') {
            if (externalModel) externalModel.visible = false;
            if (internalModel) {
                internalModel.visible = true;
                currentModel = internalModel;
            } else if (externalModel) {
                // If only external model is present, enable real-time sagittal clipping plane
                externalModel.visible = true;
                currentModel = externalModel;
                const clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0.2);
                renderer.clippingPlanes = [clipPlane];
            }
            if (activeText) activeText.textContent = 'VIEW: INTERNAL BISECTED CROSS-SECTION';
            if (btnInt) btnInt.classList.add('active');
            if (btnExt) btnExt.classList.remove('active');
        } else {
            renderer.clippingPlanes = [];
            if (internalModel) internalModel.visible = false;
            if (externalModel) {
                externalModel.visible = true;
                currentModel = externalModel;
            }
            if (activeText) activeText.textContent = 'VIEW: EXTERNAL ANATOMY';
            if (btnExt) btnExt.classList.add('active');
            if (btnInt) btnInt.classList.remove('active');
        }
    }

    function handleStructureSelection(structureKey) {
        const anchor = STRUCTURE_ANCHORS[structureKey] || STRUCTURE_ANCHORS['all'];
        const info = STRUCTURE_INFO[structureKey] || STRUCTURE_INFO['all'];

        // Update educational description banner
        const titleEl = document.getElementById('structureTitle');
        const descEl = document.getElementById('structureDescription');
        if (titleEl) titleEl.textContent = info.title;
        if (descEl) descEl.textContent = info.desc;

        // If structure requires internal view (e.g. chambers, valves), switch view
        if (anchor.requiresInternal && currentViewMode !== 'internal') {
            switchViewMode('internal');
        }

        // Capillary Inset Modal Trigger
        const capillaryInset = document.getElementById('capillaryInset');
        if (capillaryInset) {
            if (anchor.showInset) {
                capillaryInset.removeAttribute('hidden');
            } else {
                capillaryInset.setAttribute('hidden', '');
            }
        }

        // Move Beacon to anchor position
        if (highlightBeacon) {
            if (structureKey === 'all') {
                highlightBeacon.visible = false;
            } else {
                highlightBeacon.visible = true;
                highlightBeacon.position.set(anchor.pos[0], anchor.pos[1], anchor.pos[2]);
            }
        }

        // Smooth camera tween to frame the target structure
        smoothFocusCamera(anchor.pos, anchor.zoom);

        // Highlight structure meshes if tagged
        highlightMeshStructure(structureKey);
    }

    function highlightMeshStructure(key) {
        if (!currentModel) return;

        currentModel.traverse((child) => {
            if (child.isMesh && child.material) {
                if (key === 'all') {
                    child.material.opacity = 1.0;
                    child.material.transparent = false;
                    child.material.emissiveIntensity = 0.35;
                } else {
                    // Structure specific matching
                    const meshName = (child.name || '').toLowerCase();
                    const matches = meshName.includes(key.toLowerCase());

                    if (matches) {
                        child.material.emissive = new THREE.Color(0x00f3ff);
                        child.material.emissiveIntensity = 0.95;
                        child.material.opacity = 1.0;
                    } else {
                        // Gently dim unrelated geometry to focus on the structure
                        child.material.transparent = true;
                        child.material.opacity = 0.7;
                        child.material.emissiveIntensity = 0.15;
                    }
                }
            }
        });
    }

    function smoothFocusCamera(targetPos, targetZoom) {
        if (!camera || !controls) return;

        const startPos = camera.position.clone();
        const startTarget = controls.target.clone();

        const container = document.getElementById('threeHeartCanvas');
        const aspect = container ? (container.clientWidth / (container.clientHeight || 1)) : 1.2;
        const zoomScale = aspect < 1.15 ? Math.min(1.4, 1.15 / Math.max(aspect, 0.65)) : 1.0;
        const effectiveZoom = targetZoom * zoomScale;

        const endTarget = new THREE.Vector3(targetPos[0] * 0.4, targetPos[1] * 0.4, targetPos[2] * 0.4);
        const endPos = new THREE.Vector3(
            targetPos[0] * 0.2,
            targetPos[1] * 0.2 + 0.3,
            effectiveZoom
        );

        let progress = 0;
        function stepTween() {
            progress += 0.04;
            camera.position.lerpVectors(startPos, endPos, Math.min(progress, 1));
            controls.target.lerpVectors(startTarget, endTarget, Math.min(progress, 1));

            if (progress < 1) {
                requestAnimationFrame(stepTween);
            }
        }
        stepTween();
    }

    // -------------------------------------------------------------------------
    // 5. Controls Panel DOM Event Listeners
    // -------------------------------------------------------------------------
    function initControlListeners() {
        // Zoom In (+)
        const btnZoomIn = document.getElementById('btnZoomIn');
        if (btnZoomIn) {
            btnZoomIn.addEventListener('click', () => {
                if (camera) {
                    camera.position.multiplyScalar(0.85);
                    camera.updateProjectionMatrix();
                }
            });
        }

        // Zoom Out (−)
        const btnZoomOut = document.getElementById('btnZoomOut');
        if (btnZoomOut) {
            btnZoomOut.addEventListener('click', () => {
                if (camera) {
                    camera.position.multiplyScalar(1.18);
                    camera.updateProjectionMatrix();
                }
            });
        }

        // Reset View
        const btnResetView = document.getElementById('btnResetView');
        if (btnResetView) {
            btnResetView.addEventListener('click', () => {
                if (camera && controls) {
                    camera.position.set(0, 0.3, 4.8);
                    controls.target.set(0, 0, 0);
                    controls.update();
                    handleStructureSelection('all');
                    const select = document.getElementById('selectStructure');
                    if (select) select.value = 'all';
                }
            });
        }

        // 360° Rotation Toggle
        const btnToggleRotate = document.getElementById('btnToggleRotate');
        const rotateStateText = document.getElementById('rotateStateText');
        if (btnToggleRotate) {
            btnToggleRotate.addEventListener('click', () => {
                isAutoRotating = !isAutoRotating;
                controls.autoRotate = isAutoRotating;

                if (isAutoRotating) {
                    btnToggleRotate.classList.add('active');
                    if (rotateStateText) rotateStateText.textContent = 'ROTATING';
                } else {
                    btnToggleRotate.classList.remove('active');
                    if (rotateStateText) rotateStateText.textContent = 'PAUSED';
                }
            });
        }

        // Rotation Speed Select
        const selectRotateSpeed = document.getElementById('selectRotateSpeed');
        if (selectRotateSpeed) {
            selectRotateSpeed.addEventListener('change', (e) => {
                if (controls) {
                    controls.autoRotateSpeed = parseFloat(e.target.value);
                }
            });
        }

        // External / Internal View Mode Toggle
        const btnViewExternal = document.getElementById('btnViewExternal');
        const btnViewInternal = document.getElementById('btnViewInternal');
        if (btnViewExternal) {
            btnViewExternal.addEventListener('click', () => switchViewMode('external'));
        }
        if (btnViewInternal) {
            btnViewInternal.addEventListener('click', () => switchViewMode('internal'));
        }

        // Structure Dropdown Selector
        const selectStructure = document.getElementById('selectStructure');
        if (selectStructure) {
            selectStructure.addEventListener('change', (e) => {
                handleStructureSelection(e.target.value);
            });
        }

        // Close Capillary Inset Modal
        const btnCloseCapillaryInset = document.getElementById('btnCloseCapillaryInset');
        const capillaryInset = document.getElementById('capillaryInset');
        if (btnCloseCapillaryInset && capillaryInset) {
            btnCloseCapillaryInset.addEventListener('click', () => {
                capillaryInset.setAttribute('hidden', '');
            });
        }

        // Retry 3D reload button
        const btnRetryLoad = document.getElementById('btnRetryLoad');
        if (btnRetryLoad) {
            btnRetryLoad.addEventListener('click', () => {
                location.reload();
            });
        }
    }

    // -------------------------------------------------------------------------
    // 6. Initialization Entry Point
    // -------------------------------------------------------------------------
    window.addEventListener('DOMContentLoaded', () => {
        initPatientTelemetry();
        initControlListeners();
        initThreeScene();
    });

})();
