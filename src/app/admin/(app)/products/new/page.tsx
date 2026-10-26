"use client";
import { useState } from "react";
import { ProductEditor } from "@/components/admin/products/ProductEditor";
import { blankProduct } from "@/lib/admin/api/catalog";

export default function NewProduct() {
  const [initial] = useState(blankProduct);
  return <ProductEditor initial={initial} />;
}
