# Invoice V2 - File Structure Briefing

This project is a browser-based invoice management system for generating, saving, reviewing, and exporting invoices. The application is organized into a small set of UI modules and shared assets.

## Project Overview

- Main entry point: `index.html`
- Authentication front-end: `login.css`, `login.js`
- Selection page: `Selection/`
- Invoice modules: `Mod 1/`, `Mod 2/`, `Mod 3/`
- Shared media and export utilities: `Assets/`

## Folder Structure

```text
Invoice V2/
├── Assets/
│   ├── excel-export.js          # CSV export logic
│   ├── logo.png                 # Brand/logo image
│   └── stamp.png                # Stamp graphic used in invoice output
├── Mod 1/
│   ├── js/
│   │   └── main.js              # Logic for Module 1 invoice screen
│   ├── main.css                # Styles for Module 1 page
│   └── main.html               # Module 1 interface
├── Mod 2/
│   ├── js/
│   │   └── main.js              # Logic for Module 2 invoice screen
│   ├── main.css                # Styles for Module 2 page
│   └── main.html               # Module 2 interface
├── Mod 3/
│   ├── js/
│   │   └── main.js              # Logic for Module 3 invoice screen
│   ├── logo.png                # Module-specific logo asset
│   ├── main.css                # Styles for Module 3 page
│   └── main.html               # Module 3 interface
├── Selection/
│   ├── selection.css           # Styling for selection page
│   ├── selection.html          # Page for choosing invoice type or module
│   └── selection.js            # Selection logic
├── index.html                  # Primary landing or entry page
├── login.css                  # Login page styling
├── login.js                   # Login logic and flow
├── README.md                  # Project overview and description
├── README_STRUCTURE.md        # File structure briefing document
└── .git/                      # Git repository metadata
```

## Main Functional Areas

### 1. Login and Entry
- `index.html` serves as the main application entry point.
- `login.js` and `login.css` handle the login interface and styling.

### 2. Selection Flow
- `Selection/selection.html` allows users to choose the invoice workflow or interface mode.
- `Selection/selection.js` controls navigation or option selection.

### 3. Invoice Modules
- `Mod 1/`, `Mod 2/`, and `Mod 3/` are separate invoice or billing module screens.
- Each module contains its own HTML, CSS, and JavaScript logic.
- These modules are likely used to present different invoice styles or functions.

### 4. Shared Assets
- `Assets/` holds reusable images and export tools.
- `excel-export.js` supports CSV export for invoice data or backups.

## Briefing Notes

- The project is front-end focused and does not appear to use a backend server.
- Most features are handled in the browser using HTML, CSS, and JavaScript.
- Data is likely stored locally in the browser, which is reflected in the project documentation.
- The structure is modular, making it easier to manage different invoice interfaces independently.

## Recommended Use

For a basic briefing, the most important files to review are:

1. `README.md` – project purpose and business context
2. `index.html` – app entry point
3. `Selection/selection.html` – navigation and user flow
4. `Mod 1/`, `Mod 2/`, `Mod 3/` – invoice page implementations
5. `Assets/excel-export.js` – data export functionality

This structure provides a clear and simple overview of how the application is organized for presentation, development, and maintenance.
