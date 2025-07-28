document.addEventListener('DOMContentLoaded', () => {
    // === LÓGICA DE LA ENCUESTA v7.1: CORRECCIÓN PARA MÚLTIPLES PREGUNTAS DE TEXTO ===
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
            const response = await fetch('Openday.json');
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

    /**
     * CORRECCIÓN CLAVE: La lógica de guardado ahora es más robusta.
     */
    function goToQuestion(index) {
        const departingQuestion = questionsData[currentQuestionIndex];

        // 1. Guardar la respuesta del campo de texto actual (si aplica)
        if (departingQuestion && departingQuestion.type === 'text') {
            const textarea = document.querySelector(`.question-slide:nth-child(${currentQuestionIndex + 1}) textarea`);
            
            // 2. Validar solo si se intenta avanzar
            if (index > currentQuestionIndex && textarea.value.trim() === '') {
                textarea.classList.add('input-error');
                setTimeout(() => textarea.classList.remove('input-error'), 500);
                return; // Detiene el avance si el campo está vacío
            }

            // 3. Guardar o borrar la respuesta. ESTO CORRIGE EL BUG.
            // Se ejecuta al ir adelante O atrás, manteniendo el estado consistente.
            const answer = textarea.value.trim();
            if (answer !== '') {
                surveyAnswers[departingQuestion.id] = answer;
            } else {
                // Si el usuario borra el texto y retrocede, eliminamos la respuesta guardada
                delete surveyAnswers[departingQuestion.id];
            }
        }
        
        // 4. Moverse a la siguiente pregunta
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
        
        // Restaurar la respuesta guardada si existe
        const savedAnswer = surveyAnswers[currentQuestion.id];
        if (savedAnswer && currentQuestion.type === 'text') {
            const textarea = document.querySelector(`.question-slide:nth-child(${currentQuestionIndex + 1}) textarea`);
            if(textarea) textarea.value = savedAnswer;
        } else if (savedAnswer && currentQuestion.options) {
            const options = document.querySelectorAll(`.question-slide:nth-child(${currentQuestionIndex + 1}) .rating-option`);
            options.forEach(opt => {
                for(let i=1; i<=5; i++) opt.classList.remove(`selected-${i}`);
                if (opt.dataset.value === savedAnswer) opt.classList.add(`selected-${savedAnswer}`);
            });
        }
        
        // Lógica de botones
        if (currentQuestion.type === 'submit_screen') {
            const finalSubmitBtn = document.getElementById('final-submit-btn');
            // La corrección en el guardado de datos hace que este contador ahora sea fiable
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
        
        form.submit();

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
