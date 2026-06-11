# Planning Guide

A department knowledge base application that stores, organizes, and makes guides easily discoverable through an intuitive interface and an intelligent AI chatbot assistant.

**Experience Qualities**: 
1. **Efficient** - Users should find the information they need within seconds, whether through browsing or asking the chatbot
2. **Organized** - Guides should be clearly categorized and visually distinct, making the collection feel manageable rather than overwhelming
3. **Helpful** - The AI assistant should feel like a knowledgeable colleague who understands context and provides direct, actionable guidance

**Complexity Level**: Light Application (multiple features with basic state)
This is a content management and retrieval system with CRUD operations for guides, search/filter capabilities, and an AI chat interface. It requires persistent storage but doesn't need complex workflows or multi-view navigation beyond the main interface.

## Essential Features

### Guide Management
- **Functionality**: Create, edit, and delete department guides with title, category, content, and tags
- **Purpose**: Allows team members to build and maintain a living knowledge base
- **Trigger**: Click "Add Guide" button or edit icon on existing guide
- **Progression**: Click add button → Dialog opens with form → Fill in title, category, content, tags → Save → Guide appears in library → Success toast
- **Success criteria**: Guides persist between sessions, all fields save correctly, guides can be edited and deleted

### Category Organization
- **Functionality**: Filter guides by predefined categories (Procedures, Technical, HR, Safety, General)
- **Purpose**: Enables quick browsing of related guides without search
- **Trigger**: Click category filter button or "All" to see everything
- **Progression**: Click category → List filters instantly → See only relevant guides → Click another category or "All" to change view
- **Success criteria**: Filter is instant, shows accurate count, clearly indicates active filter

### Search Functionality
- **Functionality**: Real-time text search across guide titles, content, and tags
- **Purpose**: Allows users to quickly narrow down guides using keywords
- **Trigger**: Type in search input field
- **Progression**: Type keyword → Results filter in real-time → See matching guides highlighted → Clear search to reset
- **Success criteria**: Search is instant, case-insensitive, searches all relevant fields

### AI Chatbot Assistant
- **Functionality**: Conversational AI that can search guides, provide direct answers, and help solve problems
- **Purpose**: Provides intelligent assistance when users don't know exactly which guide they need
- **Trigger**: Click chat button to open sidebar, type question
- **Progression**: Click chat icon → Sidebar opens → Type question → AI responds with relevant guide references or direct help → Follow-up questions possible → Close sidebar when done
- **Success criteria**: AI can reference specific guides, provide contextual answers, and help users find solutions even with vague queries

### Guide Detail View
- **Functionality**: Expandable cards that show full guide content with formatted text
- **Purpose**: Allows quick preview without leaving the main view
- **Trigger**: Click on guide card
- **Progression**: Click card → Card expands → Read full content → Click again or click another to collapse
- **Success criteria**: Smooth animation, readable content, easy to collapse

## Edge Case Handling

- **Empty State**: Show friendly illustration and call-to-action when no guides exist yet
- **No Search Results**: Display "No guides found" message with suggestion to try different keywords or add a new guide
- **Long Content**: Guide content should scroll within card when expanded, with proper text formatting
- **Duplicate Categories**: Prevent users from creating guides without selecting a category
- **Network Delays**: Show loading state while AI is thinking, prevent multiple simultaneous chat requests
- **Very Long Guide Titles**: Truncate with ellipsis in card view, show full title in expanded view

## Design Direction

The design should evoke feelings of **clarity, organization, and approachability**. It should feel like a well-organized library with a helpful librarian assistant - professional but not corporate, structured but not rigid. The interface should reduce cognitive load through clear visual hierarchy and intuitive information architecture.

## Color Selection

A modern, vibrant color scheme that creates energy and visual interest through bold purples, teals, and pinks. The palette conveys innovation, creativity, and approachability with a contemporary digital aesthetic.

- **Primary Color**: Vibrant purple `oklch(0.55 0.22 265)` - Conveys creativity, innovation, and intelligence. Used for primary actions and key UI elements with gradient overlays.
- **Secondary Color**: Cool teal `oklch(0.72 0.18 195)` - Modern and refreshing, provides balance to the purple primary and creates harmonious gradients.
- **Accent Color**: Energetic pink `oklch(0.70 0.20 340)` - Eye-catching and playful for the AI chatbot, CTAs, and interactive moments that need attention.
- **Background**: Very light gray with subtle purple tint `oklch(0.98 0.005 280)` - Clean, modern canvas that doesn't compete with content.
- **Foreground/Background Pairings**:
  - Primary purple (oklch(0.55 0.22 265)): White text (oklch(0.99 0 0)) - Ratio 8.2:1 ✓
  - Secondary teal (oklch(0.72 0.18 195)): White text (oklch(0.99 0 0)) - Ratio 5.1:1 ✓
  - Accent pink (oklch(0.70 0.20 340)): White text (oklch(0.99 0 0)) - Ratio 4.9:1 ✓
  - Background (oklch(0.98 0.005 280)): Dark foreground (oklch(0.15 0.02 260)) - Ratio 15.8:1 ✓

