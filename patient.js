/**
 * TSVP — The Smart Vascular Predictor
 * Patient Profile & AI Assistant Controller
 */

(function () {
    'use strict';

    // -------------------------------------------------------------------------
    // 1. DOM Elements & State
    // -------------------------------------------------------------------------
    const form = document.getElementById('patientProfileForm');
    const btnAnalyzeRisk = document.getElementById('btnAnalyzeRisk');
    const btnBack = document.getElementById('btnBack');
    const telemetryModal = document.getElementById('telemetryModal');
    const modalDataSummary = document.getElementById('modalDataSummary');
    const btnDismissModal = document.getElementById('btnDismissModal');

    // BMI Mini Calculator Elements
    const bmiHelperToggle = document.getElementById('bmiHelperToggle');
    const bmiHelperBox = document.getElementById('bmiHelperBox');
    const calcHeight = document.getElementById('calcHeight');
    const calcWeight = document.getElementById('calcWeight');
    const btnApplyBmi = document.getElementById('btnApplyBmi');
    const patientBMI = document.getElementById('patientBMI');

    // AI Assistant Elements
    const btnToggleAi = document.getElementById('btnToggleAiAssistant');
    const aiDrawer = document.getElementById('aiAssistantDrawer');
    const btnCloseAi = document.getElementById('btnCloseAiAssistant');
    const aiChatForm = document.getElementById('aiChatForm');
    const btnSendChat = document.getElementById('btnSendChat');
    const aiInputText = document.getElementById('aiInputText');
    const chatMessages = document.getElementById('chatMessages');
    const aiConnectionDot = document.getElementById('aiConnectionDot');
    const aiConnectionText = document.getElementById('aiConnectionText');
    const apiConfigNotice = document.getElementById('apiConfigNotice');
    const promptChips = document.querySelectorAll('.prompt-chip');

    let isAiConfiguredOnBackend = false;

    // -------------------------------------------------------------------------
    // 2. BMI Quick Calculator
    // -------------------------------------------------------------------------
    if (bmiHelperToggle && bmiHelperBox) {
        bmiHelperToggle.addEventListener('click', () => {
            const isHidden = bmiHelperBox.hasAttribute('hidden');
            if (isHidden) {
                bmiHelperBox.removeAttribute('hidden');
            } else {
                bmiHelperBox.setAttribute('hidden', '');
            }
        });
    }

    if (btnApplyBmi && calcHeight && calcWeight && patientBMI) {
        btnApplyBmi.addEventListener('click', () => {
            const h = parseFloat(calcHeight.value);
            const w = parseFloat(calcWeight.value);

            if (!h || !w || h <= 50 || w <= 20) {
                alert('Please enter a valid height (cm) and weight (kg).');
                return;
            }

            const hMeters = h / 100;
            const bmi = (w / (hMeters * hMeters)).toFixed(1);
            patientBMI.value = bmi;
            bmiHelperBox.setAttribute('hidden', '');
            clearFieldError('bmi');
        });
    }

    // -------------------------------------------------------------------------
    // 3. Form Validation & Error Management
    // -------------------------------------------------------------------------
    function setFieldError(fieldId, message) {
        const group = document.getElementById(`group-${fieldId}`);
        const errorEl = document.getElementById(`error-${fieldId}`);
        if (group) group.classList.add('has-error');
        if (errorEl) errorEl.textContent = message;
    }

    function clearFieldError(fieldId) {
        const group = document.getElementById(`group-${fieldId}`);
        const errorEl = document.getElementById(`error-${fieldId}`);
        if (group) group.classList.remove('has-error');
        if (errorEl) errorEl.textContent = '';
    }

    // Attach real-time clear on input
    ['age', 'sex', 'systolic', 'diastolic', 'cholesterol', 'bloodsugar', 'bmi', 'smoking', 'diabetes', 'activity', 'family-history'].forEach(id => {
        const el = document.getElementById(`patient${id.charAt(0).toUpperCase() + id.slice(1)}`);
        if (el) {
            el.addEventListener('input', () => clearFieldError(id));
            el.addEventListener('change', () => clearFieldError(id));
        }
    });

    document.querySelectorAll('input[name="diabetes"]').forEach(r => {
        r.addEventListener('change', () => clearFieldError('diabetes'));
    });
    document.querySelectorAll('input[name="familyHistory"]').forEach(r => {
        r.addEventListener('change', () => clearFieldError('family-history'));
    });

    function validatePatientForm() {
        let isValid = true;
        let firstInvalidField = null;

        // 1. Age
        const ageVal = parseInt(document.getElementById('patientAge').value, 10);
        if (isNaN(ageVal) || ageVal < 18 || ageVal > 120) {
            setFieldError('age', 'Please enter a valid adult age between 18 and 120 years.');
            if (!firstInvalidField) firstInvalidField = document.getElementById('patientAge');
            isValid = false;
        } else {
            clearFieldError('age');
        }

        // 2. Sex
        const sexVal = document.getElementById('patientSex').value;
        if (!sexVal) {
            setFieldError('sex', 'Please select biological sex.');
            if (!firstInvalidField) firstInvalidField = document.getElementById('patientSex');
            isValid = false;
        } else {
            clearFieldError('sex');
        }

        // 3. Systolic BP
        const sysVal = parseInt(document.getElementById('patientSystolic').value, 10);
        if (isNaN(sysVal) || sysVal < 60 || sysVal > 260) {
            setFieldError('systolic', 'Valid range: 60 - 260 mmHg.');
            if (!firstInvalidField) firstInvalidField = document.getElementById('patientSystolic');
            isValid = false;
        } else {
            clearFieldError('systolic');
        }

        // 4. Diastolic BP
        const diaVal = parseInt(document.getElementById('patientDiastolic').value, 10);
        if (isNaN(diaVal) || diaVal < 40 || diaVal > 160) {
            setFieldError('diastolic', 'Valid range: 40 - 160 mmHg.');
            if (!firstInvalidField) firstInvalidField = document.getElementById('patientDiastolic');
            isValid = false;
        } else if (!isNaN(sysVal) && diaVal >= sysVal) {
            setFieldError('diastolic', 'Diastolic BP must be lower than Systolic BP.');
            if (!firstInvalidField) firstInvalidField = document.getElementById('patientDiastolic');
            isValid = false;
        } else {
            clearFieldError('diastolic');
        }

        // 5. Total Cholesterol
        const cholVal = parseInt(document.getElementById('patientCholesterol').value, 10);
        if (isNaN(cholVal) || cholVal < 70 || cholVal > 500) {
            setFieldError('cholesterol', 'Valid range: 70 - 500 mg/dL.');
            if (!firstInvalidField) firstInvalidField = document.getElementById('patientCholesterol');
            isValid = false;
        } else {
            clearFieldError('cholesterol');
        }

        // 6. Blood Sugar
        const sugarVal = parseInt(document.getElementById('patientBloodSugar').value, 10);
        if (isNaN(sugarVal) || sugarVal < 40 || sugarVal > 450) {
            setFieldError('bloodsugar', 'Valid range: 40 - 450 mg/dL.');
            if (!firstInvalidField) firstInvalidField = document.getElementById('patientBloodSugar');
            isValid = false;
        } else {
            clearFieldError('bloodsugar');
        }

        // 7. BMI
        const bmiVal = parseFloat(document.getElementById('patientBMI').value);
        if (isNaN(bmiVal) || bmiVal < 12 || bmiVal > 70) {
            setFieldError('bmi', 'Valid BMI range: 12.0 - 70.0 kg/m².');
            if (!firstInvalidField) firstInvalidField = document.getElementById('patientBMI');
            isValid = false;
        } else {
            clearFieldError('bmi');
        }

        // 8. Smoking
        const smokingVal = document.getElementById('patientSmoking').value;
        if (!smokingVal) {
            setFieldError('smoking', 'Please select smoking status.');
            if (!firstInvalidField) firstInvalidField = document.getElementById('patientSmoking');
            isValid = false;
        } else {
            clearFieldError('smoking');
        }

        // 9. Diabetes
        const diabetesRadio = document.querySelector('input[name="diabetes"]:checked');
        if (!diabetesRadio) {
            setFieldError('diabetes', 'Please indicate if diabetes has been diagnosed.');
            if (!firstInvalidField) firstInvalidField = document.getElementById('group-diabetes');
            isValid = false;
        } else {
            clearFieldError('diabetes');
        }

        // 10. Physical Activity
        const activityVal = document.getElementById('patientActivity').value;
        if (!activityVal) {
            setFieldError('activity', 'Please select regular physical activity level.');
            if (!firstInvalidField) firstInvalidField = document.getElementById('patientActivity');
            isValid = false;
        } else {
            clearFieldError('activity');
        }

        // 11. Family History
        const famHistoryRadio = document.querySelector('input[name="familyHistory"]:checked');
        if (!famHistoryRadio) {
            setFieldError('family-history', 'Please specify family history.');
            if (!firstInvalidField) firstInvalidField = document.getElementById('group-family-history');
            isValid = false;
        } else {
            clearFieldError('family-history');
        }

        if (!isValid && firstInvalidField) {
            firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (firstInvalidField.focus) firstInvalidField.focus();
        }

        return isValid;
    }

    // -------------------------------------------------------------------------
    // 4. Form Submission, FastAPI Analysis & Staging Handling
    // -------------------------------------------------------------------------
    function getApiBaseUrl() {
        if (typeof window !== 'undefined' && window.__TSVP_API_BASE_URL__) {
            return window.__TSVP_API_BASE_URL__.replace(/\/+$/, '');
        }
        const metaTag = document.querySelector('meta[name="api-base-url"]');
        if (metaTag && metaTag.content && metaTag.content.trim()) {
            return metaTag.content.trim().replace(/\/+$/, '');
        }
        if (window.location.port === '8001' || window.location.port === '3000' || window.location.port === '5173') {
            return `${window.location.protocol}//${window.location.hostname}:8000`;
        }
        return window.location.origin;
    }

    function showFormStatus(message, type = 'info') {
        const banner = document.getElementById('formStatusBanner');
        const textEl = document.getElementById('formStatusMessage');
        if (banner && textEl) {
            textEl.textContent = message;
            banner.className = `form-status-banner status-${type}`;
            banner.removeAttribute('hidden');
            banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    function hideFormStatus() {
        const banner = document.getElementById('formStatusBanner');
        if (banner) {
            banner.setAttribute('hidden', '');
        }
    }

    function setAnalyzeLoadingState(isLoading) {
        if (!btnAnalyzeRisk) return;
        btnAnalyzeRisk.disabled = isLoading;
        const labelEl = btnAnalyzeRisk.querySelector('.btn-label');
        if (isLoading) {
            btnAnalyzeRisk.classList.add('is-loading');
            if (labelEl) labelEl.textContent = 'ANALYZING CARDIOVASCULAR TELEMETRY...';
        } else {
            btnAnalyzeRisk.classList.remove('is-loading');
            if (labelEl) labelEl.textContent = 'ANALYZE RISK';
        }
    }

    async function handlePatientSubmit(e) {
        if (e && e.preventDefault) {
            e.preventDefault();
        }

        hideFormStatus();

        // 1. Client-side input validation
        if (!validatePatientForm()) {
            showFormStatus('Please correct the highlighted clinical fields before proceeding.', 'error');
            return;
        }

        // 2. Gather entered data
        const ageVal = parseInt(document.getElementById('patientAge').value, 10);
        const sexVal = document.getElementById('patientSex').value;
        const sysVal = parseInt(document.getElementById('patientSystolic').value, 10);
        const diaVal = parseInt(document.getElementById('patientDiastolic').value, 10);
        const cholVal = parseInt(document.getElementById('patientCholesterol').value, 10);
        const sugarVal = parseInt(document.getElementById('patientBloodSugar').value, 10);
        const bmiVal = parseFloat(document.getElementById('patientBMI').value);
        const smokeVal = document.getElementById('patientSmoking').value;
        const diabVal = document.querySelector('input[name="diabetes"]:checked').value;
        const actVal = document.getElementById('patientActivity').value;
        const famVal = document.querySelector('input[name="familyHistory"]:checked').value;
        const notesVal = document.getElementById('clinicalNotes').value.trim();

        const payload = {
            age: ageVal,
            sex: sexVal,
            systolic_bp: sysVal,
            diastolic_bp: diaVal,
            cholesterol: cholVal,
            cholesterol_unit: 'mg/dL',
            blood_sugar: sugarVal,
            blood_sugar_unit: 'mg/dL',
            bmi: bmiVal,
            smoking: smokeVal,
            diabetes: diabVal,
            physical_activity: actVal,
            family_history: famVal,
            clinical_notes: notesVal
        };

        // 3. Display Loading State
        setAnalyzeLoadingState(true);

        try {
            const apiBase = getApiBaseUrl();
            const response = await fetch(`${apiBase}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                let errorDetails = `Analysis service returned HTTP ${response.status}.`;
                try {
                    const errJson = await response.json();
                    if (errJson && errJson.message) {
                        errorDetails = errJson.message;
                    }
                    if (errJson && errJson.details && Array.isArray(errJson.details)) {
                        const specificErrors = errJson.details.map(d => d.message).join(' | ');
                        errorDetails += ` (${specificErrors})`;
                    }
                } catch (_) {}
                throw new Error(errorDetails);
            }

            const analysisResult = await response.json();

            // 4. Package patient telemetry with validated backend data & analysis
            const validated = analysisResult.validated_patient_data || {};
            const patientData = {
                timestamp: new Date().toISOString(),
                basic: validated.basic || { age: ageVal, sex: sexVal },
                vitals: validated.vitals || {
                    systolicBP: sysVal,
                    diastolicBP: diaVal,
                    cholesterol: cholVal,
                    cholesterolUnit: 'mg/dL',
                    bloodSugar: sugarVal,
                    bloodSugarUnit: 'mg/dL',
                    bmi: bmiVal
                },
                lifestyle: validated.lifestyle || {
                    smoking: smokeVal,
                    diabetes: diabVal,
                    activity: actVal,
                    familyHistory: famVal
                },
                notes: notesVal,
                analysis: analysisResult,

                // Top-level direct accessors for unified multi-page access
                age: ageVal,
                sex: sexVal,
                systolicBP: sysVal,
                diastolicBP: diaVal,
                cholesterol: cholVal,
                cholesterolUnit: 'mg/dL',
                bloodSugar: sugarVal,
                bloodSugarUnit: 'mg/dL',
                bmi: bmiVal,
                smoking: smokeVal,
                diabetes: diabVal,
                activity: actVal,
                familyHistory: famVal
            };

            // 5. Store securely in SessionStorage for multi-page persistence
            try {
                const serialized = JSON.stringify(patientData);
                sessionStorage.setItem('tsvp_patient_telemetry', serialized);
                sessionStorage.setItem('tsvp_patient_data', serialized);
                sessionStorage.setItem('tsvp_analysis_result', JSON.stringify(analysisResult));
            } catch (err) {
                console.warn('SessionStorage unavailable:', err);
            }

            // 6. Navigate to Page 3: 3D Cardiovascular Visualization Dashboard
            window.location.href = 'visualization.html';

        } catch (err) {
            console.error('Failed to analyze patient risk:', err);
            setAnalyzeLoadingState(false);
            showFormStatus(`Backend Analysis Error: ${err.message || 'Unable to communicate with TSVP backend. Please verify server status.'}`, 'error');
        }
    }

    if (form) {
        form.addEventListener('submit', handlePatientSubmit);
    }

    if (btnAnalyzeRisk) {
        btnAnalyzeRisk.addEventListener('click', handlePatientSubmit);
    }

    // Auto-save form draft as user interacts so Back navigation never loses state
    function autoSaveDraft() {
        const ageEl = document.getElementById('patientAge');
        const sexEl = document.getElementById('patientSex');
        const sysEl = document.getElementById('patientSystolic');
        const diaEl = document.getElementById('patientDiastolic');
        const cholEl = document.getElementById('patientCholesterol');
        const sugarEl = document.getElementById('patientBloodSugar');
        const bmiEl = document.getElementById('patientBMI');
        const smokeEl = document.getElementById('patientSmoking');
        const actEl = document.getElementById('patientActivity');
        const diabEl = document.querySelector('input[name="diabetes"]:checked');
        const famEl = document.querySelector('input[name="familyHistory"]:checked');
        const notesEl = document.getElementById('clinicalNotes');

        const draft = {
            timestamp: new Date().toISOString(),
            basic: {
                age: ageEl && ageEl.value ? parseInt(ageEl.value, 10) : null,
                sex: sexEl ? sexEl.value : ''
            },
            vitals: {
                systolicBP: sysEl && sysEl.value ? parseInt(sysEl.value, 10) : null,
                diastolicBP: diaEl && diaEl.value ? parseInt(diaEl.value, 10) : null,
                cholesterol: cholEl && cholEl.value ? parseInt(cholEl.value, 10) : null,
                cholesterolUnit: 'mg/dL',
                bloodSugar: sugarEl && sugarEl.value ? parseInt(sugarEl.value, 10) : null,
                bloodSugarUnit: 'mg/dL',
                bmi: bmiEl && bmiEl.value ? parseFloat(bmiEl.value) : null
            },
            lifestyle: {
                smoking: smokeEl ? smokeEl.value : '',
                diabetes: diabEl ? diabEl.value : '',
                activity: actEl ? actEl.value : '',
                familyHistory: famEl ? famEl.value : ''
            },
            notes: notesEl ? notesEl.value.trim() : ''
        };

        try {
            sessionStorage.setItem('tsvp_patient_draft', JSON.stringify(draft));
        } catch (e) {}
    }

    if (form) {
        form.addEventListener('input', autoSaveDraft);
        form.addEventListener('change', autoSaveDraft);
    }

    // Restore previously entered data if returning from Page 3 or previous session
    function restoreSavedTelemetry() {
        try {
            const raw = sessionStorage.getItem('tsvp_patient_telemetry') || 
                        sessionStorage.getItem('tsvp_patient_data') || 
                        sessionStorage.getItem('tsvp_patient_draft');
            if (!raw) return;
            const data = JSON.parse(raw);
            if (!data) return;

            const basic = data.basic || {};
            const vitals = data.vitals || {};
            const lifestyle = data.lifestyle || {};

            const age = basic.age || data.age;
            const sex = basic.sex || data.sex;
            const systolic = vitals.systolicBP || data.systolicBP || data.systolic;
            const diastolic = vitals.diastolicBP || data.diastolicBP || data.diastolic;
            const cholesterol = vitals.cholesterol || data.cholesterol;
            const bloodSugar = vitals.bloodSugar || data.bloodSugar;
            const bmi = vitals.bmi || data.bmi;
            const smoking = lifestyle.smoking || data.smoking;
            const activity = lifestyle.activity || data.activity;
            const diabetes = lifestyle.diabetes || data.diabetes;
            const familyHistory = lifestyle.familyHistory || data.familyHistory;
            const notes = data.notes;

            if (age && document.getElementById('patientAge')) document.getElementById('patientAge').value = age;
            if (sex && document.getElementById('patientSex')) document.getElementById('patientSex').value = sex;
            if (systolic && document.getElementById('patientSystolic')) document.getElementById('patientSystolic').value = systolic;
            if (diastolic && document.getElementById('patientDiastolic')) document.getElementById('patientDiastolic').value = diastolic;
            if (cholesterol && document.getElementById('patientCholesterol')) document.getElementById('patientCholesterol').value = cholesterol;
            if (bloodSugar && document.getElementById('patientBloodSugar')) document.getElementById('patientBloodSugar').value = bloodSugar;
            if (bmi && document.getElementById('patientBMI')) document.getElementById('patientBMI').value = bmi;
            if (smoking && document.getElementById('patientSmoking')) document.getElementById('patientSmoking').value = smoking;
            if (activity && document.getElementById('patientActivity')) document.getElementById('patientActivity').value = activity;
            if (diabetes) {
                const r = document.querySelector(`input[name="diabetes"][value="${diabetes}"]`);
                if (r) r.checked = true;
            }
            if (familyHistory) {
                const r = document.querySelector(`input[name="familyHistory"][value="${familyHistory}"]`);
                if (r) r.checked = true;
            }
            if (notes && document.getElementById('clinicalNotes')) {
                document.getElementById('clinicalNotes').value = notes;
            }
        } catch (e) {
            console.warn('Error restoring telemetry:', e);
        }
    }

    restoreSavedTelemetry();

    function displayStagedTelemetry(data) {
        if (!modalDataSummary || !telemetryModal) return;

        modalDataSummary.innerHTML = `
            <div class="telemetry-chip">
                <span class="chip-label">Age / Sex</span>
                <span class="chip-value">${data.basic.age} YRS &bull; ${data.basic.sex}</span>
            </div>
            <div class="telemetry-chip">
                <span class="chip-label">Blood Pressure</span>
                <span class="chip-value">${data.vitals.systolicBP}/${data.vitals.diastolicBP} mmHg</span>
            </div>
            <div class="telemetry-chip">
                <span class="chip-label">Cholesterol</span>
                <span class="chip-value">${data.vitals.cholesterol} mg/dL</span>
            </div>
            <div class="telemetry-chip">
                <span class="chip-label">Blood Sugar</span>
                <span class="chip-value">${data.vitals.bloodSugar} mg/dL</span>
            </div>
            <div class="telemetry-chip">
                <span class="chip-label">BMI</span>
                <span class="chip-value">${data.vitals.bmi} kg/m²</span>
            </div>
            <div class="telemetry-chip">
                <span class="chip-label">Smoking Status</span>
                <span class="chip-value">${data.lifestyle.smoking}</span>
            </div>
            <div class="telemetry-chip">
                <span class="chip-label">Diabetes</span>
                <span class="chip-value">${data.lifestyle.diabetes}</span>
            </div>
            <div class="telemetry-chip">
                <span class="chip-label">Activity Level</span>
                <span class="chip-value">${data.lifestyle.activity}</span>
            </div>
            <div class="telemetry-chip">
                <span class="chip-label">Family History</span>
                <span class="chip-value">${data.lifestyle.familyHistory}</span>
            </div>
        `;

        telemetryModal.removeAttribute('hidden');
    }

    if (btnDismissModal && telemetryModal) {
        btnDismissModal.addEventListener('click', () => {
            telemetryModal.setAttribute('hidden', '');
        });
    }

    // -------------------------------------------------------------------------
    // 5. Optional AI Assistant Logic & Clinical Guidelines
    // -------------------------------------------------------------------------
    // Toggle Drawer
    if (btnToggleAi && aiDrawer) {
        btnToggleAi.addEventListener('click', () => {
            const isHidden = aiDrawer.hasAttribute('hidden');
            if (isHidden) {
                aiDrawer.removeAttribute('hidden');
                btnToggleAi.setAttribute('aria-expanded', 'true');
                if (aiInputText) aiInputText.focus();
            } else {
                aiDrawer.setAttribute('hidden', '');
                btnToggleAi.setAttribute('aria-expanded', 'false');
            }
        });
    }

    if (btnCloseAi && aiDrawer && btnToggleAi) {
        btnCloseAi.addEventListener('click', () => {
            aiDrawer.setAttribute('hidden', '');
            btnToggleAi.setAttribute('aria-expanded', 'false');
        });
    }

    // Suggestion prompt chips
    promptChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const text = chip.getAttribute('data-prompt');
            if (aiInputText) {
                aiInputText.value = text;
                submitAiMessage(text);
            }
        });
    });

    // Check backend API connection status
    async function checkBackendStatus() {
        try {
            const res = await fetch('/api/status', { method: 'GET' });
            if (res.ok) {
                const data = await res.json();
                if (data.ai_configured) {
                    isAiConfiguredOnBackend = true;
                    if (aiConnectionDot) aiConnectionDot.style.background = '#00f3ff';
                    if (aiConnectionText) aiConnectionText.textContent = 'TSVP CLINICAL AI // OPENAI ONLINE';
                    if (apiConfigNotice) apiConfigNotice.setAttribute('hidden', '');
                } else {
                    isAiConfiguredOnBackend = false;
                    if (aiConnectionText) aiConnectionText.textContent = 'TSVP CLINICAL AI // TRIAGE MODE';
                    if (apiConfigNotice) apiConfigNotice.removeAttribute('hidden');
                }
            } else {
                showOfflineTriageMode();
            }
        } catch (e) {
            showOfflineTriageMode();
        }
    }

    function showOfflineTriageMode() {
        isAiConfiguredOnBackend = false;
        if (aiConnectionText) aiConnectionText.textContent = 'TSVP CLINICAL AI // CLINICAL GUIDANCE MODE';
        if (apiConfigNotice) apiConfigNotice.removeAttribute('hidden');
    }

    checkBackendStatus();

    // Chat Form / Input Submission
    function handleChatSubmit(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (!aiInputText) return;
        const message = aiInputText.value.trim();
        if (!message) return;
        submitAiMessage(message);
    }

    if (aiChatForm) {
        aiChatForm.addEventListener('submit', handleChatSubmit);
    }
    if (btnSendChat) {
        btnSendChat.addEventListener('click', handleChatSubmit);
    }
    if (aiInputText) {
        aiInputText.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleChatSubmit(e);
            }
        });
    }

    function appendMessage(sender, text, isEmergency = false) {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${sender === 'user' ? 'user-bubble' : 'ai-bubble'}`;
        if (isEmergency) bubble.classList.add('emergency-bubble');

        bubble.innerHTML = `
            <div class="bubble-avatar" aria-hidden="true">${sender === 'user' ? 'YOU' : 'AI'}</div>
            <div class="bubble-body">
                <p>${text}</p>
            </div>
        `;

        chatMessages.appendChild(bubble);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showTypingIndicator() {
        const typing = document.createElement('div');
        typing.className = 'chat-bubble ai-bubble typing-indicator';
        typing.id = 'aiTypingBubble';
        typing.innerHTML = `
            <div class="bubble-avatar" aria-hidden="true">AI</div>
            <div class="bubble-body">
                <span class="status-dot"></span> Analyzing clinical inquiry...
            </div>
        `;
        chatMessages.appendChild(typing);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function removeTypingIndicator() {
        const typing = document.getElementById('aiTypingBubble');
        if (typing) typing.remove();
    }

    async function submitAiMessage(userText) {
        aiInputText.value = '';
        appendMessage('user', userText);
        showTypingIndicator();

        // 1. High-Priority Clinical Red-Flag Check (Client-side immediate safety triage)
        const lower = userText.toLowerCase();
        const emergencyKeywords = ['crushing chest pain', 'severe chest pain', 'pain radiating to jaw', 'left arm numbness', 'cannot breathe', 'sudden collapse'];
        const isEmergency = emergencyKeywords.some(kw => lower.includes(kw));

        if (isEmergency) {
            setTimeout(() => {
                removeTypingIndicator();
                appendMessage('ai', '⚠️ CRITICAL EMERGENCY WARNING: The symptoms you described can indicate an acute coronary event or life-threatening cardiovascular emergency. Stop all activity and seek emergency medical assistance (call 911 or local emergency services) immediately. Do not drive yourself to the emergency department.', true);
            }, 600);
            return;
        }

        // 2. Query Server Backend if available
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userText })
            });

            if (response.ok) {
                const data = await response.json();
                removeTypingIndicator();
                if (data.reply) {
                    appendMessage('ai', data.reply);
                    return;
                }
            }
        } catch (err) {
            // Server endpoint unreachable or not using backend proxy
        }

        // 3. Built-In Verified Clinical Knowledge Fallback
        setTimeout(() => {
            removeTypingIndicator();
            const clinicalGuidance = getClinicalGuidanceResponse(userText);
            appendMessage('ai', clinicalGuidance);
        }, 800);
    }

    // Curated Medical Guidelines for cardiovascular health queries
    function getClinicalGuidanceResponse(query) {
        const q = query.toLowerCase();

        if (q.includes('fast') || q.includes('heartbeat') || q.includes('flutter') || q.includes('palpitation')) {
            return `Sensation of a rapid, racing, or fluttering heartbeat is referred to clinically as palpitations. 
            Common benign causes include caffeine, anxiety, dehydration, lack of sleep, or electrolyte fluctuations. However, persistent or recurring episodes could indicate arrhythmia (such as atrial fibrillation or supraventricular tachycardia). 
            \n• Follow-up considerations: Do these episodes happen at rest or with exertion? Are they accompanied by dizziness or shortness of breath? 
            \n• Recommendation: Log the frequency and duration to discuss with your healthcare professional. Seek urgent medical care if accompanied by chest discomfort or fainting.`;
        }

        if (q.includes('dizzy') || q.includes('lightheaded') || q.includes('spinning')) {
            return `Occasional dizziness can stem from benign causes like orthostatic hypotension (a brief blood pressure drop when standing up quickly), mild dehydration, or inner ear issues. 
            However, frequent lightheadedness can also relate to cardiac arrhythmias, heart valve conditions, or medication effects.
            \n• Follow-up considerations: Does dizziness occur primarily when changing posture, or does it happen suddenly while sitting or walking?
            \n• Recommendation: You should mention this pattern to your doctor, particularly if your blood pressure readings on the form indicate hypotension or hypertension.`;
        }

        if (q.includes('breathless') || q.includes('stairs') || q.includes('short of breath') || q.includes('dyspnea')) {
            return `Shortness of breath during exertion (dyspnea on exertion) like climbing stairs may reflect physical deconditioning, asthma, or cardiac workload considerations (such as early heart strain or coronary insufficiency).
            \n• Follow-up considerations: Has this breathlessness developed gradually over months, or did it start suddenly? Does it resolve quickly after resting?
            \n• Recommendation: This is an important symptom to mention to your clinician. They can assess your lung function and cardiovascular response to exercise.`;
        }

        if (q.includes('discuss') || q.includes('doctor') || q.includes('physician') || q.includes('ask')) {
            return `When consulting your physician about cardiovascular health, consider discussing:
            \n1. Any personal symptoms such as unusual fatigue, breathlessness, swollen ankles, or heart flutters.
            \n2. Your blood pressure and lipid targets in relation to your family history.
            \n3. Lifestyle factors: personalized exercise safety and dietary cardiovascular guidelines.
            \n4. Recommended diagnostic baselines (e.g. 12-lead ECG, comprehensive metabolic panel, or calcium score if indicated).`;
        }

        return `Thank you for sharing your concern. While I cannot diagnose conditions or provide personal medical evaluations, cardiovascular symptoms often stem from the interplay of blood pressure, vascular elasticity, lifestyle, and cardiac rhythm.
        \n• Recommendation: I recommend noting down when this symptom occurs, what triggers it, and discussing it directly with your healthcare provider alongside the baseline metrics you entered in the form above.
        \n• If you experience severe chest pressure, sudden numbness, or acute shortness of breath, please access emergency healthcare immediately.`;
    }

})();
