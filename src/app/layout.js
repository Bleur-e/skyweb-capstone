import "../app/globals.css";

export const metadata = {
  title: "Skyweb",
  description: "Skyland Truck Inventory and Maintenance System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}