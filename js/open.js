document.addEventListener('DOMContentLoaded', () => {
    // === LÓGICA DE LA ENCUESTA v9: CORRECCIÓN PARA ENVÍO CON IFRAME OCULTO ===
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
            
            // Verificamos que el JSON no esté vacío
            if (!rawQuestions || rawQuestions.length === 0) {
                 throw new Error("El archivo JSON está vacío o no tiene el formato correcto.");
            }

            totalRealQuestions = rawQuestions.length;
            questionsData = [ ...rawQuestions, { id: "submission", type: "submit_screen", text: "Estás a un paso de terminar" } ];
            renderQuestions();
            attachEventListeners();
            goToQuestion(0);
        } catch (error) {
            questionsWrapper.innerHTML = `<div class="question-slide"><p>Error al cargar la encuesta. Revisa la ruta y el contenido del archivo JSON.</p></div>`;
            console.error('Error fetching questions:', error);
        }
    }

    function renderQuestions() {
        questionsWrapper.innerHTML = '';
        questionsData.forEach(q => {
            const slide = document.createElement('div');
            slide.className = 'question-slide';
            slide.dataset.questionId = q.id;
            let contentHTML = '';

            if (q.type === 'text') {
                contentHTML = `<h2 class="question-text">${q.text}</h2><textarea id="q-${q.id}" name="${q.id}" rows="5" placeholder="Escribe tu respuesta aquí..." autocomplete="off"></textarea>`;
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
    
    function handleAnswer(questionId, value) {
        if (value) {
            surveyAnswers[questionId] = value;
        } else {
            delete surveyAnswers[questionId];
        }
        updateProgressAndSubmitButton();
    }
    
    function updateProgressAndSubmitButton() {
        const answeredCount = Object.keys(surveyAnswers).length;
        const progressPercentage = totalRealQuestions > 0 ? (answeredCount / totalRealQuestions) * 100 : 0;
        progressBar.style.width = `${progressPercentage}%`;

        const finalSubmitBtn = document.getElementById('final-submit-btn');
        if (finalSubmitBtn) {
            // Habilita el botón solo si se han respondido todas las preguntas REALES
            finalSubmitBtn.disabled = answeredCount < totalRealQuestions;
        }
    }

    function attachEventListeners() {
        questionsWrapper.addEventListener('click', e => {
            const ratingOption = e.target.closest('.rating-option');
            if (!ratingOption) return;
            
            const { questionId, value } = ratingOption.dataset;
            handleAnswer(questionId, value);
            
            ratingOption.parentElement.querySelectorAll('.rating-option').forEach(opt => {
                for(let i=1; i<=5; i++) opt.classList.remove(`selected-${i}`);
            });
            ratingOption.classList.add(`selected-${value}`);
            setTimeout(() => goToQuestion(currentQuestionIndex + 1), 300);
        });

        questionsWrapper.addEventListener('input', e => {
            if (e.target.tagName === 'TEXTAREA') {
                handleAnswer(e.target.name, e.target.value.trim());
            }
        });
    }

    function goToQuestion(index) {
        if (index > currentQuestionIndex) {
            const departingQuestion = questionsData[currentQuestionIndex];
            if (departingQuestion.type === 'text' && !surveyAnswers[departingQuestion.id]) {
                const textarea = document.getElementById(`q-${departingQuestion.id}`);
                if (textarea) {
                    textarea.classList.add('input-error');
                    setTimeout(() => textarea.classList.remove('input-error'), 500);
                }
                return;
            }
        }
        currentQuestionIndex = index;
        questionsWrapper.style.transform = `translateX(${-index * 100}%)`;
        updateScreenUI();
    }
    
    function updateScreenUI() {
        progressIndicator.textContent = `Paso ${currentQuestionIndex + 1} de ${questionsData.length}`;
        prevBtn.style.display = currentQuestionIndex > 0 ? 'inline-block' : 'none';
        
        const existingNavBtn = document.querySelector('.survey-navigation #submit-btn');
        if (existingNavBtn) existingNavBtn.remove();
        
        const currentQuestion = questionsData[currentQuestionIndex];
        if (currentQuestion.type === 'text') {
            const actionBtn = document.createElement('button');
            actionBtn.id = 'submit-btn';
            actionBtn.className = 'submit-btn';
            actionBtn.type = 'button';
            actionBtn.textContent = 'Siguiente';
            actionBtn.onclick = () => goToQuestion(currentQuestionIndex + 1);
            navigationContainer.appendChild(actionBtn);
        }
        
        const savedAnswer = surveyAnswers[currentQuestion.id];
        if (savedAnswer && currentQuestion.type === 'text') {
            const textarea = document.getElementById(`q-${currentQuestion.id}`);
            if (textarea) textarea.value = savedAnswer;
        }
    }
    
    prevBtn.addEventListener('click', () => {
        if (currentQuestionIndex > 0) goToQuestion(currentQuestionIndex - 1);
    });

    // ==================================================================
    // === CORRECCIÓN CLAVE PARA EL ENVÍO DEL FORMULARIO CON IFRAME ===
    // ==================================================================
    form.addEventListener('submit', e => {
        // NO prevenimos la acción por defecto.
        // e.preventDefault(); // <--- ESTA LÍNEA SE ELIMINA.

        // Deshabilitamos el botón para evitar envíos duplicados.
        const submitButton = document.getElementById('final-submit-btn');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Enviando...';
        }

        // Creamos los inputs ocultos con las respuestas, como ya hacías.
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
        
        // NO necesitamos llamar a form.submit() manualmente. El navegador lo hará
        // por nosotros porque no hemos cancelado el evento.

        // El formulario se enviará al iframe oculto. La página actual no se recargará.
        // Por lo tanto, podemos ocultar el formulario y mostrar el mensaje de agradecimiento.
        setTimeout(() => {
            form.style.display = 'none';
            thankYouMessage.style.display = 'block';
            mainContainer.style.alignItems = 'center';
            setTimeout(() => {
                thankYouMessage.style.opacity = '1';
                thankYouMessage.style.transform = 'scale(1)';
            }, 50); // Pequeña demora para la animación de entrada
        }, 500); // Damos 500ms para que el envío comience antes de ocultar el formulario.
    });

    initializeSurvey();

    const navToggle = document.querySelector('.nav-toggle');
    navToggle.addEventListener('click', () => { document.body.classList.toggle('nav-open'); });
});
