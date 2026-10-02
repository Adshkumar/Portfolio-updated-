export const caseStudies = [
  {
    slug: "akm-techie",
    title: "DTEST at AKM Techie",
    eyebrow: "Internship · Web development · June–July 2025",
    lead: "A responsive multi-page web experience for DTEST, bringing its driving-school information, practical resources, service content, and client-facing pages into one navigable site.",
    links: [
      { label: "DTEST website", href: "https://dtest-inky.vercel.app/" },
      { label: "DTEST source", href: "https://github.com/Adshkumar/Dtest" },
      {
        label: "DTEST site source",
        href: "https://github.com/Adshkumar/Dtest_site",
      },
    ],
    facts: [
      ["Role", "Intern Web Developer"],
      ["Organization", "AKM Techie"],
      ["Duration", "June 2025 – July 2025"],
      ["Focus", "Responsive multi-page web development"],
    ],
    architecture: [
      ["Visitor", "Desktop, tablet, and mobile browser"],
      ["DTEST site", "Page navigation · content sections · forms · responsive UI"],
      ["Site areas", "Home · practical tests · about · clients · stats · contact"],
    ],
    flow: [
      ["Explore", "Open the landing page and browse DTEST information"],
      ["Navigate", "Move between practical-test, service, client, and about pages"],
      ["Engage", "Use contact and demonstration entry points"],
      ["Adapt", "Use the responsive navigation and page layouts across screens"],
    ],
    areas: [
      {
        title: "Multi-page DTEST experience",
        items: [
          "Built responsive pages for the DTEST public experience, including home, practical tests, about, clients, statistics, and contact areas.",
          "Kept navigation and page structure consistent as visitors moved between informational and service-focused sections.",
          "The repository includes distinct DTEST site variants; the linked source repositories make the delivered page structure inspectable.",
        ],
      },
      {
        title: "Service and learning content",
        items: [
          "Presented driving-school and learning information, including practical-test entry points and DTEST service pages.",
          "Created a chatbot information section describing customer support and automation use cases; this is presented as product/service information, not a claim that a production chatbot backend is part of the public snapshot.",
        ],
      },
      {
        title: "Responsive interaction",
        items: [
          "Implemented custom-styled page sections, mobile navigation behavior, contact-form interfaces, and service demonstrations.",
          "Refined layouts and business-statistics displays to remain readable on smaller screens.",
        ],
      },
    ],
    dataModel: [
      {
        title: "Public website structure",
        entities: [
          ["Home", "Introduction and primary navigation"],
          ["Practical tests", "Test-centre and practical-test entry point"],
          ["About and clients", "Organization and audience information"],
          ["Stats and contact", "Business information and enquiry interface"],
        ],
        relation:
          "A shared navigation connects each page; the public source snapshot is primarily a presentation layer and should not be read as documentation of a production data backend.",
      },
    ],
    engineering: [
      [
        "Responsive structure",
        "Composed page-specific content from reusable layout patterns and responsive navigation, with mobile behavior considered alongside desktop presentation.",
      ],
      [
        "Interaction boundaries",
        "Contact forms, page links, and demonstration entry points are part of the interface. Backend submission behavior is not claimed where it is not visible in the public snapshot.",
      ],
      [
        "Work context",
        "The case study brings together the DTEST website work from the AKM Techie internship; it is distinct from the later personal full-stack application case studies.",
      ],
    ],
    delivery: [
      "The public Dtest repositories contain the site pages and styling that can be reviewed directly.",
      "The internship work described here is limited to the DTEST website, responsive presentation, interactive page elements, and the responsibilities already listed in the portfolio.",
    ],
    dataRetrieval: [
      [
        "Fast portfolio delivery",
        "This case-study route is pre-rendered into static HTML at build time, so reading the portfolio entry does not wait for an application API or database.",
      ],
      [
        "DTEST source boundary",
        "The linked site repository exposes an HTML entry point; no public API or transactional data contract is documented, so no database-backed retrieval speed is claimed for the DTEST product.",
      ],
    ],
    technologies: ["HTML", "CSS", "JavaScript", "PHP"],
  },
  {
    slug: "url-shortener",
    title: "URL Shortener",
    eyebrow: "Full-stack project · MERN · Docker Compose",
    lead: "A URL-management platform with custom short aliases, account-based link ownership, click analytics, QR codes, and a containerized frontend, API, and MongoDB stack.",
    links: [
      {
        label: "Live application",
        href: "https://url-shortener-seven-lac.vercel.app/",
      },
      {
        label: "Source code",
        href: "https://github.com/Adshkumar/URL-Shortener",
      },
    ],
    facts: [
      ["Client", "React · Vite"],
      ["API", "Express · Node.js"],
      ["Persistence", "MongoDB · Mongoose"],
      ["Local orchestration", "Docker Compose"],
    ],
    architecture: [
      ["React web client", "Vite · Tailwind · React Router · Axios"],
      ["Express API", "JWT auth · route/controller layers · rate limiting"],
      ["MongoDB", "Users · shortened links · click/analytics records"],
      ["Compose network", "Frontend · API · MongoDB with persistent volume"],
    ],
    flow: [
      ["Authenticate", "Register or sign in and receive a JWT"],
      ["Create link", "Submit a destination URL and optional custom alias"],
      ["Redirect", "Resolve the short code and redirect to its destination"],
      ["Measure", "Review click, device, browser, OS, and daily trend analytics"],
    ],
    areas: [
      {
        title: "Link lifecycle",
        items: [
          "Create, list, and delete short URLs, including custom aliases.",
          "Resolve a short code through the redirect endpoint.",
          "Manage links from an authenticated dashboard rather than a single anonymous form.",
        ],
      },
      {
        title: "Analytics and sharing",
        items: [
          "Track clicks and summarize performance for an individual URL or across a user's links.",
          "Break down link traffic by device, browser, operating system, and daily trends.",
          "Generate QR codes for shortened URLs.",
        ],
      },
      {
        title: "Account management",
        items: [
          "JWT-protected profile and password update endpoints.",
          "Support account deletion with the associated user data.",
          "Apply API rate limiting and configure CORS for the deployed frontend origin.",
        ],
      },
    ],
    dataModel: [
      {
        title: "URL product data",
        entities: [
          ["User", "Authenticated owner and profile"],
          ["Short URL", "Destination · short code/alias · owner"],
          ["Click event", "URL reference · request context · time"],
          ["Analytics summary", "Aggregated URL and account-level metrics"],
        ],
        relation:
          "The API scopes link management to authenticated accounts; redirect activity feeds per-link and overall analytics.",
      },
    ],
    apiGroups: [
      [
        "Authentication and profile",
        "POST /api/auth/register · POST /api/auth/login · GET /api/auth/me · PUT /api/auth/profile · PUT /api/auth/password · DELETE /api/auth/delete",
      ],
      [
        "Short links",
        "GET /api/urls · POST /api/urls · DELETE /api/urls/:id · GET /:shortCode",
      ],
      [
        "Analytics",
        "GET /api/analytics/:urlId · GET /api/analytics/summary",
      ],
    ],
    dataRetrieval: [
      [
        "Indexed redirect key",
        "The Mongoose schema declares shortCode unique, enabling a unique index for direct lookups when model indexes are built; the deployment does not publish index status or latency benchmarks.",
      ],
      [
        "Account-scoped dashboard",
        "Authenticated URL and analytics routes return the current account's links and summaries. Click events are stored separately so reporting can aggregate activity without expanding every link document.",
      ],
      [
        "Scale-up consideration",
        "The click-event schema does not declare an index on shortUrl or clickedAt. Add query-shaped indexes and bounded date windows if event volume makes analytics aggregation a read bottleneck; no latency benchmark is published.",
      ],
    ],
    engineering: [
      [
        "Service boundary",
        "The Vite client calls an Express REST API; URL resolution and protected management endpoints are handled on the server.",
      ],
      [
        "Authentication",
        "JWT middleware protects account-specific URL, analytics, and profile operations.",
      ],
      [
        "Deployment configuration",
        "The README documents frontend hosting on Vercel and backend hosting on Render, with explicit API URL, base URL, CORS origin, and production environment settings.",
      ],
      [
        "Container topology",
        "Docker Compose runs MongoDB, the API, and frontend on a shared bridge network; a named volume persists MongoDB data.",
      ],
    ],
    delivery: [
      "Install and run the frontend and backend as separate packages, configuring their API and database environment values.",
      "Use Docker Compose for the three-service local development topology; MongoDB data lives in the configured persistent volume.",
      "The repository README documents production deployment and the API endpoint surface for auth, URLs, analytics, and redirects.",
    ],
    technologies: [
      "React",
      "Vite",
      "Tailwind CSS",
      "React Router",
      "Axios",
      "Framer Motion",
      "Recharts",
      "Node.js",
      "Express",
      "MongoDB",
      "Mongoose",
      "JWT",
      "bcryptjs",
      "Docker",
      "Docker Compose",
    ],
  },
  {
    slug: "agentic-ai",
    title: "Agentic AI App Builder",
    eyebrow: "AI product · Next.js · Gemini · Cline SDK",
    lead: "A prompt-driven React app builder that generates code into a live Sandpack preview, persists workspaces and chat history, and lets an agent improve files iteratively.",
    links: [
      {
        label: "Live application",
        href: "https://agentic-flow-ai.vercel.app/",
      },
      {
        label: "Source code",
        href: "https://github.com/Adshkumar/Agentic-AI",
      },
    ],
    facts: [
      ["Framework", "Next.js App Router · TypeScript"],
      ["Identity and plans", "Clerk"],
      ["Workspace persistence", "Prisma · PostgreSQL"],
      ["Preview runtime", "Sandpack"],
    ],
    architecture: [
      ["Next.js workspace UI", "Prompt/chat · code editor · live preview"],
      ["Authenticated API routes", "Generation · improvement · workspace actions"],
      ["AI runtimes", "Gemini generation · Cline agent file patches"],
      ["Persistence and assets", "Prisma/PostgreSQL · Supabase image storage"],
    ],
    flow: [
      ["Describe", "Submit a natural-language app request and optional image"],
      ["Generate", "Gemini streams status and structured files/dependencies"],
      ["Preview", "Render generated React code in the Sandpack browser"],
      ["Improve", "Pro user asks the Cline agent to patch files one by one"],
    ],
    areas: [
      {
        title: "Prompt-to-preview generation",
        items: [
          "Create React app files from natural-language requests and display the result in a live browser preview.",
          "Keep a split workspace with chat on one side and code/preview on the other; generated conversations and project files persist across visits.",
          "Upload reference images to Supabase Storage and include their accessible image URL in the generation context.",
        ],
      },
      {
        title: "Streaming workspace",
        items: [
          "Stream assistant text and status updates while generation is in progress.",
          "Inspect generated source in a read-only CodeMirror editor and switch between the preview and code views.",
          "Export a runnable project ZIP; browse and delete saved workspaces from the projects area.",
        ],
      },
      {
        title: "Improve and fix loops",
        items: [
          "A plan-gated Cline SDK agent can call update_file to replace complete files and stream each patch into the running Sandpack preview.",
          "Preview runtime or compilation errors can be passed back into an AI repair flow.",
          "Generated dependency names are checked against the npm registry before they are accepted.",
        ],
      },
      {
        title: "Plans and credits",
        items: [
          "The README describes free, Starter, and Pro credit allocations; generation and improvement consume credits.",
          "Generation checks available credit on the server and persists the workspace update and credit deduction in a database transaction.",
          "Plan changes can top up credits; the Pro-only improvement flow enforces plan and ownership checks server-side.",
        ],
      },
    ],
    dataModel: [
      {
        title: "Persistent workspace",
        entities: [
          ["User", "Clerk identity · profile · plan · credits"],
          ["Workspace", "Owner · title · messages JSON · generated file data"],
          ["Workspace image", "Supabase Storage object organized by user/workspace"],
          ["Generation", "Authenticated request · AI response · credit operation"],
        ],
        relation:
          "A user owns many workspaces; each workspace stores conversation messages and generated files/dependencies. Image assets are stored separately and referenced in prompts.",
      },
    ],
    apiGroups: [
      [
        "Generate application",
        "POST /api/gen-ai-code · streams structured assistant output, title, generated files, and dependencies",
      ],
      [
        "Improve application",
        "POST /api/improve · Pro/Starter-gated Cline file-update workflow streamed to the workspace",
      ],
    ],
    dataRetrieval: [
      [
        "Indexed workspace ownership",
        "The Prisma schema indexes Workspace.userId, supporting account-scoped workspace retrieval without scanning every user's saved projects.",
      ],
      [
        "Persistent project reads",
        "Messages and generated files are stored with each workspace; the projects view can retrieve saved sessions without regenerating them with Gemini.",
      ],
      [
        "Keep reads separate from AI latency",
        "Workspace/database reads are distinct from generation and improvement, which wait on remote AI providers and streamed work. The repository does not publish end-to-end latency benchmarks.",
      ],
    ],
    engineering: [
      [
        "Server-side authorization",
        "Generation and improvement routes derive the authenticated Clerk identity, validate workspace ownership, and enforce plan/credit requirements.",
      ],
      [
        "Structured, streamed responses",
        "The generation endpoint streams server-sent events and returns a defined response shape for assistant text, title, files, and dependencies.",
      ],
      [
        "Agent tool boundary",
        "The Cline agent receives the current app files and two narrow tools: update an entire file and signal completion. Each patch is streamed back into the preview.",
      ],
      [
        "Transactional accounting",
        "The generated workspace state and corresponding credit decrement are committed together so an accepted generation does not leave those writes split.",
      ],
    ],
    delivery: [
      "The README documents Node.js 22+, Clerk, Supabase/PostgreSQL, and a Google AI Studio key as prerequisites.",
      "Prisma client generation and database schema push precede starting the Next.js development server.",
      "Server credentials such as Clerk secret, database URL, Gemini key, and Arcjet key stay in server environment configuration; publishable values are not interchangeable with secrets.",
    ],
    technologies: [
      "Next.js App Router",
      "TypeScript",
      "React",
      "Clerk",
      "Prisma",
      "PostgreSQL",
      "Supabase Storage",
      "Google Gemini",
      "Cline SDK",
      "Sandpack",
      "CodeMirror",
      "Arcjet",
      "Tailwind CSS",
      "shadcn/ui",
      "Server-Sent Events",
    ],
  },
  {
    slug: "chat-application",
    title: "Chat Application",
    eyebrow: "Full-stack project · Real-time messaging · Docker",
    lead: "A real-time chat product built around authenticated users, room-based conversations, persistent message history, and live presence and typing feedback.",
    links: [
      {
        label: "Live application",
        href: "https://chat-application-sable-rho.vercel.app/",
      },
      {
        label: "Source code",
        href: "https://github.com/Adshkumar/ChatApplication",
      },
    ],
    facts: [
      ["Web client", "Frontend container"],
      ["Application server", "Node.js · Express"],
      ["Realtime transport", "Socket.IO"],
      ["Persistence and local orchestration", "MongoDB · Docker Compose"],
    ],
    architecture: [
      ["Browser client", "Sign in · rooms · messages · presence"],
      ["Express API", "Authentication · application endpoints"],
      ["Socket.IO server", "Room events · message delivery · live indicators"],
      ["MongoDB", "Persistent user and message data"],
      ["Docker Compose", "Frontend and backend containers run together"],
    ],
    flow: [
      ["Authenticate", "Sign in and establish an authenticated session"],
      ["Join", "Enter a room and connect to its realtime channel"],
      ["Send", "Submit a message to the room over the live connection"],
      ["Deliver", "Persist history and update connected room participants"],
    ],
    areas: [
      {
        title: "Room-based messaging",
        items: [
          "Create an interactive chat experience where conversations are organized into rooms.",
          "Use Socket.IO for live message delivery rather than requiring the client to repeatedly poll for new messages.",
          "Persist message history so conversations remain available beyond the immediate socket session.",
        ],
      },
      {
        title: "Presence and interaction feedback",
        items: [
          "Expose live status for room participants.",
          "Show typing indicators to make active conversation state visible.",
          "Keep the message experience synchronized for connected room members.",
        ],
      },
      {
        title: "Authentication and deployment",
        items: [
          "Use JWT-based authentication for protected chat workflows.",
          "The repository has distinct Dockerfiles for frontend and backend and a Docker Compose file to orchestrate them together.",
          "Compose provides a shared service environment so the UI and API can be run as a coordinated application stack.",
        ],
      },
    ],
    dataModel: [
      {
        title: "Conversation concepts",
        entities: [
          ["User", "Authenticated identity and live status"],
          ["Room", "Conversation boundary for membership and events"],
          ["Message", "Author · room · content · persisted history"],
          ["Socket session", "Connected client and realtime event channel"],
        ],
        relation:
          "Authenticated users connect to rooms; messages are associated with a room and author, persisted by the backend, and broadcast to connected participants.",
      },
    ],
    dataRetrieval: [
      [
        "Push instead of polling",
        "Socket.IO delivers new room messages and interaction events to connected members, avoiding repeated client requests just to discover whether a message arrived.",
      ],
      [
        "Persistent history",
        "MongoDB backs conversation history while sockets handle live delivery. The repository is private, so message-history query shape, indexes, pagination, and measured latency are not asserted here.",
      ],
      [
        "Growth path",
        "For large rooms, use room-scoped history with bounded pagination and indexes aligned to the room/time sort; this is a scale-up recommendation, not a claim about the current private implementation.",
      ],
    ],
    engineering: [
      [
        "Realtime transport",
        "Socket.IO handles room-level bidirectional events for messages and interaction state; the API remains responsible for application and persistence operations.",
      ],
      [
        "Identity boundary",
        "JWT-based authentication protects user and chat workflows; room access and user identity must be validated by the server.",
      ],
      [
        "Container separation",
        "Frontend and backend have separate Docker build contexts and runtime images, composed together for a reproducible multi-service run.",
      ],
    ],
    delivery: [
      "The application is split into frontend and backend services; each has its own Dockerfile.",
      "The root docker-compose.yml coordinates the services. The project description identifies MongoDB as the persistence layer.",
      "Repository details are private, so this case study sticks to the architecture and capabilities already supplied for the portfolio rather than claiming unverified endpoint names or infrastructure settings.",
    ],
    technologies: [
      "Node.js",
      "Express",
      "MongoDB",
      "JWT",
      "Socket.IO",
      "Docker",
      "Docker Compose",
      "Frontend application",
    ],
  },
  {
    slug: "ai-interview-platform",
    title: "InterviewAI",
    eyebrow: "AI product · Interview preparation · Full-stack",
    lead: "An interview-preparation platform that turns a candidate profile and target job description into a structured interview blueprint, preparation roadmap, gap analysis, and ATS-oriented resume PDF.",
    links: [
      {
        label: "Live application",
        href: "https://adarsh-interviewai.vercel.app/",
      },
      {
        label: "Source code",
        href: "https://github.com/Adshkumar/ai-interview-platform-",
      },
    ],
    facts: [
      ["Frontend", "React · Vite · React Router"],
      ["API", "Node.js · Express"],
      ["Report storage", "MongoDB · Mongoose"],
      ["AI and document output", "Groq · Google GenAI · Puppeteer"],
    ],
    architecture: [
      ["React application", "Authentication · dashboard · blueprint reports"],
      ["Express API", "JWT guards · interview/report endpoints"],
      ["AI services", "Groq Llama · Google GenAI · structured report generation"],
      ["Data and documents", "MongoDB reports · Puppeteer-generated PDF"],
    ],
    flow: [
      ["Provide context", "Upload a PDF/DOCX resume or write a profile and add a job description"],
      ["Analyze", "Generate match score, skills gaps, and role-specific content"],
      ["Prepare", "Review questions, model answers, DSA patterns, and a 14-day plan"],
      ["Save/export", "Return to saved reports or generate an ATS-oriented resume PDF"],
    ],
    areas: [
      {
        title: "Personalized interview blueprint",
        items: [
          "Compare a candidate resume or self-description with the target role description.",
          "Create a circular candidate/job match score and a prioritized gap and vulnerability analysis with practical pivot suggestions.",
          "Generate eight specialized technical questions with interviewer intent and model answers, plus eight tailored STAR-method behavioral questions.",
        ],
      },
      {
        title: "Preparation plan and DSA practice",
        items: [
          "Produce a day-by-day 14-day interview preparation roadmap.",
          "Build a DSA pattern guide covering common structures such as BFS/DFS, two pointers, trees, heaps, sliding window, and dynamic programming.",
          "Attach role-relevant practice problems, conceptual strategies, and links for continued practice.",
        ],
      },
      {
        title: "Resume and report workflow",
        items: [
          "Compile a one-page, ATS-oriented resume as styled HTML/CSS and use Puppeteer to produce an A4 PDF for download.",
          "Save generated reports for later review, search report history, and delete completed reports.",
          "Protect report and profile workflows with authenticated frontend routes and JWT-guarded backend endpoints.",
        ],
      },
    ],
    dataModel: [
      {
        title: "Candidate reports",
        entities: [
          ["User", "Credentials · profile · authentication state"],
          ["Interview report", "Candidate/job context · generated blueprint sections"],
          ["Resume input", "Uploaded PDF/DOCX or written profile"],
          ["Resume output", "Rendered one-page PDF generated from report/profile data"],
        ],
        relation:
          "A signed-in user can create and revisit interview reports; each report's structured data drives the blueprint UI and optional resume PDF.",
      },
    ],
    apiGroups: [
      [
        "Authentication",
        "POST /api/auth/register · POST /api/auth/login · GET /api/auth/me",
      ],
      [
        "Interview reports",
        "POST /api/interview/ · GET /api/interview/ · GET /api/interview/report/:interviewId · POST /api/interview/delete-report/:interviewId",
      ],
      [
        "Resume export",
        "POST /api/interview/resume/pdf/:interviewReportId",
      ],
    ],
    dataRetrieval: [
      [
        "Separate report list and detail",
        "The documented API separates a user's report history from fetching a specific report, so clients can load the overview and request full blueprint detail through distinct endpoints.",
      ],
      [
        "Authenticated report access",
        "JWT-protected report routes scope saved interview material to a signed-in user; resume PDFs are generated on demand rather than stored as a repeated report payload.",
      ],
      [
        "Scale-up consideration",
        "The documented history endpoint does not specify pagination or a report-list index. Add bounded pagination and indexes matching owner plus creation-time queries as report volume grows; no retrieval benchmark is published.",
      ],
    ],
    engineering: [
      [
        "AI output boundary",
        "The README describes structured generation with schema validation so the frontend receives predictable report sections rather than an unbounded free-form response.",
      ],
      [
        "Provider integration",
        "Groq-hosted Llama 3.3 70B is documented for fast blueprint generation, with Google GenAI also listed as an integrated provider.",
      ],
      [
        "Document rendering",
        "Puppeteer renders a styled HTML/CSS resume in a headless browser and streams an A4 PDF back for download.",
      ],
      [
        "Separation of concerns",
        "The repository separates React feature areas, Express controllers/routes, authentication middleware, persistence models, and AI/PDF services.",
      ],
    ],
    delivery: [
      "Install backend and frontend dependencies separately; configure MongoDB and the backend JWT/AI credentials, then point the Vite client to the API URL.",
      "The README documents a local frontend at the Vite development URL and a separately running Express server.",
      "Separate backend and frontend Dockerfiles exist, providing independent Node.js runtime environments for the two application layers.",
    ],
    technologies: [
      "React",
      "Vite",
      "React Router",
      "SCSS",
      "Axios",
      "Node.js",
      "Express",
      "MongoDB",
      "Mongoose",
      "JWT",
      "bcrypt",
      "Groq SDK",
      "Llama 3.3 70B",
      "Google GenAI",
      "Puppeteer",
      "Docker",
    ],
  },
  {
    slug: "uber-clone",
    title: "Uber Clone",
    eyebrow: "Full-stack ride-hailing product · React · Node.js · Socket.IO",
    lead: "A two-sided ride-hailing application with separate rider and captain journeys, address search, vehicle-specific estimates, ride lifecycle controls, realtime events, map views, and Razorpay payment verification.",
    links: [
      {
        label: "Live application",
        href: "https://uber-psi-three.vercel.app/",
      },
      { label: "Source code", href: "https://github.com/Adshkumar/UBER" },
    ],
    heroImage:
      "https://raw.githubusercontent.com/Adshkumar/UBER/main/assets/uber-thumbnail.png",
    heroImageAlt:
      "Uber Clone ride-hailing project banner from the repository README",
    facts: [
      ["Rider app", "React 19 · Vite · React Router 7"],
      ["Captain app", "Role-specific dashboard and ride workflows"],
      ["API / realtime", "Express · REST · Socket.IO"],
      ["Persistence", "MongoDB Atlas · Mongoose"],
      ["Mapping", "Google Maps · Places · browser geolocation"],
      ["Payments", "Razorpay · INR · server-side signature verification"],
      ["Client runtime", "Vite dev server · Vercel SPA deployment"],
      ["Server runtime", "Node.js · Express · configurable Node hosting"],
    ],
    lifecycle: [
      ["pending", "Rider creates a ride; waiting for captain acceptance"],
      ["accepted", "Captain claims the ride; OTP is used to authorize start"],
      ["ongoing", "Assigned captain starts the ride after OTP verification"],
      ["completed", "Assigned captain ends the active ride"],
    ],
    lifecycleNote:
      "Cancellation branches from pending or accepted; the service rejects cancellation once the ride has moved to ongoing.",
    fareRates: [
      ["Car / UberGo", "₹50", "₹15 / km", "₹3 / minute"],
      ["Moto", "₹20", "₹8 / km", "₹1.50 / minute"],
      ["Auto", "₹30", "₹10 / km", "₹2 / minute"],
    ],
    apiGroups: [
      [
        "User auth",
        "POST /users/register · POST /users/login · GET /users/profile · GET /users/logout",
      ],
      [
        "Captain auth",
        "POST /captains/register · POST /captains/login · GET /captains/profile · GET /captains/logout",
      ],
      [
        "Maps",
        "GET /maps/get-suggestions · GET /maps/get-coordinates · GET /maps/get-distance-time",
      ],
      [
        "Rides",
        "POST /rides/create · GET /rides/get-fare · POST /rides/confirm · GET /rides/start-ride · POST /rides/end-ride",
      ],
      [
        "Payment and history",
        "POST /rides/create-payment-order · POST /rides/verify-payment · GET /rides/user/active · GET /rides/user/rides · GET /rides/captain/rides · GET /rides/:rideId · POST /rides/cancel",
      ],
    ],
    socketEvents: [
      ["join", "Client → server", "Register user ID and role for socket routing"],
      [
        "join-confirmed",
        "Server → client",
        "Confirm socket ID and registered role/user",
      ],
      [
        "new-ride",
        "Server → captain",
        "Notify connected captains of a pending ride",
      ],
      [
        "ride-confirmed",
        "Server → rider",
        "Deliver accepted ride and captain details",
      ],
      [
        "ride-otp",
        "Server → captain",
        "Deliver the start-verification OTP after acceptance",
      ],
      [
        "ride-started",
        "Server → rider",
        "Notify rider that the captain has started the ride",
      ],
      [
        "ride-ended",
        "Server → rider",
        "Deliver the completed ride payload",
      ],
      [
        "ride-cancelled",
        "Documented event",
        "Cancellation event in the README event contract",
      ],
      [
        "update-location-captain",
        "Captain → server",
        "Location event is currently logged; it is not persisted or rebroadcast",
      ],
    ],
    dataRetrieval: [
      [
        "Ride-history queries",
        "The API exposes active-ride lookups and paginated rider history, keeping the history response bounded instead of returning an unlimited timeline.",
      ],
      [
        "Geospatial index",
        "Captain records define a MongoDB 2dsphere index and the repository contains a radius-search helper; the current create-ride controller does not use that helper and instead notifies all captains with active sockets.",
      ],
      [
        "Static portfolio route",
        "This case-study page is pre-rendered at build time. Ride estimates and live app data remain dependent on their external API/database services and are not fetched to display this portfolio page.",
      ],
    ],
    implementationNotes: [
      "Distance/time is currently a fixed development stub (10 km / 15 minutes), so fare calculations are formula demonstrations rather than route-specific estimates.",
      "Ride requests are currently sent to every captain with an active socket ID; the 2dsphere radius-search helper is not used by the create-ride controller.",
      "The frontend map watches browser geolocation locally, but the current client/server code does not implement a complete persisted and broadcast live captain-location stream.",
      "The backend service generates an OTP with crypto.randomInt, but the confirmation controller replaces it with Math.random before returning it. This implementation detail should be corrected before treating OTP generation as production-grade.",
      "Payment-order creation currently accepts an amount from the authenticated client; production payment integrity requires deriving and binding the amount to the server-calculated ride rather than trusting client input.",
      "The ride service/controller read and write vehicleType and payment-related fields with names that do not all match the current Ride Mongoose schema (for example, paymentId vs paymentID). Reconcile the schema and domain contract before relying on those values in persisted ride records.",
      "The backend README/package describes an API and deployment design, but its npm test script is a placeholder that exits with an error; automated backend tests are not included.",
    ],
    architecture: [
      [
        "Rider and captain browser clients",
        "React + Vite · protected routes · role contexts · maps · ride panels",
      ],
      [
        "HTTP application API",
        "Express · express-validator · JWT role middleware · controllers",
      ],
      [
        "Realtime channel",
        "Socket.IO · identity/type join · online socket lookup · ride events",
      ],
      [
        "Domain services and persistence",
        "Ride/fare logic · user/captain/ride Mongoose models · MongoDB",
      ],
      [
        "External services",
        "Google Places · Nominatim geocoding · Razorpay order and checkout",
      ],
    ],
    flow: [
      [
        "Find a route",
        "Rider searches pickup and destination, requests an estimate, and selects a vehicle",
      ],
      [
        "Request a ride",
        "Authenticated API validates the request, creates a pending ride, and notifies connected captains",
      ],
      [
        "Accept and verify",
        "Captain confirms the pending request; the rider/captain receive a six-digit start OTP",
      ],
      [
        "Ride and settle",
        "Captain starts with the OTP, ends the ride, and the rider can complete the Razorpay payment flow",
      ],
    ],
    areas: [
      {
        title: "1. Rider application and journey",
        items: [
          "Dedicated entry, signup, login, home, active-ride, riding, and logout screens.",
          "JWT-protected user routes maintain the rider session and profile; map screens combine address search, map display, and browser geolocation.",
          "Google Places Autocomplete suggests addresses; a coordinate lookup endpoint resolves address strings.",
          "Request fare estimates for car (UberGo), motorcycle, and auto before creating a ride.",
          "View a waiting-for-captain state, captain details after acceptance, ride OTP, live-ride interface, and completion/payment state.",
          "The API exposes the active ride and paginated rider ride history.",
        ],
      },
      {
        title: "2. Captain application and journey",
        items: [
          "Separate captain signup/login and route protection; registration captures vehicle color, plate, capacity, and type.",
          "Captain home presents a map/dashboard, availability controls, incoming ride requests, and ride actions.",
          "Connected captains receive Socket.IO ride-request events and can confirm a request.",
          "Captain-only endpoints support starting a ride with its six-digit OTP and ending an ongoing ride.",
          "Captain ride history and earnings summaries are supported in the backend service layer.",
        ],
      },
      {
        title: "3. Ride lifecycle and state rules",
        items: [
          "Ride state is represented as pending, accepted, ongoing, completed, or cancelled.",
          "A request begins pending; one captain can atomically accept a pending ride, and a captain must own an accepted ride to start or end it.",
          "Starting requires the ride's six-digit OTP; cancellation is permitted while pending or accepted, not after the ride is ongoing.",
          "Rider flows prevent creating a second active request while a pending, accepted, or ongoing ride already exists.",
          "Ride records link the rider and optional captain and retain pickup, destination, fare, status, distance/duration fields, payment identifiers, and an OTP excluded from default query selection.",
        ],
      },
      {
        title: "4. Maps, geocoding, and discovery",
        items: [
          "Google Maps JavaScript API renders maps; Places API provides address autocomplete; the browser Geolocation API supplies the user's current map position.",
          "The backend coordinate service geocodes addresses through Nominatim/OpenStreetMap.",
          "Captain documents use GeoJSON Point coordinates in [longitude, latitude] order and define a MongoDB 2dsphere index; a radius-search service is present.",
          "Repository note: the current create-ride controller sends requests to all captains with active socket IDs rather than using the radius-search service. The UI map's location watcher does not currently publish a persisted rider/captain tracking stream through the server.",
        ],
      },
      {
        title: "5. Vehicle pricing and estimates",
        items: [
          "Estimate all three vehicle categories from a base fare plus per-kilometer and per-minute rates, rounding the resulting fare to a whole rupee.",
          "Car (UberGo): ₹50 base + ₹15/km + ₹3/minute.",
          "Moto: ₹20 base + ₹8/km + ₹1.50/minute.",
          "Auto: ₹30 base + ₹10/km + ₹2/minute.",
          "Repository note: the current getDistanceTime service returns a fixed 10 km / 15 minute development response. Estimates therefore demonstrate the fare calculation, but are not route-accurate until a live distance-matrix implementation replaces that stub.",
        ],
      },
      {
        title: "6. Razorpay payment lifecycle",
        items: [
          "The backend creates an INR Razorpay order using its server-held key secret and returns the public key/order details to the frontend checkout.",
          "After checkout, the backend recomputes an HMAC-SHA256 signature from orderId|paymentId and compares it before proceeding.",
          "The verified-payment route records payment identifiers and creates/notifies a ride; the client includes trip details for that creation flow.",
          "The application also has a separate ride-creation endpoint without the payment-order verification path, so the payment-first and direct-create flows should be understood as distinct code paths.",
          "Razorpay private credentials belong only in backend environment configuration; the frontend uses the public key for checkout.",
        ],
      },
      {
        title: "7. Identity and session security",
        items: [
          "Rider and captain credentials are stored in separate MongoDB models, with bcrypt password hashing and bcrypt comparison at login.",
          "Both roles receive signed JWTs with a 24-hour expiry; separate authentication middleware protects rider and captain endpoints.",
          "Logout stores a token in a blacklist collection whose document expires after 24 hours; password fields are excluded from default model queries.",
          "Route inputs use express-validator for email, names, passwords, vehicle types, ride IDs, addresses, and OTP length.",
        ],
      },
      {
        title: "8. Realtime events and online state",
        items: [
          "Clients join the Socket.IO server with a user ID and role; the server associates their socket ID with the corresponding user or captain record and confirms the join.",
          "The backend emits new-ride to connected captains, ride-confirmed to the rider, ride-otp to the captain, ride-started to the rider, and ride-ended after completion; ride-cancelled is included in the documented event contract.",
          "Disconnect handling clears the matching user/captain socket ID and online flag.",
          "Repository note: the update-location-captain handler currently logs incoming coordinates; it does not persist the new location or broadcast a location update in the current socket implementation.",
        ],
      },
      {
        title: "9. API surface",
        items: [
          "Users: register, login, profile, logout.",
          "Captains: register, login, profile, logout.",
          "Maps: get-suggestions, get-coordinates, get-distance-time.",
          "Rides: create-payment-order, verify-payment, create, get-fare, confirm, start-ride, end-ride, active ride, rider/captain history, ride details, cancel, and socket diagnostic.",
        ],
      },
    ],
    dataModel: [
      {
        title: "MongoDB domain model",
        entities: [
          ["User", "Name · unique email · bcrypt password · socket ID"],
          [
            "Captain",
            "Identity · active/inactive state · vehicle · GeoJSON location",
          ],
          [
            "Ride",
            "Rider/captain refs · pickup/destination · fare · state · OTP · payment IDs",
          ],
          [
            "BlacklistedToken",
            "Unique revoked JWT · createdAt TTL after 24 hours",
          ],
        ],
        relation:
          "User and captain documents connect to rides by ObjectId references. Captain location is indexed as GeoJSON for near queries; JWT revocation records expire through a MongoDB TTL index.",
      },
    ],
    engineering: [
      [
        "Layered backend",
        "Express routes validate and authenticate requests, controllers coordinate transport/realtime/payment behavior, and ride/map services encapsulate domain operations.",
      ],
      [
        "Conditional state transitions",
        "Captain acceptance updates only rides still pending; start and end operations check both assigned captain and expected state. OTP is hidden by default in Mongoose selections.",
      ],
      [
        "Input validation and role separation",
        "express-validator checks route fields, with distinct JWT middleware for rider and captain access.",
      ],
      [
        "Realtime delivery",
        "Socket.IO uses the persisted role-specific socket ID to emit events directly to the rider or captain involved in a workflow.",
      ],
      [
        "Operational boundaries",
        "The README's target design and the current implementation differ in a few important places: distance/time is mocked, create-ride dispatch is not radius-filtered, and location socket events are not persisted. These are called out explicitly rather than described as completed production behavior.",
      ],
    ],
    delivery: [
      "Repository layout separates UBER-FRONTEND (Vite SPA) and UBER-BACKEND (Express API/socket server).",
      "Backend development runs on port 3000; frontend development runs on port 5173.",
      "Frontend settings: VITE_BASE_URL, VITE_GOOGLE_MAPS_API_KEY, and VITE_RAZORPAY_KEY_ID.",
      "Backend settings: MONGODB_URI, JWT_SECRET, GOOGLE_MAPS_API, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and PORT.",
      "The README describes a Vercel SPA deployment with an index.html rewrite and a separately hosted Node API (Render, Railway, Heroku, or EC2 examples).",
      "Production CORS must allow the deployed frontend origin; MongoDB, JWT signing, Maps, and Razorpay secret values must remain server-side.",
      "The backend package currently defines its test script as a placeholder that exits with an error; no automated backend test suite is documented there.",
    ],
    technologies: [
      "React 19.1",
      "Vite 7.1",
      "Tailwind CSS 4.1",
      "React Router 7.9",
      "GSAP 3.14",
      "Axios 1.12",
      "Google Maps JavaScript API",
      "Google Places API",
      "Browser Geolocation API",
      "Node.js",
      "Express 4",
      "express-validator",
      "MongoDB Atlas",
      "Mongoose 8",
      "Socket.IO 4",
      "JSON Web Tokens",
      "bcrypt",
      "Razorpay",
      "Nominatim / OpenStreetMap",
      "GeoJSON",
      "MongoDB 2dsphere index",
    ],
  },
];

export function getCaseStudyBySlug(slug) {
  return caseStudies.find((study) => study.slug === slug);
}
