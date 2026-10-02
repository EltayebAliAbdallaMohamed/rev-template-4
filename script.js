document.addEventListener("DOMContentLoaded", async () => {
  const slidesContainer = document.getElementById("slides-container");
  const currentSlideLabel = document.getElementById("current-slide-label");
  const ttsButton = document.getElementById("tts-button");
  const ttsStatus = document.getElementById("tts-status");
  
  let autoPlayAudio = false;

  function announceStatus(message) {
    if (!ttsStatus) return;
    ttsStatus.textContent = "";
    setTimeout(() => {
      ttsStatus.textContent = message;
    }, 50);
  }

  function speakSelectedText() {
    const selectedText = window.getSelection().toString().replace(/\s+/g, " ").trim();

    if (!selectedText) {
      announceStatus("No text selected. Please select text to read aloud.");
      return;
    }

    if (!ttsButton) return;

    window.speechSynthesis.cancel();

    const arabicRegex = /[\u0600-\u06FF]/g;
    const isArabic = arabicRegex.test(selectedText);

    const utterance = new SpeechSynthesisUtterance(selectedText);
    utterance.rate =0.6;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.lang = isArabic ? "ar-SA" : "en-US";

    ttsButton.classList.add("speaking");
    ttsButton.textContent = "🔊 Speaking...";
    ttsButton.setAttribute("aria-pressed", "true");

    announceStatus(
      isArabic
        ? "Reading Arabic text aloud."
        : "Reading English text aloud."
    );

    utterance.onend = () => {
      ttsButton.classList.remove("speaking");
      ttsButton.textContent = "🔊 Read Selected Text";
      ttsButton.setAttribute("aria-pressed", "false");
      announceStatus("Reading finished.");
    };

    utterance.onerror = () => {
      ttsButton.classList.remove("speaking");
      ttsButton.textContent = "🔊 Read Selected Text";
      ttsButton.setAttribute("aria-pressed", "false");
      announceStatus("Speech failed. Please try again.");
      console.error("Speech synthesis error:", utterance.error);
    };

    window.speechSynthesis.speak(utterance);
  }

  if (ttsButton) {
    ttsButton.addEventListener("click", speakSelectedText);
  }

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "s") {
      event.preventDefault();
      speakSelectedText();
    }
  });

  try {
    const response = await fetch("activity.json");
    if (!response.ok) {
      throw new Error("Could not load activity.json");
    }

    const data = await response.json();
    const lessons = Array.isArray(data) ? data : [data];

    if (!lessons.length) {
      throw new Error("No lesson data found.");
    }

    lessons.forEach((lesson, index) => {
      const section = document.createElement("section");
      section.className = "slide";
      section.tabIndex = 0;
      section.setAttribute("data-background-color", "#0b1020");
      section.setAttribute("aria-label", `Slide ${index + 1}: ${lesson.lessonTitle || "English lesson"}`);

      const audioFile = lesson.audioFileName || "";
      const audioScript = lesson.audioScript || "No audio script available.";
      const arabicTranslation = lesson.arabicTranslation || "No Arabic translation available.";
      const bookTitle = lesson.bookTitle || "Unknown book";
      const unitNumber = lesson.unitNumber ?? "N/A";
      const pageNumber = lesson.pageNumber ?? "N/A";

      section.innerHTML = `
        <div class="slide-content" tabindex="0">
          <div class="title-with-checkbox">
            <h1>${lesson.lessonTitle || `Lesson ${index + 1}`}</h1>
            <label class="auto-play-label">
              <input type="checkbox" class="auto-play-checkbox" aria-label="Auto-play audio on navigation" />
              <span class="checkbox-text">Auto-play</span>
            </label>
          </div>

          <div class="meta-grid">
            <div class="meta-card">
              <strong>Book</strong>
              <span>${bookTitle}</span>
            </div>

            <div class="meta-card">
              <strong>Unit</strong>
              <span>${unitNumber}</span>
            </div>

            <div class="meta-card">
              <strong>Page</strong>
              <span>${pageNumber}</span>
            </div>

            <div class="meta-card">
              <strong>Audio</strong>
              <span>${audioFile ? audioFile : "No audio file assigned"}</span>
            </div>
          </div>

          <div class="audio-box">
            <strong>Listen to the lesson audio:</strong>
            ${
              audioFile
                ? `<audio controls preload="metadata" aria-label="Lesson audio for ${lesson.lessonTitle || "this lesson"}" class="lesson-audio">
                    <source src="${audioFile}" type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>`
                : "<p>No audio file available.</p>"
            }
          </div>

          <div class="transcript-box">
            <strong>Audio script</strong>
            <p>${audioScript}</p>
          </div>

          <div class="translation-box">
            <strong>Arabic translation</strong>
            <p>${arabicTranslation}</p>
          </div>
        </div>
      `;

      slidesContainer.appendChild(section);
    });

    Reveal.initialize({
      hash: false,
      controls: true,
      progress: true,
      slideNumber: "c/t",
      center: true,
      width: 1280,
      height: 720,
      transition: "slide",
      controlsLayout: "edges",
      backgroundTransition: "fade",
      navigationMode: "linear",
      keyboard: true,
      touch: true,
      help: true,
      fragments: true,
      pdfSeparateFragments: false,
      plugins: []
    });

    const updateFooterSlideInfo = () => {
      const total = document.querySelectorAll(".slides section").length;
      const currentIndex = Reveal.getIndices().h + 1;
      currentSlideLabel.textContent = `${currentIndex} / ${total}`;
    };

    // Wait for Reveal to be ready before updating slide info
    Reveal.on("ready", updateFooterSlideInfo);
    Reveal.addEventListener("slidechanged", updateFooterSlideInfo);

    Reveal.addEventListener("slidechanged", () => {
      const current = document.querySelector(".slides section.present .slide-content");
      if (current) {
        current.setAttribute("tabindex", "0");
        current.focus({ preventScroll: true });
        
        // Handle auto-play audio
        const checkbox = current.querySelector(".auto-play-checkbox");
        const audio = current.querySelector(".lesson-audio");
        
        if (checkbox && checkbox.checked && audio) {
          audio.currentTime = 0;
          audio.play().catch(err => console.log("Auto-play prevented:", err));
        }
      }
    });
    
    // Add event listeners to all checkboxes
    document.querySelectorAll(".auto-play-checkbox").forEach(checkbox => {
      checkbox.addEventListener("change", (e) => {
        autoPlayAudio = e.target.checked;
      });
    });

  } catch (error) {
    console.error(error);

    const fallbackSection = document.createElement("section");
    fallbackSection.innerHTML = `
      <div class="slide-content" tabindex="0">
        <h1>Lesson Content Not Loaded</h1>
        <p>The activity data could not be loaded.</p>
        <p>Please ensure <strong>activity.json</strong> exists and is valid JSON.</p>
      </div>
    `;
    slidesContainer.appendChild(fallbackSection);

    Reveal.initialize({
      hash: false,
      controls: true,
      progress: true,
      controlsLayout: "edge",
      touch: true,
      slideNumber: "c/t",
      center: true,
      transition: "slide"
    });

    currentSlideLabel.textContent = "1 / 1";
    announceStatus("Lesson content could not be loaded.");
  }
});
