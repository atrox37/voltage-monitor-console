import { getRouteApi } from "@tanstack/react-router";
import {
  DeviceEditContextProvider,
  useDeviceEditState,
} from "@/features/devices/contexts/device-edit-context";
import { DeviceDetailView } from "./device-detail-view";

const deviceDetailRoute = getRouteApi("/_app/devices/list/$id");

export function DeviceDetailPage() {
  const { id } = deviceDetailRoute.useParams();
  const editState = useDeviceEditState(id);
  return (
    <DeviceEditContextProvider value={editState}>
      <DeviceDetailView />
    </DeviceEditContextProvider>
  );
}
