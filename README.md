# Voyara-TravelAgencyMgmgSystem
A web-based Travel Agency Management System for discovering travel packages, searching destinations, filtering by budget, submitting booking requests, and managing booking status.

## Project Overview

Travelers often need to browse multiple travel options and contact agents manually to understand package details and booking availability. TAMS aims to centralize this process through a structured platform for package discovery and booking management.

## Objectives

- Display available travel packages in an organized interface.
- Help users find destinations and compare package budgets.
- Present package itineraries, duration, pricing, and inclusions.
- Allow travelers to submit booking requests with their details.
- Enable travelers to track booking status.
- Allow agents to confirm or reject booking requests.
- Provide a foundation for package administration and revenue reporting.
- Learning JIRA as a tool for project mgmt with the help of this project
## Core Modules

### 1. Package Discovery
- Browse available travel packages.
- Search packages by destination.
- Filter packages using minimum and maximum budgets.
- View package details, including itinerary, duration, price, and inclusions.

### 2. Booking Management
- Submit booking requests with traveler details.
- View booking status.
- Allow agents to confirm or reject booking requests.

### Planned Extensions
- Payment processing and tracking.
- Agent and package administration.
- Administrative dashboard and revenue reports.
- Functional testing and defect tracking.

> Implementation status: Features should be considered complete only after they have been implemented and verified in the application.

## Technology Stack

The exact stack depends on the existing codebase.

- **Frontend:** To be documented based on the implemented project.
- **Backend:** To be documented based on the implemented project.
- **Database:** To be documented based on the implemented project.
- **Project Management:** Jira
- **Version Control:** Git and GitHub

Update this section with the actual technologies used by the project.

## Getting Started

### Prerequisites
Install the tools required by your actual frontend and backend stack.

### Installation
1. Clone the repository:

   ```bash
   git clone <YOUR_GITHUB_REPOSITORY_URL>
   cd travel-agency-management-system
   ```

2. Install dependencies using the package manager for your project.

3. Configure required environment variables using the provided environment example, if applicable.

4. Start the frontend and backend using the commands specified in their respective project configuration files.

5. Open the local URL printed by the development server.

> Setup commands and environment variables should be documented after verifying the actual project configuration.

## Project Structure

The structure below is illustrative. Adjust it to match the actual repository.

```text
travel-agency-management-system/
├── frontend/
│   ├── src/
│   └── public/
├── backend/
├── README.md
├── .gitignore
└── .env.example
```

## Project Management

Development tasks are tracked in Jira using epics, user stories, subtasks, and sprints.

Current implementation focus:
- Package listing UI
- Package data retrieval
- Package listing validation
- Booking request submission
- Booking status tracking
- Agent booking decisions

## Testing

Testing should cover:
- Successful package retrieval and rendering.
- Destination search and budget filtering.
- Package detail presentation.
- Booking request validation and submission.
- Booking status updates.
- Agent confirmation and rejection.
- Loading, empty, and error states.

Only report tests as passed after they have been executed.

## Future Improvements

- Secure authentication and role-based access control.
- Payment gateway integration.
- Advanced package search and sorting.
- Email or in-app booking notifications.
- Administrative analytics and revenue reporting.

### Project Type: Academic Learning Project
### Primary Focus: Jira, Agile Workflows, Sprint Planning, and Task Management
Application Scenario: Travel Agency Management System
