import type { ExcalidrawElementLike } from "@/types/domain";
import { boxWithLabel, cylinder, groupElements } from "./element-factory";

export const BUILTIN_SNIPPET_TAG = "builtin";

export type BuiltinSnippetDefinition = {
  slug: string;
  name: string;
  description: string;
  tags: string;
  build: () => ExcalidrawElementLike[];
};

export const BUILTIN_SNIPPET_DEFINITIONS: BuiltinSnippetDefinition[] = [
  {
    slug: "database",
    name: "Database",
    description: "SQL / relational database (cylinder)",
    tags: `${BUILTIN_SNIPPET_TAG},storage,sql`,
    build: () =>
      groupElements(
        "database",
        cylinder("database", {
          width: 200,
          height: 140,
          strokeColor: "#1971c2",
          backgroundColor: "#d0ebff",
          label: "Database",
        }),
      ),
  },
  {
    slug: "redis",
    name: "Redis",
    description: "In-memory cache (Redis)",
    tags: `${BUILTIN_SNIPPET_TAG},cache,redis`,
    build: () =>
      groupElements(
        "redis",
        boxWithLabel("redis", "Redis", {
          strokeColor: "#c92a2a",
          backgroundColor: "#ffe3e3",
        }),
      ),
  },
  {
    slug: "cache",
    name: "Cache",
    description: "Generic cache layer",
    tags: `${BUILTIN_SNIPPET_TAG},cache`,
    build: () =>
      groupElements(
        "cache",
        boxWithLabel("cache", "Cache", {
          strokeColor: "#e67700",
          backgroundColor: "#fff4e6",
        }),
      ),
  },
  {
    slug: "load-balancer",
    name: "Load Balancer",
    description: "Traffic load balancer (diamond)",
    tags: `${BUILTIN_SNIPPET_TAG},networking`,
    build: () =>
      groupElements(
        "load-balancer",
        boxWithLabel("load-balancer", "Load Balancer", {
          width: 220,
          height: 120,
          shape: "diamond",
          strokeColor: "#2f9e44",
          backgroundColor: "#d3f9d8",
        }),
      ),
  },
  {
    slug: "app-server",
    name: "App Server",
    description: "Application / API server",
    tags: `${BUILTIN_SNIPPET_TAG},compute`,
    build: () =>
      groupElements(
        "app-server",
        boxWithLabel("app-server", "App Server", {
          strokeColor: "#364fc7",
          backgroundColor: "#edf2ff",
        }),
      ),
  },
  {
    slug: "web-server",
    name: "Web Server",
    description: "HTTP web server",
    tags: `${BUILTIN_SNIPPET_TAG},compute`,
    build: () =>
      groupElements(
        "web-server",
        boxWithLabel("web-server", "Web Server", {
          strokeColor: "#364fc7",
          backgroundColor: "#edf2ff",
        }),
      ),
  },
  {
    slug: "microservice",
    name: "Microservice",
    description: "Single microservice instance",
    tags: `${BUILTIN_SNIPPET_TAG},compute`,
    build: () =>
      groupElements(
        "microservice",
        boxWithLabel("microservice", "Service", {
          width: 180,
          height: 76,
          strokeColor: "#5f3dc4",
          backgroundColor: "#f3f0ff",
        }),
      ),
  },
  {
    slug: "client",
    name: "Client",
    description: "User / mobile / browser client",
    tags: `${BUILTIN_SNIPPET_TAG},client`,
    build: () =>
      groupElements(
        "client",
        boxWithLabel("client", "Client", {
          strokeColor: "#495057",
          backgroundColor: "#f1f3f5",
        }),
      ),
  },
  {
    slug: "api-gateway",
    name: "API Gateway",
    description: "API gateway / edge routing",
    tags: `${BUILTIN_SNIPPET_TAG},networking`,
    build: () =>
      groupElements(
        "api-gateway",
        boxWithLabel("api-gateway", "API Gateway", {
          width: 220,
          height: 88,
          strokeColor: "#0b7285",
          backgroundColor: "#e3fafc",
        }),
      ),
  },
  {
    slug: "message-queue",
    name: "Message Queue",
    description: "Async queue (SQS, RabbitMQ, etc.)",
    tags: `${BUILTIN_SNIPPET_TAG},messaging`,
    build: () =>
      groupElements(
        "message-queue",
        boxWithLabel("message-queue", "Message Queue", {
          width: 220,
          height: 88,
          strokeColor: "#862e9c",
          backgroundColor: "#f8f0fc",
        }),
      ),
  },
  {
    slug: "kafka",
    name: "Kafka",
    description: "Kafka / event stream",
    tags: `${BUILTIN_SNIPPET_TAG},messaging,kafka`,
    build: () =>
      groupElements(
        "kafka",
        boxWithLabel("kafka", "Kafka", {
          strokeColor: "#862e9c",
          backgroundColor: "#f8f0fc",
        }),
      ),
  },
  {
    slug: "cdn",
    name: "CDN",
    description: "Content delivery network",
    tags: `${BUILTIN_SNIPPET_TAG},networking,cdn`,
    build: () =>
      groupElements(
        "cdn",
        boxWithLabel("cdn", "CDN", {
          width: 200,
          height: 88,
          strokeColor: "#0c8591",
          backgroundColor: "#e3fafc",
        }),
      ),
  },
  {
    slug: "object-storage",
    name: "Object Storage",
    description: "Blob storage (S3, GCS)",
    tags: `${BUILTIN_SNIPPET_TAG},storage`,
    build: () =>
      groupElements(
        "object-storage",
        cylinder("object-storage", {
          width: 200,
          height: 140,
          strokeColor: "#2b8a3e",
          backgroundColor: "#d3f9d8",
          label: "Object Storage",
        }),
      ),
  },
  {
    slug: "dns",
    name: "DNS",
    description: "DNS resolver",
    tags: `${BUILTIN_SNIPPET_TAG},networking`,
    build: () =>
      groupElements(
        "dns",
        boxWithLabel("dns", "DNS", {
          width: 160,
          height: 76,
          strokeColor: "#1864ab",
          backgroundColor: "#e7f5ff",
        }),
      ),
  },
  {
    slug: "firewall",
    name: "Firewall / WAF",
    description: "Firewall or web application firewall",
    tags: `${BUILTIN_SNIPPET_TAG},security`,
    build: () =>
      groupElements(
        "firewall",
        boxWithLabel("firewall", "Firewall", {
          strokeColor: "#e03131",
          backgroundColor: "#fff5f5",
        }),
      ),
  },
];

export function builtinSnippetId(slug: string): string {
  return `builtin-${slug}`;
}

export function isBuiltinSnippetId(id: string): boolean {
  return id.startsWith("builtin-");
}

export function builtinSlugFromId(id: string): string | null {
  if (!isBuiltinSnippetId(id)) return null;
  return id.slice("builtin-".length);
}

export function getBuiltinDefinitionById(id: string): BuiltinSnippetDefinition | null {
  const slug = builtinSlugFromId(id);
  if (!slug) return null;
  return BUILTIN_SNIPPET_DEFINITIONS.find((d) => d.slug === slug) ?? null;
}
