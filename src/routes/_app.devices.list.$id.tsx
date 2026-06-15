import { createFileRoute } from "@tanstack/react-router";
import { DeviceDetailPage } from "@/features/devices/pages/device-detail-page";

export const Route = createFileRoute("/_app/devices/list/$id")({
  component: DeviceDetailPage,
});
