document.addEventListener('DOMContentLoaded', () => {
    // === LÓGICA DE LA ENCUESTA v7: MÉTODO IFRAME OCULTO (ANTI-CORS DEFINITIVO) ===
    const form = document.getElementById('openDaySurveyForm');
    const questionsWrapper = document.getElementById('questions-wrapper');
    const progressIndicator = document.getElementById('progress-indicator');
    const progressBar = document.getElementById('survey-progress-bar');
    const prevBtn = document.getElementById('prev-btn');
    const navigationContainer = document.querySelector('.survey-navigation');
    const thankYouMessage = document.getElementById('thank-you-message');
    const mainContainer = document.querySelector('.survey-container');
    const hiddenInputsContainer = document.getElementById('hidden-inputs-container');
    
    let currentQuestionIndex = 0;
    let questionsData = [];
    let surveyAnswers = {};
    let totalRealQuestions = 0;

    async function initializeSurvey() {
        try {
            // Asegúrate de que esta ruta sea correcta para tu proyecto
            const response = await fetch('../src/Openday.json');
            if (!response.ok) throw new Error(`Network response was not ok (${response.status})`);
            const rawQuestions = await response.json();
            
            totalRealQuestions = rawQuestions.length;
            questionsData = [ ...rawQuestions, { id: "submission", type: "submit_screen", text: "Estás a un paso de terminar" } ];
            renderQuestions();
            goToQuestion(0);
        } catch (error) {
            questionsWrapper.innerHTML = `<div class="question-slide"><p>Error al cargar la encuesta. Revisa la ruta del archivo JSON.</p></div>`;
            console.error('Error fetching questions:', error);
        }
    }

    function renderQuestions() {
        questionsWrapper.innerHTML = '';
        questionsData.forEach(q => {
            const slide = document.createElement('div');
            slide.className = 'question-slide';
            let contentHTML = '';

            if (q.type === 'text') {
                contentHTML = `<h2 class="question-text">${q.text}</h2><textarea name="${q.id}" rows="5" placeholder="Escribe tu respuesta aquí..." autocomplete="off"></textarea>`;
            } else if (q.type === 'submit_screen') {
                contentHTML = `
                    <div class="submit-slide-content">
                        <h2 class="question-text">${q.text}</h2>
                        <p>Revisa tus respuestas usando el botón "Anterior" o presiona Enviar para finalizar.</p>
                        <button type="submit" id="final-submit-btn" class="submit-btn" disabled>Enviar Resultados</button>
                    </div>
                `;
            } else if (q.options) {
                contentHTML = `<h2 class="question-text">${q.text}</h2><div class="rating-options">`;
                q.options.forEach(opt => {
                    contentHTML += `<div class="rating-option" data-value="${opt.value}" data-question-id="${q.id}">${opt.label}</div>`;
                });
                contentHTML += `</div>`;
            }
            slide.innerHTML = contentHTML;
            questionsWrapper.appendChild(slide);
        });
    }

    function goToQuestion(index) {
        if (index > currentQuestionIndex) {
            const departingQuestion = questionsData[currentQuestionIndex];
            if (departingQuestion.type === 'text') {
                const textarea = document.querySelector(`.question-slide:nth-child(${currentQuestionIndex + 1}) textarea`);
                if (textarea.value.trim() === '') {
                    textarea.classList.add('input-error');
                    setTimeout(() => textarea.classList.remove('input-error'), 500);
                    return;
                }
                surveyAnswers[departingQuestion.id] = textarea.value.trim();
            }
        }
        currentQuestionIndex = index;
        questionsWrapper.style.transform = `translateX(${-index * 100}%)`;
        updateUI();
    }
    
    function updateUI() {
        const answeredCount = Object.keys(surveyAnswers).length;
        const progressPercentage = totalRealQuestions > 0 ? (answeredCount / totalRealQuestions) * 100 : 0;
        progressBar.style.width = `${progressPercentage}%`;
        progressIndicator.textContent = `Paso ${currentQuestionIndex + 1} de ${questionsData.length}`;
        prevBtn.style.display = currentQuestionIndex > 0 ? 'inline-block' : 'none';
        const existingNavBtn = document.querySelector('.survey-navigation #submit-btn');
        if (existingNavBtn) existingNavBtn.remove();
        const currentQuestion = questionsData[currentQuestionIndex];
        const savedAnswer = surveyAnswers[currentQuestion.id];
        if (savedAnswer) {
            if (currentQuestion.type === 'text') {
                const textarea = document.querySelector(`.question-slide:nth-child(${currentQuestionIndex + 1}) textarea`);
                if(textarea) textarea.value = savedAnswer;
            } else if (currentQuestion.options) {
                const options = document.querySelectorAll(`.question-slide:nth-child(${currentQuestionIndex + 1}) .rating-option`);
                options.forEach(opt => {
                    for(let i=1; i<=5; i++) opt.classList.remove(`selected-${i}`);
                    if (opt.dataset.value === savedAnswer) opt.classList.add(`selected-${savedAnswer}`);
                });
            }
        }
        if (currentQuestion.type === 'submit_screen') {
            const finalSubmitBtn = document.getElementById('final-submit-btn');
            if (finalSubmitBtn) finalSubmitBtn.disabled = answeredCount < totalRealQuestions;
        } else if (currentQuestion.type === 'text') {
            const actionBtn = document.createElement('button');
            actionBtn.id = 'submit-btn';
            actionBtn.className = 'submit-btn';
            actionBtn.type = 'button';
            actionBtn.textContent = 'Siguiente';
            actionBtn.onclick = () => goToQuestion(currentQuestionIndex + 1);
            navigationContainer.appendChild(actionBtn);
        }
    }

    questionsWrapper.addEventListener('click', e => {
        const ratingOption = e.target.closest('.rating-option');
        if (!ratingOption) return;
        const { questionId, value } = ratingOption.dataset;
        surveyAnswers[questionId] = value;
        ratingOption.parentElement.querySelectorAll('.rating-option').forEach(opt => {
            for(let i=1; i<=5; i++) opt.classList.remove(`selected-${i}`);
        });
        ratingOption.classList.add(`selected-${value}`);
        setTimeout(() => goToQuestion(currentQuestionIndex + 1), 300);
    });
    
    prevBtn.addEventListener('click', () => {
        if (currentQuestionIndex > 0) goToQuestion(currentQuestionIndex - 1);
    });

    form.addEventListener('submit', e => {
        e.preventDefault();
        
        const submitButton = document.getElementById('final-submit-btn');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Enviando...';
        }

        hiddenInputsContainer.innerHTML = '';
        
        const sourceInput = document.createElement('input');
        sourceInput.type = 'hidden';
        sourceInput.name = 'form_source';
        sourceInput.value = 'satisfaction_survey';
        hiddenInputsContainer.appendChild(sourceInput);

        for (const key in surveyAnswers) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = surveyAnswers[key];
            hiddenInputsContainer.appendChild(input);
        }
        
        form.submit(); // <-- Envío tradicional

        // Asumimos éxito y mostramos la pantalla de agradecimiento
        setTimeout(() => {
            form.style.display = 'none';
            thankYouMessage.style.display = 'block';
            mainContainer.style.alignItems = 'center';
            setTimeout(() => {
                thankYouMessage.style.opacity = '1';
                thankYouMessage.style.transform = 'scale(1)';
            }, 50);
        }, 1000);
    });

    initializeSurvey();

    const navToggle = document.querySelector('.nav-toggle');
    navToggle.addEventListener('click', () => { document.body.classList.toggle('nav-open'); });
});