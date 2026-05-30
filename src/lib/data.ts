// ─────────────────────────────────────────────────────────────────────────
// All portfolio content lives here. Edit this file to update the site.
// ─────────────────────────────────────────────────────────────────────────

export const profile = {
  name: "Bharath Genji Mohanaranga",
  handle: "bharath",
  role: "AI Engineer",
  location: "Houston, TX",
  email: "bharath.genjimohanaranga@gwmail.gwu.edu",
  phone: "+1 571 259 4792",
  linkedin: "https://www.linkedin.com/in/bharath-gm/",
  github: "https://github.com/Bharath-GM",
  resume: "/bharath-resume.pdf",
  tagline: "AI Engineer · ships production multi-agent systems",
  summary:
    "AI Engineer who ships production multi-agent systems that move real business metrics — cut 15-minute workflows to under 2 minutes, recovered 10K+ analyst hours, and drove $2M+ in projected savings. 4+ years across the full stack: LangGraph / Google ADK agent orchestration, RAG pipelines, and cross-cloud deployments on GCP, AWS & Azure with end-to-end MLOps.",
};

export const stats = [
  { value: "$2M+", label: "projected annual savings" },
  { value: "10K+", label: "analyst hours recovered" },
  { value: "15min → 2min", label: "workflow time cut" },
  { value: "4+ yrs", label: "shipping AI systems" },
];

// What I'm doing RIGHT NOW (current role, framed as running processes)
export const now = {
  company: "NRG Energy",
  role: "AI Consultant — Data & AI Team",
  period: "Sep 2025 – Present",
  location: "Houston, TX (Hybrid)",
  processes: [
    {
      name: "EMMA BPEM",
      status: "running",
      desc: "Lead developer of an AI customer-service automation system using LangGraph ReAct agents with Gemini 2.5 Flash. Multi-agent orchestration (Entry/Shielding, Orchestrator, Supervisor, Specialist nodes) across 5 use cases — referral credits, gift cards, wrong amounts, Amazon incentives.",
      metrics: ["15–30min → 1–3min", "95% pilot accuracy", "1,000+ cases/mo"],
      tech: ["LangGraph", "Gemini 2.5 Flash", "Cloud Run", "Firestore", "SAP OData"],
    },
    {
      name: "Credit Risk Review Agent",
      status: "building",
      desc: "Multi-agent system on Google ADK (Credit Risk Agent + Research Agent) automating Credit Review Templates — financial spreading, ratio calculations, debt-maturity analysis, covenant extraction, and early-warning detection.",
      metrics: ["Google ADK", "AlloyDB RAG", "Vertex AI"],
      tech: ["Google ADK", "AlloyDB", "text-embedding-004", "Vertex AI"],
    },
  ],
  extras: [
    "Engineered cross-cloud auth between Azure Container Apps and Google Vertex AI via service-account keys in Azure Key Vault.",
    "Built Microsoft Graph API integrations (SharePoint + email via MSAL) wired as MCP tools in the NRG Tool Factory platform.",
    "Implemented RAG pipelines with AlloyDB vector store for credit-policy retrieval and financial document grounding.",
  ],
};

// What I've DONE — career timeline
export type Job = {
  company: string;
  role: string;
  period: string;
  location: string;
  highlights: string[];
  tech: string[];
};

