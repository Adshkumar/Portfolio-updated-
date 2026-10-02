import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import ThemeNavbar from "@/components/ThemeNavbar";
import Link from "next/link";

const architectureLayers = [
  {
    title: "Expo mobile client",
    detail: "Expo Router screens · React Native · native camera, audio and sharing",
  },
  {
    title: "Identity and app services",
    detail: "Clerk sign-in · TanStack Query · typed service and validation layers",
  },
  {
    title: "Supabase platform",
    detail: "PostgreSQL · Row Level Security · Realtime · database APIs",
  },
  {
    title: "Background integrations",
    detail: "Gemini AI · scheduled Edge Functions · Resend email · Expo Push",
  },
];

const productAreas = [
  {
    title: "1. Onboarding and identity",
    items: [
      "Create an account or sign in through Clerk; first-run setup captures a preferred currency and starting balance.",
      "The signed-in Clerk identity is connected to Supabase as a third-party auth provider, so database policies can scope records to the authenticated user.",
      "Profile controls include appearance, profile image, currency, privacy/security settings, notifications, data export, sign-out, and account deletion.",
    ],
  },
  {
    title: "2. Personal accounts and money movement",
    items: [
      "Create and manage cash, bank, credit-card, and savings accounts; choose a default account and track balances.",
      "Record income and expenses with amount, category, description, date, account, and input method.",
      "Browse transaction history with categories, search, filters, and daily income-versus-expense charts.",
      "The dashboard summarizes balances, monthly income and spending, budget progress, expense breakdowns, and recent activity.",
    ],
  },
  {
    title: "3. Budgets and spending guidance",
    items: [
      "Set one monthly budget per user and monitor actual spending against it on the dashboard.",
      "A scheduled daily job sends a budget summary and threshold notifications at 50%, 90%, and 100%; the highest crossed threshold is handled first, with threshold state reset each month.",
      "A weekly scheduled job finds users with activity in the last seven days, asks Gemini for two to four short personalized tips, and emails a weekly recap.",
    ],
  },
  {
    title: "4. AI-assisted money entry and analysis",
    items: [
      "Receipt workflow: choose or capture a receipt image, ask Gemini to extract the transaction fields, review the result, then save it as a transaction.",
      "Voice workflow: grant microphone access, record a spoken purchase, send the audio for transcription and interpretation, then review and save the transaction.",
      "The finance assistant builds a context from accounts, transactions, currency, budget, and owner details. It answers recognized questions deterministically (such as balances, budget usage, and category spending) and uses Gemini for other questions.",
      "AI requests send receipt images, recorded voice input, or derived financial context to Google Gemini for processing. The mobile Gemini key uses an EXPO_PUBLIC_ variable and is therefore client-visible.",
      "The AI assistant is a spending-information aid, not a source of financial, investment, tax, or legal advice.",
    ],
  },
  {
    title: "5. Shared expenses and settling up",
    items: [
      "Maintain friends/contacts and create groups for contexts such as trips, home, couples, office, or custom groups; invitations can be pending before a person joins.",
      "Add a shared expense with a group or directly with participants, multiple payers, category, currency, notes, and an optional receipt.",
      "Supported allocations include equal, exact, percentage, shares, adjustment, and itemized splits. Recurring expense records support weekly, biweekly, monthly, and yearly frequencies.",
      "Track each participant's paid, owed, and net balance; record settlements by cash, UPI, bank transfer, or another method.",
      "A min-flow debt-simplification routine reduces the number of suggested transfers while preserving each member's net position. Groups also have activity history, expense comments, and payment reminders.",
    ],
  },
  {
    title: "6. Privacy, security, and notifications",
    items: [
      "PostgreSQL Row Level Security scopes personal records to the Clerk user ID. The split-expense schema has relationship-aware policies for group and expense membership.",
      "Profile privacy controls offer PIN/pattern backup locks, biometric protection, recovery questions, lock removal, and account deletion.",
      "Database triggers create in-app notification records for transaction additions/deletions. Supabase Realtime updates the foreground app; opted-in devices can receive background delivery through Expo Push.",
      "Push permission is requested from the user's notification settings, not automatically on app startup.",
      "The repository documents native iOS/Android push delivery; browser Web Push and service workers are not configured for the web target.",
    ],
  },
  {
    title: "7. Export and accessibility of data",
    items: [
      "Export transactions into a formatted .xlsx workbook with date, type, amount, category, description, account, input method, and creation time columns.",
      "The workbook is shared through the device's native sharing sheet when available.",
      "The app supports light, dark, and system appearance modes and currency-aware formatting.",
    ],
  },
];

