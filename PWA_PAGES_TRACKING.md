# 📋 PWA Pages & Components Tracking Document

**نظام تتبع صفحات وعناصر تطبيق الويب التقدمي**

---

## 🎯 Implementation Approach

**CRITICAL**: This document tracks the **ADAPTIVE APPROACH** where responsive design is implemented **WITHIN EACH EXISTING FILE** - NO separate mobile version files will be created.

### 📐 Implementation Strategy

```typescript
// Pattern to be applied in EVERY component
const { isMobile, isTablet, isDesktop } = useResponsive();

// Conditional rendering within the same component
if (isDesktop) {
  return <DesktopLayout />; // Keep existing exactly as-is
}

if (isTablet) {
  return <TabletAdaptation />; // Tablet optimizations
}

return <MobileOptimization />; // Mobile-first design
```

---

## 📱 MAIN APPLICATION PAGES

### 1. **Home Dashboard** - `/`

**File**: `sham/src/app/page.tsx`

#### Current Desktop Implementation

- 3-column module grid layout
- Large module cards with descriptions
- Pending approvals summary section

#### Required Adaptations

```typescript
// Within existing page.tsx
export default function HomePage() {
  const { isMobile, isTablet } = useResponsive();

  if (isMobile) {
    return (
      <div className="pb-20">
        {" "}
        {/* Account for bottom nav */}
        <MobileHeader />
        <PullToRefresh onRefresh={refreshData}>
          <div className="grid grid-cols-1 gap-4 p-4">
            {modules.map((module) => (
              <CompactModuleCard key={module.id} {...module} />
            ))}
          </div>
        </PullToRefresh>
        <FloatingActionButton />
      </div>
    );
  }

  if (isTablet) {
    return (
      <div className="grid grid-cols-2 gap-6 p-6">
        {modules.map((module) => (
          <TabletModuleCard key={module.id} {...module} />
        ))}
      </div>
    );
  }

  // Keep existing desktop layout exactly as-is
  return <DesktopHomePage />;
}
```

#### Offline/Sync Features

- [ ] Cache module data for offline viewing
- [ ] Queue pending actions when offline
- [ ] Show sync status indicator
- [ ] Pull-to-refresh for manual sync

---

### 2. **Login Page** - `/login`

**File**: `sham/src/app/login/page.tsx`

#### Current Desktop Implementation

- Centered login form
- Company branding display
- Arabic RTL support
- Standard form validation

#### Required Adaptations

```typescript
// Within existing login/page.tsx
export default function LoginPage() {
  const { isMobile } = useResponsive();

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-sm">
            <MobileLogo />
            <MobileLoginForm />
            <BiometricLoginOption />
            <RememberDeviceOption />
          </div>
        </div>
        <OfflineIndicator />
      </div>
    );
  }

  // Keep existing desktop layout
  return <DesktopLoginPage />;
}
```

#### Offline/Sync Features

- [ ] Offline login with cached credentials
- [ ] Remember device functionality
- [ ] Biometric authentication preparation
- [ ] Offline mode indicator

---

### 3. **Projects Management** - `/projects`

**File**: `sham/src/app/projects/page.tsx`

#### Current Desktop Implementation

- Table and grid view toggle
- Advanced filtering system
- Bulk operations toolbar
- Detailed project cards
- Search functionality

#### Required Adaptations

```typescript
// Within existing projects/page.tsx
export default function ProjectsPage() {
  const { isMobile, isTablet } = useResponsive();

  if (isMobile) {
    return (
      <div className="pb-20">
        <MobileSearchHeader />
        <FilterBottomSheet />
        <InfiniteScrollContainer>
          {projects.map((project) => (
            <SwipeableProjectCard
              key={project.id}
              project={project}
              swipeActions={["edit", "view", "archive"]}
            />
          ))}
        </InfiniteScrollContainer>
        <CreateProjectFAB />
      </div>
    );
  }

  if (isTablet) {
    return (
      <div className="flex flex-col h-full">
        <TabletToolbar />
        <div className="flex-1 grid grid-cols-2 gap-4 p-4">
          {projects.map((project) => (
            <TabletProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    );
  }

  // Keep existing desktop functionality
  return <DesktopProjectsPage />;
}
```

