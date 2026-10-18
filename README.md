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

### 3. Destination Search & Budget Filtering (Jira Stories: TAMS-24, TAMS-25 & TAMS-10)
- **Destination Search (`DestinationSearch.jsx`):**
  - Search input with placeholder `"Search by destination..."`.
  - Accessible search icon and landmark `role="search"`.
  - Clear button (`×`) appears dynamically whenever text is entered.
  - Keyboard accessibility with `Escape` to clear search and screen-reader accessible label.
  - Case-insensitive, whitespace-trimmed partial substring filtering.
- **Budget Filtering (`BudgetFilter.jsx`):**
  - Clear input fields: **"Minimum Budget (₹)"** and **"Maximum Budget (₹)"**.
  - Non-negative numeric validation (`min="0"`).
  - Validation: verifies that minimum budget does not exceed maximum budget (`"Minimum budget cannot exceed maximum budget."`).
  - Action buttons: **"Apply Filters"** to apply criteria and **"Clear Filters"** to reset budget range.
  - Inclusive boundary matching: correctly includes package prices equal to either boundary (`price >= min && price <= max`).
- **Combined Search & Budget Logic (`PackageSection.jsx`):**
  - Seamlessly combines destination query and budget criteria.
  - Clearing budget filters preserves destination search query.
  - Clearing destination search preserves active budget filters.
  - Active filter tags and live match counter (`Showing X of Y packages`).
  - Distinct empty states for no destination match, no budget match, combined filter mismatch, and empty catalog.

### 4. Package Details Interface (Jira Story: TAMS-11)
- **Comprehensive Details View (`PackageDetails.jsx`):**
  - High-resolution hero image, destination/duration/category badges, and package title heading.
  - Quick specification cards for duration, price in Indian Rupees (`₹`), destination, and travel category.
  - Full overview description section.
- **Day-by-Day Itinerary:**
  - Structured timeline with numbered Day indicators, milestone titles, and detailed descriptions.
  - Graceful fallback message when itinerary details are pending or customized on request.
- **Inclusions & Exclusions:**
  - Dedicated cards with visual iconography (green `✓` checkmarks for inclusions, red `✕` crosses for exclusions).
  - Graceful notes when optional fields are omitted in raw data.
- **Navigation & Routing:**
  - Connects "View Details" on package cards directly to the details view.
  - Breadcrumbs (`Home / Packages / [Destination]`) and prominent "← Back to Packages" return buttons.
  - URL synchronization (`?package=pkg-id`) and browser history support (`popstate`).
  - Preserves user search query and budget filter settings when returning to the package listing.
- **Resilience & Error States:**
  - Dedicated "Package Not Found" view with return action when an invalid package identifier is requested.
  - Loading skeleton state and error recovery banner with retry option.

### 5. Display Itinerary and Inclusions (Jira Story: TAMS-31)
- **Day-by-Day Itinerary (`PackageDetails.jsx`):**
  - Clearly labelled `"Day-by-Day Itinerary"` section with schedule duration badge (`X Days Schedule`).
  - Displays each itinerary day in chronological order (`sortedItinerary`) regardless of source array ordering.
  - Numbered day badges (`Day 1`, `Day 2`, etc.), bold title, and detailed descriptive summary.
  - Supports packages with varying itinerary lengths (e.g., 4-day Goa, 5-day Manali, 6-day Kerala).
  - Graceful fallback note when itinerary details are not yet provided (`"Itinerary details for this package are currently unavailable. A customized day-by-day schedule can be tailored upon inquiry."`), avoiding fabricated activities.
- **Package Inclusions & Exclusions (`PackageDetails.jsx`):**
  - Clearly labelled `"What's Included"` section with green checkmark iconography.
  - Accessible list markup (`role="list"` and `role="listitem"`) displaying all confirmed inclusions.
  - Safe fallback when no inclusions are listed (`"No specific inclusions listed for this package. Inclusion details are available upon request."`), without assuming standard items.
  - Clearly labelled `"What's Not Included"` section for exclusions, rendered conditionally only when exclusions are explicitly present in the data model.
- **Responsive Layout & Alignment:**
  - Robust 2-column desktop grid with sticky sidebar.
  - Single-column stacked layout on mobile devices (`max-width: 640px`) and tablets (`max-width: 1024px`).
  - Consistent padding using `--screen-padding` token preventing layout clipping on smaller screens.

---

## Technology Stack
- **Frontend Framework:** React 19 + Vite 8
- **Styling:** Pure Vanilla CSS with CSS Custom Properties, Flexbox, and CSS Grid
- **Testing:** Vitest (66 unit & integration tests)
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

### 4. Run Tests, Linting & Build
```bash
# Run unit & integration tests
npm test

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
│   │   ├── BudgetFilter.jsx            # Min/max budget filter controls & validation
│   │   ├── DestinationSearch.jsx       # Destination search bar with clear button
│   │   ├── DetailsPlaceholderModal.jsx # Accessible preview dialog
│   │   ├── EmptyState.jsx              # Distinct empty states for catalog/search/budget
│   │   ├── ErrorState.jsx              # Error banner with retry
│   │   ├── Footer.jsx                  # Site footer with brand info
│   │   ├── HeroSection.jsx             # Welcoming hero & CTA
│   │   ├── LoadingSkeleton.jsx         # Shimmering skeleton cards
│   │   ├── Navbar.jsx                  # Header with desktop/mobile navigation
│   │   ├── PackageCard.jsx             # Individual travel package card
│   │   ├── PackageDetails.jsx          # Comprehensive package details page view
│   │   └── PackageSection.jsx          # Package listing section, toolbar, search & grid
│   ├── data/
│   │   └── packages.js                 # Sample package dataset with itineraries & inclusions
│   ├── services/
│   │   └── packageService.js           # API retrieval, getPackageById & response normalization
│   ├── App.jsx                         # Main application component & routing
│   ├── index.css                       # Full-width design system & styles
│   └── main.jsx                        # Entry point
├── tests/
│   ├── budgetFilter.test.js            # TAMS-10 budget filter unit & integration tests
│   ├── destinationSearch.test.js       # TAMS-24/TAMS-25 search interface & logic tests
│   ├── packageDetails.test.js          # TAMS-11 package details unit & integration tests
│   └── packageListing.test.js          # TAMS-7/TAMS-8 data retrieval & state tests
├── index.html                          # HTML shell with Google Fonts & SEO tags
├── package.json
└── README.md
```

---

## Project Management & Jira Roadmap
Development tasks are tracked in Jira using epics, user stories, subtasks, and sprints:
- [x] **TAMS-7:** Browse Available Travel Packages (Package Listing UI)
- [x] **TAMS-8:** Package Data Retrieval (Dynamic API, Loading, Error & Empty States)
- [x] **TAMS-9:** Package Details & Detailed Itinerary View
- [x] **TAMS-24:** Build Destination Search Interface
- [x] **TAMS-25:** Implement Destination Search Logic
- [x] **TAMS-10:** Destination Search & Budget Filtering
- [x] **TAMS-11:** Build Package Details Interface
- [x] **TAMS-31:** Display Itinerary and Inclusions
- [ ] **TAMS-12:** Booking Request Submission & Status Tracking

---

## License
Private — Voyara Travel Agency Management System.
