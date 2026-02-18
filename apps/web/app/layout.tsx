import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenClaw Control Plane Lite",
  description:
    "A user-friendly dashboard for managing your OpenClaw Gateway — connections, skills, cron jobs, channels, and more.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0a0e17" />
      </head>
      <body>{children}</body>
    </html>
  );
}
