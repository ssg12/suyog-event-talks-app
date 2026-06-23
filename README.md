# BigQuery Release Notes Hub

A modern, high-fidelity web application built with Python Flask and vanilla HTML, CSS, and JavaScript. It fetches the latest Google BigQuery Release Notes from the official XML feed, parses updates chronologically, categorizes them, and allows users to search, filter, and share specific updates directly on X (Twitter).

**GitHub Repository:** [https://github.com/ssg12/suyog-event-talks-app](https://github.com/ssg12/suyog-event-talks-app)

---

## Key Features

- **Live Parser**: Fetches the official XML release notes feed and parses them.
- **Granular Update Splitting**: Automatically parses daily entries and splits them into distinct sub-cards (e.g. separating *Features*, *Announcements*, *Deprecations*, *Issues*, and *General* updates that occur on the same date).
- **Caching Mechanism**: Implements a memory cache that stores parsed notes for 1 hour to ensure near-instant page load times.
- **Manual Override**: A dedicated **Refresh** button with a rotation animation triggers a bypass of the cache to pull the absolute latest live feed.
- **Live Search & Filter**: Real-time interactive keyword search and category pills filter updates instantly on the client side.
- **Premium Glassmorphic Design**: Features a sleek dark theme with floating radial glowing background animations, active pulse indicators, and responsive card lists using Inter and Outfit typography.
- **Tweet Composer Modal**: Allows the user to select any specific update and compose a Tweet. Includes:
  - Excerpt generation.
  - Character limit validator (280 characters limit).
  - Accurate URL length calculations (counting all URLs as exactly 23 characters as per X/Twitter's shortening policy).
  - Dynamic circular progress indicator.
  - One-click copy to clipboard.
  - Web intent redirection to open X's draft publisher directly.

---

## Project Structure

```
bq-release-notes/
├── app.py                  # Flask Application Server
├── requirements.txt        # Python dependency list
├── README.md               # Documentation
├── templates/
│   └── index.html          # Dashboard HTML skeleton & SVG definitions
└── static/
    ├── css/
    │   └── style.css       # Layout styles & keyframe animations
    └── js/
        └── main.js         # AJAX loaders, timeline builder, search/filter & Tweet modal logic
```

---

## Setup & Running Locally

### Prerequisites
- Python 3 (Launcher `py` or `python` command)

### 1. Set Up the Virtual Environment
Create and configure the virtual environment in the project directory:
```bash
# Create virtual environment
py -m venv venv

# Activate virtual environment
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On Windows (CMD):
.\venv\Scripts\activate.bat
```

### 2. Install Dependencies
Install Flask and Requests:
```bash
pip install -r requirements.txt
```

### 3. Run the Application
Start the Flask dev server:
```bash
python app.py
```

By default, the server runs on:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## Customizing Share Presets
If you want to modify default hashtags or styling, you can check:
- `static/js/main.js`: `openTweetModal()` contains the default tweet template text formatting.
- `static/css/style.css`: Contains CSS variables for custom styling.