#### Offline/Sync Features

- [ ] Cache all projects for offline viewing
- [ ] Queue project creation/updates when offline
- [ ] Offline search functionality
- [ ] Sync status per project
- [ ] Conflict resolution for concurrent edits

---

### 4. **Project Details** - `/projects/[id]`

**File**: `sham/src/app/projects/[id]/page.tsx`

#### Current Desktop Implementation

- Multi-column layout with tabs
- Category assignments table
- Invoice management section
- Financial summaries
- Executive dashboard integration

#### Required Adaptations

```typescript
// Within existing projects/[id]/page.tsx
export default function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { isMobile, isTablet } = useResponsive();

  if (isMobile) {
    return (
      <div className="pb-20">
        <MobileProjectHeader projectId={params.id} />
        <TabNavigation
          tabs={["overview", "categories", "invoices", "finances"]}
        />
        <SwipeableViews>
          <ProjectOverviewTab />
          <ProjectCategoriesTab />
          <ProjectInvoicesTab />
          <ProjectFinancesTab />
        </SwipeableViews>
        <ActionBottomSheet />
      </div>
    );
  }

  if (isTablet) {
    return (
      <div className="flex flex-col h-full">
        <TabletProjectHeader />
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
          <ProjectInfoPanel />
          <ProjectActionsPanel />
        </div>
      </div>
    );
  }

  // Keep existing desktop layout
  return <DesktopProjectDetailPage />;
}
```

#### Offline/Sync Features

- [ ] Cache project details and related data
- [ ] Queue invoice approvals when offline
- [ ] Offline category assignments
- [ ] Sync financial calculations
- [ ] Handle attachment uploads when back online

---

### 5. **Project Creation** - `/projects/create`

**File**: `sham/src/app/projects/create/page.tsx`

#### Current Desktop Implementation

- Multi-step form wizard
- Category selection interface
- Budget allocation system
- Contractor assignment
- Validation and submission

#### Required Adaptations

```typescript
// Within existing projects/create/page.tsx
export default function CreateProjectPage() {
  const { isMobile, isTablet } = useResponsive();

  if (isMobile) {
    return (
      <div className="pb-20">
        <MobileWizardHeader />
        <StepIndicator currentStep={currentStep} totalSteps={5} />
        <SwipeableSteps>
          <BasicInfoStep />
          <CategorySelectionStep />
          <BudgetAllocationStep />
          <ContractorAssignmentStep />
          <ReviewAndSubmitStep />
        </SwipeableSteps>
        <MobileWizardNavigation />
      </div>
    );
  }

  if (isTablet) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <TabletStepIndicator />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CurrentStepContent />
          </div>
          <div>
            <StepSummaryPanel />
          </div>
        </div>
      </div>
    );
  }

  // Keep existing desktop wizard
  return <DesktopCreateProjectPage />;
}
```

#### Offline/Sync Features

- [ ] Save draft projects locally
- [ ] Queue project creation when offline
- [ ] Validate data before queuing
- [ ] Resume creation after connectivity
- [ ] Handle file uploads in offline mode

---

### 6. **Safe Management** - `/safe` ✅ **IMPLEMENTED**

**File**: `sham/src/app/safe/page.tsx`

#### Current Desktop Implementation

- Financial dashboard with charts
- Transaction history table
- Funding modals and forms
- Real-time balance display
- Expense tracking

#### ✅ **Completed Adaptations**

