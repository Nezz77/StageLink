# StageLink Marketplace UI

StageLink is a modern, high-performance marketplace platform connecting event organizers with performing artists, stage production crews, and professional equipment rentals. Built with **React 19**, **Vite 8**, **Tailwind CSS v4**, and **Framer Motion**, the application features rich micro-interactions, dark mode aesthetics, an animated authentication modal, real-time negotiation chat, and role-specific dashboards.

---

## ⚡ Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **React 19 & TypeScript** | Modern component architecture with strict type safety |
| **Vite 8** | Next-generation frontend build tool and ultra-fast dev server with HMR |
| **Tailwind CSS v4** | Utility-first CSS framework configured via `@tailwindcss/vite` |
| **Framer Motion & Motion** | High-performance spring animations, slide transitions, and page effects |
| **Embla Carousel React** | Fluid, touch-friendly carousel for featured collections |
| **Lucide React & React Icons** | Curated icon libraries for interface elements and social login providers |
| **Class Variance Authority & Base UI** | Type-safe design variant generation and accessible UI primitives |
| **Git LFS (Large File Storage)** | Optimized version control for high-resolution video and brand assets |

---

## 📂 Project Architecture

```
StageLink-Frontend/
├── public/
│   ├── stagelink-logo.png            # Transparent brand logo
│   └── Stage-Link-Background.mp4     # Hero video background
├── src/
│   ├── components/
│   │   ├── watermelon/
│   │   │   └── morphing-discovery-bar.tsx  # Morphing filter & search bar
│   │   ├── AdminDashboard.tsx        # Platform administration & verification
│   │   ├── ArtistCollectionCard.tsx  # Artist showcase card with rating & pricing
│   │   ├── ArtistDashboard.tsx       # Artist schedule, bookings & revenue
│   │   ├── AuthModal.tsx             # Animated sliding Sign In / Sign Up modal
│   │   ├── BookingChat.tsx           # Real-time negotiation & escrow contract chat
│   │   ├── BrowseArtistsPage.tsx     # Filterable artist directory
│   │   ├── CustomerDashboard.tsx     # Organizer portal & event planning wizard
│   │   ├── Icons.tsx                 # Centralized Lucide icons & rating stars
│   │   ├── LandingPage.tsx           # Main landing page with hero, carousels & tabs
│   │   ├── MotionCarousel.tsx        # Smooth motion carousel for featured artists
│   │   ├── RentEquipmentPage.tsx     # Gear rental catalog (Sound, Lighting, Stage)
│   │   ├── RenterDashboard.tsx       # Equipment inventory & fleet management
│   │   ├── SplashScreen.tsx          # Animated intro screen with scaling brand logo
│   │   └── SwitchMode.tsx            # Neon concert / dark theme switcher
│   ├── lib/
│   │   └── utils.ts                  # Class merger utility (`clsx` + `tailwind-merge`)
│   ├── App.tsx                       # Root orchestrator with role switching
│   ├── index.css                     # Global styles, variables, and Tailwind imports
│   └── main.tsx                      # Vite React entry point
├── package.json                      # Scripts and dependencies
├── tsconfig.json                     # TypeScript compiler configuration
└── vite.config.ts                    # Vite build and Tailwind configuration
```

---

## 🧩 Component Breakdown