const technologies = [
  "React Native",
  "Expo SDK 54",
  "Expo Router",
  "TypeScript",
  "Clerk Expo",
  "Supabase",
  "PostgreSQL",
  "Row Level Security",
  "Supabase Realtime",
  "Supabase Edge Functions",
  "Google Gemini",
  "TanStack Query",
  "Zustand",
  "React Hook Form",
  "Zod",
  "NativeWind",
  "Expo Camera",
  "Expo Audio",
  "Expo Notifications",
  "Expo SecureStore",
  "Expo Local Authentication",
  "Expo Sharing",
  "Expo Image Picker",
  "date-fns",
  "currency-codes",
  "currency-symbol-map",
  "React Native Gifted Charts",
  "SheetJS (xlsx)",
];

export default function FinanceTrackerCaseStudy() {
  return (
    <div className="page">
      <main className="container">
        <Hero />
        <Link href="/experience" className="experienceBack">
          <i className="fas fa-arrow-left" aria-hidden="true"></i>
          Back to experience
        </Link>

        <article className="caseStudy">
          <header className="caseStudyHeader">
            <p className="caseStudyEyebrow">
              Product engineering · iOS and Android · Full-stack
            </p>
            <h1 className="caseStudyTitle">Finance Tracker</h1>
            <p className="caseStudyLead">
              A mobile personal-finance app for managing accounts, budgets, and
              transactions, with AI-assisted capture and a complete shared
              expense-splitting system.
            </p>
            <div className="caseStudyLinks">
              <a
                href="https://github.com/Adshkumar/Finance-Tracker"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fab fa-github" aria-hidden="true"></i>
                Source code and setup guide
              </a>
            </div>
            <p className="caseStudyAvailability">
              The previously linked hosted preview currently returns a 404. The
              repository README contains the setup and release instructions.
            </p>
          </header>

          <figure className="caseStudyScreenshot">
            <img
              src="/images/finance-tracker.jpeg"
              alt="Finance Tracker app preview showing the mobile dashboard, balances, budget progress, expense chart, and recent transactions"
              loading="eager"
              fetchPriority="high"
            />
            <figcaption>
              Product artwork from the Finance Tracker repository README.
            </figcaption>
          </figure>

          <section className="caseStudySection" aria-labelledby="overview">
            <h2 id="overview">Product overview</h2>
            <p>
              Finance Tracker combines day-to-day money management and group
              expense settlement in one Expo application. A user can set up
              their profile and currency, create accounts, log or import
              transactions, monitor a monthly budget, review spending, and
              share expenses with friends or groups. Receipt scanning, voice
              entry, and a context-aware assistant reduce manual work; scheduled
              backend tasks provide budget alerts and weekly spending tips.
            </p>
            <div className="caseStudyFacts" aria-label="Project summary">
              <div>
                <span>Platforms</span>
                <strong>iOS · Android</strong>
              </div>
              <div>
                <span>App version</span>
                <strong>1.0.0</strong>
              </div>
              <div>
                <span>Primary data store</span>
                <strong>Supabase Postgres</strong>
              </div>
              <div>
                <span>Application ID</span>
                <strong>com.adarsh.reactnativefinance</strong>
              </div>
              <div>
                <span>Primary navigation</span>
                <strong>Home · Transactions · Add · Assistant · Profile</strong>
              </div>
            </div>
          </section>

          <section className="caseStudySection" aria-labelledby="architecture">
            <h2 id="architecture">System architecture</h2>
            <p>
              The native client handles interactive flows and authenticated
              queries. Supabase is the application data boundary; scheduled
              jobs and webhooks run separately from the app process.
            </p>
            <div
              className="caseStudyArchitecture"
              role="img"
              aria-label="Architecture flow from Expo mobile client to Clerk identity and app services, to Supabase PostgreSQL with row-level security and realtime, and to Gemini and scheduled Edge Function integrations"
            >
              {architectureLayers.map((layer, index) => (
                <div className="caseStudyArchitectureStep" key={layer.title}>
                  <div className="caseStudyArchitectureNode">
                    <span className="caseStudyArchitectureIndex">
                      0{index + 1}
                    </span>
                    <div>
                      <strong>{layer.title}</strong>
                      <span>{layer.detail}</span>
                    </div>
                  </div>
                  {index < architectureLayers.length - 1 && (
                    <div className="caseStudyArchitectureArrow" aria-hidden="true">
                      <i className="fas fa-arrow-down"></i>
                      <span>authenticated requests · scoped data · events</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="caseStudyIntegrationGrid">
              <div>
                <h3>Interactive AI flows</h3>
                <p>
                  The client calls Gemini for receipt/voice extraction and
                  assistant questions. Extracted transaction details are
                  reviewed in the app before the user saves them.
                </p>
              </div>
              <div>
                <h3>Scheduled and event-driven work</h3>
                <p>
                  Supabase Edge Functions handle budget emails, weekly tips,
                  invitations, and push delivery. PostgreSQL cron jobs schedule
                  the budget and weekly-tip functions; a database webhook
                  triggers push delivery for notification inserts.
                </p>
              </div>
            </div>
          </section>

          <section className="caseStudySection" aria-labelledby="journey">
            <h2 id="journey">Core money-entry flow</h2>
            <p>
              Manual entry, a receipt image, or a voice note all converge on the
              same transaction record, so the dashboard, budget, history, and
              assistant use one source of truth.
            </p>
            <div className="caseStudyFlow" aria-label="Transaction data flow">
              {[
                ["Capture", "Manual form · receipt photo · voice recording"],
                ["Review", "Confirm amount, category, account, and date"],
                ["Persist", "Save transaction under the signed-in user"],
                ["Use", "Refresh balances, charts, budget, and history"],
              ].map(([title, detail], index) => (
                <div className="caseStudyFlowStep" key={title}>
                  <span>{index + 1}</span>
                  <strong>{title}</strong>
                  <p>{detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="caseStudySection" aria-labelledby="capabilities">
            <h2 id="capabilities">Product capabilities</h2>
            <div className="caseStudyFeatureList">
              {productAreas.map((area) => (
                <article className="caseStudyFeature" key={area.title}>
                  <h3>{area.title}</h3>
                  <ul className="caseStudyDetailList">
                    {area.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <section className="caseStudySection" aria-labelledby="data-model">
            <h2 id="data-model">Data model at a glance</h2>
            <p>
              Personal finance and shared spending are separate data domains.
              The main tables reference the Clerk user ID; shared spending uses
              normalized group, expense, payer, participant, and settlement
              records.
            </p>
            <div className="caseStudyDataDiagram">
              <div className="caseStudyDataDomain">
                <h3>Personal finance</h3>
                <div className="caseStudyEntity caseStudyEntityPrimary">
                  <strong>users</strong>
                  <span>Clerk identity · profile · currency</span>
                </div>
                <div className="caseStudyEntityRow">
                  <div className="caseStudyEntity">
                    <strong>accounts</strong>
                    <span>type · balance · default</span>
                  </div>
                  <div className="caseStudyEntity">
                    <strong>budgets</strong>
                    <span>monthly amount · alert state</span>
                  </div>
                </div>
                <div className="caseStudyEntity">
                  <strong>transactions</strong>
                  <span>
                    account · amount · category · date · input method · status
                  </span>
                </div>
                <div className="caseStudyEntityRow">
                  <div className="caseStudyEntity">
                    <strong>notifications</strong>
                    <span>type · message · read state</span>
                  </div>
                  <div className="caseStudyEntity">
                    <strong>push_subscriptions</strong>
                    <span>device token · platform</span>
                  </div>
                </div>
                <p className="caseStudyRelation">
                  users → accounts → transactions; users → budgets, notifications,
                  and push subscriptions
                </p>
              </div>
              <div className="caseStudyDataDomain">
                <h3>Shared expenses</h3>
                <div className="caseStudyEntityRow">
                  <div className="caseStudyEntity">
                    <strong>shared_friends</strong>
                    <span>contacts · invite state</span>
                  </div>
                  <div className="caseStudyEntity">
                    <strong>shared_groups</strong>
                    <span>group · currency · settings</span>
                  </div>
                </div>
                <div className="caseStudyEntity">
                  <strong>shared_group_members</strong>
                  <span>membership · role · invitation state</span>
                </div>
                <div className="caseStudyEntity">
                  <strong>shared_expenses</strong>
                  <span>amount · split method · receipt · recurrence</span>
                </div>
                <div className="caseStudyEntityRow">
                  <div className="caseStudyEntity">
                    <strong>payers + participants</strong>
                    <span>paid amount · owed amount · split details</span>
                  </div>
                  <div className="caseStudyEntity">
                    <strong>shared_payments</strong>
                    <span>payer · payee · settlement</span>
                  </div>
                </div>
                <p className="caseStudyRelation">
                  Groups and expenses connect members, payers, participants,
                  settlements, comments, invitations, activity, and reminders.
                </p>
              </div>
            </div>
          </section>

          <section
            className="caseStudySection"
            aria-labelledby="data-retrieval"
          >
            <h2 id="data-retrieval">Fast data retrieval and page delivery</h2>
            <p>
              This portfolio page is statically generated, so its content is
              available without a runtime database or API request. In the
              Finance Tracker itself, these patterns keep user data scoped and
              reduce unnecessary repeat reads; actual response time depends on
              network conditions and database load.
            </p>
            <div className="caseStudyPerformanceGrid">
              <article>
                <h3>Cached server state</h3>
                <p>
                  TanStack Query owns remote data and refreshes affected
                  queries after mutations, reusing cached results instead of
                  refetching every screen indiscriminately.
                </p>
              </article>
              <article>
                <h3>User-scoped database reads</h3>
                <p>
                  Supabase PostgreSQL Row Level Security filters personal
                  records by the authenticated Clerk identity; shared-expense
                  policies check group and expense membership at the database
                  boundary.
                </p>
              </article>
              <article>
                <h3>Realtime updates</h3>
                <p>
                  Supabase Realtime updates the foreground app when
                  notifications change, while scheduled summaries and push
                  delivery run in Edge Functions rather than blocking normal
                  transaction reads.
                </p>
              </article>
            </div>
          </section>

          <section className="caseStudySection" aria-labelledby="engineering">
            <h2 id="engineering">Engineering decisions</h2>
            <div className="caseStudyEngineeringGrid">
              <article>
                <h3>Identity and authorization</h3>
                <p>
                  Clerk is the sign-in provider; Supabase is configured to
                  accept Clerk as third-party auth. RLS policies use the
                  authenticated subject to limit user-owned rows. Group data
                  uses membership-aware policies and helper functions to
                  authorize access without relying only on client-side checks.
                </p>
              </article>
              <article>
                <h3>Server and client boundaries</h3>
                <p>
                  The app uses client-visible Expo configuration for its
                  publishable/service endpoint settings. Private credentials
                  such as service-role, Resend, and webhook secrets belong in
                  the Supabase Edge Function/Vault configuration, never in the
                  shipped app bundle.
                </p>
              </article>
              <article>
                <h3>Reliable financial arithmetic</h3>
                <p>
                  Split calculations are isolated in pure TypeScript engines,
                  round to two decimal places, validate allocation totals, and
                  calculate each member&apos;s net position before simplifying
                  proposed payments.
                </p>
              </article>
              <article>
                <h3>Client data flow</h3>
                <p>
                  TanStack Query owns server data and mutation-driven
                  invalidation; Zustand holds shared user preferences.
                  Validated form flows use React Hook Form and Zod, keeping
                  input rules separate from persistence services.
                </p>
              </article>
            </div>
          </section>

          <section className="caseStudySection" aria-labelledby="setup">
            <h2 id="setup">From checkout to a production build</h2>
            <ol className="caseStudyDetailList caseStudySetupList">
              <li>
                Install the project dependencies with <code>npm install</code>.
              </li>
              <li>
                Configure <code>EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY</code>,{" "}
                <code>EXPO_PUBLIC_SUPABASE_URL</code>,{" "}
                <code>EXPO_PUBLIC_SUPABASE_KEY</code>, and{" "}
                <code>EXPO_PUBLIC_GEMINI_API_KEY</code> in the local environment.
                These <code>EXPO_PUBLIC_</code> values are bundled into the app;
                they are not a place for private keys.
              </li>
              <li>
                Configure Clerk as a Supabase third-party auth provider, apply
                the SQL schema and RLS policies, and configure the required
                Edge Function secrets, notification webhook, and scheduled
                jobs in Supabase.
              </li>
              <li>
                Start the Expo development server with{" "}
                <code>npx expo start -c</code>; for local native Android
                development, use <code>npx expo run:android</code>.
              </li>
              <li>
                Create an Android production APK with{" "}
                <code>eas build --platform android --profile production</code>,
                then follow the release checklist for authentication, data
                operations, AI capture, export, privacy controls, and
                notifications.
              </li>
            </ol>
            <p className="caseStudyOpsNote">
              Backend-only secrets include{" "}
              <code>RESEND_API_KEY</code>, <code>RESEND_FROM_EMAIL</code>,{" "}
              <code>GEMINI_API_KEY</code>, and{" "}
              <code>NOTIFICATION_WEBHOOK_SECRET</code> (plus the optional{" "}
              <code>EMAIL_LOGO_URL</code>).
              The documented schedules run daily at 09:00 UTC for budget
              summaries/alerts and every Monday at 09:00 UTC for weekly tips.
              Never place Supabase service-role, Clerk secret, or Resend
              credentials in the mobile app.
            </p>
          </section>

          <section className="caseStudySection" aria-labelledby="quality">
            <h2 id="quality">Quality, testing, and release</h2>
            <ul className="caseStudyDetailList">
              <li>
                Split-engine tests cover cent remainders, exact and percentage
                allocation validation, shares, itemized tax/tip allocation,
                and min-flow debt simplification.
              </li>
              <li>
                The README release checklist calls for validating sign-in,
                account and transaction flows, budgets, exports, receipt and
                voice capture, app locks, appearance, account deletion, and
                sign-out on a release build.
              </li>
              <li>
                Android production builds use EAS. Native configuration and
                bundled JavaScript changes require a new native build because
                automatic remote update checks are disabled in the Expo
                configuration.
              </li>
              <li>
                Production setup requires Clerk, Supabase, Gemini, database
                schema/RLS, Edge Function secrets, Android application
                metadata, and push-notification configuration. Values for
                <code> EXPO_PUBLIC_</code> variables are embedded in the client
                and must be treated as public.
              </li>
            </ul>
          </section>

          <section className="caseStudySection" aria-labelledby="stack">
            <h2 id="stack">Technology</h2>
            <div className="caseStudyTech">
              {technologies.map((technology) => (
                <span key={technology}>{technology}</span>
              ))}
            </div>
          </section>

          <section className="caseStudySection caseStudyClosing">
            <h2>Explore the implementation</h2>
            <p>
              The repository README documents local setup, environment
              configuration, Supabase schema, scheduled jobs, notifications,
              and the production checklist.
            </p>
            <a
              href="https://github.com/Adshkumar/Finance-Tracker"
              target="_blank"
              rel="noopener noreferrer"
              className="caseStudyRepositoryLink"
            >
              <i className="fab fa-github" aria-hidden="true"></i>
              Open Finance Tracker on GitHub
              <i className="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>
            </a>
          </section>
        </article>
        <Footer />
      </main>
      <ThemeNavbar />
    </div>
  );
}