```typescript
// ✅ IMPLEMENTED - Within existing safe/page.tsx
export default function SafePage() {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  if (isMobile) {
    return (
      <PermissionRoute requiredPermission="canAccessSafePage">
        <MobileLayout />
      </PermissionRoute>
    );
  }

  if (isTablet) {
    return (
      <PermissionRoute requiredPermission="canAccessSafePage">
        <TabletLayout />
      </PermissionRoute>
    );
  }

  // Keep existing desktop dashboard exactly as-is
  return <DesktopSafePage />;
}
```

#### ✅ **Mobile Features Implemented**

- **Mobile Header**: Sticky header with refresh button and funding action
- **Pull-to-Refresh**: Swipe down to refresh data with loading indicator
- **Balance Card**: Gradient card showing current balance and summary stats
- **Quick Actions**: Filter and report buttons in grid layout
- **Collapsible Filters**: Expandable search and filter section
- **Mobile Transaction List**: Optimized cards with swipe-friendly edit buttons
- **Floating Action Button**: Fixed FAB for quick funding access
- **Mobile-Optimized Modals**: Same modals work across all screen sizes

#### ✅ **Tablet Features Implemented**

- **Tablet Header**: Clean header with refresh and funding buttons
- **Financial Grid**: 2x4 responsive grid for key metrics
- **Enhanced Filters**: Side-by-side search and filter layout
- **Tablet Transaction Cards**: Larger cards with better spacing
- **Responsive Typography**: Optimized text sizes for tablet viewing

#### ✅ **Technical Implementation**

- **useResponsive Hook**: Custom hook for breakpoint detection (mobile < 768px, tablet 768-1023px, desktop 1024px+)
- **Conditional Rendering**: Three separate layout components within same file
- **Desktop Preservation**: Original desktop layout completely untouched
- **RTL Support**: All mobile/tablet layouts maintain Arabic RTL support
- **Permission System**: All permission checks work across layouts

#### Offline/Sync Features (Future Implementation)

- [ ] Cache balance and transaction history
- [ ] Queue funding requests when offline
- [ ] Offline expense calculations
- [ ] Sync financial data on reconnection
- [ ] Handle currency conversions offline

---

### 7. **Contractors Management** - `/contractors`

**File**: `sham/src/app/contractors/page.tsx`

#### Current Desktop Implementation

- Contractor database table
- Search and filtering
- Add/edit contractor forms
- Contact information management
- Project assignment tracking

#### Required Adaptations

```typescript
// Within existing contractors/page.tsx
export default function ContractorsPage() {
  const { isMobile, isTablet } = useResponsive();

  if (isMobile) {
    return (
      <div className="pb-20">
        <MobileSearchBar />
        <FilterTabs />
        <InfiniteScrollList>
          {contractors.map((contractor) => (
            <SwipeableContractorCard
              key={contractor.id}
              contractor={contractor}
              swipeActions={["call", "edit", "assign"]}
            />
          ))}
        </InfiniteScrollList>
        <AddContractorFAB />
      </div>
    );
  }

  if (isTablet) {
    return (
      <div className="flex h-full">
        <div className="w-1/3 border-r">
          <ContractorsList />
        </div>
        <div className="flex-1">
          <ContractorDetails />
        </div>
      </div>
    );
  }

  // Keep existing desktop table view
  return <DesktopContractorsPage />;
}
```

#### Offline/Sync Features

- [ ] Cache contractor database
- [ ] Queue new contractor additions
- [ ] Offline contact information access
- [ ] Sync project assignments
- [ ] Handle profile image uploads

---

### 8. **General Expenses** - `/general-expenses`

**File**: `sham/src/app/general-expenses/page.tsx`

#### Current Desktop Implementation

- Expense tracking interface
- Category-based organization
- Approval workflow
- Receipt attachment system
- Financial reporting

#### Required Adaptations

