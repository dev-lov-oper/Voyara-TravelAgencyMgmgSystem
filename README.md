# Voyara — Travel Agency Management System (TAMS)

An academic Jira and Agile project management learning exercise using a Travel Agency Management System as the application scenario.

> **Project Type:** Academic Learning Project  
> **Primary Focus:** Jira, Agile Workflows, Sprint Planning, and Task Management  
> **Application Scenario:** Travel Agency Management System (`Voyara`)

---

## Project Overview

Travelers often need to browse multiple travel options and contact agents manually to understand package details and booking availability. TAMS centralizes this discovery process through a structured, responsive platform for travel package exploration and booking workflows.

### Objectives
- Display available travel packages in a clean, intuitive, and modern interface.
- Help travelers compare destinations, durations, and transparent budgets.
- Present package itineraries, pricing in Indian Rupees (`₹`), and key features.
- Provide a robust foundation for booking submissions and status tracking.
- Practice industry-standard Agile project management using Jira stories and sprints.

---

## Features Implemented (Jira Story: TAMS-7)

### 1. Curated Package Listing UI
- **Full-Width Immersive Experience:** Clean, modern travel aesthetic with warm off-white tones, deep navy typography, and restrained ocean teal/blue accents.
- **Dynamic 3-Column Grid:** Responsive package cards spanning wide desktop viewports, 2-column tablet layout, and 1-column mobile stack.
- **Package Details at a Glance:**
  - High-resolution destination photography with graceful fallback handling.
  - Destination name and duration pill tags.
  - Indian Rupee (`₹`) formatted pricing per person.
  - Accessible *View Details* preview dialog with keyboard `Escape` dismiss.

### 2. Dynamic Package Data Retrieval
- **Centralized Service Layer (`src/services/packageService.js`):**
  - Configurable API endpoint via `VITE_API_URL` (defaults to `/api`).
  - Safe field normalization that prevents UI crashes if optional fields are missing or differently formatted in backend payloads.
  - Support for `is_active` filtering so only active packages are displayed.
  - Isolated sample dataset fallback for local development and reviewer previews.
- **Asynchronous States:**
  - **Loading State:** Shimmering skeleton cards (`LoadingSkeleton.jsx`) matching the card dimensions without layout shift.
  - **Error State:** Clear error card (`ErrorState.jsx`) with a functional retry mechanism.
  - **Empty State:** Distinct empty state (`EmptyState.jsx`) displaying *"No packages available right now."* with supporting information when 0 packages are active.
  - **Reviewer State Toggle:** Interactive pill buttons to easily toggle between available packages and the empty state.

---

## Technology Stack
- **Frontend Framework:** React 19 + Vite 8
- **Styling:** Pure Vanilla CSS with CSS Custom Properties, Flexbox, and CSS Grid
- **Linter & Code Quality:** Oxlint (0 warnings, 0 errors)
- **Version Control:** Git & GitHub
- **Project Management:** Jira

---

## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/dev-lov-oper/Voyara-TravelAgencyMgmgSystem.git
cd Voyara-TravelAgencyMgmgSystem
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Production Build & Linting
```bash
# Run lint check
npm run lint

# Build production bundle
npm run build
```

---

## Project Structure
```text
Voyara-TravelAgencyMgmgSystem/
├── src/
│   ├── components/
│   │   ├── DetailsPlaceholderModal.jsx # Accessible preview dialog
│   │   ├── EmptyState.jsx              # No packages empty state
│   │   ├── ErrorState.jsx              # Error banner with retry
│   │   ├── Footer.jsx                  # Site footer with brand info
│   │   ├── HeroSection.jsx             # Welcoming hero & CTA
│   │   ├── LoadingSkeleton.jsx         # Shimmering skeleton cards
│   │   ├── Navbar.jsx                  # Header with desktop/mobile navigation
│   │   ├── PackageCard.jsx             # Individual travel package card
│   │   └── PackageSection.jsx          # Package listing section & grid
│   ├── data/
│   │   └── packages.js                 # Sample package dataset
│   ├── services/
│   │   └── packageService.js           # API retrieval & response normalization
│   ├── App.jsx                         # Main application component
│   ├── index.css                       # Full-width design system & styles
│   └── main.jsx                        # Entry point
├── index.html                          # HTML shell with Google Fonts & SEO tags
├── package.json
└── README.md
```

---

## Project Management & Jira Roadmap
Development tasks are tracked in Jira using epics, user stories, subtasks, and sprints:
- [x] **TAMS-7:** Package Listing UI & Dynamic Data Retrieval
- [ ] **TAMS-8:** Package Details & Detailed Itinerary View
- [ ] **TAMS-9:** Destination Search & Budget Filtering
- [ ] **TAMS-10:** Booking Request Submission
- [ ] **TAMS-11:** Booking Status Tracking & Agent Decisions

---

## License
Private — Voyara Travel Agency Management System.
