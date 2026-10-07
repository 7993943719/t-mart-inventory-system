"use client";

import React from "react";
import { SharedDashboardLayout } from "@/components/layout/SharedDashboardLayout";

interface Props {
  businessName: string;
  userName: string;
  role: string;
  pageTitle?: string;
  children: React.ReactNode;
}

export function UnifiedDashboardShell({ businessName, userName, role, pageTitle, children }: Props) {
  return (
    <SharedDashboardLayout
      businessName={businessName}
      userName={userName}
      role={role}
      pageTitle={pageTitle}
    >
      {children}
    </SharedDashboardLayout>
  );
}
