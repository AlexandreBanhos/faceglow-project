import { NavLink } from "react-router-dom";

const links = [
  { to: "/admin/users",     label: "Usuários" },
  { to: "/admin/products",  label: "Produtos" },
  { to: "/admin/afiliados", label: "Afiliados" },
];

export function AdminNav() {
  return (
    <nav className="flex gap-1 border-b border-border mb-6">
      {links.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
