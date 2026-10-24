# Voyara — Travel Agency Management System (TAMS)

An academic Jira and Agile project management learning exercise using a Travel Agency Management System as the application scenario.

> **Project Type:** Academic Learning Project  
> **Primary Focus:** Jira, Agile Workflows, Sprint Planning, and Task Management  
> **Application Scenario:** Travel Agency Management System (`Voyara`)

---

## Project Overview

Travelers often need to browse multiple travel options and contact agents manually to understand package details and booking availability. TAMS centralizes this discovery process through a structured, responsive platform for travel package exploration and booking workflows.

### Objectives
- PRIMARY OBJECTIVE: **Practice industry-standard Agile project management using Jira stories and sprints.**
- Display available travel packages in a clean, intuitive, and modern interface.
- Help travelers compare destinations, durations, and transparent budgets.
- Present package itineraries, pricing in Indian Rupees (`₹`), and key features.
- Provide a robust foundation for booking submissions and status tracking.


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

### 6. Package Details and Retrieval Validation (Jira Story: TAMS-32)
- **Data Association & Package Isolation:**
  - Validated that `getPackageById` and package selection cleanly map package identifiers (`pkg-1`, `pkg-2`, `pkg-5`, `pkg-6`, etc.) to respective package information without cross-contamination.
  - Verified each package displays its distinct title, destination, price, duration, description, itinerary, and inclusions.
- **Defect Fixes & Improvements:**
  - **Filter State Preservation:** Destination search query and applied budget filters now remain fully preserved in state when navigating from the package listing to package details and back via `"Back to Packages"`.
  - **Declarative Image Error Handling:** Replaced effect-based image error resets with declarative URL comparison (`failedImageUrl === pkg?.imageUrl`), eliminating cascading re-renders and React compiler warnings.
  - **Unique Itinerary Keys:** Switched from day index to robust unique keys (`item.id || ${dayNum}-${index}`) to prevent list item collisions.
  - **Clean Package Unmounting:** Added dynamic `key={selectedPackageId || 'details'}` to `<PackageDetails>` to ensure immediate state cleanup when navigating between packages.
- **Asynchronous & Error Edge States:**
  - Loading skeleton display during asynchronous package retrieval.
  - User-friendly "Package Not Found" state for invalid or nonexistent package identifiers with direct return action.
  - Network error state with functional "Try Again" retry action.

### 7. Booking Request Form & Validation (Jira Story: TAMS-33)
- **Booking Request Form (`BookingForm.jsx`):**
  - **Traveler Full Name:** Required input with accessible label, autocomplete, and character length check.
  - **Email Address:** Required input with RFC 5322 regex validation (`user@domain.tld`).
  - **Phone Number:** Required telephone input supporting Indian 10-digit mobile numbers with optional country code (`+91`), spaces, hyphens, and international formats (10 to 15 digits).
  - **Number of Travelers:** Required positive integer input (minimum 1, whole numbers only).
  - **Preferred Travel Date:** Required date input with past-date prevention (`min={todayStr}`).
  - **Additional Requests:** Optional multiline textarea for dietary requirements, accessibility needs, or room preferences.
  - **Submit Button:** Clearly labelled `"Submit Booking Request"` primary action button.
