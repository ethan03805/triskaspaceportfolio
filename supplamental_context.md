# Supplemental Context: Ethan Triska

This file is the human-maintained source of truth for narrative information about Ethan Triska and his work. It is used to ground an AI assistant that showcases his projects to visitors.

## 1. Usage Rules

- Speak as an AI assistant that showcases Ethan's work. Never claim to be Ethan, and never speak in his voice as if you were him.
- Only use information present in the approved sources (this file, the resume, and the authored project and profile content). If a visitor asks for something that is not in these sources, say plainly that the information is not available.
- Do not infer, guess, or invent facts. Do not fill gaps with assumptions about Ethan, his projects, or his history.
- Default to third person. A warmer, more casual register is acceptable only when a friend-style persona is explicitly requested.
- Style: no em dashes, no exclamation marks, no marketing superlatives.
- Treat everything in this file as shareable with visitors unless a section says otherwise.

## 2. Identity and Contact

- Name: Ethan Triska.
- Email: ethan@triska.space.
- Website: triskaspace.com.
- Background summary: Ethan turns business-analytics training into AI tools that ship. He pairs a Business Analytics background with hands-on AI engineering, with experience at Northrop Grumman Space Systems and graduate study in Computer Science at DePaul.

Education:

- DePaul University, College of Computing and Digital Media (Chicago, IL). Master of Science in Computer Science, expected graduation 2028.
- The University of Scranton, Kania School of Management (Scranton, PA). Bachelor of Science in Business Analytics with an Operations Management minor, graduated May 2025. Dean's List in Fall 2024, Fall 2023, and Spring 2022.

Experience:

- Northrop Grumman Space Systems (Dulles, VA), Pricing and Estimating Intern, June 2024 to August 2024. Reviewed Space Basis of Estimates for accuracy and compliance with sector policy, worked on an Agile Scrum team building a Python-based Cost Volume Generator tool for the Space Sector that automates cost-volume creation and assures DFARS compliance, analyzed sector metrics through data visualization in Tableau, and independently developed Pricing and Estimating onboarding training in Adobe Captivate.
- Pampco (Passaic, NJ), Data Analytics Assistant, June 2023 to August 2023, and Data Analytics Intern, June 2022 to August 2022. Streamlined rebate management by aggregating vendor data into a single report, cleaned and standardized product catalog data in Excel, compiled multi-year financial data, and performed comparative analysis against public and private competitors.

Skills:

- Programming and tools: Python (Pandas, NumPy, SpaCy), SQL, VBA, Pivot Tables, Bash, PowerShell, Git, MS Access.
- Analytics methods: K-nearest-neighbors, cluster analysis, decision trees, linear optimization (Excel Solver), ARIMA modeling, regression modeling, and system reliability analysis.

## 3. Career Goals

Ethan is seeking roles across AI engineering and analysis, data engineering and analysis, and operations. His long-term goal is bridging complex AI logic and practical, cost-effective business applications.

## 4. Projects

### 4.1 Axiom (featured)

Axiom is a cost-minimizing engine for agentic AI. It is a software-development-focused agent orchestration engine whose purpose is to drive down the two things that make multi-agent AI expensive and unreliable: wasted spend and hallucination. It is written in Go. The project lives at agentaxiom.space.

The central idea is cost minimization. Capable AI models are expensive, and most of the work involved in building software does not need an expensive model. Axiom treats model choice as an economic decision. It compartmentalizes a high-level goal into bounded tasks and routes each task to the cheapest model that can complete it reliably, reserving capable, costly models for the work that genuinely requires them. Trivial work such as renames, import additions, configuration changes, and boilerplate can run on small local models at no API cost, simple functions can run on cheap models, most coding runs on mid-tier models, and only complex algorithms, coherent multi-endpoint construction, and critical-path code reach for premium models. The result is that the same outcome is produced at a fraction of the cost of putting every step through a single capable model.

Budget-aware orchestration makes this concrete. The user sets a maximum budget before a project begins, and the engine respects that ceiling at all times. Model selection, concurrency, and retry strategy are all informed by the budget that remains. Before each model call, the engine calculates the maximum possible cost of that call and refuses it if it would exceed the remaining budget. When the budget is exhausted, execution pauses and the user is asked to raise the ceiling or stop. Cost is tracked per request, per task, per model, and per project, so spend is always visible rather than discovered after the fact.

The architecture rests on a separation of authority between a trusted engine and untrusted planes. The trusted engine is the Go program running on the user's machine. It holds all authority: it manages state, writes to the filesystem, runs git, spawns and destroys workers, brokers every model call, and enforces the budget. The untrusted plane is where the AI agents live, each isolated in its own container with no direct access to the filesystem, to git, to the network, or to model APIs. The contract is simple. Agents propose, and the engine disposes. Every action an agent wants to take is submitted as a structured request that the engine validates, authorizes, checks against the budget, and only then executes. A misbehaving or hallucinating agent therefore cannot write arbitrary files, cannot spawn its own workers, and cannot quietly exceed its budget, because it never holds the authority to do any of those things in the first place. A third, separate plane runs untrusted generated code for compilation, linting, and testing in an isolated sandbox with no network access and no credentials, so code an agent produced cannot reach the rest of the system.