export const work: Job[] = [
  {
    company: "TheDetail.ai",
    role: "Founding AI Software Engineer",
    period: "May 2025 – Jul 2025",
    location: "Washington, DC (Remote)",
    highlights: [
      "Spearheaded an enterprise GenAI document-intelligence platform as first engineer; FastAPI microservices on AWS ECS Fargate with Lambda/SQS/EventBridge — scaled to 10K+ docs/min (p99 < 200ms).",
      "Built ensemble extraction with Google Document AI, Azure Document Intelligence & Gemini LLMs — F1 0.97 across 40+ drawing formats.",
      "Weaviate + OpenAI vector layer with semantic re-ranking (<50ms retrieval over 30M vectors); RAG workflows via LangChain ReAct agents.",
      "End-to-end MLOps (GitHub Actions, Terraform, Docker); GPU inference bursts on Vertex AI cut unit cost 18%.",
    ],
    tech: ["FastAPI", "AWS ECS Fargate", "Weaviate", "LangChain", "Terraform"],
  },
  {
    company: "Kingsman Academy",
    role: "ST Hodge Fellow / AI & Data Science Intern",
    period: "Feb 2025 – Dec 2025",
    location: "Washington, DC (Hybrid)",
    highlights: [
      "Architected a unified data & GenAI platform ingesting LMS, finance & attendance into a central feature + vector store powering real-time dashboards and LLM tools.",
      "Built LLM copilots (RAG over policy / IEPs / attendance) with LangChain ReAct that draft interventions, summarize histories & return cited answers.",
      "Productionized prompts & evals: version control, dataset-grounded evaluation, guardrails (PII redaction, refusal rules), observability.",
      "Deployed low-latency Python APIs on AWS (ECS/Lambda) and GCP (Vertex AI + Cloud Run) with batching/caching.",
    ],
    tech: ["LangChain", "pgvector", "AWS", "GCP", "Tableau"],
  },
  {
    company: "Infotrend",
    role: "AI/ML Engineer Intern",
    period: "Jun 2024 – Aug 2024",
    location: "Washington, DC",
    highlights: [
      "Deployed a real-time image-processing stack with Dockge; integrated Stable Diffusion with Open WebUI; secured access via VPS + Cloudflare Zero Trust.",
      "Engineered CV/NLP apps with Python, TensorFlow, PyTorch & OpenCV; summarized SOTA deep & RL research to guide model and infra choices.",
    ],
    tech: ["Stable Diffusion", "PyTorch", "OpenCV", "Cloudflare Zero Trust"],
  },
  {
    company: "GW Institute of Public Policy",
    role: "Research Assistant",
    period: "May 2024 – Aug 2024",
    location: "Washington, DC",
    highlights: [
      "Built an analytics app with the LAiSER library to reorganize skill data from NLx; automated job-data analysis across Texas industries — +40% handling efficiency.",
    ],
    tech: ["Python", "LAiSER", "NLP"],
  },
  {
    company: "InfoCepts",
    role: "Executive → Associate → Intern, Cloud & Data Engineer",
    period: "Mar 2021 – Jul 2023",
    location: "Chennai, India",
    highlights: [
      "Integrated Flask-RESTX APIs with Azure SQL & AI analytics (+50% productivity); standardized Bitbucket workflows and led Agile delivery.",
      "Modernized an Order-Management System on AWS (−25% manual effort); built an automated Spark quality analyzer (+30% assessment performance).",
      "Automated ETL for Teradata → Snowflake migration (−50% manual effort); engineered high-performance ETL with HBase, Hive, Kafka, YARN, Hadoop, MapReduce & PySpark (−40% processing time).",
    ],
    tech: ["PySpark", "Snowflake", "Kafka", "Hadoop", "Azure SQL"],
  },
];

export const stack: { group: string; items: string[] }[] = [
  {
    group: "genai_llms",
    items: [
      "LangGraph",
      "LangChain (ReAct)",
      "Google ADK",
      "RAG",
      "Weaviate",
      "pgvector",
      "AlloyDB",
      "OpenAI",
      "Gemini 2.5 Flash",
      "Document AI",
      "Stable Diffusion",
    ],
  },
  {
    group: "languages",
    items: ["Python", "FastAPI", "Flask-RESTX", "OpenCV", "PySpark"],
  },
  {
    group: "cloud_infra",
    items: [
      "GCP — Vertex AI, Cloud Run, Firestore, BigQuery",
      "AWS — ECS Fargate, Lambda, SQS, EventBridge",
      "Azure — Container Apps, SQL, Key Vault, Blob",
      "Microsoft Graph API",
      "Cloudflare Zero Trust",
    ],
  },
  {
    group: "data_streaming",
    items: ["Snowflake", "Teradata", "HBase", "Hive", "Kafka", "Hadoop", "Tableau"],
  },
  {
    group: "mlops_devops",
    items: [
      "Docker",
      "Terraform",
      "GitHub Actions",
      "Azure DevOps CI/CD",
      "Secrets management",
      "Observability (traces/latency/cost)",
    ],
  },
];

export type Project = {
  name: string;
  period: string;
  desc: string;
  result: string;
};

export const projects: Project[] = [
  {
    name: "NCAA Tournament Prediction",
    period: "2024",
    desc: "Trained an XGBoost model on 21 years of NCAA data for the GWU AI/ML Bracket Challenge (Brier score 0.1759).",
    result: "Ranked top 2.2% nationally · Challenge winner",
  },
  {
    name: "Enhancing Park Safety — NYC",
    period: "2024",
    desc: "Analyzed NYC park-crime data (2015–2023) with Python & Tableau; delivered safety recommendations by park size and incident trends.",
    result: "Data-driven safety recommendations",
  },
];

export const education = [
  {
    degree: "M.S. Data Science",
    school: "The George Washington University",
    period: "2023 – 2025",
    detail: "GPA 3.8",
  },
  {
    degree: "B.Tech. Computer Science",
    school: "SRM Institute of Science and Technology",
    period: "2017 – 2021",
    detail: "GPA 3.4",
  },
];

export const accomplishments = [
  "Winner — ITC & GWU AI/ML Bracket Challenge (score 1370)",
  "First Runner-up — InfoCepts E360 booth, product ideation & development",
];
