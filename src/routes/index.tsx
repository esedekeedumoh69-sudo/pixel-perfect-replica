import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "LightGrab Office" },
      { name: "description", content: "Private operations app for LightGrab office staff in Oron." },
      { property: "og:title", content: "LightGrab Office" },
      { property: "og:description", content: "Private operations app for LightGrab office staff in Oron." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard", replace: true });
  },
});
