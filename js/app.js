/**
 * Model Arena v2 - Main Interactive Controller
 */

(function () {
  let arenaData = null;
  let currentRoundIndex = 0;
  let currentExercise = "bench";
  let userVotes = {}; // { roundId: modelId }
  let currentSelectedCandidate = null;

  // DOM Elements Cache
  const els = {
    exercisePills: document.getElementById("exercise-pills"),
    roundStepTag: document.getElementById("round-step-tag"),
    roundName: document.getElementById("round-name"),
    roundCounter: document.getElementById("round-counter"),
    progressBarFill: document.getElementById("progress-bar-fill"),
    questionText: document.getElementById("question-text"),
    questionHint: document.getElementById("question-hint"),
    videoPlayer: document.getElementById("video-player"),
    videoClipTag: document.getElementById("video-clip-tag"),
    btnPlayPause: document.getElementById("btn-play-pause"),
    btnReplay: document.getElementById("btn-replay"),
    videoTimeline: document.getElementById("video-timeline"),
    videoTimelineFill: document.getElementById("video-timeline-fill"),
    videoTimeLabel: document.getElementById("video-time-label"),
    completionBanner: document.getElementById("completion-banner"),
    btnReplayInline: document.getElementById("btn-replay-inline"),
    votingGrid: document.getElementById("voting-grid"),
    btnNext: document.getElementById("btn-next"),
    roundStage: document.getElementById("round-stage"),
    feedbackStage: document.getElementById("feedback-stage"),
    feedbackTextarea: document.getElementById("feedback-textarea"),
    btnSubmitFeedback: document.getElementById("btn-submit-feedback"),
    btnSkipFeedback: document.getElementById("btn-skip-feedback"),
    successStage: document.getElementById("success-stage"),
    votesSummaryList: document.getElementById("votes-summary-list"),
    btnOpenStats: document.getElementById("btn-open-stats"),
    btnOpenPack: document.getElementById("btn-open-pack"),
    btnRestart: document.getElementById("btn-restart"),
    modalStats: document.getElementById("modal-stats"),
    btnCloseStats: document.getElementById("btn-close-stats"),
    statsContainer: document.getElementById("stats-container"),
    btnExportCsv: document.getElementById("btn-export-csv"),
    modalPack: document.getElementById("modal-pack"),
    btnClosePack: document.getElementById("btn-close-pack"),
    packVideoPlayer: document.getElementById("pack-video-player"),
    packTabs: document.getElementById("pack-tabs"),
    headerStatsBtn: document.getElementById("header-stats-btn")
  };

  // Initialize
  async function init() {
    try {
      const res = await fetch("data/arena.json");
      arenaData = await res.json();
      currentExercise = arenaData.default_exercise || "bench";

      setupExerciseSelector();
      setupEventListeners();
      renderRound(0);
    } catch (err) {
      console.error("Error loading arena.json:", err);
      if (els.questionText) {
        els.questionText.textContent = "Error al cargar la configuración de la arena.";
      }
    }
  }

  // Setup Exercise Pills
  function setupExerciseSelector() {
    if (!els.exercisePills || !arenaData.exercises) return;
    els.exercisePills.innerHTML = "";

    arenaData.exercises.forEach((ex) => {
      const btn = document.createElement("button");
      btn.className = `exercise-pill ${ex.id === currentExercise ? "active" : ""}`;
      btn.textContent = ex.label;
      btn.dataset.exercise = ex.id;
      btn.addEventListener("click", () => {
        if (currentExercise === ex.id) return;
        currentExercise = ex.id;
        document.querySelectorAll(".exercise-pill").forEach((p) => p.classList.remove("active"));
        btn.classList.add("active");
        loadVideoForCurrentRound();
      });
      els.exercisePills.appendChild(btn);
    });
  }

  // Event Listeners
  function setupEventListeners() {
    // Video Controls
    els.btnPlayPause.addEventListener("click", togglePlay);
    els.videoPlayer.addEventListener("click", togglePlay);
    els.btnReplay.addEventListener("click", replayVideo);
    els.btnReplayInline.addEventListener("click", replayVideo);

    els.videoPlayer.addEventListener("timeupdate", updateTimeline);
    els.videoPlayer.addEventListener("ended", onVideoEnded);
    els.videoPlayer.addEventListener("play", () => updatePlayIcon(false));
    els.videoPlayer.addEventListener("pause", () => updatePlayIcon(true));

    els.videoTimeline.addEventListener("click", seekTimeline);

    // Next Round Button
    els.btnNext.addEventListener("click", handleNextRound);

    // Feedback Submission
    els.btnSubmitFeedback.addEventListener("click", () => finalizeSubmission(false));
    els.btnSkipFeedback.addEventListener("click", () => finalizeSubmission(true));

    // Post-vote action buttons
    els.btnOpenStats.addEventListener("click", openStatsModal);
    els.headerStatsBtn.addEventListener("click", openStatsModal);
    els.btnCloseStats.addEventListener("click", closeStatsModal);
    els.btnExportCsv.addEventListener("click", () => Tracker.exportCSV());

    els.btnOpenPack.addEventListener("click", openPackModal);
    els.btnClosePack.addEventListener("click", closePackModal);
    els.btnRestart.addEventListener("click", restartArena);

    // Close modals on outside click
    window.addEventListener("click", (e) => {
      if (e.target === els.modalStats) closeStatsModal();
      if (e.target === els.modalPack) closePackModal();
    });
  }

  // Render Round
  function renderRound(index) {
    if (!arenaData || !arenaData.rounds[index]) return;
    currentRoundIndex = index;
    const round = arenaData.rounds[index];
    currentSelectedCandidate = userVotes[round.id] || null;

    // Update Header / Progress
    els.roundStepTag.textContent = `Ronda ${index + 1}`;
    els.roundName.textContent = round.name;
    els.roundCounter.textContent = `${index + 1} de ${arenaData.rounds.length}`;

    const progressPct = ((index) / arenaData.rounds.length) * 100;
    els.progressBarFill.style.width = `${progressPct}%`;

    // Question
    els.questionText.textContent = round.question;
    els.questionHint.textContent = round.hint;

    // Video
    loadVideoForCurrentRound();

    // Hide completion banner until video ends
    els.completionBanner.style.display = "none";

    // Candidates
    renderCandidates(round);

    // Update Next Button State
    updateNextButtonState();
  }

  // Load Video
  function loadVideoForCurrentRound() {
    const round = arenaData.rounds[currentRoundIndex];
    if (!round) return;

    const videoSrc = round.videos[currentExercise] || round.videos["bench"];
    const exLabel = (arenaData.exercises.find((e) => e.id === currentExercise) || {}).label || currentExercise;

    els.videoClipTag.textContent = `${round.badge} • ${exLabel}`;
    
    // Smooth transition of video source
    els.videoPlayer.src = videoSrc;
    els.videoPlayer.currentTime = 0;
    els.videoPlayer.load();

    // Try auto-play muted (allowed by browsers on mobile)
    const playPromise = els.videoPlayer.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        updatePlayIcon(true);
      });
    }
  }

  // Render Candidates Grid
  function renderCandidates(round) {
    els.votingGrid.innerHTML = "";

    round.candidates.forEach((cand) => {
      const card = document.createElement("div");
      card.className = `candidate-card ${currentSelectedCandidate === cand.id ? "selected" : ""}`;
      card.dataset.id = cand.id;

      card.innerHTML = `
        <div class="candidate-header">
          <span class="candidate-color-dot" style="color: ${cand.color}; background-color: ${cand.color};"></span>
          <span class="candidate-tag">${cand.tag}</span>
        </div>
        <div class="candidate-name">${cand.name}</div>
        <div class="candidate-radio">
          <div class="candidate-radio-inner"></div>
        </div>
      `;

      card.addEventListener("click", () => {
        selectCandidate(cand.id);
      });

      els.votingGrid.appendChild(card);
    });
  }

  // Select Candidate
  function selectCandidate(modelId) {
    currentSelectedCandidate = modelId;
    const round = arenaData.rounds[currentRoundIndex];
    userVotes[round.id] = modelId;

    // Update UI cards
    const cards = els.votingGrid.querySelectorAll(".candidate-card");
    cards.forEach((c) => {
      if (c.dataset.id === modelId) {
        c.classList.add("selected");
      } else {
        c.classList.remove("selected");
      }
    });

    updateNextButtonState();

    // Light tactile feedback if available
    if (navigator.vibrate) {
      try { navigator.vibrate(15); } catch (e) {}
    }
  }

  // Next Button State
  function updateNextButtonState() {
    if (currentSelectedCandidate) {
      els.btnNext.disabled = false;
      const isLast = currentRoundIndex === arenaData.rounds.length - 1;
      els.btnNext.innerHTML = isLast
        ? 'Revisar y Finalizar Voto <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>'
        : 'Siguiente Ronda <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>';
    } else {
      els.btnNext.disabled = true;
      els.btnNext.innerHTML = 'Selecciona una opción para continuar';
    }
  }

  // Video Events
  function togglePlay() {
    if (els.videoPlayer.paused) {
      els.videoPlayer.play();
    } else {
      els.videoPlayer.pause();
    }
  }

  function replayVideo() {
    els.videoPlayer.currentTime = 0;
    els.videoPlayer.play();
    els.completionBanner.style.display = "none";
  }

  function updatePlayIcon(isPaused) {
    if (isPaused) {
      els.btnPlayPause.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
    } else {
      els.btnPlayPause.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
    }
  }

  function updateTimeline() {
    const cur = els.videoPlayer.currentTime;
    const dur = els.videoPlayer.duration || 1;
    const pct = (cur / dur) * 100;
    els.videoTimelineFill.style.width = `${pct}%`;

    const curFmt = formatTime(cur);
    const durFmt = formatTime(dur);
    els.videoTimeLabel.textContent = `${curFmt} / ${durFmt}`;
  }

  function seekTimeline(e) {
    const rect = els.videoTimeline.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    els.videoPlayer.currentTime = pos * els.videoPlayer.duration;
  }

  function onVideoEnded() {
    updatePlayIcon(true);
    els.completionBanner.style.display = "flex";
    // If user hasn't selected an option yet, subtly pulse the grid
    if (!currentSelectedCandidate) {
      els.votingGrid.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function formatTime(secs) {
    if (isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }

  // Handle Next Round
  function handleNextRound() {
    if (!currentSelectedCandidate) return;

    if (currentRoundIndex < arenaData.rounds.length - 1) {
      renderRound(currentRoundIndex + 1);
    } else {
      // Completed all rounds! Show feedback screen
      showFeedbackScreen();
    }
  }

  // Show Feedback Screen
  function showFeedbackScreen() {
    els.roundStage.style.display = "none";
    els.feedbackStage.style.display = "block";
    els.progressBarFill.style.width = "100%";
  }

  // Finalize Submission
  async function finalizeSubmission(skipFeedback) {
    const feedback = skipFeedback ? "" : els.feedbackTextarea.value.trim();

    // Disable button to prevent double-click
    els.btnSubmitFeedback.disabled = true;
    els.btnSkipFeedback.disabled = true;

    await Tracker.submitVotes({
      webhookUrl: arenaData.settings.webhook_url,
      exercise: currentExercise,
      votes: userVotes,
      feedback: feedback
    });

    showSuccessScreen();
  }

  // Show Success Screen
  function showSuccessScreen() {
    els.feedbackStage.style.display = "none";
    els.successStage.style.display = "flex";

    // Populate summary of votes
    els.votesSummaryList.innerHTML = "";
    arenaData.rounds.forEach((round) => {
      const chosenId = userVotes[round.id];
      const cand = round.candidates.find((c) => c.id === chosenId) || { name: chosenId || "Sin voto" };

      const item = document.createElement("div");
      item.className = "vote-item";
      item.innerHTML = `
        <span class="vote-category">${round.name}</span>
        <span class="vote-choice">${cand.name}</span>
      `;
      els.votesSummaryList.appendChild(item);
    });
  }

  // Restart Arena
  function restartArena() {
    userVotes = {};
    currentSelectedCandidate = null;
    if (els.feedbackTextarea) els.feedbackTextarea.value = "";
    els.btnSubmitFeedback.disabled = false;
    els.btnSkipFeedback.disabled = false;

    els.successStage.style.display = "none";
    els.feedbackStage.style.display = "none";
    els.roundStage.style.display = "block";

    renderRound(0);
  }

  // Stats Modal
  function openStatsModal() {
    renderStatsContent();
    els.modalStats.classList.add("open");
  }

  function closeStatsModal() {
    els.modalStats.classList.remove("open");
  }

  function renderStatsContent() {
    const stats = Tracker.getAggregatedStats();
    const fbLog = Tracker.getFeedbackLog();
    els.statsContainer.innerHTML = "";

    if (Object.keys(stats).length === 0) {
      els.statsContainer.innerHTML = `
        <div style="text-align: center; color: var(--text-dim); padding: 20px 0;">
          Aún no se han registrado votos en este navegador.<br>
          ¡Completa la arena para ver los primeros resultados!
        </div>
      `;
      return;
    }

    // Render stats for each round
    arenaData.rounds.forEach((round) => {
      const rStats = stats[round.id] || { total: 0, models: {} };
      const total = rStats.total || 0;

      const group = document.createElement("div");
      group.className = "stat-group";
      group.innerHTML = `
        <div class="stat-header">
          <span class="stat-label" style="font-weight: 700;">${round.name}</span>
          <span class="stat-value" style="color: var(--text-dim);">${total} votos</span>
        </div>
      `;

      round.candidates.forEach((cand) => {
        const count = rStats.models[cand.id] || 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;

        const row = document.createElement("div");
        row.style.marginBottom = "6px";
        row.innerHTML = `
          <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 2px;">
            <span><strong style="color: #fff;">${cand.name}</strong> <span style="color: var(--text-dim);">(${cand.tag})</span></span>
            <span style="font-family: monospace; color: var(--accent-cyan);">${pct}% (${count})</span>
          </div>
          <div class="stat-bar-track">
            <div class="stat-bar-fill" style="width: ${pct}%; background: ${cand.color || 'var(--accent-cyan)'};"></div>
          </div>
        `;
        group.appendChild(row);
      });

      els.statsContainer.appendChild(group);
      els.statsContainer.appendChild(document.createElement("hr")).style.borderColor = "var(--border-subtle)";
    });

    // Feedback comments section
    if (fbLog.length > 0) {
      const fbHeader = document.createElement("div");
      fbHeader.innerHTML = `<h4 style="font-size: 0.88rem; color: #fff; margin-top: 8px;">Comentarios Recientes (${fbLog.length}):</h4>`;
      els.statsContainer.appendChild(fbHeader);

      fbLog.slice(-5).reverse().forEach((f) => {
        const cCard = document.createElement("div");
        cCard.style.background = "rgba(0,0,0,0.3)";
        cCard.style.padding = "8px 12px";
        cCard.style.borderRadius = "6px";
        cCard.style.fontSize = "0.8rem";
        cCard.style.border = "1px solid var(--border-subtle)";
        cCard.style.marginTop = "6px";
        cCard.innerHTML = `<div style="color: #cbd5e1;">"${escapeHtml(f.feedback)}"</div><div style="color: var(--text-dim); font-size: 0.7rem; margin-top: 2px;">${new Date(f.date).toLocaleDateString()}</div>`;
        els.statsContainer.appendChild(cCard);
      });
    }
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Pack Modal
  function openPackModal() {
    renderPackTabs();
    els.modalPack.classList.add("open");
  }

  function closePackModal() {
    els.packVideoPlayer.pause();
    els.modalPack.classList.remove("open");
  }

  function renderPackTabs() {
    if (!arenaData.packs) return;
    els.packTabs.innerHTML = "";

    arenaData.packs.forEach((p, idx) => {
      const btn = document.createElement("button");
      btn.className = `exercise-pill ${idx === 0 ? "active" : ""}`;
      btn.textContent = p.label;
      btn.addEventListener("click", () => {
        document.querySelectorAll("#pack-tabs .exercise-pill").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        els.packVideoPlayer.src = p.video;
        els.packVideoPlayer.play();
      });
      els.packTabs.appendChild(btn);
    });

    // Default to first pack video
    els.packVideoPlayer.src = arenaData.packs[0].video;
    els.packVideoPlayer.play();
  }

  // Run on DOM Ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
