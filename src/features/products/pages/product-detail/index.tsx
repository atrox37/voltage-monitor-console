import { getRouteApi } from "@tanstack/react-router";
import {
  ProductEditContextProvider,
  useProductEditState,
} from "@/features/products/contexts/product-edit-context";
import { ProductDetailView } from "./product-detail-view";

const productDetailRoute = getRouteApi("/_app/devices/products/$id");

export function ProductDetailPage() {
  const { id } = productDetailRoute.useParams();
  const editState = useProductEditState(id);
  return (
    <ProductEditContextProvider value={editState}>
      <ProductDetailView />
    </ProductEditContextProvider>
  );
}