- **Client-Side Validation & Feedback:**
  - Clear error messages displayed directly below each erroneous field with accessible `role="alert"` and `aria-describedby`.
  - Inputs highlighted with `aria-invalid="true"` and visible error borders.
  - Automatically preserves entered values when validation fails.
  - Dedicated validation utilities extracted into [`src/utils/bookingValidation.js`](file:///c:/Users/hp/OneDrive/Desktop/Sharvan%202.0/SE-PLB/src/utils/bookingValidation.js).
- **Selected Package Summary:**
  - Displays selected package name, destination, duration, category, and price per person.
  - Dynamic transparent price calculation: displays estimated total based on selected traveler count (`₹price × travelers = ₹total`).
  - "No payment required right now" reassuring traveler guarantee notice.
- **Confirmation State & Routing:**
  - When client validation succeeds, renders a clean acknowledgment view summarizing traveler details.
  - Seamless navigation back to package details view (`Back to Package Details` / `Cancel`) and URL state synchronization (`?package=id&action=book`).

### 8. Booking Creation & Database Storage (Jira Story: TAMS-34)
- **Embedded Database Architecture (`src/server/db/database.js`):**
  - Robust SQLite storage powered by Node.js native `node:sqlite` (`DatabaseSync`), requiring zero external native C++ binary dependencies.
  - Foreign key constraint enforcement (`PRAGMA foreign_keys = ON;`) and WAL journal mode (`PRAGMA journal_mode = WAL;`) for high concurrency and resilience.
  - Persistent database file stored on disk (`data/voyara.db`), ensuring booking records survive application restarts.
  - In-memory database mode (`:memory:`) support for ultra-fast, isolated automated testing.
- **Automated Schema Migrations & Seeding (`src/server/db/migrations.js`):**
  - Idempotent migration runner tracking applied migrations in a dedicated `migrations` table.
  - Initial schema migration (`001_initial_schema.sql`) creating `packages` table, `bookings` table, and performance indexes (`idx_bookings_ref`, `idx_bookings_pkg`, `idx_bookings_status`).
  - Automatic seed mechanism populating the package catalog from `SAMPLE_PACKAGES` if the catalog is empty.
  - Dedicated CLI migration script executable via `npm run migrate`.
- **Server-Side Validation Layer (`src/server/controllers/bookingController.js`):**
  - Strict server-side verification of all incoming requests:
    - **Full Name:** Required, trimmed, minimum 2 characters.
    - **Email:** Required, RFC 5322 regex validation format.
    - **Phone:** Required, valid 10-15 digit formatting.
    - **Traveler Count:** Required, positive whole integer ($\ge 1$).
    - **Travel Date:** Required, valid date format, cannot be in the past.
    - **Package Verification:** Verifies the selected package exists in the database and is currently active; returns HTTP 404 or 400 with descriptive error details when nonexistent.
  - Invalid requests are rejected with HTTP 400/404 without creating records in the database.
- **Unique Booking Reference & Initial Status:**
  - Generates unique, uppercase, human-readable booking references adhering to the project's convention: `BK-YYYYMMDD-XXXX` (e.g. `BK-20261020-Z3T3`).
  - Sets the initial booking status to `Pending` for travel specialist review.
  - Calculates transparent total booking cost based on package price and traveler count (`price × travelerCount`).
  - Records ISO 8601 creation timestamps (`createdAt`, `updatedAt`).
- **RESTful API Service & Vite Dev Server Integration (`src/server/apiHandler.js` & `src/server/viteApiPlugin.js`):**
  - Seamless dev and preview server integration via Vite middleware plugin:
    - `POST /api/bookings`: Validates payload, verifies package existence, creates booking record, and returns HTTP 201 with created booking.
    - `GET /api/bookings/:reference`: Retrieves single booking by unique reference with joined package details.
    - `GET /api/bookings`: Lists all bookings in descending chronological order.
    - `GET /api/packages`: Retrieves active packages catalog from database.
    - `GET /api/packages/:id`: Retrieves single package by identifier.
  - Standalone Node HTTP server entry (`src/server/index.js`) runnable via `npm run server`.
- **Frontend Integration & UX Resilience (`src/components/BookingForm.jsx` & `src/services/bookingService.js`):**
  - Centralized client service layer (`src/services/bookingService.js`) handling API requests, network failures, and custom `BookingApiError` handling.
  - **Duplicate Submission Prevention:** In-flight submission tracking (`isSubmitting`) disables the submit button and renders a spinning micro-indicator to prevent double-charging or duplicate reservations.
  - **Confirmed Booking View:** Upon successful backend creation, renders the confirmed booking card displaying the unique booking reference code, status pill (`Pending`), package details, traveler summary, and "+ Book Another Trip" action.
  - **Failure Handling & Preservation:** If a server or network failure occurs, renders a visible alert banner (`#booking-server-error`) while fully preserving user-entered input values so the traveler never loses their work.

---

## Technology Stack
- **Frontend Framework:** React 19 + Vite 8
- **Backend & API:** Node.js native HTTP server & Vite dev/preview server middleware (`/api/*`)
- **Database & ORM:** SQLite via Node.js native `node:sqlite` (`DatabaseSync`), tracked SQL migrations
- **Styling:** Pure Vanilla CSS with CSS Custom Properties, Flexbox, and CSS Grid
- **Testing:** Vitest (118 unit & integration tests across 6 test suites)
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

### 3. Run Database Migrations
```bash
# Apply SQLite migrations and seed catalog packages
npm run migrate
```

### 4. Run Development Server
```bash
# Starts Vite dev server with embedded backend API middleware (/api/*)
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Run Standalone Backend Server (Optional)
```bash
# Starts standalone Node API server on port 3001
npm run server
```

### 6. Run Tests, Linting & Build
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
│   │   ├── BookingForm.jsx             # Booking request form with validation, server integration & confirmation
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
│   ├── server/
│   │   ├── controllers/
│   │   │   └── bookingController.js    # Server-side validation, reference generation & booking logic
│   │   ├── db/
│   │   │   ├── migrations/
│   │   │   │   └── 001_initial_schema.sql # DDL for packages, bookings, indexes
│   │   │   ├── database.js             # SQLite connection & instance management (node:sqlite)
│   │   │   ├── migrations.js           # Idempotent migration runner & package catalog seeder
│   │   │   └── runMigrationsCli.js     # CLI runner for npm run migrate
│   │   ├── models/
│   │   │   ├── bookingModel.js         # Booking persistence, reference generation & queries
│   │   │   └── packageModel.js         # Package database queries & deserialization
│   │   ├── apiHandler.js               # Central API request router (/api/packages, /api/bookings)
│   │   ├── index.js                    # Standalone Node.js HTTP server entry
│   │   └── viteApiPlugin.js            # Vite plugin for seamless dev/preview API middleware
│   ├── services/
│   │   ├── bookingService.js           # Client-side API service for booking creation & retrieval
│   │   └── packageService.js           # API retrieval, getPackageById & response normalization
│   ├── utils/
│   │   └── bookingValidation.js        # Email, phone, date, and traveler count validators
│   ├── App.jsx                         # Main application component & routing
│   ├── index.css                       # Full-width design system & styles
│   └── main.jsx                        # Entry point
├── tests/
│   ├── bookingBackend.test.js          # TAMS-34 database, migrations, API, validation & integration tests
│   ├── bookingForm.test.js             # TAMS-33 booking form validation & UI tests
│   ├── budgetFilter.test.js            # TAMS-10 budget filter unit & integration tests
│   ├── destinationSearch.test.js       # TAMS-24/TAMS-25 search interface & logic tests
│   ├── packageDetails.test.js          # TAMS-11/TAMS-31/TAMS-32 package details tests
│   └── packageListing.test.js          # TAMS-7/TAMS-8 data retrieval & state tests
├── index.html                          # HTML shell with Google Fonts & SEO tags
├── package.json
├── vite.config.js
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
- [x] **TAMS-32:** Validate Package Details and Retrieval
- [x] **TAMS-33:** Build Booking Form
- [x] **TAMS-34:** Booking Submission & Backend Integration
- [x] **TAMS-35:** Validate Booking Submission Workflow
- [x] **TAMS-36:** Booking Status Interface (My Bookings UI)
- [x] **TAMS-37:** Retrieve Booking Records and Status (Customer Authentication & Data Isolation)
- [x] **TAMS-12:** Booking Request Submission & Status Tracking
- [ ] **TAMS-13:** Booking Status Tracking
- [ ] **TAMS-14:** Agent Booking Confirmation & Rejection


---

