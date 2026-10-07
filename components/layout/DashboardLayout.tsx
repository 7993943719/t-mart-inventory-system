"use client";

import React from "react";
import { SharedDashboardLayout } from "./SharedDashboardLayout";

interface Props {
  businessName: string;
  userName: string;
  role: string;
  pageTitle?: string;
  children: React.ReactNode;
}

export function DashboardLayout({ businessName, userName, role, pageTitle, children }: Props) {
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
