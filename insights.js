// insights.js — Mood Insights Modal + Download All Entries (FIXED VERSION)

document.addEventListener("DOMContentLoaded", async () => {
  await new Promise(r => window.core?.onReady?.(r) || setTimeout(r, 1000));

  const moodModal   = document.getElementById("moodModal");
  const openBtn     = document.getElementById("openMoodInsights");
  const statusEl    = document.getElementById("downloadStatus");

  if (!moodModal && !openBtn && !statusEl) return;

  // FIXED: proper emoji → name + color mapping
  const moodMap = {
    "😊": { name: "Happy",    color: "#A7D8A7" },
    "🙂": { name: "Calm",     color: "#C7E1C7" },
    "😐": { name: "Neutral",  color: "#E0E0E0" },
    "😔": { name: "Sad",      color: "#D8A7A7" },
    "😰": { name: "Anxious",  color: "#E8C7A7" },
    "😡": { name: "Angry",    color: "#E8A7A7" },
    "❤️": { name: "Love",     color: "#FFB3B3" }
  };

  const showStatus = (msg, error = false) => {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.style.color = error ? "#c33" : "#2e6";
    setTimeout(() => statusEl.textContent = "", 5000);
  };

  async function fetchEntries() {
    const { data, error } = await window.supabase
      .from('journal_entries')
      .select('id, title, body, feeling, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  // =============== MOOD INSIGHTS MODAL ===============
  if (openBtn && moodModal) {
    openBtn.addEventListener("click", async () => {
      moodModal.style.display = "flex";
      await renderMoodInsights();
    });

    async function renderMoodInsights() {
      try {
        const entries = await fetchEntries();
        const recent   = entries.filter(e => new Date(e.created_at) >= new Date(Date.now() - 30*24*60*60*1000));

        document.getElementById("entryCount").textContent = recent.length;
        if (recent.length === 0) {
          document.getElementById("dominantMood").textContent = "Start journaling to see your trends!";
          return;
        }

        // Mood counts
        const moodCount = {};
        recent.forEach(e => e.feeling && (moodCount[e.feeling] = (moodCount[e.feeling] || 0) + 1));

        const labels = Object.keys(moodCount).map(emoji => moodMap[emoji]?.name || emoji);
        const colors = Object.keys(moodCount).map(emoji => moodMap[emoji]?.color || "#999");

        // Dominant mood
        const dominantEmoji = Object.entries(moodCount).sort((a,b) => b[1]-a[1])[0][0];
        document.getElementById("dominantMood").textContent = 
          `You've been feeling mostly ${moodMap[dominantEmoji]?.name || dominantEmoji} lately`;

        // Streak (current consecutive days)
        const dates = [...new Set(entries.map(e => e.created_at.split('T')[0]))].sort().reverse();
        let streak = 0;
        for (let i = 0; i < dates.length; i++) {
          const expected = new Date(Date.now() - i*24*60*60*1000).toISOString().split('T')[0];
          if (dates[i] === expected) streak++;
          else break;
        }
        document.getElementById("streakCount").textContent = streak;
        document.getElementById("streakEmoji").textContent = streak >= 7 ? "🔥" : streak >= 3 ? "✨" : "🌱";

        // Destroy old charts
        if (window.pieChart) window.pieChart.destroy();
        if (window.lineChart) window.lineChart.destroy();

        // Pie
        window.pieChart = new Chart(document.getElementById("moodPieChart"), {
          type: "doughnut",
          data: { labels, datasets: [{ data: Object.values(moodCount), backgroundColor: colors, borderWidth: 3, borderColor: "#fff" }] },
          options: { plugins: { legend: { position: "bottom" } } }
        });

        // Line chart
        const moodValues = { "😡":1, "😰":2, "😔":3, "😐":4, "🙂":5, "😊":6, "❤️":7 };
        const last30Days = Array.from({length: 30}, (_, i) => {
          const d = new Date(Date.now() - (29-i)*24*60*60*1000);
          return d.toISOString().split('T')[0];
        });

        const dailyAvg = last30Days.map(date => {
          const dayEntries = recent.filter(e => e.created_at.startsWith(date) && e.feeling);
          if (dayEntries.length === 0) return null;
          return dayEntries.reduce((sum, e) => sum + moodValues[e.feeling], 0) / dayEntries.length;
        });

        window.lineChart = new Chart(document.getElementById("moodLineChart"), {
          type: "line",
          data: {
            labels: last30Days.map((_, i) => i === 29 ? "Today" : `${30-i}d ago`),
            datasets: [{
              label: "Mood",
              data: dailyAvg,
              borderColor: "rgb(124, 140, 132)",
              backgroundColor: "rgba(124, 140, 132, 0.1)",
              tension: 0.4,
              fill: true,
              pointBackgroundColor: dailyAvg.map(v => v > 5 ? "#A7D8A7" : v > 4 ? "#E0E0E0" : "#D8A7A7")
            }]
          },
          options: {
            scales: { y: { min: 1, max: 7, ticks: { stepSize: 1, callback: v => ["", "😡","😰","😔","😐","🙂","😊","❤️"][v] } } },
            plugins: { legend: { display: false } }
          }
        });

      } catch (err) {
        console.error(err);
        document.getElementById("dominantMood").textContent = "Failed to load insights.";
      }
    }
  }

  // =============== DOWNLOAD BUTTONS ===============
  document.getElementById("downloadPdf")?.addEventListener("click", async () => {
    try {
      const entries = await fetchEntries();
      if (!entries.length) return showStatus("No entries to download.");

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text("My MindMend Journal", 105, 20, { align: "center" });
      doc.setFontSize(12);
      doc.text(`Exported ${new Date().toLocaleDateString()} • ${entries.length} entries`, 105, 30, { align: "center" });

      let y = 45;
      entries.forEach((e, i) => {
        if (y > 270) { doc.addPage(); y = 20; }
        const date = new Date(e.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        doc.setFontSize(16);
        doc.text(e.title || "(Untitled)", 20, y); y += 8;
        doc.setFontSize(11);
        doc.setTextColor(120,120,120);
        doc.text(`${date}   ${e.feeling || ""} ${moodEmojis[e.feeling] || ""}`, 20, y); y += 10;

        const txt = (e.body || "").replace(/<\/?[^>]+>/gi, "");
        doc.setFontSize(12);
        doc.setTextColor(60,60,60);
        doc.text(doc.splitTextToSize(txt, 170), 20, y);
        y += txt.split("\n").length * 7 + 10;
        if (i < entries.length-1) { doc.setDrawColor(220,220,220); doc.line(20, y-5, 190, y-5); y += 8; }
      });

      doc.save(`MindMend-Journal-${new Date().toISOString().slice(0,10)}.pdf`);
      showStatus("PDF downloaded!");
    } catch (err) { showStatus("PDF failed", true); }
  });

  document.getElementById("downloadMd")?.addEventListener("click", async () => {
    const entries = await fetchEntries();
    if (!entries.length) return showStatus("No entries.");
    let md = `# MindMend Journal Export\n\n${new Date().toLocaleString()}\n\n---\n\n`;
    entries.forEach(e => {
      const clean = (e.body || "").replace(/<\/?[^>]+>/gi, "").trim();
      md += `## ${e.title || "Untitled"}\n*${new Date(e.created_at).toLocaleDateString()} ${e.feeling || ""} ${moodEmojis[e.feeling] || ""}*\n\n${clean}\n\n---\n\n`;
    });
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `MindMend-${new Date().toISOString().slice(0,10)}.md`; a.click();
    URL.revokeObjectURL(url);
    showStatus("Markdown downloaded!");
  });

  document.getElementById("downloadJson")?.addEventListener("click", async () => {
    const entries = await fetchEntries();
    if (!entries.length) return showStatus("No entries.");
    const data = { exported_at: new Date().toISOString(), total: entries.length, entries };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `MindMend-${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
    showStatus("JSON downloaded!");
  });
});

