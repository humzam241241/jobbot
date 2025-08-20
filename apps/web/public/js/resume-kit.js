// public/js/resume-kit.js
async function generateResumeKit() {
  const btn   = document.querySelector("#generate-btn");
  const jobUrl = document.querySelector("#jobUrl, [name='jobUrl']")?.value?.trim();
  const model  = document.querySelector("#aiModel, [name='aiModel']")?.value || "GPT-4o";
  const notes  = document.querySelector("#notes, [name='notes']")?.value || "";
  const resumeFile = document.querySelector("#resumeFile")?.files?.[0];
  const resumeText = document.querySelector("#resumeText")?.value || "";

  if (!jobUrl) return showError("Please paste a Job URL.");

  // UI state
  btn?.setAttribute("disabled", "true");
  showProgress("Preparing…");

  // Abort after 45s
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort("timeout"), 45000);

  try {
    // Use FormData for file upload support
    const formData = new FormData();
    formData.append("jobUrl", jobUrl);
    formData.append("aiModel", model);
    formData.append("notes", notes);
    if (resumeFile) {
      formData.append("file", resumeFile);
    }
    formData.append("resumeText", resumeText);

    const res = await fetch(`${window.API_BASE}/api/resume-kit`, {
      method: "POST",
      credentials: "include",
      body: formData,
      signal: ctrl.signal
    });

    const ctype = res.headers.get("content-type") || "";
    const data = ctype.includes("application/json")
      ? await res.json()
      : { error: (await res.text()).slice(0, 500) };

    if (!res.ok) {
      throw new Error(data?.error || `Request failed (${res.status})`);
    }

    showSuccess("Resume kit generated.");
    if (data.files) {
      renderDownloadLinks(data.files);
    }
  } catch (e) {
    const msg =
      e?.name === "AbortError" ? "API timed out. Is the server running on 8787?" :
      e?.message || String(e);
    showError(msg);
  } finally {
    clearTimeout(to);
    btn?.removeAttribute("disabled");
    endProgress();
  }
}

// Helper functions
window.showError = window.showError || function(msg) {
  const errorBox = document.querySelector("#errorBox");
  if (errorBox) {
    errorBox.textContent = `Error: ${msg}`;
    errorBox.style.display = "block";
  } else {
    alert(`Error: ${msg}`);
  }
};

window.showSuccess = window.showSuccess || function(msg) {
  console.log(msg);
  const errorBox = document.querySelector("#errorBox");
  if (errorBox) {
    errorBox.style.display = "none";
  }
};

window.showProgress = window.showProgress || function(msg) {
  const btn = document.querySelector("#generate-btn");
  if (btn) {
    btn.textContent = msg;
  }
  console.log(msg);
};

window.endProgress = window.endProgress || function() {
  const btn = document.querySelector("#generate-btn");
  if (btn) {
    btn.textContent = "Generate Resume Kit";
  }
};

window.renderDownloadLinks = window.renderDownloadLinks || function(files) {
  console.log("Files generated:", files);
};

// Attach event listener when DOM is ready
function bindGenerate() {
  const btn = document.querySelector("#generate-btn");
  if (!btn) return;
  btn.addEventListener("click", function(e) {
    e.preventDefault();
    generateResumeKit();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bindGenerate);
} else {
  bindGenerate();
}