```typescript
// Within existing general-expenses/page.tsx
export default function GeneralExpensesPage() {
  const { isMobile, isTablet } = useResponsive();

  if (isMobile) {
    return (
      <div className="pb-20">
        <MobileExpenseHeader />
        <CategoryTabs />
        <ExpensesList>
          {expenses.map((expense) => (
            <SwipeableExpenseCard
              key={expense.id}
              expense={expense}
              swipeActions={["approve", "edit", "receipt"]}
            />
          ))}
        </ExpensesList>
        <CameraCaptureFAB />
      </div>
    );
  }

  if (isTablet) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
        <ExpenseFormPanel />
        <ExpenseListPanel />
      </div>
    );
  }

  // Keep existing desktop interface
  return <DesktopGeneralExpensesPage />;
}
```

#### Offline/Sync Features

- [ ] Cache expense categories and data
- [ ] Queue expense submissions
- [ ] Offline receipt capture and storage
- [ ] Sync approval status
- [ ] Handle large file uploads

---

### 9. **Resources/HR** - `/resources`

**File**: `sham/src/app/resources/page.tsx`

#### Current Desktop Implementation

- Employee database management
- Role and permission assignment
- Contact information tracking
- Department organization
- User account management

#### Required Adaptations

```typescript
// Within existing resources/page.tsx
export default function ResourcesPage() {
  const { isMobile, isTablet } = useResponsive();

  if (isMobile) {
    return (
      <div className="pb-20">
        <MobileEmployeeHeader />
        <DepartmentTabs />
        <EmployeeList>
          {employees.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              onCall={() => callEmployee(employee.phone)}
              onMessage={() => messageEmployee(employee.id)}
            />
          ))}
        </EmployeeList>
        <AddEmployeeFAB />
      </div>
    );
  }

  if (isTablet) {
    return (
      <div className="flex h-full">
        <div className="w-1/3">
          <EmployeeDirectory />
        </div>
        <div className="flex-1">
          <EmployeeDetailsPanel />
        </div>
      </div>
    );
  }

  // Keep existing desktop management interface
  return <DesktopResourcesPage />;
}
```

#### Offline/Sync Features

- [ ] Cache employee directory
- [ ] Queue role/permission changes
- [ ] Offline contact access
- [ ] Sync user account updates
- [ ] Handle profile photo uploads

---

### 10. **Financial Reports** - `/financial-reports`

**File**: `sham/src/app/financial-reports/page.tsx`

#### Current Desktop Implementation

- Comprehensive reporting dashboard
- Chart and graph visualizations
- Export functionality
- Date range filtering
- Multiple report types

#### Required Adaptations

```typescript
// Within existing financial-reports/page.tsx
export default function FinancialReportsPage() {
  const { isMobile, isTablet } = useResponsive();

  if (isMobile) {
    return (
      <div className="pb-20">
        <MobileReportHeader />
        <ReportTypeTabs />
        <ScrollableCharts>
          {reports.map((report) => (
            <TouchOptimizedChart
              key={report.id}
              data={report.data}
              type={report.type}
              pinchToZoom={true}
            />
          ))}
        </ScrollableCharts>
        <ExportBottomSheet />
      </div>
    );
  }

  if (isTablet) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
        <ReportConfigPanel />
        <ReportVisualizationPanel />
      </div>
    );
  }

  // Keep existing desktop reporting interface
  return <DesktopFinancialReportsPage />;
}
```

#### Offline/Sync Features

- [ ] Cache report data for offline viewing
- [ ] Queue report generation requests
- [ ] Offline chart interactions
- [ ] Sync export requests
- [ ] Handle large data downloads

---

## 🎭 MODAL COMPONENTS

### 1. **ApprovalsModal**

**File**: `sham/src/components/layout/ApprovalsModal.tsx`

#### Current Desktop Implementation

- Large modal with approval queue
- Bulk approval functionality
- Detailed item preview
- Admin-level controls

#### Required Adaptations

