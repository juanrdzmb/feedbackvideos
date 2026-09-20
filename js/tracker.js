/**
 * Model Arena v2 - Tracker & Results Storage
 * Handles anonymous session voting, Google Apps Script webhook dispatches,
 * and local storage aggregations.
 */

const Tracker = (function () {
  const SESSION_KEY = "vbt_arena_session_id";
  const VOTES_KEY = "vbt_arena_votes_log";
  const AGGREGATES_KEY = "vbt_arena_aggregates";

  // Generate or retrieve anonymous session ID
  function getSessionId() {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = "anon_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now().toString(36);
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  // Device detection helper
  function getDeviceInfo() {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return "Android";
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return "iOS (iPhone/iPad)";
    if (/Macintosh/i.test(ua)) return "macOS";
    if (/Windows/i.test(ua)) return "Windows";
    if (/Linux/i.test(ua)) return "Linux";
    return "Web Browser";
  }

  // Save vote locally to aggregates
  function recordLocalVote(roundId, modelId, exercise) {
    const raw = localStorage.getItem(AGGREGATES_KEY);
    const agg = raw ? JSON.parse(raw) : {};

    if (!agg[roundId]) {
      agg[roundId] = { total: 0, models: {} };
    }
    agg[roundId].total = (agg[roundId].total || 0) + 1;
    agg[roundId].models[modelId] = (agg[roundId].models[modelId] || 0) + 1;

    localStorage.setItem(AGGREGATES_KEY, JSON.stringify(agg));

    // Also record vote entry in log
    const logRaw = localStorage.getItem(VOTES_KEY);
    const log = logRaw ? JSON.parse(logRaw) : [];
    log.push({
      date: new Date().toISOString(),
      sessionId: getSessionId(),
      roundId,
      modelId,
      exercise
    });
    localStorage.setItem(VOTES_KEY, JSON.stringify(log));
  }

  // Dispatch final bundle to Google Sheets Webhook
  async function submitVotes({ webhookUrl, exercise, votes, feedback }) {
    // 1. Always record in local storage
    Object.keys(votes).forEach((roundId) => {
      recordLocalVote(roundId, votes[roundId], exercise);
    });

    // 2. If feedback comment present, record it locally too
    if (feedback) {
      const fbKey = "vbt_arena_feedback_log";
      const fbList = JSON.parse(localStorage.getItem(fbKey) || "[]");
      fbList.push({
        date: new Date().toISOString(),
        sessionId: getSessionId(),
        exercise,
        feedback
      });
      localStorage.setItem(fbKey, JSON.stringify(fbList));
    }

    // 3. Send to Webhook (Google Apps Script Web App) if configured
    if (webhookUrl && webhookUrl.trim().startsWith("http")) {
      const payload = {
        session_id: getSessionId(),
        exercise: exercise,
        device: getDeviceInfo(),
        feedback: feedback || "",
        votes: Object.keys(votes).map((roundId) => ({
          round_id: roundId,
          model_chosen: votes[roundId],
          exercise: exercise
        }))
      };

      try {
        await fetch(webhookUrl, {
          method: "POST",
          mode: "no-cors", // Standard for Google Apps Script redirects
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        console.log("[Tracker] Payload successfully dispatched to webhook.");
      } catch (err) {
        console.warn("[Tracker] Error dispatching to webhook:", err);
      }
    }

    return true;
  }

  // Get aggregated statistics
  function getAggregatedStats() {
    const raw = localStorage.getItem(AGGREGATES_KEY);
    return raw ? JSON.parse(raw) : {};
  }

  // Get comments log
  function getFeedbackLog() {
    const raw = localStorage.getItem("vbt_arena_feedback_log");
    return raw ? JSON.parse(raw) : [];
  }

  // Export all local data to CSV
  function exportCSV() {
    const logRaw = localStorage.getItem(VOTES_KEY);
    const log = logRaw ? JSON.parse(logRaw) : [];
    if (log.length === 0) {
      alert("Aún no hay votos registrados en este navegador.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Fecha,Sesion,Ejercicio,Ronda,Modelo\n";

    log.forEach((row) => {
      csvContent += `${row.date},${row.sessionId},${row.exercise},${row.roundId},${row.modelId}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `model_arena_votes_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return {
    getSessionId,
    getDeviceInfo,
    submitVotes,
    getAggregatedStats,
    getFeedbackLog,
    exportCSV
  };
})();
