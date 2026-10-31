# 🛡️ ScamSentry AI — Chrome Browser Extension (Manifest V3)

> **Tagline:** Real-time URL phishing and malicious link verification connecting directly to Avaish’s universal lookup API.

The **ScamSentry AI Browser Extension** inspects the currently visited website URL and verifies it in real time against the ScamSentry AI backend risk engine.

---

## 🚀 How to Install in Google Chrome

Follow these 4 simple steps to install the extension locally:

1. Open **`chrome://extensions`** in your Chrome address bar.
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click the **Load unpacked** button in the top-left toolbar.
4. In the folder picker, select the **`browser-extension/`** folder:
   ```text
   e:\Project\DeepDefence\scamsentry-ai\browser-extension
   ```

*The ScamSentry AI shield icon will appear in your Chrome extensions toolbar. Pin it for convenient 1-click access.*

---

## 🔌 Avaish's Backend API Specification

The extension is configured out-of-the-box to use Avaish's universal lookup API:

* **HTTP Method:** `POST`
* **Local Base URL:** `http://localhost:8001`
* **API Endpoint:** `/api/lookup`
* **Full URL:** `http://localhost:8001/api/lookup`

### 1. Request Payload
When inspecting a visited website (or when testing a URL), the extension sends:
```json
{
  "query": "https://example.com"
}
```

### 2. Expected Response Fields
The extension renders all returned intelligence fields from the backend:
```json
{
  "verdict": "KNOWN_SCAM",
  "risk_score": 95,
  "risk_level": "high",
  "report_count": 43,
  "top_category": "Phishing / Fake KYC"
}
```

---

## 🚦 Verdict Handling & Safety Standards

| Returned Verdict | Risk Banner | Guidance & UI Behavior |
| :--- | :--- | :--- |
| **`KNOWN_SCAM`** | 🔴 Red High Risk (`#B42318`) | Displays a clear, urgent warning banner: **DO NOT** enter banking credentials, ATM PIN, UPI PIN, or SMS OTPs. |
| **`SUSPICIOUS`** | 🟡 Amber Caution (`#8F5300`) | Displays caution advisory: verify sender independently; check for deceptive domain typos. |
| **`NO_REPORTS`** | ⚪ Slate Neutral (`#556070`) | **"No reports found—not guaranteed safe."** Never claims silence is safe. Alerts user that new fraud domains rotate rapidly. |
| **`VERIFIED_BUSINESS`** | 🟢 Green Verified (`#17692F`) | Displays official directory match for registered banks and public utilities. |

---

## 🔒 Privacy-First Design & Minimal Permissions

- **`activeTab` Permission Only:** Inspection happens **only on demand** when the user clicks the extension popup.
- **Zero Browsing History Access:** Never requests `<all_urls>` permission, never monitors background tab navigation, and never tracks or transmits unrelated browsing activity.
- **`storage` Permission:** Retains user settings (configurable backend URL, web app URL, and mock mode toggle) locally in the browser.

---

## ⚙️ Configurable API & Settings

Click the ⚙️ **Gear icon** in the top-right corner of the popup to access settings:
* **API Base URL:** Default is `http://localhost:8001` (can be changed to any port or remote host).
* **Test API Health:** Probes `GET /health` or `POST /api/lookup` with a ping to verify connectivity.
* **Enable Mock Mode (Dev Only):** When Avaish's backend is not running, toggle this on to simulate all 4 verdict states locally without errors.
* **Separation of Source:** Live responses display `Verified by Live Backend (http://localhost:8001/api/lookup)`. Simulated responses display `Development Mock Mode (Simulated Response)`.

---

## 🧪 How to Test Against Avaish’s Backend

### Step 1: Start Avaish’s Backend Server
In the backend directory, ensure the FastAPI server is running on port **8001**:
```powershell
# In a separate terminal
cd backend
uvicorn app.main:app --port 8001 --reload
```

### Step 2: Test URL Lookups
1. Browse to any website in Chrome (e.g. `https://sbi.co.in` or `https://github.com`).
2. Click the **ScamSentry AI** extension icon.
3. The popup will automatically extract the URL and send a `POST` request to `http://localhost:8001/api/lookup`.
4. The status pill will display **Live API (8001)** and show the real verdict returned by the backend.

### Step 3: Offline Development & Quick-Test Presets
If Avaish's backend is temporarily stopped:
* The extension gracefully transitions to an informative **Backend Server Unavailable** card with a 1-click **Enable Dev Mock Mode** button.
* In Mock Mode, you can use the **Quick Test URLs** buttons at the bottom of the popup (`Scam Link`, `Suspicious`, `No Reports`, `Verified`) to demonstrate all 4 states for judges and evaluators without requiring a live database.