### 1. Root & Orchestration
- **[`App.tsx`](file:///src/App.tsx)**: The top-level controller managing user authentication state, current role views (`visitor`, `customer`, `artist`, `renter`, `admin`), cursor glow positioning, and an interactive **Demo Role Switcher** in the bottom-right corner.
- **[`SplashScreen.tsx`](file:///src/components/SplashScreen.tsx)**: Animated intro component that renders the brand logo with spring scaling and subtle glow before fading into the application.
- **[`SwitchMode.tsx`](file:///src/components/SwitchMode.tsx)**: Floating theme controller that toggles between Deep Cosmic Dark mode and Stage/Concert Glow mode.

### 2. Public Marketplace & Browsing
- **[`LandingPage.tsx`](file:///src/components/LandingPage.tsx)**: The flagship storefront featuring:
  - Video hero with embedded `Stage-Link-Background.mp4`
  - Integrated `MorphingDiscoveryBar` category picker
  - `MotionCarousel` showcasing top-rated performers
  - Quick-navigation tabs: Home, Browse Artists, and Rent Equipment
  - Call-to-action banner and brand footer
- **[`BrowseArtistsPage.tsx`](file:///src/components/BrowseArtistsPage.tsx)**: Directory allowing event organizers to filter talent by genre (Rock, Electronic, Jazz, Acoustic), price range, ratings, and location.
- **[`RentEquipmentPage.tsx`](file:///src/components/RentEquipmentPage.tsx)**: Production gear marketplace covering sound systems, stage lighting, trussing, and LED video walls with daily rate calculation and availability checkers.
- **[`ArtistCollectionCard.tsx`](file:///src/components/ArtistCollectionCard.tsx)**: Interactive card component showcasing artist imagery, verified badges, genre tags, user reviews, and direct booking actions.

### 3. Authentication & Account Creation
- **[`AuthModal.tsx`](file:///src/components/AuthModal.tsx)**: Dual-panel animated authentication modal designed with an interactive sliding colored overlay:
  - **Sign In Panel**: Direct email & password entry with social authentication (Google, Apple, Facebook).
  - **Sign Up Panel**: Multi-role onboarding with custom registration options for Customers, Artists, and Equipment Owners.
  - **Sliding Violet Overlay**: Smoothly slides horizontally to reveal and conceal panels without page reload.

### 4. Dashboards & Operations
- **[`CustomerDashboard.tsx`](file:///src/components/CustomerDashboard.tsx)**: Organizer dashboard equipped with:
  - Multi-step Event Booking Wizard (Type, Date, Budget, Genre, Venue)
  - AI-driven recommendations based on event scope
  - Active booking timeline and saved wishlist
- **[`ArtistDashboard.tsx`](file:///src/components/ArtistDashboard.tsx)**: Performance management suite featuring:
  - Gig calendar and schedule tracker
  - Booking request approvals (Accept / Decline)
  - Earnings analytics and repertoire management
- **[`RenterDashboard.tsx`](file:///src/components/RenterDashboard.tsx)**: Equipment vendor management tool for:
  - Gear inventory status (Available, Rented, Maintenance)
  - Active rental dispatch and returns tracking
  - Fleet revenue statistics
- **[`AdminDashboard.tsx`](file:///src/components/AdminDashboard.tsx)**: Platform oversight console including:
  - Real-time marketplace GMV and active session telemetry
  - Artist profile verification queue
  - Dispute resolution thread inspector
  - Escrow transaction monitoring

### 5. Collaboration & Negotiation
- **[`BookingChat.tsx`](file:///src/components/BookingChat.tsx)**: Dedicated live negotiation workspace facilitating instant messaging between artists and organizers, automated contract generation, date/time scheduling, and milestone escrow payments.

### 6. Interactive & Utility Components
- **[`watermelon/morphing-discovery-bar.tsx`](file:///src/components/watermelon/morphing-discovery-bar.tsx)**: Smooth pill-style category bar with morphing layout animations for fast filtering.
- **[`MotionCarousel.tsx`](file:///src/components/MotionCarousel.tsx)**: Embla-powered touch/swipe carousel with motion scale effects.
- **[`Icons.tsx`](file:///src/components/Icons.tsx)**: Centralized icon aggregator exporting Lucide icons and customized rating star graphics.
- **[`lib/utils.ts`](file:///src/lib/utils.ts)**: Helper combining `clsx` and `tailwind-merge` for safe conditional class name composition.

---

## 📦 External Packages & Dependencies

| Package | Version | Usage |
| :--- | :--- | :--- |
| `react` & `react-dom` | `^19.0.0` | React core library |
| `framer-motion` & `motion` | `^13.4.0` | Motion transitions, layout animations, and spring physics |
| `@tailwindcss/vite` & `tailwindcss` | `^4.0.0` | Tailwind CSS v4 JIT engine |
| `embla-carousel-react` | `^8.6.0` | Carousel engine powering `MotionCarousel` |
| `lucide-react` | `^1.47.0` | Interface icons (search, calendar, stars, settings, etc.) |
| `react-icons` | `^5.7.0` | Social and brand icons (Google, Apple, Facebook) |
| `@base-ui/react` | `^1.8.0` | Accessible unstyled primitives |
| `class-variance-authority` | `^0.7.1` | Variant styling management |
| `clsx` & `tailwind-merge` (`cn`) | Latest | Conflict-free class merging |
| `@fontsource-variable/geist` | `^5.3.0` | Modern typography font |

---

## 🚀 How to Run and Preview Locally

### Prerequisites
- **Node.js** (v18.0.0 or higher recommended)
- **pnpm** (or **npm** / **yarn**)
- **Git LFS** (for downloading binary video and image assets)

### Step 1: Clone the Repository
```bash
git clone https://github.com/Nezz77/StageLink-Frontend.git
cd StageLink-Frontend
```

> **Note:** If you haven't initialized Git LFS yet, run:
> ```bash
> git lfs install
> git lfs pull
> ```

### Step 2: Install Dependencies
```bash
pnpm install
# or if using npm:
# npm install
```

### Step 3: Start the Development Server
```bash
pnpm dev
# or if using npm:
# npm run dev
```

Open your browser and navigate to:
```
http://localhost:8443
# or the URL displayed in your terminal (typically http://localhost:5173 or http://localhost:8443)
```

### Step 4: Previewing Different Roles
When the app opens, click through the **Splash Screen** to enter the main interface. 

You can test any role instantly using the **Role Switcher** widget at the bottom right corner of the screen:
- **Visitor**: Public Landing Page, Browse Artists, Rent Equipment, and Animated Auth Modal.
- **Customer**: Event planner view with the Event Planning Wizard, AI Recommendations, and Booking Chat.
- **Artist**: Musician/Performer dashboard with booking requests, gig schedule, and earnings.
- **Equipment Renter**: Equipment supplier dashboard with gear inventory management and rental schedules.
- **Administrator**: Admin panel for KYC verification, platform escrow overview, and dispute management.

### Step 5: Building for Production
To create a production build:
```bash
pnpm build
# or: npm run build
```

To preview the production build locally:
```bash
pnpm preview
# or: npm run preview
```
