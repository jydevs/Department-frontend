"use client";
import { useState } from "react";
import { ProductEditor } from "@/components/products/ProductEditor";
import { blankProduct } from "@/lib/api/catalog";

export default function NewProduct() {
  const [initial] = useState(blankProduct);
  return <ProductEditor initial={initial} />;
}
