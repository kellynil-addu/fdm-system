export interface RoleTab {
  title: string;
  href: string;
  comingSoon?: true;
}

export interface RoleSection {
  category: string;
  tabs: RoleTab[];
}

export const ROLE_SECTIONS: { role: string; section: RoleSection }[] = [
  {
    role: "admin_staff",
    section: {
      category: "Administration",
      tabs: [
        { title: "Clients", href: "/dashboard/clients" },
        { title: "Property Lots", href: "/dashboard/properties/map" },
        { title: "Operations Log", href: "/dashboard/operations", comingSoon: true },
      ],
    },
  },
  {
    role: "billing_staff",
    section: {
      category: "Billing",
      tabs: [{ title: "Invoicing & Billing", href: "/dashboard/billing", comingSoon: true }],
    },
  },
  {
    role: "accounting_staff",
    section: {
      category: "Accounting",
      tabs: [{ title: "Accounts Payable", href: "/dashboard/accounting", comingSoon: true }],
    },
  },
  {
    role: "legal_staff",
    section: {
      category: "Legal",
      tabs: [{ title: "Contract Management", href: "/dashboard/legal", comingSoon: true }],
    },
  },
];
