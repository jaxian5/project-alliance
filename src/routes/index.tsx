import { createFileRoute } from "@tanstack/react-router";
import { AllianceApp } from "@/alliance/App.tsx";

export const Route = createFileRoute("/")({
  component: AllianceApp,
});