```typescript
// Within existing ApprovalsModal.tsx
export const ApprovalsModal = ({ isOpen, onClose }: ModalProps) => {
  const { isMobile } = useResponsive();

  if (isMobile) {
    return (
      <MobileBottomSheet isOpen={isOpen} onClose={onClose}>
        <div className="h-[80vh] flex flex-col">
          <MobileModalHeader title="الموافقات المعلقة" onClose={onClose} />
          <div className="flex-1 overflow-y-auto">
            <ApprovalsList />
          </div>
          <MobileActionBar />
        </div>
      </MobileBottomSheet>
    );
  }

  // Keep existing desktop modal
  return <DesktopApprovalsModal />;
};
```

#### Offline/Sync Features

- [ ] Cache pending approvals
- [ ] Queue approval decisions
- [ ] Offline approval preview
- [ ] Sync approval status

---

### 2. **InvoicePreviewModal**

**File**: `sham/src/components/layout/InvoicePreviewModal.tsx`

#### Current Desktop Implementation

- Full invoice preview
- Approval/rejection controls
- Comment system
- Attachment viewing

#### Required Adaptations

```typescript
// Within existing InvoicePreviewModal.tsx
export const InvoicePreviewModal = ({ invoice, isOpen, onClose }: Props) => {
  const { isMobile } = useResponsive();

  if (isMobile) {
    return (
      <MobileFullScreenModal isOpen={isOpen} onClose={onClose}>
        <MobileInvoiceHeader invoice={invoice} />
        <ScrollableInvoiceContent>
          <InvoiceDetails />
          <AttachmentGallery />
          <CommentSection />
        </ScrollableInvoiceContent>
        <MobileApprovalActions />
      </MobileFullScreenModal>
    );
  }

  // Keep existing desktop modal
  return <DesktopInvoicePreviewModal />;
};
```

#### Offline/Sync Features

- [ ] Cache invoice details and attachments
- [ ] Queue approval/rejection decisions
- [ ] Offline comment viewing
- [ ] Sync approval actions

---

### 3. **EnhancedCategoryInvoiceModal**

**File**: `sham/src/components/projects/EnhancedCategoryInvoiceModal.tsx`

#### Current Desktop Implementation

- Complex invoice creation form
- Line items management
- Real-time calculations
- Multi-step validation
- Attachment handling

#### Required Adaptations

```typescript
// Within existing EnhancedCategoryInvoiceModal.tsx
export const EnhancedCategoryInvoiceModal = ({
  isOpen,
  onClose,
  categoryId,
}: Props) => {
  const { isMobile } = useResponsive();

  if (isMobile) {
    return (
      <MobileFullScreenModal isOpen={isOpen} onClose={onClose}>
        <MobileWizardHeader title="إنشاء فاتورة جديدة" />
        <StepIndicator currentStep={currentStep} totalSteps={4} />
        <SwipeableSteps>
          <BasicInvoiceInfoStep />
          <LineItemsStep />
          <AttachmentsStep />
          <ReviewAndSubmitStep />
        </SwipeableSteps>
        <MobileWizardNavigation />
      </MobileFullScreenModal>
    );
  }

  // Keep existing desktop modal
  return <DesktopEnhancedCategoryInvoiceModal />;
};
```

#### Offline/Sync Features

- [ ] Save invoice drafts locally
- [ ] Queue invoice creation
- [ ] Offline calculations
- [ ] Handle attachment uploads when online
- [ ] Validate data before queuing

---

### 4. **CategoryAssignmentModal**

**File**: `sham/src/components/projects/CategoryAssignmentModal.tsx`

#### Current Desktop Implementation

- Category selection interface
- Budget allocation controls
- Assignment validation
- Real-time updates

#### Required Adaptations

```typescript
// Within existing CategoryAssignmentModal.tsx
export const CategoryAssignmentModal = ({
  isOpen,
  onClose,
  projectId,
}: Props) => {
  const { isMobile } = useResponsive();

  if (isMobile) {
    return (
      <MobileBottomSheet isOpen={isOpen} onClose={onClose}>
        <div className="h-[70vh] flex flex-col">
          <MobileModalHeader title="تخصيص الفئات" onClose={onClose} />
          <div className="flex-1 overflow-y-auto p-4">
            <CategorySelectionList />
            <BudgetAllocationSliders />
          </div>
          <MobileActionButtons />
        </div>
      </MobileBottomSheet>
    );
  }

  // Keep existing desktop modal
  return <DesktopCategoryAssignmentModal />;
};
```

