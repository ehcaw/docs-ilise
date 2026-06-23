import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

// Deterministic pseudo-random so reruns are stable.
let seed = 1337;
const rand = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const pickN = (arr, n) => {
  const c = [...arr];
  const out = [];
  while (out.length < n && c.length) out.push(c.splice(Math.floor(rand() * c.length), 1)[0]);
  return out;
};

const adjectives = ["streamlined", "scalable", "resilient", "automated", "unified", "granular", "real-time", "secure", "modular", "flexible", "robust", "intuitive", "lightweight", "enterprise-grade", "self-serve"];
const nouns = ["workflow", "pipeline", "dashboard", "connector", "policy", "schema", "endpoint", "report", "alert", "dataset", "permission", "template", "webhook", "snapshot", "audit log"];
const verbs = ["configure", "monitor", "optimize", "synchronize", "validate", "provision", "archive", "deploy", "throttle", "reconcile", "annotate", "export"];

const para = () => {
  const sentences = [];
  const count = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < count; i++) {
    sentences.push(
      `You can ${pick(verbs)} a ${pick(adjectives)} ${pick(nouns)} to keep your ${pick(adjectives)} ${pick(nouns)} aligned with team expectations.`
    );
  }
  return sentences.join(" ");
};

const callout = () => {
  const type = pick(["Note", "Tip", "Warning", "Info"]);
  return `<${type}>\n  ${para()}\n</${type}>`;
};

const bullets = () => {
  return pickN([...nouns, ...verbs], 4)
    .map((b) => `- A ${pick(adjectives)} approach to ${b} that fits most teams.`)
    .join("\n");
};

const codeBlock = () => {
  return "```bash\n" + `curl -X POST https://api.example.com/${pick(nouns).replace(/ /g, "-")} \\\n  -H "Authorization: Bearer $TOKEN" \\\n  -d '{"${pick(verbs)}": true}'` + "\n```";
};

function pageBody(title) {
  const blocks = [];
  blocks.push(`Welcome to the **${title}** guide. ${para()}`);
  blocks.push(`## Overview\n\n${para()}\n\n${bullets()}`);
  blocks.push(`## How it works\n\n${para()}\n\n${codeBlock()}`);
  blocks.push(callout());
  blocks.push(`## Best practices\n\n${para()}\n\n${bullets()}`);
  blocks.push(`## Troubleshooting\n\n${para()}`);
  blocks.push(callout());
  blocks.push(`## Next steps\n\n${para()}`);
  return blocks.join("\n\n");
}

function makePage(path, title, description) {
  const fm = `---\ntitle: "${title}"\nsidebarTitle: "${title}"\ndescription: "${description}"\n---\n\n`;
  const full = `/Users/ryan/mintlify/testing/docs-ilise/${path}.mdx`;
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, fm + pageBody(title) + "\n");
}

const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Define groups -> subsections -> N topic pages each.
const groupDefs = [
  { group: "Platform", icon: "layers", append: true, sections: { "Configuration": 10, "Administration": 10, "Architecture": 8, "Security": 8 } },
  { group: "Analytics", icon: "chart-bar", append: true, sections: { "Dashboards": 10, "Reports": 10, "Metrics": 8, "Data Modeling": 8 } },
  { group: "Integrations", icon: "plug", append: true, sections: { "Connectors": 12, "Webhooks": 8, "Authentication": 6, "Marketplace": 6 } },
  { group: "API Reference", icon: "code", sections: { "Endpoints": 14, "Authentication": 6, "Rate Limits": 4, "SDKs": 8 } },
  { group: "Automation", icon: "workflow", sections: { "Triggers": 8, "Actions": 8, "Recipes": 10 } },
  { group: "Guides", icon: "book-open", sections: { "Getting Started": 8, "Advanced": 10, "Migration": 6 } },
  { group: "Billing", icon: "credit-card", sections: { "Plans": 6, "Invoices": 6, "Usage": 6 } },
  { group: "Security", icon: "shield", sections: { "Compliance": 6, "Access Control": 8, "Audit": 6 } },
];

const topics = [
  "getting started", "deep dive", "configuration", "best practices", "common pitfalls",
  "advanced setup", "team workflows", "performance tuning", "monitoring", "troubleshooting",
  "scaling up", "automation", "templates", "examples", "reference", "limits and quotas",
  "data retention", "notifications", "custom fields", "bulk operations", "version history",
  "rollback strategies", "disaster recovery", "cost optimization", "tagging", "filtering",
];

const navGroups = [];
let pageCount = 0;

for (const def of groupDefs) {
  const groupSlug = slug(def.group);
  const pagesForGroup = [];

  // Group landing/overview page
  const overviewPath = `${groupSlug}/overview`;
  makePage(overviewPath, `${def.group} Overview`, `Everything you need to know about ${def.group.toLowerCase()}.`);
  pagesForGroup.push(overviewPath);
  pageCount++;

  for (const [section, n] of Object.entries(def.sections)) {
    const secSlug = slug(section);
    const sectionPages = [];
    for (let i = 0; i < n; i++) {
      const topic = topics[(i + section.length) % topics.length];
      const title = `${section}: ${titleCase(topic)}`;
      const path = `${groupSlug}/${secSlug}/${slug(topic)}-${i + 1}`;
      makePage(path, title, `Learn about ${topic} for ${section.toLowerCase()}.`);
      sectionPages.push(path);
      pageCount++;
    }
    pagesForGroup.push({ group: section, pages: sectionPages });
  }

  navGroups.push({ group: def.group, icon: def.icon, append: def.append, pages: pagesForGroup });
}

console.log(`Generated ${pageCount} pages.`);

// Merge into docs.json
const docsPath = "/Users/ryan/mintlify/testing/docs-ilise/docs.json";
const docs = JSON.parse(readFileSync(docsPath, "utf8"));
const existing = docs.navigation.groups;

for (const ng of navGroups) {
  if (ng.append) {
    const target = existing.find((g) => g.group === ng.group);
    if (target) {
      // keep existing top-level pages, then add subsection nested groups
      const nested = ng.pages.filter((p) => typeof p === "object");
      target.pages = [...target.pages, ...nested];
      continue;
    }
  }
  delete ng.append;
  ng.expanded = false;
  existing.push(ng);
}
// clean append flags
for (const g of existing) delete g.append;

writeFileSync(docsPath, JSON.stringify(docs, null, 2) + "\n");
console.log("docs.json updated. Total top-level groups:", existing.length);