## Font Selection

Typography should convey **modernity and clarity** with a friendly, approachable character. Use **Plus Jakarta Sans** for body text and UI elements for its geometric warmth and excellent readability, paired with **Outfit** for headings to add personality and impact.

- **Typographic Hierarchy**:
  - H1 (App Title): Outfit Bold/32-48px/tight letter-spacing with gradient overlay
  - H2 (Section Headers): Outfit SemiBold/24px/normal letter-spacing  
  - H3 (Guide Titles): Outfit SemiBold/18-20px/normal letter-spacing
  - Body (Guide Content): Plus Jakarta Sans Regular/15px/relaxed line-height (1.6)
  - UI Labels: Plus Jakarta Sans Medium/14px/normal letter-spacing
  - Chat Messages: Plus Jakarta Sans Regular/14px/relaxed line-height (1.5)
  - Tags/Badges: Plus Jakarta Sans Bold/12px/normal letter-spacing

## Animations

Animations should enhance clarity and provide subtle feedback without creating distraction. Use smooth, natural transitions to maintain spatial relationships and guide attention.

- **Card Expansion**: Smooth height animation (300ms) with ease-in-out when expanding guide details
- **Filter Changes**: Gentle fade (200ms) when guide list updates after filtering
- **Chatbot Entry**: Slide-in from right (350ms) with subtle backdrop fade for the AI sidebar
- **Button Interactions**: Subtle scale (0.98) on press for tactile feedback
- **Search Results**: Staggered fade-in (50ms delay between items) when results update
- **Success Actions**: Gentle bounce on toast notifications
- **Loading States**: Pulsing animation for AI thinking indicator

## Component Selection

- **Components**:
  - `Card` for guide items with custom hover shadow effects
  - `Dialog` for guide creation/editing forms
  - `Button` with variants (default for primary actions, outline for filters, ghost for secondary)
  - `Input` and `Textarea` for form fields with focus ring in primary color
  - `Badge` for category tags and guide metadata
  - `ScrollArea` for chat messages and long guide content
  - `Sheet` for the AI chatbot sidebar (right-side slide)
  - `Separator` for visual breaks between sections
  
- **Customizations**:
  - Custom guide card component with expand/collapse state
  - Custom chat bubble components (user vs AI with different styling)
  - Custom empty state illustration or icon composition
  - Custom category filter chips with active state indicator
  
- **States**:
  - Buttons: Default has solid primary background, hover adds subtle scale and brightness increase, active shows pressed state, disabled is muted with reduced opacity
  - Input fields: Default has subtle border, focus shows primary color ring and border, filled state shows slight background tint
  - Guide cards: Default has subtle shadow, hover elevates with increased shadow, expanded shows border highlight
  - Filter chips: Default is ghost, active shows solid background with primary color, hover shows slight background
  
- **Icon Selection**:
  - `BookOpen` or `Books` for main app icon and empty state
  - `Plus` for add new guide
  - `MagnifyingGlass` for search
  - `Funnel` for filters
  - `ChatCircle` or `ChatsCircle` for chatbot toggle
  - `PencilSimple` for edit actions
  - `Trash` for delete
  - `Tag` for guide tags
  - `X` for close/clear actions
  - `Check` for success states
  - `Robot` or `Brain` for AI assistant indicator
  
- **Spacing**:
  - Container padding: `p-6` (24px) on desktop, `p-4` (16px) on mobile
  - Card gaps: `gap-4` (16px) in grid layout
  - Form fields: `gap-4` (16px) vertical spacing
  - Section margins: `mb-6` (24px) between major sections
  - Card internal padding: `p-5` (20px)
  - Button padding: `px-4 py-2` for default size
  
- **Mobile**:
  - Single column grid for guide cards (2-3 columns on desktop)
  - Chatbot changes from sidebar Sheet to full-screen Dialog on mobile
  - Category filters stack vertically or use horizontal scroll with snap points
  - Search bar stays fixed at top with reduced height
  - Touch targets minimum 44px for all interactive elements
  - Reduced padding (`p-4` instead of `p-6`) for better screen utilization