#### Offline/Sync Features

- [ ] Cache category data
- [ ] Queue assignment changes
- [ ] Offline budget calculations
- [ ] Sync assignments when online

---

### 5. **ViewProjectModal** (Deprecated)

**File**: `sham/src/components/projects/ViewProjectModal.tsx`

#### Status

- **DEPRECATED**: Functionality moved to dedicated page
- **Action Required**: Remove or refactor for mobile quick-view

---

### 6. **AddEmployeeModal**

**File**: `sham/src/components/resources/AddEmployeeModal.tsx`

#### Current Desktop Implementation

- Employee information form
- Role assignment interface
- Contact details management
- Validation and submission

#### Required Adaptations

```typescript
// Within existing AddEmployeeModal.tsx
export const AddEmployeeModal = ({ isOpen, onClose }: Props) => {
  const { isMobile } = useResponsive();

  if (isMobile) {
    return (
      <MobileFullScreenModal isOpen={isOpen} onClose={onClose}>
        <MobileFormHeader title="إضافة موظف جديد" />
        <ScrollableForm>
          <PersonalInfoSection />
          <ContactInfoSection />
          <RoleAssignmentSection />
          <PhotoUploadSection />
        </ScrollableForm>
        <MobileFormActions />
      </MobileFullScreenModal>
    );
  }

  // Keep existing desktop modal
  return <DesktopAddEmployeeModal />;
};
```

#### Offline/Sync Features

- [ ] Save employee drafts
- [ ] Queue employee creation
- [ ] Handle photo uploads offline
- [ ] Sync role assignments

---

## 🏗️ LAYOUT COMPONENTS

### 1. **MainLayout**

**File**: `sham/src/components/layout/MainLayout.tsx`

#### Current Desktop Implementation

- Global application wrapper
- Sidebar navigation integration
- TopBar header component
- Content area management
- Authentication checks

#### Required Adaptations

```typescript
// Within existing MainLayout.tsx
export const MainLayout = ({ children }: Props) => {
  const { isMobile, isTablet } = useResponsive();

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MobileTopBar />
        <main className="pb-16">{children}</main>
        <BottomNavigation />
        <OfflineSyncIndicator />
      </div>
    );
  }

  if (isTablet) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <CollapsibleSidebar />
        <div className="flex-1 flex flex-col">
          <TabletTopBar />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    );
  }

  // Keep existing desktop layout exactly as-is
  return <DesktopMainLayout>{children}</DesktopMainLayout>;
};
```

#### Offline/Sync Features

- [ ] Global sync status indicator
- [ ] Offline mode banner
- [ ] Background sync management
- [ ] Connection status monitoring

---

### 2. **Navigation**

**File**: `sham/src/components/layout/Navigation.tsx`

#### Current Desktop Implementation

- Sidebar navigation menu
- Role-based menu items
- Active state management
- Collapsible sections

#### Required Adaptations

```typescript
// Within existing Navigation.tsx
export const Navigation = () => {
  const { isMobile, isTablet } = useResponsive();

  if (isMobile) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around py-2">
          {mainNavItems.map((item) => (
            <BottomNavItem key={item.id} {...item} />
          ))}
          <MoreMenuButton />
        </div>
      </nav>
    );
  }

  if (isTablet) {
    return (
      <aside className="w-64 bg-white border-r border-gray-200">
        <div className="p-4">
          <CompanyLogo />
        </div>
        <nav className="mt-8">
          {navItems.map((item) => (
            <TabletNavItem key={item.id} {...item} />
          ))}
        </nav>
      </aside>
    );
  }

  // Keep existing desktop sidebar
  return <DesktopSidebarNavigation />;
};
```

#### Offline/Sync Features

