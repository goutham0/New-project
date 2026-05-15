import "./globals.css";

export const metadata = {
  title: "ApplyPilot | AI Job Application Platform",
  description: "AI-powered job application assistant for manual, assisted, and direct bulk apply workflows."
};

export const viewport = {
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
