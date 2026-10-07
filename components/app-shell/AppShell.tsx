"use client";

import React from "react";
import { SharedDashboardLayout } from "@/components/layout/SharedDashboardLayout";

interface Props {
  businessName: string;
  userName: string;
  children: React.ReactNode;
}

export function AppShell({ businessName, userName, children }: Props) {
  return (
    <SharedDashboardLayout
      businessName={businessName}
      userName={userName}
      role="OWNER"
      pageTitle="More"
    >
      {children}
    </SharedDashboardLayout>
  );
}
