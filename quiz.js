(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const form = $('startForm');
  const nameInput = $('participantName');
  const emailInput = $('participantEmail');
  const consentInput = $('participantConsent');
  const startButton = $('startButton');
  const nextButton = $('nextButton');
  const toast = $('toast');
  let participant = null;
  let index = 0;
  let points = [];
  let answered = false;
  let countdown = null;
  let deadline = 0;
  let toastTimeout;
  let startPending = false;

  function scriptUrl() {
    const raw = String(window.QUIZ_SCRIPT_URL || '').trim();
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:\?.*)?$/.test(raw)) {
      throw new Error('Add your deployed Apps Script URL in config.js first.');
    }
    return raw;
  }

  function randomHex(bytes) {
    const buffer = new Uint8Array(bytes);
    crypto.getRandomValues(buffer);
    return Array.from(buffer, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function sendToScript(action, values) {
    return new Promise((resolve, reject) => {
      const nonce = randomHex(16);
      const frame = document.createElement('iframe');
      const submitForm = document.createElement('form');
      frame.name = 'wmdQuizFrame' + nonce;
      frame.style.display = 'none';
      frame.setAttribute('aria-hidden', 'true');
      submitForm.style.display = 'none';
      submitForm.method = 'POST';
      submitForm.action = scriptUrl();
      submitForm.target = frame.name;
      const fields = { action, nonce, ...values };
      for (const [name, value] of Object.entries(fields)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        submitForm.appendChild(input);
      }
      let settled = false;
      const timeout = setTimeout(() => finish(new Error('The Apps Script did not respond. Check its deployment and try again.')), 30000);
      function finish(error, result) {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        window.removeEventListener('message', onMessage);
        submitForm.remove();
        frame.remove();
        if (error) reject(error);
        else resolve(result);
      }
      function onMessage(event) {
        const data = event.data;
        if (!data || data.type !== 'wmd-quiz-result' || data.nonce !== nonce) return;
        if (!data.result?.ok) {
          const error = new Error(data.result?.error || 'The Apps Script request failed.');
          error.code = data.result?.code;
          finish(error);
        } else finish(null, data.result);
      }
      window.addEventListener('message', onMessage);
      document.body.append(frame, submitForm);
      try { submitForm.submit(); }
      catch (error) { finish(error); }
    });
  }

  function showScreen(id) {
    for (const screen of ['startScreen', 'quizScreen', 'finishScreen']) $(screen).hidden = screen !== id;
  }
  function showToast(message) {
    clearTimeout(toastTimeout);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
  }
  function updateStartButton() {
    startButton.disabled = startPending || !nameInput.value.trim() || !emailInput.validity.valid || !emailInput.value.trim() || !consentInput.checked;
  }
  [nameInput, emailInput, consentInput].forEach(input => input.addEventListener('input', updateStartButton));
  consentInput.addEventListener('change', updateStartButton);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    updateStartButton();
    if (startButton.disabled) return;
    startPending = true;
    updateStartButton();
    startButton.textContent = 'Checking…';
    try {
      const name = nameInput.value.trim();
      const email = emailInput.value.trim().toLowerCase();
      const check = await sendToScript('check', { email });
      if (check.taken) {
        $('alreadyDialog').showModal();
        return;
      }
      participant = { name, email };
      index = 0;
      points = [];
      renderQuestion();
    } catch (error) {
      showToast(error.message);
    } finally {
      startPending = false;
      startButton.textContent = 'Start quiz';
      updateStartButton();
    }
  });

  function stopTimer() { if (countdown) clearInterval(countdown); countdown = null; }
  function remainingSeconds() { return Math.max(0, Math.min(10, Math.ceil((deadline - performance.now()) / 1000))); }
  function drawTimer() {
    const remaining = remainingSeconds();
    $('timer').textContent = remaining;
    $('timer').classList.toggle('urgent', remaining <= 3);
    if (!remaining && !answered) submitAnswer(null);
  }
  function renderQuestion() {
    showScreen('quizScreen');
    stopTimer();
    answered = false;
    const q = QUESTIONS[index];
    $('sectionName').textContent = q.section;
    $('questionCount').textContent = `Question ${index + 1} of ${QUESTIONS.length}`;
    $('progressFill').style.width = `${((index + 1) / QUESTIONS.length) * 100}%`;
    $('questionTitle').textContent = q.question;
    $('runningTotal').textContent = points.reduce((sum, value) => sum + value, 0);
    $('answerNote').textContent = '';
    nextButton.textContent = index === QUESTIONS.length - 1 ? 'Finish quiz' : 'Next question';
    nextButton.disabled = true;
    $('answers').replaceChildren(...q.options.map((option, choice) => {
      const button = document.createElement('button');
      button.className = 'answer';
      button.type = 'button';
      const letter = document.createElement('span');
      letter.className = 'answer-letter';
      letter.textContent = 'ABCD'[choice];
      const label = document.createElement('span');
      label.textContent = option;
      button.append(letter, label);
      button.addEventListener('click', () => submitAnswer(choice));
      return button;
    }));
    deadline = performance.now() + 10000;
    drawTimer();
    countdown = setInterval(drawTimer, 100);
  }
  function submitAnswer(choice) {
    if (answered) return;
    const remaining = remainingSeconds();
    answered = true;
    stopTimer();
    const correct = remaining > 0 && choice === QUESTIONS[index].answer;
    const timedOut = remaining === 0 || choice === null;
    const earned = correct ? 10 + remaining : 0;
    points.push(earned);
    $('timer').textContent = remaining;
    $('runningTotal').textContent = points.reduce((sum, value) => sum + value, 0);
    [...$('answers').children].forEach((button, answerIndex) => {
      button.disabled = true;
      if (answerIndex === choice) button.classList.add(correct ? 'correct' : 'wrong');
    });
    $('answerNote').textContent = timedOut ? 'Time is up. 0 points for this question.' : correct ? `Correct! +${earned} points` : 'Incorrect. 0 points for this question.';
    nextButton.disabled = false;
    showToast(timedOut ? "Time's up" : correct ? 'Your answer is correct' : 'Your answer is wrong');
  }
  nextButton.addEventListener('click', async () => {
    if (!answered || nextButton.disabled) return;
    nextButton.disabled = true;
    if (index < QUESTIONS.length - 1) {
      index++;
      renderQuestion();
      return;
    }
    nextButton.textContent = 'Saving…';
    try {
      const result = await sendToScript('save', {
        name: participant.name,
        email: participant.email,
        consent: 'true',
        points: JSON.stringify(points)
      });
      $('finalTotal').textContent = result.total;
      participant = null;
      showScreen('finishScreen');
    } catch (error) {
      if (error.code === 'ALREADY_TAKEN') $('alreadyDialog').showModal();
      else showToast(error.message);
      nextButton.disabled = false;
    } finally { nextButton.textContent = 'Finish quiz'; }
  });
  $('dialogOk').addEventListener('click', () => $('alreadyDialog').close());
})();
