"use client";
import { useState } from "react";
import { CollectionEditor } from "@/components/products/CollectionEditor";
import { blankCollection } from "@/lib/api/catalog";

export default function NewCollection() {
  const [c] = useState(blankCollection);
  return <CollectionEditor initial={c} />;
}
