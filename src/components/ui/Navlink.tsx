"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinkProps {
  href: string[];
  children: React.ReactNode;
}

export default function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname();

  // Check if current pathname matches any of the hrefs or starts with any of them
  const isActive = href.some(
    (path) => pathname === path || pathname.startsWith(path)
  );

  // Use the first href as the primary link destination
  const primaryHref = href[0];

  return (
    <Link
      href={primaryHref}
      className={`text-xl relative pb-3 px-2 after:absolute after:inset-x-0 after:bottom-0 hover:text-[#00ffe9] transition after:bg-gradient-to-r after:from-[#00FFE9] after:to-[#003B3C] ${
        isActive ? "text-[#00ffe9]" : "text-white"
      }`}
    >
      {children}
    </Link>
  );
}
