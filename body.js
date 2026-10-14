/**
 * TSVP — The Smart Vascular Predictor
 * Page 4: Interactive Whole-Body Anatomy Controller
 * 3D Holographic Human Avatar & Systemic Cardiovascular Mapping
 */

(function () {
    'use strict';

    // -------------------------------------------------------------------------
    // 1. State & Data Store
    // -------------------------------------------------------------------------
    let patientData = null;
    let scene, camera, renderer, controls;
    let canvasContainer, canvasEl;
    let isAutoRotating = true;
    let currentViewMode = 'front'; // 'front' | 'back' | 'circulatory'
    let selectedOrganKey = 'all';
    let animationFrameId = null;

    // 3D Object Groups
    let avatarGroup = null;
    let bodySilhouetteGroup = null;
    let silhouetteAnteriorGroup = null;
    let silhouettePosteriorGroup = null;
    let organsGroup = null;
    let vascularTreeGroup = null;
    let heartGroup = null;
    let externalModelGroup = null;
    let selectionBeacon = null;
    let currentLayerMode = 'translucent'; // 'translucent' | 'cutaway' | 'internal' | 'surface'
    let isExternalModelLoaded = false;

    // Organ Object Registry for Raycasting & Highlighting
    const organMeshes = new Map();
    const organAnchors = {
        'all': { pos: [0, 0.1, 0], localPos: [0, 0.87, 0], lookAt: [0, 0.1, 0], zoom: 7.2 },
        'heart': { pos: [0.045, 1.40, 0.10], localPos: [0.015, 1.30, 0.035], lookAt: [0.045, 1.40, 0.10], zoom: 4.0 },
        'brain': { pos: [0, 2.30, 0.06], localPos: [0, 1.60, -0.01], lookAt: [0, 2.30, 0.06], zoom: 3.8 },
        'lungs': { pos: [0, 1.55, 0.06], localPos: [0, 1.35, 0], lookAt: [0, 1.55, 0.06], zoom: 4.2 },
        'kidneys': { pos: [0, 0.80, -0.09], localPos: [0, 1.10, -0.017], lookAt: [0, 0.80, -0.09], zoom: 3.8 },
        'liver': { pos: [0.18, 0.95, 0.12], localPos: [0.06, 1.15, 0.04], lookAt: [0.18, 0.95, 0.12], zoom: 3.8 },
        'arteries': { pos: [0, 0.70, 0], localPos: [0, 1.05, 0], lookAt: [0, 0.70, 0], zoom: 5.5 },
        'veins': { pos: [0, 0.70, 0], localPos: [0, 1.05, 0], lookAt: [0, 0.70, 0], zoom: 5.5 },
        'aorta': { pos: [0.036, 1.49, 0.06], localPos: [0.012, 1.33, 0.02], lookAt: [0.036, 1.49, 0.06], zoom: 3.8 },
        'vena_cava': { pos: [-0.045, 1.40, 0.06], localPos: [-0.015, 1.35, 0.02], lookAt: [-0.045, 1.40, 0.06], zoom: 3.8 },
        'peripheral': { pos: [0, -1.30, 0.08], localPos: [0, 0.40, 0.02], lookAt: [0, -1.30, 0.08], zoom: 5.5 }
    };

    // Camera target interpolation state
    const cameraTarget = {
        pos: null,
        lookAt: null
    };

    // -------------------------------------------------------------------------
    // 2. DOM Elements Cache
    // -------------------------------------------------------------------------
    const elTelemetryGrid = document.getElementById('bodyTelemetryGrid');
    const elTelemetryStatusLabel = document.getElementById('telemetryStatusLabel');
    const elHudActiveStructureName = document.getElementById('hudActiveStructureName');
    const elHudViewIndicator = document.getElementById('hudViewIndicator');
    const elHudModelBadge = document.getElementById('hudModelBadge');
    const elTooltip = document.getElementById('canvas3dTooltip');
    const elTooltipTitle = document.getElementById('tooltipTitle');
    const elLoaderOverlay = document.getElementById('viewportLoaderOverlay');
    const elErrorOverlay = document.getElementById('viewportErrorOverlay');
    const elFactorsScrollList = document.getElementById('factorsScrollList');

    // Controls
    const btnToggleRotate = document.getElementById('btnToggleRotate');
    const rotateStateText = document.getElementById('rotateStateText');
    const btnZoomIn = document.getElementById('btnZoomIn');
    const btnZoomOut = document.getElementById('btnZoomOut');
    const btnResetView = document.getElementById('btnResetView');
    const btnViewFront = document.getElementById('btnViewFront');
    const btnViewBack = document.getElementById('btnViewBack');
    const btnViewCirculatory = document.getElementById('btnViewCirculatory');
    const btnLayerTranslucent = document.getElementById('btnLayerTranslucent');
    const btnLayerCutaway = document.getElementById('btnLayerCutaway');
    const btnLayerInternal = document.getElementById('btnLayerInternal');
    const btnLayerSurface = document.getElementById('btnLayerSurface');
    const glbFileInput = document.getElementById('glbFileInput');
    const btnResetOrganFocus = document.getElementById('btnResetOrganFocus');
    const heartActionBox = document.getElementById('heartActionBox');

    // Organ Info Panel Elements
    const organNameHeading = document.getElementById('organNameHeading');
    const organCategoryTag = document.getElementById('organCategoryTag');
    const organStatusBadge = document.getElementById('organStatusBadge');
    const organNormalFunction = document.getElementById('organNormalFunction');
    const organCardioConnection = document.getElementById('organCardioConnection');
    const organPatientFactorsChips = document.getElementById('organPatientFactorsChips');
    const organPatientFactorsText = document.getElementById('organPatientFactorsText');
    const organWhatThisMeans = document.getElementById('organWhatThisMeans');

    // -------------------------------------------------------------------------
    // 3. Organ & Structure Educational Knowledge Base
    // -------------------------------------------------------------------------
    const ORGAN_DATA = {
        'all': {
            name: 'Whole-Body Circulation (Schematic)',
            category: 'Systemic Circuit Schematic',
            status: 'Schematic View',
            normal: 'The human circulatory system forms a closed loop of approximately 60,000 miles of blood vessels. Oxygen-rich blood ejected by the heart delivers vital oxygen, glucose, and nutrients to every tissue, while systemic veins collect metabolic byproducts for hepatic clearance, renal filtration, and pulmonary oxygen replenishment.',
            cardio: 'Systemic vascular resistance determines the pressure gradient that the heart must generate to maintain organ perfusion. Blood pressure, endothelial integrity, and circulating lipids operate continuously across this interconnected systemic network.',
            factorsText: 'Your comprehensive cardiovascular profile connects to this systemic network: Blood Pressure, Total Cholesterol, Fasting Blood Sugar, BMI, Smoking Status, Physical Activity, and Family History.',
            factorsPills: [
                { label: 'Systolic/Diastolic BP', type: 'cyan' },
                { label: 'Cholesterol Profile', type: 'cyan' },
                { label: 'Fasting Glucose', type: 'cyan' },
                { label: 'Cardiorespiratory Fitness', type: 'cyan' }
            ],
            meaning: 'Every organ depends upon the continuous, unobstructed flow of blood through healthy vessels. What affects one part of your vascular tree—such as arterial pressure or circulating lipids—has systemic implications for your entire body.'
        },
        'heart': {
            name: 'Heart (Cor)',
            category: 'Central Cardiac Pump',
            status: 'Primary Focus',
            normal: 'The heart is a four-chambered muscular organ that beats approximately 100,000 times per day, pumping roughly 2,000 gallons of blood. The right chambers receive deoxygenated blood and direct it to the pulmonary circuit; the left chambers receive oxygen-rich blood and forcefully eject it through the aorta to sustain systemic perfusion.',
            cardio: 'As the central muscular engine of the vascular system, the heart generates systolic driving pressure. When systemic arterial resistance is high (hypertension), the left ventricle must pump with greater force, which can lead to ventricular wall thickening (hypertrophy) and higher myocardial oxygen consumption.',
            factorsText: 'Relevant submitted factors include resting blood pressure, blood glucose regulation, and smoking status.',
            factorsPills: [
                { label: 'Blood Pressure Workload', type: 'amber' },
                { label: 'Myocardial Perfusion', type: 'cyan' },
                { label: 'Pulse Rhythm', type: 'cyan' }
            ],
            meaning: 'Maintaining healthy blood pressure and smoke-free living reduces unnecessary workload on the heart muscle. Explore our high-resolution 3D Heart model on Page 3 for in-depth cardiac anatomical examination.'
        },
        'brain': {
            name: 'Brain (Cerebral Perfusion)',
            category: 'Central Nervous System',
            status: 'Critical Perfusion',
            normal: 'The brain accounts for only about 2% of total body weight but consumes approximately 20% of the body’s resting oxygen and glucose supply. It requires an uninterrupted arterial blood supply via the bilateral internal carotid arteries and vertebral arteries, which join at the base of the brain to form the Circle of Willis.',
            cardio: 'Cerebral vessels rely on precise autoregulation to maintain constant blood flow across fluctuating systemic pressures. Chronically elevated blood pressure can cause microvascular endothelial remodeling, micro-aneurysms, or lacunar changes, while atherosclerotic narrowing of the carotid arteries increases ischemic stroke risk.',
            factorsText: 'Submitted factors relevant to cerebral vascular health include blood pressure, smoking status, and diabetes status.',
            factorsPills: [
                { label: 'Cerebral Autoregulation', type: 'amber' },
                { label: 'Carotid Patency', type: 'cyan' },
                { label: 'Microvascular Integrity', type: 'cyan' }
            ],
            meaning: 'Having cardiovascular risk factors does NOT mean that a stroke or brain damage has occurred. It simply highlights the importance of managing blood pressure and lifestyle habits to protect cerebral blood vessels over the long term.'
        },
        'lungs': {
            name: 'Lungs (Pulmonary Circuit)',
            category: 'Pulmonary Gas Exchange',
            status: 'Low-Pressure Circuit',
            normal: 'The lungs contain approximately 300 million micro-alveoli where gas exchange takes place. The pulmonary trunk receives deoxygenated blood from the right ventricle, branches into left and right pulmonary arteries, transfers carbon dioxide, oxygenates hemoglobin, and returns fresh blood to the left atrium through the four pulmonary veins.',
            cardio: 'The pulmonary circulation is normally a low-resistance, high-capacitance system. If the left ventricle experiences elevated filling pressures, retrograde hydrostatic pressure can transmit back into pulmonary capillary beds. Tobacco smoke directly introduces oxidative oxidants that damage alveolar-capillary membranes.',
            factorsText: 'Submitted factors relevant to pulmonary vascular health include smoking status and physical activity level.',
            factorsPills: [
                { label: 'Tobacco Exposure', type: 'amber' },
                { label: 'Gas Exchange Integrity', type: 'cyan' },
                { label: 'Cardiorespiratory Endurance', type: 'cyan' }
            ],
            meaning: 'Occasional breathlessness can stem from many non-cardiac causes (such as conditioning, allergies, asthma, or anxiety) and cannot be diagnosed from this visualization. Staying smoke-free and engaging in regular aerobic activity directly supports pulmonary vascular efficiency.'
        },
        'kidneys': {
            name: 'Kidneys (Renal Hemodynamics)',
            category: 'Fluid Balance & Filtration',
            status: 'Metabolic Filter',
            normal: 'The bilateral kidneys filter approximately 180 liters of fluid daily through millions of nephrons, removing metabolic waste while regulating electrolyte balance, extracellular fluid volume, and systemic blood pressure through the renin-angiotensin-aldosterone system (RAAS).',
            cardio: 'The kidneys receive roughly 20-25% of cardiac output through the renal arteries. High systemic blood pressure can exert mechanical stress on delicate glomerular arterioles over time, while persistent hyperglycemia promotes advanced glycation and microvascular filtering changes.',
            factorsText: 'Submitted factors relevant to renal microvascular health include blood pressure, blood glucose, and body mass index.',
            factorsPills: [
                { label: 'Glomerular Arterioles', type: 'amber' },
                { label: 'Renin-Angiotensin Regulation', type: 'cyan' },
                { label: 'Fluid Balance', type: 'cyan' }
            ],
            meaning: 'High blood pressure and elevated glucose can strain kidney blood vessels over time, but questionnaire values alone can never claim or diagnose kidney damage. Routine clinical urine and blood tests (e.g. eGFR, creatinine) provide formal assessment.'
        },
        'liver': {
            name: 'Liver (Hepatic Circulation)',
            category: 'Metabolic & Protein Synthesis',
            status: 'Dual Blood Supply',
            normal: 'The liver is the body’s metabolic hub, responsible for producing vital clotting factors, albumin, bile, and apolipoproteins, as well as clearing toxins and synthesizing/recycling cholesterol through hepatic LDL receptors.',
            cardio: 'The liver possesses a unique dual blood supply: the hepatic artery provides oxygenated arterial blood, while the portal vein delivers nutrient-dense blood from the digestive tract. In severe right-sided heart failure, backward systemic venous congestion can elevate hepatic sinusoidal pressure.',
            factorsText: 'Submitted factors relevant to hepatic metabolism include total cholesterol and body mass index.',
            factorsPills: [
                { label: 'Lipid Synthesis & Clearance', type: 'cyan' },
                { label: 'Portal Venous Flow', type: 'cyan' },
                { label: 'Metabolic Homeostasis', type: 'cyan' }
            ],
            meaning: 'Ordinary cardiovascular risk factors do NOT indicate or prove liver disease. The liver is highlighted here because it plays a primary biological role in synthesizing and clearing circulating cholesterol.'
        },
        'arteries': {
            name: 'Arteries (Systemic Arterial Tree)',
            category: 'High-Pressure Conduits',
            status: 'Arterial Vasculature',
            normal: 'Arteries are thick-walled, elastic vessels composed of three layers (intima, media, and adventitia) that carry oxygenated blood under pulsatile high pressure away from the heart to every capillary bed in the body.',
            cardio: 'Atherosclerosis develops when excess circulating ApoB-containing lipoproteins (LDL) penetrate the subendothelial space of the arterial wall, triggering an inflammatory cascade. High blood pressure exerts physical shear strain on the endothelium, while smoking impairs nitric-oxide-mediated vasodilation.',
            factorsText: 'Relevant submitted factors include systolic and diastolic blood pressure, total cholesterol, smoking status, and diabetes.',
            factorsPills: [
                { label: 'Endothelial Shear Stress', type: 'amber' },
                { label: 'Lipid Retention', type: 'cyan' },
                { label: 'Arterial Compliance', type: 'cyan' }
            ],
            meaning: 'This visualization does NOT claim or visually show that your individual arteries are blocked. It illustrates how arterial walls respond over years to mechanical pressure, circulating lipids, and smoke exposure.'
        },
        'veins': {
            name: 'Veins (Systemic Venous Return)',
            category: 'Low-Pressure Capacitance',
            status: 'Venous Vasculature',
            normal: 'Veins are thin-walled, distensible capacitance vessels equipped with one-way bicuspid valves that return deoxygenated blood back toward the heart against gravity, aided by rhythmic contraction of surrounding skeletal muscles (the muscle pump).',
            cardio: 'Unlike high-pressure arteries, veins operate under low pressures (5-15 mmHg). Venous return is enhanced by physical movement and deep respiration. Prolonged sedentary posture can lead to venous pooling in the lower extremities.',
            factorsText: 'Relevant submitted factors include regular physical activity level and body mass index.',
            factorsPills: [
                { label: 'Calf Muscle Pump', type: 'cyan' },
                { label: 'Venous Valve Competence', type: 'cyan' },
                { label: 'Capacitance Return', type: 'cyan' }
            ],
            meaning: 'Venous conditions (such as varicose veins or venous insufficiency) differ fundamentally from arterial atherosclerosis. Do not interpret venous pathways as coronary artery disease. Regular walking directly activates the venous muscle pump.'
        },
        'aorta': {
            name: 'Aorta (Ascending, Arch & Descending)',
            category: 'Great Arterial Trunk',
            status: 'Elastic Trunk',
            normal: 'The aorta is the largest single artery in the human body (approx. 2.5–3 cm in diameter). It arises directly from the left ventricle, arches superiorly behind the sternum, gives off the brachiocephalic, carotid, and subclavian arteries, and descends through the chest and abdomen to deliver high-volume arterial flow.',
            cardio: 'The aorta serves as an elastic buffer (the Windkessel effect), expanding during cardiac systole to absorb peak pressure and recoiling during diastole to maintain continuous forward perfusion. Chronic elevated systolic pressure and tobacco exposure place ongoing biomechanical tension on aortic wall elastin.',
            factorsText: 'Submitted factors relevant to aortic wall tension include systolic blood pressure, age, and smoking history.',
            factorsPills: [
                { label: 'Windkessel Elastic Recoil', type: 'amber' },
                { label: 'Peak Systolic Pressure', type: 'amber' },
                { label: 'Wall Compliance', type: 'cyan' }
            ],
            meaning: 'The aorta is the highway of the arterial system. Keeping your resting blood pressure within recommended targets prevents excess hydraulic strain on its muscular and elastic layers.'
        },
        'vena_cava': {
            name: 'Superior & Inferior Vena Cava',
            category: 'Great Venous Trunks',
            status: 'Central Venous Return',
            normal: 'The Superior Vena Cava (SVC) drains blood from the head, neck, arms, and upper chest, while the Inferior Vena Cava (IVC) is the largest vein in the body, collecting blood from the abdomen, pelvis, and lower limbs. Both great vessels empty into the right atrium.',
            cardio: 'Central venous pressure in the venae cavae reflects the filling pressure of the right side of the heart. These great conduits ensure that returned blood smoothly enters the heart without backpressure.',
            factorsText: 'Relevant factors include physical activity and overall fluid homeostasis.',
            factorsPills: [
                { label: 'Central Venous Pressure', type: 'cyan' },
                { label: 'Right Heart Return', type: 'cyan' },
                { label: 'Thoracoabdominal Pump', type: 'cyan' }
            ],
            meaning: 'The venae cavae represent the main drainage conduits returning circulation to the heart. Healthy cardiovascular habits support smooth venous drainage throughout both upper and lower body circuits.'
        },
        'peripheral': {
            name: 'Peripheral Circulation (Arms & Legs)',
            category: 'Extremity Perfusion',
            status: 'Distal Vascular Beds',
            normal: 'Peripheral circulation refers to the network of arteries, capillaries, and veins supplying the extremities (arms, hands, legs, and feet). Distal arterioles regulate local blood supply according to tissue metabolic demands, while capillary loops ensure microvascular oxygen exchange.',
            cardio: 'Peripheral artery disease (PAD) occurs when atherosclerotic plaque builds up in the femoral, popliteal, or tibial arteries, reducing blood flow to the limbs. Cigarette smoking and diabetes are potent risk factors for peripheral arterial and microvascular impairment.',
            factorsText: 'Relevant submitted factors include smoking status, diabetes, and physical activity level.',
            factorsPills: [
                { label: 'Distal Perfusion', type: 'amber' },
                { label: 'Microvascular Tone', type: 'cyan' },
                { label: 'Collateral Vessel Growth', type: 'cyan' }
            ],
            meaning: 'Occasional leg pain, coldness, or numbness can have many causes (including nerve compression, musculoskeletal strain, or vascular changes) and require professional medical evaluation. Walking regularly stimulates peripheral collateral vessel development.'
        }
    };

    // -------------------------------------------------------------------------
    // 4. Ingest Patient Telemetry from Session Storage
    // -------------------------------------------------------------------------
    function loadPatientTelemetry() {
        try {
            const raw = sessionStorage.getItem('tsvp_patient_telemetry') || 
                        sessionStorage.getItem('tsvp_patient_data');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && (parsed.vitals || parsed.systolicBP)) {
                    patientData = parsed;
                    if (elTelemetryStatusLabel) {
                        elTelemetryStatusLabel.textContent = 'VERIFIED PATIENT DATA LOADED (FROM PAGE 2)';
                    }
                    return;
                }
            }
        } catch (e) {
            console.warn('Could not read patient telemetry from sessionStorage:', e);
        }

        // Realistic demonstration profile if accessed directly
        patientData = {
            isDemo: true,
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
            notes: 'Family history of cardiovascular disease.'
        };

        if (elTelemetryStatusLabel) {
            elTelemetryStatusLabel.textContent = 'DEMO PATIENT PROFILE ACTIVE (ENTER YOUR DATA ON PAGE 2)';
        }
    }

    // -------------------------------------------------------------------------
    // 5. Render Top Telemetry Ribbon
    // -------------------------------------------------------------------------
    function renderTelemetryRibbon() {
        if (!elTelemetryGrid || !patientData) return;

        const basic = patientData.basic || {};
        const vitals = patientData.vitals || {};
        const lifestyle = patientData.lifestyle || {};

        const sys = vitals.systolicBP || '--';
        const dia = vitals.diastolicBP || '--';
        const chol = vitals.cholesterol || '--';
        const sugar = vitals.bloodSugar || '--';
        const bmi = vitals.bmi || '--';
        const smoking = lifestyle.smoking || 'Unspecified';
        const diabetes = lifestyle.diabetes || 'No';
        const activity = lifestyle.activity || 'Unspecified';
        const famHist = lifestyle.familyHistory || 'No';

        elTelemetryGrid.innerHTML = `
            <div class="body-metric-box">
                <span class="body-metric-label">Demographics</span>
                <span class="body-metric-value">${basic.age || '--'} YRS &bull; ${basic.sex || 'N/A'}</span>
            </div>

            <div class="body-metric-box">
                <span class="body-metric-label">Blood Pressure</span>
                <span class="body-metric-value" style="color:${sys >= 140 || dia >= 90 ? '#ff6b81' : sys >= 130 ? '#ffc93c' : '#38edff'};">${sys}/${dia} mmHg</span>
            </div>

            <div class="body-metric-box">
                <span class="body-metric-label">Total Cholesterol</span>
                <span class="body-metric-value" style="color:${chol >= 240 ? '#ff6b81' : chol >= 200 ? '#ffc93c' : '#ffffff'};">${chol} mg/dL</span>
            </div>

            <div class="body-metric-box">
                <span class="body-metric-label">Fasting Glucose</span>
                <span class="body-metric-value" style="color:${sugar >= 126 ? '#ff6b81' : sugar >= 100 ? '#ffc93c' : '#ffffff'};">${sugar} mg/dL</span>
            </div>

            <div class="body-metric-box">
                <span class="body-metric-label">BMI</span>
                <span class="body-metric-value">${bmi} kg/m²</span>
            </div>

            <div class="body-metric-box">
                <span class="body-metric-label">Smoking</span>
                <span class="body-metric-value" style="color:${smoking === 'Current' ? '#ff6b81' : '#ffffff'};">${smoking}</span>
            </div>

            <div class="body-metric-box">
                <span class="body-metric-label">Diabetes</span>
                <span class="body-metric-value" style="color:${diabetes === 'Yes' ? '#ff6b81' : '#ffffff'};">${diabetes}</span>
            </div>

            <div class="body-metric-box">
                <span class="body-metric-label">Activity</span>
                <span class="body-metric-value" style="color:${activity === 'Low' ? '#ffc93c' : '#ffffff'};">${activity}</span>
            </div>

            <div class="body-metric-box">
                <span class="body-metric-label">Family CVD</span>
                <span class="body-metric-value">${famHist}</span>
            </div>
        `;
    }

    // -------------------------------------------------------------------------
    // 6. Render Side Health Factors List
    // -------------------------------------------------------------------------
    function renderHealthFactorsList() {
        if (!elFactorsScrollList || !patientData) return;

        const vitals = patientData.vitals || {};
        const lifestyle = patientData.lifestyle || {};

        const sys = Number(vitals.systolicBP);
        const dia = Number(vitals.diastolicBP);
        const chol = Number(vitals.cholesterol);
        const sugar = Number(vitals.bloodSugar);
        const bmi = Number(vitals.bmi);
        const smoking = lifestyle.smoking || 'Never';
        const diabetes = lifestyle.diabetes || 'No';
        const activity = lifestyle.activity || 'Moderate';
        const famHist = lifestyle.familyHistory || 'No';

        const factorCards = [];

        // BP Factor
        if (!isNaN(sys)) {
            const isStage2 = sys >= 140 || dia >= 90;
            const isStage1 = sys >= 130 || dia >= 80;
            factorCards.push({
                name: 'Blood Pressure',
                val: `${sys}/${dia} mmHg`,
                cls: isStage2 ? 'factor-red' : isStage1 ? 'factor-amber' : '',
                organs: 'Heart, Arteries, Brain, Kidneys',
                organTarget: 'arteries'
            });
        }

        // Cholesterol Factor
        if (!isNaN(chol)) {
            factorCards.push({
                name: 'Total Cholesterol',
                val: `${chol} mg/dL`,
                cls: chol >= 240 ? 'factor-red' : chol >= 200 ? 'factor-amber' : '',
                organs: 'Arteries, Aorta, Liver',
                organTarget: 'arteries'
            });
        }

        // Blood Glucose / Diabetes
        if (!isNaN(sugar)) {
            factorCards.push({
                name: 'Glycemic Regulation',
                val: diabetes === 'Yes' ? `Diabetes (${sugar} mg/dL)` : `${sugar} mg/dL`,
                cls: diabetes === 'Yes' || sugar >= 126 ? 'factor-red' : sugar >= 100 ? 'factor-amber' : '',
                organs: 'Blood Vessels, Kidneys, Peripheral Circulation',
                organTarget: 'kidneys'
            });
        }

        // Smoking
        factorCards.push({
            name: 'Smoking Status',
            val: smoking,
            cls: smoking === 'Current' ? 'factor-red' : '',
            organs: 'Heart, Lungs, Arteries, Peripheral Circulation',
            organTarget: smoking === 'Current' ? 'lungs' : 'heart'
        });

        // Physical Activity
        factorCards.push({
            name: 'Physical Activity',
            val: activity,
            cls: activity === 'Low' ? 'factor-amber' : '',
            organs: 'Veins, Heart, Cardiorespiratory Conditioning',
            organTarget: 'veins'
        });

        // Family History
        if (famHist === 'Yes') {
            factorCards.push({
                name: 'Family CVD History',
                val: 'First-Degree Relative',
                cls: 'factor-amber',
                organs: 'Arterial Systemic Genetics & Surveillance',
                organTarget: 'arteries'
            });
        }

        elFactorsScrollList.innerHTML = factorCards.map(fc => `
            <div class="body-factor-card ${fc.cls}" data-target-organ="${fc.organTarget}" title="Click to highlight connected organs in 3D">
                <div class="factor-top-row">
                    <span class="factor-name-tag">${fc.name}</span>
                    <span class="factor-value-text">${fc.val}</span>
                </div>
                <div class="factor-organs-note">
                    Connected Structures: <span class="factor-organs-list">${fc.organs}</span>
                </div>
            </div>
        `).join('');

        // Clicking a health factor card highlights its primary organ
        document.querySelectorAll('.body-factor-card').forEach(card => {
            card.addEventListener('click', () => {
                const target = card.getAttribute('data-target-organ');
                if (target && ORGAN_DATA[target]) {
                    selectOrgan(target);
                }
            });
        });
    }

    // -------------------------------------------------------------------------
    // 7. Initialize Three.js 3D Whole-Body Scene
    // -------------------------------------------------------------------------
    function initThreeScene() {
        canvasContainer = document.getElementById('bodyCanvasWrapper');
        canvasEl = document.getElementById('webgl-body-canvas');
        if (!canvasContainer || !canvasEl) return;

        try {
            // Guard against missing Three.js library
            if (typeof THREE === 'undefined') {
                throw new Error('Three.js library is not loaded');
            }

            // Explicitly ensure error overlay is hidden during normal initialization
            if (elErrorOverlay) {
                elErrorOverlay.hidden = true;
                elErrorOverlay.style.display = 'none';
            }

            // Ensure loader overlay is visible
            if (elLoaderOverlay) {
                elLoaderOverlay.hidden = false;
                elLoaderOverlay.style.display = 'flex';
                elLoaderOverlay.style.opacity = '1';
            }

            // Clean up any existing scene objects, loops, and listeners safely before re-init
            cleanupThreeScene();

            // Set up camera target
            if (!cameraTarget.pos) {
                cameraTarget.pos = new THREE.Vector3(0, 0.3, 7.2);
                cameraTarget.lookAt = new THREE.Vector3(0, 0.2, 0);
            } else {
                cameraTarget.pos.set(0, 0.3, 7.2);
                cameraTarget.lookAt.set(0, 0.2, 0);
            }
            clock = new THREE.Clock();

            // 1. Scene
            scene = new THREE.Scene();
            scene.fog = new THREE.FogExp2(0x01040a, 0.045);

            // 2. Camera with dimension fallback
            const width = canvasContainer.clientWidth || 800;
            const height = canvasContainer.clientHeight || 560;
            const aspect = width / height;
            camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
            camera.position.set(0, 0.3, 7.2);

            // 3. Renderer
            renderer = new THREE.WebGLRenderer({
                canvas: canvasEl,
                antialias: true,
                alpha: true,
                powerPreference: 'high-performance'
            });
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.25;

            // 4. Controls
            if (typeof THREE.OrbitControls === 'function') {
                controls = new THREE.OrbitControls(camera, renderer.domElement);
                controls.enableDamping = true;
                controls.dampingFactor = 0.05;
                controls.minDistance = 3.2;
                controls.maxDistance = 12.0;
                controls.maxPolarAngle = Math.PI * 0.95;
                controls.minPolarAngle = Math.PI * 0.05;
                controls.target.set(0, 0.2, 0);
            }

            // 5. Lighting
            const ambientLight = new THREE.AmbientLight(0x071536, 1.2);
            scene.add(ambientLight);

            const keyLight = new THREE.DirectionalLight(0x00f3ff, 1.5);
            keyLight.position.set(3, 5, 4);
            scene.add(keyLight);

            const fillLight = new THREE.DirectionalLight(0x0066ff, 1.2);
            fillLight.position.set(-3, 3, -2);
            scene.add(fillLight);

            const rimLight = new THREE.DirectionalLight(0xff1e42, 1.1);
            rimLight.position.set(0, -4, -3);
            scene.add(rimLight);

            // 6. Build the 3D Avatar & Cardiovascular System
            buildFullBodyAnatomy();

            // 7. Raycasting for Interaction
            setupRaycasting();

            // 8. Event Listeners
            window.addEventListener('resize', onWindowResize);

            // Loader overlay will be hidden when authentic medical models finish loading
            setTimeout(() => {
                if (elLoaderOverlay && elLoaderOverlay.style.display !== 'none') {
                    elLoaderOverlay.style.opacity = '0';
                    setTimeout(() => { 
                        elLoaderOverlay.hidden = true; 
                        elLoaderOverlay.style.display = 'none';
                    }, 400);
                }
            }, 8000);

            // 9. Start Render Loop
            animate();
        } catch (err) {
            console.error('[TSVP 3D Body Viewer] Scene initialization failed:', err);
            showSceneError(err.message || 'WebGL context or 3D engine error.');
        }
    }

    function showSceneError(message) {
        if (elLoaderOverlay) {
            elLoaderOverlay.hidden = true;
            elLoaderOverlay.style.display = 'none';
        }
        if (elErrorOverlay) {
            const errorMsgEl = document.getElementById('errorMessageText');
            if (errorMsgEl) {
                errorMsgEl.textContent = message || 'Falling back to interactive vascular schematic.';
            }
            elErrorOverlay.hidden = false;
            elErrorOverlay.style.display = 'flex';
            elErrorOverlay.style.opacity = '1';
        }
    }

    function cleanupThreeScene() {
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        window.removeEventListener('resize', onWindowResize);

        if (controls) {
            if (typeof controls.dispose === 'function') {
                controls.dispose();
            }
            controls = null;
        }

        if (scene) {
            scene.traverse(child => {
                if (child.isMesh || child.isLine || child.isPoints) {
                    if (child.geometry && typeof child.geometry.dispose === 'function') {
                        child.geometry.dispose();
                    }
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m && typeof m.dispose === 'function' && m.dispose());
                        } else if (typeof child.material.dispose === 'function') {
                            child.material.dispose();
                        }
                    }
                }
            });
            while (scene.children && scene.children.length > 0) {
                scene.remove(scene.children[0]);
            }
            scene = null;
        }

        if (renderer) {
            if (typeof renderer.dispose === 'function') {
                renderer.dispose();
            }
            renderer = null;
        }

        avatarGroup = null;
        bodySilhouetteGroup = null;
        silhouetteAnteriorGroup = null;
        silhouettePosteriorGroup = null;
        organsGroup = null;
        vascularTreeGroup = null;
        externalModelGroup = null;
        selectionBeacon = null;
        isExternalModelLoaded = false;
        organMeshes.clear();
    }

    function retrySceneInit() {
        if (elErrorOverlay) {
            elErrorOverlay.hidden = true;
            elErrorOverlay.style.display = 'none';
        }
        if (elLoaderOverlay) {
            elLoaderOverlay.hidden = false;
            elLoaderOverlay.style.display = 'flex';
            elLoaderOverlay.style.opacity = '1';
        }
        cleanupThreeScene();
        setTimeout(() => {
            initThreeScene();
            selectOrgan(selectedOrganKey || 'all');
        }, 150);
    }

    // -------------------------------------------------------------------------
    // 8. Authentic Anatomical 3D Human Model & Cardiovascular Atlas Loader
    // -------------------------------------------------------------------------

    function buildFullBodyAnatomy() {
        avatarGroup = new THREE.Group();
        scene.add(avatarGroup);

        // Scaled by 3.0 and centered at Y = -2.50 to place feet at -2.50 and crown at +2.50
        avatarGroup.scale.set(3.0, 3.0, 3.0);
        avatarGroup.position.set(0, -2.50, 0);

        bodySilhouetteGroup = new THREE.Group();
        silhouetteAnteriorGroup = new THREE.Group();
        silhouettePosteriorGroup = new THREE.Group();
        bodySilhouetteGroup.add(silhouetteAnteriorGroup);
        bodySilhouetteGroup.add(silhouettePosteriorGroup);

        organsGroup = new THREE.Group();
        vascularTreeGroup = new THREE.Group();
        heartGroup = new THREE.Group();
        externalModelGroup = new THREE.Group();

        avatarGroup.add(bodySilhouetteGroup);
        avatarGroup.add(organsGroup);
        avatarGroup.add(vascularTreeGroup);
        avatarGroup.add(heartGroup);
        avatarGroup.add(externalModelGroup);

        // 1. Build 3D Selection Targeting Beacon
        buildSelectionBeacon();

        // 2. Load the Authentic Multi-Layer Medical Atlas
        loadAuthenticMedicalAtlas();
    }

    // =========================================================================
    // Authentic Multi-Layer Anatomical Asset Loader (Z-Anatomy / BodyParts3D / NIH)
    // =========================================================================
    function loadAuthenticMedicalAtlas() {
        if (typeof THREE.GLTFLoader === 'undefined') {
            console.error('[TSVP 3D Body] THREE.GLTFLoader is not available');
            showSceneError('GLTFLoader library not loaded.');
            return;
        }

        const loader = new THREE.GLTFLoader();
        if (typeof THREE.DRACOLoader !== 'undefined') {
            const dracoLoader = new THREE.DRACOLoader();
            dracoLoader.setDecoderPath('libs/draco/');
            dracoLoader.setDecoderConfig({ type: 'js' });
            loader.setDRACOLoader(dracoLoader);
        }

        const loaderText = document.getElementById('loaderText');
        const updateProgress = (step, total, msg) => {
            if (loaderText) {
                loaderText.textContent = msg + ' (' + step + '/' + total + ')...';
            }
        };

        let loadedCount = 0;
        const totalModels = 5;

        const checkAllLoaded = () => {
            loadedCount++;
            if (loadedCount >= totalModels) {
                setLayerMode(currentLayerMode || 'translucent');
                if (elHudModelBadge) {
                    elHudModelBadge.textContent = 'Z-ANATOMY ATLAS (CC-BY-SA 4.0)';
                    elHudModelBadge.classList.add('active-external');
                }
                if (elLoaderOverlay) {
                    elLoaderOverlay.style.opacity = '0';
                    setTimeout(() => {
                        elLoaderOverlay.hidden = true;
                        elLoaderOverlay.style.display = 'none';
                    }, 400);
                }
            }
        };

        // 1. Cardiovascular System: 676 real blood vessels (dolasim.glb)
        updateProgress(1, totalModels, 'PARSING CARDIOVASCULAR NETWORK');
        loader.load('assets/dolasim.glb', (gltf) => {
            processCardiovascularVessels(gltf.scene);
            checkAllLoaded();
        }, undefined, (err) => {
            console.warn('[TSVP] dolasim.glb load notice:', err);
            checkAllLoaded();
        });

        // 2. Visceral Organs: Bilateral Kidneys, Liver Segments, Lungs (ic-organlar.glb)
        updateProgress(2, totalModels, 'PARSING VISCERAL INTERNAL ORGANS');
        loader.load('assets/ic-organlar.glb', (gltf) => {
            processVisceralOrgans(gltf.scene);
            checkAllLoaded();
        }, undefined, (err) => {
            console.warn('[TSVP] ic-organlar.glb load notice:', err);
            checkAllLoaded();
        });

        // 3. Real 3D Heart: NIH Visible Human Male Anatomical Heart (VH_M_Heart.glb)
        updateProgress(3, totalModels, 'PARSING VISIBLE HUMAN 3D HEART');
        loader.load('assets/VH_M_Heart.glb', (gltf) => {
            processHeartModel(gltf.scene);
            checkAllLoaded();
        }, undefined, (err) => {
            console.warn('[TSVP] VH_M_Heart.glb load notice:', err);
            checkAllLoaded();
        });

        // 4. Neurovascular System: Brain & Cerebral Structures (sinir.glb)
        updateProgress(4, totalModels, 'PARSING NEUROVASCULAR STRUCTURES');
        loader.load('assets/sinir.glb', (gltf) => {
            processBrainModel(gltf.scene);
            checkAllLoaded();
        }, undefined, (err) => {
            console.warn('[TSVP] sinir.glb load notice:', err);
            checkAllLoaded();
        });

        // 5. Muscular System: 683 real human anatomical muscles (kas.glb)
        updateProgress(5, totalModels, 'PARSING FULL-BODY ANATOMICAL SILHOUETTE');
        loader.load('assets/kas.glb', (gltf) => {
            processMuscularLayer(gltf.scene);
            checkAllLoaded();
        }, undefined, (err) => {
            console.warn('[TSVP] kas.glb load notice:', err);
            checkAllLoaded();
        });
    }

    // A. Process Systemic Cardiovascular Vessels (Arteries & Veins)
    function processCardiovascularVessels(loadedScene) {
        if (!vascularTreeGroup || !loadedScene) return;

        const arterialMat = new THREE.MeshStandardMaterial({
            color: 0xff1e42,
            emissive: 0xaa0022,
            emissiveIntensity: 0.85,
            roughness: 0.22,
            metalness: 0.35
        });

        const venousMat = new THREE.MeshStandardMaterial({
            color: 0x00a8ff,
            emissive: 0x0044aa,
            emissiveIntensity: 0.75,
            roughness: 0.22,
            metalness: 0.35
        });

        const aortaGroup = new THREE.Group();
        const venaCavaGroup = new THREE.Group();
        const arteriesGroup = new THREE.Group();
        const veinsGroup = new THREE.Group();
        const peripheralGroup = new THREE.Group();

        loadedScene.traverse(child => {
            if (child.isMesh) {
                const name = (child.name || '').toLowerCase();
                const isArtery = name.includes('arter') || name.includes('aorta') || name.includes('carotid') || 
                                 name.includes('femoral') || name.includes('subclavian') || name.includes('iliac') || 
                                 name.includes('celiac') || name.includes('mesenteric') || name.includes('coronary') ||
                                 name.includes('pulmonary trunk');
                const isVein = name.includes('vein') || name.includes('cava') || name.includes('jugular') || 
                               name.includes('saphenous') || name.includes('portal');

                child.material = isArtery ? arterialMat.clone() : (isVein ? venousMat.clone() : arterialMat.clone());
                child.castShadow = false;
                child.receiveShadow = false;

                if (name.includes('aorta')) {
                    child.userData.organKey = 'aorta';
                    aortaGroup.add(child.clone());
                } else if (name.includes('cava')) {
                    child.userData.organKey = 'vena_cava';
                    venaCavaGroup.add(child.clone());
                } else if (name.includes('femoral') || name.includes('tibial') || name.includes('plantar') || name.includes('radial') || name.includes('ulnar') || name.includes('palmar')) {
                    child.userData.organKey = 'peripheral';
                    peripheralGroup.add(child.clone());
                } else if (isArtery) {
                    child.userData.organKey = 'arteries';
                    arteriesGroup.add(child.clone());
                } else {
                    child.userData.organKey = 'veins';
                    veinsGroup.add(child.clone());
                }
            }
        });

        vascularTreeGroup.add(loadedScene);
        registerOrganObject('aorta', aortaGroup);
        registerOrganObject('vena_cava', venaCavaGroup);
        registerOrganObject('arteries', arteriesGroup);
        registerOrganObject('veins', veinsGroup);
        registerOrganObject('peripheral', peripheralGroup);
    }

    // B. Process Visceral Organs (Lungs, Liver, Bilateral Kidneys)
    function processVisceralOrgans(loadedScene) {
        if (!organsGroup || !loadedScene) return;

        const lungMat = new THREE.MeshStandardMaterial({
            color: 0x06b6d4,
            emissive: 0x083344,
            emissiveIntensity: 0.5,
            roughness: 0.35,
            metalness: 0.2,
            transparent: true,
            opacity: 0.70
        });

        const liverMat = new THREE.MeshStandardMaterial({
            color: 0xb45309,
            emissive: 0x451a03,
            emissiveIntensity: 0.45,
            roughness: 0.4,
            metalness: 0.2
        });

        const kidneyMat = new THREE.MeshStandardMaterial({
            color: 0xd97706,
            emissive: 0x78350f,
            emissiveIntensity: 0.5,
            roughness: 0.35,
            metalness: 0.25
        });

        const digestiveMat = new THREE.MeshStandardMaterial({
            color: 0x8b5cf6,
            emissive: 0x3b0764,
            emissiveIntensity: 0.4,
            roughness: 0.4,
            metalness: 0.2
        });

        const lungsGroup = new THREE.Group();
        const liverGroup = new THREE.Group();
        const kidneysGroup = new THREE.Group();

        loadedScene.traverse(child => {
            if (child.isMesh) {
                const name = (child.name || '').toLowerCase();
                if (name.includes('lung') || name.includes('bronch') || name.includes('trachea') || name.includes('pleura')) {
                    child.material = lungMat.clone();
                    child.userData.organKey = 'lungs';
                    lungsGroup.add(child.clone());
                } else if (name.includes('liver') || name.includes('gallbladder')) {
                    child.material = liverMat.clone();
                    child.userData.organKey = 'liver';
                    liverGroup.add(child.clone());
                } else if (name.includes('kidney') || name.includes('renal') || name.includes('ureter')) {
                    child.material = kidneyMat.clone();
                    child.userData.organKey = 'kidneys';
                    kidneysGroup.add(child.clone());
                } else {
                    child.material = digestiveMat.clone();
                }
            }
        });

        organsGroup.add(loadedScene);
        registerOrganObject('lungs', lungsGroup);
        registerOrganObject('liver', liverGroup);
        registerOrganObject('kidneys', kidneysGroup);
    }

    // C. Process NIH Visible Human Male Anatomical 3D Heart
    function processHeartModel(loadedScene) {
        if (!heartGroup || !loadedScene) return;

        const heartMyoMat = new THREE.MeshStandardMaterial({
            color: 0xff1e42,
            emissive: 0xaa0022,
            emissiveIntensity: 0.90,
            roughness: 0.28,
            metalness: 0.35
        });

        const atriumMat = new THREE.MeshStandardMaterial({
            color: 0xd90429,
            emissive: 0x770011,
            emissiveIntensity: 0.75,
            roughness: 0.35,
            metalness: 0.25
        });

        const valveMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x334155,
            emissiveIntensity: 0.3,
            roughness: 0.2,
            metalness: 0.1
        });

        loadedScene.traverse(child => {
            if (child.isMesh) {
                const name = (child.name || '').toLowerCase();
                if (name.includes('atrium')) {
                    child.material = atriumMat.clone();
                } else if (name.includes('valve')) {
                    child.material = valveMat.clone();
                } else {
                    child.material = heartMyoMat.clone();
                }
                child.userData.organKey = 'heart';
            }
        });

        // Offset heart into cardiac notch (mediastinum) alignment
        loadedScene.position.set(0.00, 0.825, 0.025);
        heartGroup.add(loadedScene);
        registerOrganObject('heart', heartGroup);
    }

    // D. Process Brain & Neurovascular Structures
    function processBrainModel(loadedScene) {
        if (!organsGroup || !loadedScene) return;

        const brainMat = new THREE.MeshStandardMaterial({
            color: 0x38edff,
            emissive: 0x005577,
            emissiveIntensity: 0.65,
            roughness: 0.35,
            metalness: 0.3
        });

        const brainGroup = new THREE.Group();
        loadedScene.traverse(child => {
            if (child.isMesh) {
                const name = (child.name || '').toLowerCase();
                if (name.includes('midbrain') || name.includes('cerebell') || name.includes('thalam') || 
                    name.includes('hypothalam') || name.includes('pons') || name.includes('medulla') || 
                    name.includes('falx') || name.includes('brain')) {
                    child.material = brainMat.clone();
                    child.userData.organKey = 'brain';
                    brainGroup.add(child.clone());
                } else {
                    // Hide peripheral nerve tracts to maintain clean visualization
                    child.visible = false;
                }
            }
        });

        organsGroup.add(loadedScene);
        registerOrganObject('brain', brainGroup);
    }

    // E. Process 683 Real Human Muscles (Genuine Contours & Silhouette)
    function processMuscularLayer(loadedScene) {
        if (!silhouetteAnteriorGroup || !silhouettePosteriorGroup || !loadedScene) return;

        const muscleMat = new THREE.MeshStandardMaterial({
            color: 0x07284a,
            emissive: 0x002d55,
            emissiveIntensity: 0.35,
            roughness: 0.28,
            metalness: 0.65,
            transparent: true,
            opacity: 0.18,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        const anteriorNames = [
            'pectoralis', 'rectus abdominis', 'external abdominal oblique',
            'internal abdominal oblique', 'linea alba', 'pyramidalis',
            'sternocleidomastoid', 'serratus anterior', 'transversus abdominis'
        ];

        loadedScene.traverse(child => {
            if (child.isMesh) {
                child.material = muscleMat.clone();
                const name = (child.name || '').toLowerCase();
                const isAnteriorTorso = anteriorNames.some(t => name.includes(t)) || 
                                       (child.position.y > 0.85 && child.position.y < 1.55 && child.position.z > 0.015);

                if (isAnteriorTorso) {
                    silhouetteAnteriorGroup.add(child.clone());
                } else {
                    silhouettePosteriorGroup.add(child.clone());
                }
            }
        });
    }

    function buildSelectionBeacon() {
        const beaconGeom = new THREE.TorusGeometry(0.12, 0.008, 16, 36);
        const beaconMat = new THREE.MeshBasicMaterial({
            color: 0x00f3ff,
            transparent: true,
            opacity: 0.85
        });
        selectionBeacon = new THREE.Mesh(beaconGeom, beaconMat);
        selectionBeacon.rotation.x = Math.PI / 2;
        selectionBeacon.visible = false;
        avatarGroup.add(selectionBeacon);
    }

    // =========================================================================
    // F. Layer Mode Controls (Translucent, Cutaway, Internal Only, Surface)
    // =========================================================================
    function setLayerMode(mode) {
        currentLayerMode = mode;

        [btnLayerTranslucent, btnLayerCutaway, btnLayerInternal, btnLayerSurface].forEach(btn => {
            if (btn) btn.classList.remove('active');
        });

        if (mode === 'translucent') {
            if (btnLayerTranslucent) btnLayerTranslucent.classList.add('active');
            setShellVisibility(true, true, 0.18);
            setOrgansVisibility(true, 1.0);
            setVascularVisibility(true, 1.0);
            if (heartGroup) heartGroup.visible = true;
            if (elHudViewIndicator) elHudViewIndicator.textContent = 'TRANSLUCENT ANATOMY • 360° ACTIVE';
        } else if (mode === 'cutaway') {
            if (btnLayerCutaway) btnLayerCutaway.classList.add('active');
            // Hide anterior muscles to reveal internal visceral organs & thoracic cavity
            setShellVisibility(false, true, 0.35);
            setOrgansVisibility(true, 1.0);
            setVascularVisibility(true, 1.0);
            if (heartGroup) heartGroup.visible = true;
            if (elHudViewIndicator) elHudViewIndicator.textContent = 'ANTERIOR VISCERAL CUTAWAY • 360° ACTIVE';
        } else if (mode === 'internal') {
            if (btnLayerInternal) btnLayerInternal.classList.add('active');
            // Hide all muscular silhouettes
            setShellVisibility(false, false, 0);
            setOrgansVisibility(true, 1.0);
            setVascularVisibility(true, 1.0);
            if (heartGroup) heartGroup.visible = true;
            if (elHudViewIndicator) elHudViewIndicator.textContent = 'INTERNAL ORGANS & VASCULAR CIRCUIT';
        } else if (mode === 'surface') {
            if (btnLayerSurface) btnLayerSurface.classList.add('active');
            // Solid surface musculature
            setShellVisibility(true, true, 0.88);
            setOrgansVisibility(false, 0);
            setVascularVisibility(false, 0);
            if (heartGroup) heartGroup.visible = false;
            if (elHudViewIndicator) elHudViewIndicator.textContent = 'SURFACE ANATOMICAL SILHOUETTE';
        }
    }

    function setShellVisibility(anteriorVisible, posteriorVisible, opacity) {
        if (silhouetteAnteriorGroup) {
            silhouetteAnteriorGroup.visible = anteriorVisible;
            silhouetteAnteriorGroup.traverse(child => {
                if (child.isMesh && child.material && child.material.transparent !== undefined) {
                    child.material.opacity = opacity;
                }
            });
        }
        if (silhouettePosteriorGroup) {
            silhouettePosteriorGroup.visible = posteriorVisible;
            silhouettePosteriorGroup.traverse(child => {
                if (child.isMesh && child.material && child.material.transparent !== undefined) {
                    child.material.opacity = opacity;
                }
            });
        }
    }

    function setOrgansVisibility(visible, opacity) {
        if (organsGroup) {
            organsGroup.visible = visible;
            if (visible) {
                organsGroup.traverse(child => {
                    if (child.isMesh && child.material && child.material.transparent) {
                        child.material.opacity = Math.min(1.0, opacity);
                    }
                });
            }
        }
        if (heartGroup) {
            heartGroup.visible = visible;
        }
    }

    function setVascularVisibility(visible, opacity) {
        if (vascularTreeGroup) {
            vascularTreeGroup.visible = visible;
        }
    }

    function loadExternalGLBFromFile(file) {
        if (!file || typeof THREE.GLTFLoader === 'undefined') return;
        const url = URL.createObjectURL(file);

        if (elLoaderOverlay) {
            elLoaderOverlay.hidden = false;
            elLoaderOverlay.style.display = 'flex';
            elLoaderOverlay.style.opacity = '1';
            const loaderText = document.getElementById('loaderText');
            if (loaderText) loaderText.textContent = 'PARSING CUSTOM 3D CAD MODEL...';
        }

        const loader = new THREE.GLTFLoader();
        if (typeof THREE.DRACOLoader !== 'undefined') {
            const dracoLoader = new THREE.DRACOLoader();
            dracoLoader.setDecoderPath('libs/draco/');
            dracoLoader.setDecoderConfig({ type: 'js' });
            loader.setDRACOLoader(dracoLoader);
        }

        loader.load(
            url,
            (gltf) => {
                integrateLoadedGLB(gltf.scene, file.name);
                setTimeout(() => {
                    if (elLoaderOverlay) {
                        elLoaderOverlay.style.opacity = '0';
                        setTimeout(() => {
                            elLoaderOverlay.hidden = true;
                            elLoaderOverlay.style.display = 'none';
                        }, 300);
                    }
                }, 200);
            },
            undefined,
            (err) => {
                console.error('Failed to load custom GLB file:', err);
                alert('Could not load 3D file: ' + (err.message || 'Unsupported GLB format'));
                if (elLoaderOverlay) {
                    elLoaderOverlay.hidden = true;
                    elLoaderOverlay.style.display = 'none';
                }
            }
        );
    }

    function integrateLoadedGLB(loadedScene, sourceName) {
        if (!avatarGroup || !loadedScene) return;

        const box = new THREE.Box3().setFromObject(loadedScene);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const targetHeight = 1.67; // in avatar local meter space
        const scaleFactor = targetHeight / (size.y || maxDim || 1);

        loadedScene.scale.set(scaleFactor, scaleFactor, scaleFactor);
        loadedScene.position.set(-center.x * scaleFactor, -center.y * scaleFactor + 0.835, -center.z * scaleFactor);

        if (externalModelGroup) {
            avatarGroup.remove(externalModelGroup);
        }
        externalModelGroup = new THREE.Group();
        externalModelGroup.add(loadedScene);
        avatarGroup.add(externalModelGroup);

        isExternalModelLoaded = true;

        if (elHudModelBadge) {
            elHudModelBadge.textContent = 'CUSTOM CAD: ' + sourceName.split('/').pop();
            elHudModelBadge.classList.add('active-external');
        }

        loadedScene.traverse(child => {
            if (child.isMesh) {
                const nameLower = (child.name || '').toLowerCase();
                for (const key of Object.keys(ORGAN_DATA)) {
                    if (nameLower.includes(key)) {
                        child.userData.organKey = key;
                        organMeshes.set(key, child);
                        break;
                    }
                }
            }
        });
    }

    // Helper to register 3D organ groups for raycasting & focus
    function registerOrganObject(key, objGroup) {
        organMeshes.set(key, objGroup);
        objGroup.traverse(child => {
            if (child.isMesh) {
                child.userData.organKey = key;
            }
        });
    }

    // -------------------------------------------------------------------------
    // -------------------------------------------------------------------------
    // 9. Raycasting Setup for 3D Organ Selection & Hover
    // -------------------------------------------------------------------------
    function setupRaycasting() {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        function getCanvasRelativeCoords(event) {
            const rect = canvasEl.getBoundingClientRect();
            return {
                x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
                y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
                clientX: event.clientX,
                clientY: event.clientY
            };
        }

        function getIntersectableObjects() {
            const targets = [];
            if (organsGroup && organsGroup.visible) targets.push(...organsGroup.children);
            if (vascularTreeGroup && vascularTreeGroup.visible) targets.push(...vascularTreeGroup.children);
            if (heartGroup && heartGroup.visible) targets.push(...heartGroup.children);
            if (externalModelGroup && externalModelGroup.visible) targets.push(...externalModelGroup.children);
            return targets;
        }

        // Hover Tooltip
        canvasEl.addEventListener('mousemove', (e) => {
            const coords = getCanvasRelativeCoords(e);
            mouse.x = coords.x;
            mouse.y = coords.y;

            raycaster.setFromCamera(mouse, camera);
            const targets = getIntersectableObjects();
            const intersects = raycaster.intersectObjects(targets, true);

            if (intersects.length > 0) {
                let hitOrganKey = null;
                for (let i = 0; i < intersects.length; i++) {
                    let obj = intersects[i].object;
                    while (obj && obj !== scene) {
                        if (obj.userData && obj.userData.organKey) {
                            hitOrganKey = obj.userData.organKey;
                            break;
                        }
                        obj = obj.parent;
                    }
                    if (hitOrganKey) break;
                }

                if (hitOrganKey && ORGAN_DATA[hitOrganKey]) {
                    canvasContainer.style.cursor = 'pointer';
                    if (elTooltip && elTooltipTitle) {
                        elTooltipTitle.textContent = ORGAN_DATA[hitOrganKey].name;
                        elTooltip.hidden = false;
                    }
                    return;
                }
            }

            canvasContainer.style.cursor = isAutoRotating ? 'grab' : 'default';
            if (elTooltip) elTooltip.hidden = true;
        });

        canvasEl.addEventListener('mouseleave', () => {
            if (elTooltip) elTooltip.hidden = true;
        });

        // Click Selection
        canvasEl.addEventListener('click', (e) => {
            const coords = getCanvasRelativeCoords(e);
            mouse.x = coords.x;
            mouse.y = coords.y;

            raycaster.setFromCamera(mouse, camera);
            const targets = getIntersectableObjects();
            const intersects = raycaster.intersectObjects(targets, true);

            if (intersects.length > 0) {
                for (let i = 0; i < intersects.length; i++) {
                    let obj = intersects[i].object;
                    while (obj && obj !== scene) {
                        if (obj.userData && obj.userData.organKey) {
                            selectOrgan(obj.userData.organKey);
                            return;
                        }
                        obj = obj.parent;
                    }
                }
            }
        });
    }

    // -------------------------------------------------------------------------
    // 10. Select Organ & Update 3D Highlight & Information Panel
    // -------------------------------------------------------------------------
    function selectOrgan(organKey) {
        if (!ORGAN_DATA[organKey]) return;
        selectedOrganKey = organKey;

        // 1. Update Shelf Button Highlights
        document.querySelectorAll('.organ-pill-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-organ') === organKey);
        });

        // 2. Update Viewport HUD
        if (elHudActiveStructureName) {
            elHudActiveStructureName.textContent = ORGAN_DATA[organKey].name.toUpperCase();
        }

        // 3. Update 3D Selection Beacon & Camera Anchor
        const anchor = organAnchors[organKey] || organAnchors['all'];
        if (selectionBeacon) {
            if (organKey === 'all') {
                selectionBeacon.visible = false;
            } else {
                const bPos = anchor.localPos || anchor.pos;
                selectionBeacon.position.set(...bPos);
                selectionBeacon.visible = true;
            }
        }

        // Smoothly adjust camera target to world coordinates of selected organ
        if (cameraTarget && cameraTarget.lookAt) {
            const lookPos = anchor.pos || anchor.lookAt;
            cameraTarget.lookAt.set(...lookPos);
        }

        // 4. Update Organ Information Panel
        renderOrganInfoPanel(organKey);

        // 5. Toggle Heart Action Button
        if (heartActionBox) {
            heartActionBox.hidden = (organKey !== 'heart');
        }
    }

    // Render Side Panel with the 4 Mandated Sections (Personalized to Patient Input)
    function renderOrganInfoPanel(organKey) {
        const data = ORGAN_DATA[organKey];
        if (!data) return;

        if (organNameHeading) organNameHeading.textContent = data.name;
        if (organCategoryTag) organCategoryTag.textContent = data.category;
        if (organStatusBadge) organStatusBadge.textContent = data.status;

        if (organNormalFunction) organNormalFunction.textContent = data.normal;
        if (organCardioConnection) organCardioConnection.textContent = data.cardio;

        // Dynamic patient factors based on actual submitted values
        const vitals = (patientData && patientData.vitals) || {};
        const lifestyle = (patientData && patientData.lifestyle) || {};
        const sys = vitals.systolicBP || (patientData && patientData.systolicBP);
        const dia = vitals.diastolicBP || (patientData && patientData.diastolicBP);
        const chol = vitals.cholesterol || (patientData && patientData.cholesterol);
        const cholUnit = vitals.cholesterolUnit || (patientData && patientData.cholesterolUnit) || 'mg/dL';
        const sugar = vitals.bloodSugar || (patientData && patientData.bloodSugar);
        const sugarUnit = vitals.bloodSugarUnit || (patientData && patientData.bloodSugarUnit) || 'mg/dL';
        const bmi = vitals.bmi || (patientData && patientData.bmi);
        const smoking = lifestyle.smoking || (patientData && patientData.smoking) || 'Never';
        const diabetes = lifestyle.diabetes || (patientData && patientData.diabetes) || 'No';
        const activity = lifestyle.activity || (patientData && patientData.activity) || 'Moderate';
        const famHist = lifestyle.familyHistory || (patientData && patientData.familyHistory) || 'No';

        let customFactorsText = data.factorsText;
        let customPills = data.factorsPills;

        if (sys && dia) {
            if (organKey === 'heart') {
                customFactorsText = `Your recorded resting blood pressure is ${sys}/${dia} mmHg, fasting blood sugar is ${sugar} ${sugarUnit}, and smoking status is '${smoking}'. High mechanical afterload or oxidative stress can elevate ventricular stroke work.`;
                customPills = [
                    { label: `BP: ${sys}/${dia} mmHg`, type: (sys >= 140 || dia >= 90) ? 'red' : (sys >= 130) ? 'amber' : 'cyan' },
                    { label: `Sugar: ${sugar} ${sugarUnit}`, type: (sugar >= 126 || diabetes === 'Yes') ? 'red' : (sugar >= 100) ? 'amber' : 'cyan' },
                    { label: `Smoking: ${smoking}`, type: (smoking === 'Current') ? 'red' : (smoking === 'Former') ? 'amber' : 'cyan' }
                ];
            } else if (organKey === 'aorta') {
                customFactorsText = `Your recorded systolic pressure is ${sys} mmHg and diastolic is ${dia} mmHg. The aortic root receives cyclic high-pressure systolic ejection directly from the left ventricle.`;
                customPills = [
                    { label: `Systolic: ${sys} mmHg`, type: (sys >= 140) ? 'red' : (sys >= 130) ? 'amber' : 'cyan' },
                    { label: `Diastolic: ${dia} mmHg`, type: (dia >= 90) ? 'red' : 'cyan' },
                    { label: 'Aortic Wall Compliance', type: 'cyan' }
                ];
            } else if (organKey === 'arteries') {
                customFactorsText = `Your recorded blood pressure is ${sys}/${dia} mmHg and total cholesterol is ${chol} ${cholUnit}. Chronic arterial wall shear stress and circulating lipids interact across systemic arterial beds.`;
                customPills = [
                    { label: `BP: ${sys}/${dia} mmHg`, type: (sys >= 140 || dia >= 90) ? 'red' : (sys >= 130) ? 'amber' : 'cyan' },
                    { label: `Cholesterol: ${chol} ${cholUnit}`, type: (chol >= 240) ? 'red' : (chol >= 200) ? 'amber' : 'cyan' },
                    { label: `Smoking: ${smoking}`, type: (smoking === 'Current') ? 'red' : 'cyan' }
                ];
            } else if (organKey === 'kidneys') {
                customFactorsText = `Your recorded blood pressure is ${sys}/${dia} mmHg and fasting glucose is ${sugar} ${sugarUnit}. Glomerular micro-arterioles rely on precise capillary perfusion gradients for plasma filtration.`;
                customPills = [
                    { label: `BP: ${sys}/${dia} mmHg`, type: (sys >= 140 || dia >= 90) ? 'red' : (sys >= 130) ? 'amber' : 'cyan' },
                    { label: `Glucose: ${sugar} ${sugarUnit}`, type: (sugar >= 126 || diabetes === 'Yes') ? 'red' : (sugar >= 100) ? 'amber' : 'cyan' }
                ];
            } else if (organKey === 'brain') {
                customFactorsText = `Your recorded blood pressure is ${sys}/${dia} mmHg and smoking status is '${smoking}'. Bilateral internal carotid arteries and the Circle of Willis sustain steady cerebral perfusion.`;
                customPills = [
                    { label: `BP: ${sys}/${dia} mmHg`, type: (sys >= 140 || dia >= 90) ? 'red' : (sys >= 130) ? 'amber' : 'cyan' },
                    { label: `Smoking: ${smoking}`, type: (smoking === 'Current') ? 'red' : 'cyan' },
                    { label: `Diabetes: ${diabetes}`, type: (diabetes === 'Yes') ? 'red' : 'cyan' }
                ];
            } else if (organKey === 'lungs') {
                customFactorsText = `Your recorded smoking status is '${smoking}' and physical activity level is '${activity}'. Pulmonary capillaries transfer oxygen to erythrocytes to oxygenate systemic arterial circulation.`;
                customPills = [
                    { label: `Smoking: ${smoking}`, type: (smoking === 'Current') ? 'red' : (smoking === 'Former') ? 'amber' : 'cyan' },
                    { label: `Fitness: ${activity}`, type: (activity === 'Low') ? 'amber' : 'cyan' }
                ];
            } else if (organKey === 'liver') {
                customFactorsText = `Your recorded total cholesterol is ${chol} ${cholUnit} and BMI is ${bmi} kg/m². Hepatic parenchyma synthesizes and clears circulating ApoB-containing lipoproteins.`;
                customPills = [
                    { label: `Cholesterol: ${chol} ${cholUnit}`, type: (chol >= 240) ? 'red' : (chol >= 200) ? 'amber' : 'cyan' },
                    { label: `BMI: ${bmi} kg/m²`, type: (bmi >= 30) ? 'red' : (bmi >= 25) ? 'amber' : 'cyan' }
                ];
            } else if (organKey === 'peripheral') {
                customFactorsText = `Your recorded physical activity is '${activity}', smoking status is '${smoking}', and blood glucose is ${sugar} ${sugarUnit}. Peripheral microvascular beds reflect distal perfusion in the limbs.`;
                customPills = [
                    { label: `Activity: ${activity}`, type: (activity === 'Low') ? 'amber' : 'cyan' },
                    { label: `Smoking: ${smoking}`, type: (smoking === 'Current') ? 'red' : 'cyan' }
                ];
            } else if (organKey === 'all') {
                customFactorsText = `Your submitted profile connects to this systemic network: BP ${sys}/${dia} mmHg, Cholesterol ${chol} ${cholUnit}, Fasting Glucose ${sugar} ${sugarUnit}, BMI ${bmi} kg/m², Smoking '${smoking}', Activity '${activity}', and Family History '${famHist}'.`;
                customPills = [
                    { label: `BP: ${sys}/${dia} mmHg`, type: (sys >= 140 || dia >= 90) ? 'red' : (sys >= 130) ? 'amber' : 'cyan' },
                    { label: `Chol: ${chol} ${cholUnit}`, type: (chol >= 240) ? 'red' : (chol >= 200) ? 'amber' : 'cyan' },
                    { label: `Glucose: ${sugar} ${sugarUnit}`, type: (sugar >= 126) ? 'red' : 'cyan' },
                    { label: `Activity: ${activity}`, type: (activity === 'Low') ? 'amber' : 'cyan' }
                ];
            }
        }

        if (organPatientFactorsText) organPatientFactorsText.textContent = customFactorsText;
        if (organWhatThisMeans) organWhatThisMeans.textContent = data.meaning;

        // Populate patient factor chips
        if (organPatientFactorsChips) {
            organPatientFactorsChips.innerHTML = customPills.map(p => `
                <span class="factor-chip chip-${p.type}">&bull; ${p.label}</span>
            `).join('');
        }
    }

    // -------------------------------------------------------------------------
    // 11. View Modes (Front, Back, Cardiovascular View)
    // -------------------------------------------------------------------------
    function setViewMode(mode) {
        currentViewMode = mode;

        [btnViewFront, btnViewBack, btnViewCirculatory].forEach(btn => {
            if (btn) btn.classList.remove('active');
        });

        if (mode === 'front') {
            if (btnViewFront) btnViewFront.classList.add('active');
            if (elHudViewIndicator) elHudViewIndicator.textContent = 'FRONT ANTERIOR VIEW';
            cameraTarget.pos.set(0, 0.3, 7.2);
            setBodySilhouetteOpacity(0.22);
        } else if (mode === 'back') {
            if (btnViewBack) btnViewBack.classList.add('active');
            if (elHudViewIndicator) elHudViewIndicator.textContent = 'BACK POSTERIOR VIEW';
            cameraTarget.pos.set(0, 0.3, -7.2);
            setBodySilhouetteOpacity(0.22);
        } else if (mode === 'circulatory') {
            if (btnViewCirculatory) btnViewCirculatory.classList.add('active');
            if (elHudViewIndicator) elHudViewIndicator.textContent = 'CARDIOVASCULAR TREE EMPHASIS';
            cameraTarget.pos.set(0, 0.2, 5.8);
            // Ultra-translucent silhouette to emphasize red/blue vascular tree
            setBodySilhouetteOpacity(0.04);
        }
    }

    function setBodySilhouetteOpacity(opacity) {
        if (!bodySilhouetteGroup) return;
        bodySilhouetteGroup.traverse(child => {
            if (child.isMesh && child.material) {
                child.material.opacity = opacity;
                child.material.transparent = true;
            }
        });
    }

    // -------------------------------------------------------------------------
    // 12. 3D Animation & Render Loop
    // -------------------------------------------------------------------------
    let clock = null;

    function animate() {
        if (!renderer || !scene || !camera) return;
        animationFrameId = requestAnimationFrame(animate);

        const elapsedTime = clock ? clock.getElapsedTime() : 0;

        // 1. Slow Auto-Rotation
        if (isAutoRotating && avatarGroup) {
            avatarGroup.rotation.y += 0.005;
        }

        // 2. Heartbeat Pulsation Animation
        const heartGroup = organMeshes.get('heart');
        if (heartGroup) {
            // Cardiac cycle pulse calculation (systolic contraction + diastolic expansion)
            const pulse = 1.0 + Math.sin(elapsedTime * 6.0) * 0.05 + Math.sin(elapsedTime * 12.0) * 0.02;
            heartGroup.scale.set(pulse, pulse, pulse);
        }

        // 3. Selection Beacon Animation
        if (selectionBeacon && selectionBeacon.visible) {
            selectionBeacon.rotation.z += 0.02;
            const beaconScale = 1.0 + Math.sin(elapsedTime * 4.0) * 0.12;
            selectionBeacon.scale.set(beaconScale, beaconScale, beaconScale);
        }

        // 4. Smooth Camera Interpolation towards target
        if (controls && cameraTarget && cameraTarget.lookAt) {
            controls.target.lerp(cameraTarget.lookAt, 0.05);
            controls.update();
        }

        renderer.render(scene, camera);
    }

    function onWindowResize() {
        if (!canvasContainer || !camera || !renderer) return;
        const width = canvasContainer.clientWidth || 800;
        const height = canvasContainer.clientHeight || 560;
        const aspect = width / (height || 1);
        camera.aspect = aspect;
        if (aspect < 1.15) {
            if (controls) {
                controls.minDistance = 2.5;
                controls.maxDistance = 14.0;
            }
        }
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

    // -------------------------------------------------------------------------
    // 13. UI Event Handlers
    // -------------------------------------------------------------------------
    function setupUIEventListeners() {
        // Shelf Buttons
        document.querySelectorAll('.organ-pill-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const organKey = btn.getAttribute('data-organ');
                selectOrgan(organKey);
            });
        });

        // View Mode Buttons
        if (btnViewFront) btnViewFront.addEventListener('click', () => setViewMode('front'));
        if (btnViewBack) btnViewBack.addEventListener('click', () => setViewMode('back'));
        if (btnViewCirculatory) btnViewCirculatory.addEventListener('click', () => setViewMode('circulatory'));

        // Rotation Toggle
        if (btnToggleRotate) {
            btnToggleRotate.addEventListener('click', () => {
                isAutoRotating = !isAutoRotating;
                btnToggleRotate.classList.toggle('active', isAutoRotating);
                if (rotateStateText) {
                    rotateStateText.textContent = isAutoRotating ? 'ROTATING' : 'PAUSED';
                }
            });
        }

        // Zoom In / Out
        if (btnZoomIn) {
            btnZoomIn.addEventListener('click', () => {
                if (camera) camera.position.multiplyScalar(0.85);
            });
        }

        if (btnZoomOut) {
            btnZoomOut.addEventListener('click', () => {
                if (camera) camera.position.multiplyScalar(1.15);
            });
        }

        // Reset View
        if (btnResetView) {
            btnResetView.addEventListener('click', () => {
                isAutoRotating = true;
                if (btnToggleRotate) btnToggleRotate.classList.add('active');
                if (rotateStateText) rotateStateText.textContent = 'ROTATING';
                if (avatarGroup) avatarGroup.rotation.y = 0;
                setViewMode('front');
                selectOrgan('all');
            });
        }

        // Reset Organ Focus Button
        if (btnResetOrganFocus) {
            btnResetOrganFocus.addEventListener('click', () => {
                selectOrgan('all');
            });
        }

        // Layer Mode Buttons
        if (btnLayerTranslucent) btnLayerTranslucent.addEventListener('click', () => setLayerMode('translucent'));
        if (btnLayerCutaway) btnLayerCutaway.addEventListener('click', () => setLayerMode('cutaway'));
        if (btnLayerInternal) btnLayerInternal.addEventListener('click', () => setLayerMode('internal'));
        if (btnLayerSurface) btnLayerSurface.addEventListener('click', () => setLayerMode('surface'));

        // External GLB File Input
        if (glbFileInput) {
            glbFileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    loadExternalGLBFromFile(e.target.files[0]);
                }
            });
        }

        // Retry 3D Scene Button (Fallback Recovery)
        const btnRetry = document.getElementById('btnRetryLoad');
        if (btnRetry) {
            btnRetry.addEventListener('click', (e) => {
                e.preventDefault();
                retrySceneInit();
            });
        }
    }

    // -------------------------------------------------------------------------
    // 14. Initialization
    // -------------------------------------------------------------------------
    loadPatientTelemetry();
    renderTelemetryRibbon();
    renderHealthFactorsList();
    initThreeScene();
    setupUIEventListeners();
    selectOrgan('all');

})();
