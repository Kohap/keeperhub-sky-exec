import { createFileRoute } from "@tanstack/react-router";
import { AppNotFound } from "@/lib/error-component";

export const Route = createFileRoute("/$")({
  component: AppNotFound,
});
