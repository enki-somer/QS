# 🧠 Financial Management System – Knowledge Base (Low-Fidelity MVP Phase)

## 📌 System Objective

To design and build a centralized, desktop-like **web-based financial system** tailored for a construction-focused business. The application will manage:

- Construction **Projects**
- Cash flow via a central **SAFE**
- **Human Resources** (employees, salaries, bonuses)
- **General (non-project) Expenses**
- **Comprehensive Financial Reports**

The goal is a **modern, smooth**, and **Arabic-supportive** interface that feels like a native desktop app but runs on standard web stacks.

---

## 🖥️ UX Philosophy

- Desktop-application feel, responsive for widescreen monitors
- All core navigation and system modules accessible from the **Home Page**
- Fast interactions, clear data presentation
- Future support for offline & multi-device usage (planned)

---

## 📁 Main Modules (Pages):

### 1. 🏗️ Projects

> Main controller of all construction-related work.

- Create new projects with:
  - Name, code/ID (immutable), location, budget estimate, client, start/end dates
- **Edit** all project fields _except the ID_
- Add **new invoice entries** with:
  - Manual input of invoice data (number, amount, date, notes)
  - Attach PDF/image of the actual invoice
  - Link invoice to the project
- All invoice additions/edits must be **timestamped**
- Sync project financials with **SAFE module**

---

### 2. 💰 SAFE (Cash Flow Register)

> The financial heart of the system.

- Logs all cash **inflows** (revenue, loans, capital injection)
- Logs all cash **outflows** (project payments, salaries, expenses)
- All transactions must include:
  - Timestamp
  - Reference type (Project, Resource, General)
  - Linked entity (e.g., project name, expense category)
  - Description
  - Amount
  - Payment method (Cash, Transfer, Cheque, etc.)
- Must allow monthly/weekly summaries and full export
- Synchronizes with:
  - Project invoices
  - Salaries
  - General expenses

---

### 3. 👷 Resources (Human Resources)

> Manages staff and role-based compensation.

- Add employees with:
  - Name, role, join date, base salary
- Include optional fields:
  - Daily bonus, overtime pay, deductions
- Assign employee to a project (optional)
- Calculate total payout monthly per employee
- Sync payouts with **SAFE**

---

### 4. 🧾 General Expenses

> Tracks non-project operational costs.

- Add entries manually with:
  - Category (e.g., Office, Utilities, Fuel)
  - Description
  - Amount
  - Receipt image upload (optional)
  - Date of transaction
- Must be **independent from projects**
- Sync with **SAFE**

---

### 5. 📊 Financial Reports

> Generates filterable and exportable overviews.

- Filter options:
  - By date range
  - By project
  - By resource (employee)
  - By expense category
- Export to PDF/print for:
  - Project summaries
  - SAFE ledger
  - Salaries
  - Invoice register
- Supports total and partial balances
- Layout must be **RTL-compatible**

---

## 🎯 MVP Goals

- Focus on low-fidelity UI to validate structure and flow
- Use **Next.js 14+** for component routing and performance
- Use **Tailwind CSS** for styling
- Component-based layout, reusable, minimal logic
- All features stubbed as UI placeholders for backend later
- Use **Next.js `app/` routing** and **layout.tsx** architecture

---

## 🌐 Localization & Arabic Support

- Arabic-first design mindset
- RTL layout support with toggle for Arabic/English UI (future-ready)
- Font considerations:
  - Use a readable Arabic-friendly font (e.g., `Cairo`, `Tajawal`) in production
  - Maintain fallback to Tailwind’s default in MVP
- Labels, buttons, forms should be easily translatable

---

## 🧱 Technical Stack

| Layer       | Tool                                                                     |
| ----------- | ------------------------------------------------------------------------ |
| Frontend    | **Next.js 14+** (App Router)                                             |
| Styling     | **Tailwind CSS**                                                         |
| UI Behavior | Modular components with props/state planning                             |
| Future Auth | Clerk/Auth.js (optional)                                                 |
| State Mgmt  | Local only (in MVP), plan for Zustand or Context API                     |
| PDF/Print   | Use `@react-pdf/renderer` or `html2pdf` later for invoice/report exports |

---

## 🔐 Data & Future Backend Structure

- Each module maps cleanly to a database table
- Transactions are always:
  - Timestamped
  - Linked (via foreign key or relational link)
  - Auditable (logs added later)
- Files (invoices/receipts) stored as URLs or Base64 (MVP), switch to Blob/File later
- Every financial record has a clear source (SAFE = single source of truth)

---

## 🧠 Agent Notes

When initializing backend logic, consider:

- Use PostgreSQL with Prisma ORM
- Separate schemas:
  - `projects`
  - `invoices`
  - `transactions`
  - `employees`
  - `payouts`
  - `expenses`
- Use foreign keys and indices for performance
- Prepare for multi-tenant support in future (optional)
- Backend routes should be REST or tRPC (future discussion)

---

## 📌 Next Steps

1. Build UI wireframes for each module with dummy data
2. Use mock API endpoints and delay functions for loading states
3. Make layout responsive and RTL-aware
4. Identify reusable UI elements: InputField, Table, Modal, FileUpload
5. Define schema types using TypeScript interfaces

---