- [ ] Show offline indicators on nav items
- [ ] Disable unavailable features when offline
- [ ] Queue navigation analytics

---

### 3. **TopBar**

**File**: `sham/src/components/layout/TopBar.tsx`

#### Current Desktop Implementation

- User profile display
- Notification center
- Search functionality
- Quick actions menu

#### Required Adaptations

```typescript
// Within existing TopBar.tsx
export const TopBar = () => {
  const { isMobile, isTablet } = useResponsive();

  if (isMobile) {
    return (
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <MenuButton />
          <CompanyLogo size="sm" />
          <div className="flex items-center space-x-2">
            <NotificationBell />
            <UserAvatar size="sm" />
          </div>
        </div>
      </header>
    );
  }

  if (isTablet) {
    return (
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <SearchBar />
          <div className="flex items-center space-x-4">
            <NotificationCenter />
            <UserMenu />
          </div>
        </div>
      </header>
    );
  }

  // Keep existing desktop topbar
  return <DesktopTopBar />;
};
```

#### Offline/Sync Features

- [ ] Show connection status
- [ ] Offline notification queue
- [ ] Sync progress indicator

---

### 4. **PageNavigation** (Breadcrumbs)

**File**: `sham/src/components/layout/PageNavigation.tsx`

#### Current Desktop Implementation

- Breadcrumb navigation
- Page title display
- Back button functionality
- Context-aware navigation

#### Required Adaptations

```typescript
// Within existing PageNavigation.tsx
export const PageNavigation = ({ breadcrumbs, title }: Props) => {
  const { isMobile } = useResponsive();

  if (isMobile) {
    return (
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center">
          <BackButton />
          <h1 className="text-lg font-semibold text-gray-900 mr-3">{title}</h1>
        </div>
      </div>
    );
  }

  // Keep existing desktop breadcrumbs
  return <DesktopPageNavigation breadcrumbs={breadcrumbs} title={title} />;
};
```

---

## 🎨 UI COMPONENTS

### 1. **Button Components**

**File**: `sham/src/components/ui/Button.tsx`

#### Required Adaptations

```typescript
// Within existing Button.tsx
export const Button = ({ children, className, ...props }: ButtonProps) => {
  const { isMobile } = useResponsive();

  const mobileClasses = isMobile
    ? "min-h-[44px] min-w-[44px] text-base px-6 py-3"
    : "";

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        mobileClasses,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
```

---

### 2. **Input Components**

**File**: `sham/src/components/ui/Input.tsx`

#### Required Adaptations

```typescript
// Within existing Input.tsx
export const Input = ({ className, type, ...props }: InputProps) => {
  const { isMobile } = useResponsive();

  const mobileClasses = isMobile ? "min-h-[44px] text-base" : "";

  return (
    <input
      type={type}
      className={cn(
        "flex w-full rounded-md border border-gray-300 bg-white px-3 py-2",
        mobileClasses,
        className
      )}
      {...props}
    />
  );
};
```

---

### 3. **Card Components**

**File**: `sham/src/components/ui/Card.tsx`

#### Required Adaptations

```typescript
// Within existing Card.tsx
export const Card = ({ children, className, ...props }: CardProps) => {
  const { isMobile } = useResponsive();

  const mobileClasses = isMobile ? "mx-4 mb-4 shadow-sm" : "";

  return (
    <div
      className={cn(
        "rounded-lg border border-gray-200 bg-white shadow",
        mobileClasses,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
```

---

## 📊 IMPLEMENTATION CHECKLIST

### Phase 1: Core Infrastructure (Week 1-2)

- [x] **useResponsive Hook**: ✅ Created responsive detection hook
- [x] **Offline/Sync Manager**: ✅ Implemented sync system with service worker
- [x] **PWA Configuration**: ✅ Set up service worker and manifest
- [ ] **Base Components**: Adapt Button, Input, Card components

### Phase 2: Layout Adaptation (Week 3-4)

