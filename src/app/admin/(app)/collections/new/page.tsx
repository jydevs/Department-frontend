"use client";
import { useState } from "react";
import { CollectionEditor } from "@/components/admin/products/CollectionEditor";
import { blankCollection } from "@/lib/admin/api/catalog";

export default function NewCollection() {
  const [c] = useState(blankCollection);
  return <CollectionEditor initial={c} />;
}
