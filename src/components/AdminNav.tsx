import { NavLink, useNavigate } from "react-router-dom";
import { Home } from "lucide-react";

const links = [
  { to: "/admin/users",     label: "Usuários" },
  { to: "/admin/products",  label: "Produtos" },
  { to: "/admin/afiliados", label: "Afiliados" },
];

export function AdminNav() {
  const navigate = useNavigate();
  return (
    <nav className="flex items-center gap-1 border-b border-border mb-6">
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
      <button
        onClick={() => navigate("/")}
        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 mb-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Home size={14} />
        Início
      </button>
    </nav>
  );
}