- [ ] **MainLayout**: Implement adaptive layout system
- [ ] **Navigation**: Create bottom navigation for mobile
- [x] **TopBar**: ✅ Enhanced with network status indicator
- [ ] **Modal System**: Create mobile-friendly modals

### Phase 3: Page Implementation (Week 5-8)

- [ ] **Home Dashboard** (`/`): Implement adaptive home page
- [ ] **Login Page** (`/login`): Add mobile login optimizations
- [ ] **Projects Management** (`/projects`): Create mobile project list
- [ ] **Project Details** (`/projects/[id]`): Implement tabbed mobile view
- [ ] **Project Creation** (`/projects/create`): Mobile wizard interface
- [x] **Safe Management** (`/safe`): ✅ Completed mobile financial dashboard
- [ ] **Contractors** (`/contractors`): Mobile contractor management
- [ ] **General Expenses** (`/general-expenses`): Mobile expense tracking
- [ ] **Resources/HR** (`/resources`): Mobile employee management
- [ ] **Financial Reports** (`/financial-reports`): Mobile reporting interface

### Phase 4: Modal Adaptation (Week 9)

- [ ] **ApprovalsModal**: Mobile approval interface
- [ ] **InvoicePreviewModal**: Full-screen mobile preview
- [ ] **EnhancedCategoryInvoiceModal**: Mobile invoice wizard
- [ ] **CategoryAssignmentModal**: Mobile assignment interface
- [ ] **AddEmployeeModal**: Mobile employee form

### Phase 5: Testing & Polish (Week 10)

- [ ] **Cross-device Testing**: Test on various devices
- [ ] **Offline Testing**: Verify offline functionality
- [ ] **Performance Optimization**: Optimize for mobile performance
- [ ] **User Experience**: Polish mobile interactions

---

## 🔄 OFFLINE/SYNC INTEGRATION

### Global Sync Status ✅ **NETWORK STATUS COMPLETED**

```typescript
// ✅ IMPLEMENTED: Network status monitoring
const [isOnline, setIsOnline] = useState(true);
const [showIndicator, setShowIndicator] = useState(false);

useEffect(() => {
  const handleOnline = () => {
    setIsOnline(true);
    setShowIndicator(true);
    setTimeout(() => setShowIndicator(false), 3000);
  };

  const handleOffline = () => {
    setIsOnline(false);
    setShowIndicator(true);
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
}, []);

// ✅ IMPLEMENTED: Visual indicators
// - Top floating indicator (desktop/tablet)
// - Bottom banner (mobile)
// - TopBar integration
// - Automatic show/hide logic

// 🔄 TODO: Sync queue indicators
{
  pendingCount > 0 && <PendingSyncIndicator count={pendingCount} />;
}
{
  syncInProgress && <SyncProgressIndicator />;
}
```

### Data Caching Strategy

- **Critical Data**: Cache for offline access (projects, contractors, safe balance)
- **User Actions**: Queue all create/update/delete operations
- **File Uploads**: Store locally and sync when online
- **Search Data**: Cache search results for offline use

### Conflict Resolution

- **Last Write Wins**: For simple data updates
- **User Choice**: For complex conflicts (show both versions)
- **Automatic Merge**: For non-conflicting changes
- **Rollback Option**: Allow users to undo sync conflicts

---

## ⚠️ CRITICAL NOTES

1. **NO SEPARATE FILES**: All adaptations happen within existing files
2. **DESKTOP PRESERVATION**: Desktop functionality must remain exactly as-is
3. **PROGRESSIVE ENHANCEMENT**: Mobile features enhance, don't replace
4. **OFFLINE FIRST**: Every feature must work offline
5. **ARABIC RTL**: Maintain RTL support across all screen sizes
6. **PERFORMANCE**: Mobile optimizations must not affect desktop performance

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Implementation Status**: Planning Phase

---

_This document serves as the single source of truth for PWA implementation across all pages and components in the QS Financial Management System._