The workers are disposable, and Ethan calls them Meeseeks after the single-purpose characters in Rick and Morty. Each Meeseeks is created for exactly one bounded task, is given the minimum necessary context for that task and nothing more, does the job, and is then discarded. No worker persists between tasks, and no worker accumulates context. This directly addresses the second source of cost and failure: as an AI agent accumulates context about a project, it begins hallucinating references to code, APIs, and files that do not exist. By keeping each worker's context small and structured, and by destroying the worker the moment its task is done, Axiom keeps context tight and hallucination low. The engine determines the right amount of context for each task, ranging from a few symbol signatures up to a repository map, and prefers the smallest level that is sufficient. Every retry gets a fresh worker rather than a reused one, so feedback is delivered as explicit input to a clean worker rather than as accumulated state.

Work flows through a clean hierarchy from intent to finished code. A top-level orchestrator owns the project: it reads the user's prompt, decides how to break the goal into tasks, and chooses which model tier each task should use. For portions of the project that are complex enough to manage on their own, the orchestrator delegates a subtree to a sub-orchestrator, which manages that branch in turn. Sub-orchestrators delegate down to the individual workers. The orchestrator decides, the sub-orchestrators decide within their branches, and the engine executes for all of them. This gives a clean path from a single high-level intent down to the small bounded units of work that actually produce code.

The flow itself is driven by an immutable specification. From the user's prompt, the orchestrator produces a structured specification that describes the architecture, requirements, test strategy, and acceptance criteria for the software to be built. The user reviews and approves that specification, and once it is approved the scope is fixed. Execution then proceeds autonomously against the approved scope. This is deliberate. When users correct an AI agent in the middle of a run, the agent tends to blend the new instruction with the old one rather than cleanly replacing it, and the result drifts. Fixing the scope up front and then executing against it removes that whole class of failure. When the outside world contradicts an assumption in the specification, such as a dependency that has been removed or an external API that has changed, the engine has a controlled, auditable way to adapt the affected work without reopening the overall scope or feature set. Each unit of generated code passes through automated validation and an independent review by a separate model before it is committed, and commits are serialized so that parallel work does not collide.

Taken together, Axiom is an engine that takes a single goal, plans it into bounded tasks, routes each task to the cheapest model that can do it reliably, runs disposable single-task workers inside a strict boundary between the trusted engine and the untrusted agents, and assembles the results into finished software while never exceeding a budget the user set in advance.

### 4.2 Serenity Radio (featured)

Serenity Radio is an LLM-hosted internet radio station that runs around the clock with no human staff. A language model acts as the host: it selects tracks from a curated library, schedules shows, and replies to listener messages in real time. Listeners can send short notes and hear the AI host respond on air. The site shows what is playing now and streams the station directly in the browser. It lives at underclassradio.com.

### 4.3 Vox (featured)

Vox is a macOS dictation app that turns speech into text entirely on the user's device, with nothing sent to the cloud. It is speech-to-text, not the reverse: a system-wide hotkey lets a user dictate into any application. Vox supports both Whisper and Parakeet local models, transcribes audio files, learns custom vocabulary, and runs fully offline after the initial model download. It is a one-time five dollar license with no subscription. It lives at voxtts.space.

## 5. Gated Projects

These projects are gated and described only briefly. They are tagged aerospace and security.

- SSTPA Tool (aerospace, security). A desktop tool that helps engineers apply the Systems Security-Theoretic Process Analysis method to large, air-gapped systems. It models the system hierarchy and generates security requirements from that model. It was built in Python.
- Satellite Simulator (aerospace). A simulation tool built around a custom physics engine for orbital mechanics, with integrated GIS data for realistic visualization. It was built in C++.

## 6. FAQ

Q: What is Ethan focused on right now?
A: Ethan is focused on building AI tools that ship, with an emphasis on making agentic AI cheaper and more reliable. Axiom, his cost-minimizing engine for agentic AI, is the clearest example. Alongside it he maintains Serenity Radio, an LLM-hosted radio station, and Vox, an on-device dictation app for macOS.

Q: What differentiates Ethan's approach?
A: Ethan comes from a Business Analytics background and consistently frames engineering as an economic problem. In Axiom that shows up as routing each task to the cheapest model that can do it reliably and holding the whole run to a budget the user sets in advance. His stated long-term goal is bridging complex AI logic and practical, cost-effective business applications, and his projects reflect that combination of capability and cost discipline.

Q: What is Ethan's background?
A: Ethan holds a Bachelor of Science in Business Analytics from the University of Scranton and is pursuing a Master of Science in Computer Science at DePaul. He interned in Pricing and Estimating at Northrop Grumman Space Systems and worked in data analytics at Pampco. See the Identity and Contact section for details.

## 7. Fun

A few personal details, useful for the friendlier persona.

- Music: Ethan listens to progressive rock, including King Crimson, Yes, Pink Floyd, and Camel. His favorite album is On the Beach by Neil Young.
- Hobbies: he plays basketball, hikes, and reads postmodern fiction.
- Television: his favorite show is The Sopranos.
