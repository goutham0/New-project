import { Suspense } from "react";
import AssistedHandoffClient from "@/components/AssistedHandoffClient";

export default function AssistedHandoffPage() {
  return (
    <Suspense fallback={null}>
      <AssistedHandoffClient />
    </Suspense>
  );
}
