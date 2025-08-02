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
  // const isActive = href.some(
  //   (path) => pathname === path || pathname.startsWith(path)
  // );

  // Use the first href as the primary link destination
  const primaryHref = href[0];

  return <Link href={primaryHref}>{children}</Link>;
}
